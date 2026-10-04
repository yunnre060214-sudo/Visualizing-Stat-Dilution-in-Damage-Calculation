import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  applyShareableState,
  decodeShareState,
  getBrowserStorage,
  loadState,
  saveState,
  type PersistedStateV2,
} from "./persistedState";

interface PersistedStateStore {
  notice: string | null;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setState: Dispatch<SetStateAction<PersistedStateV2>>;
  state: PersistedStateV2;
}

interface Session {
  notice: string | null;
  state: PersistedStateV2;
  storage: Storage | null;
}

const PersistedStateContext = createContext<PersistedStateStore | null>(null);

function cloneState(state: PersistedStateV2): PersistedStateV2 {
  return JSON.parse(JSON.stringify(state)) as PersistedStateV2;
}

function initialize(initialState?: PersistedStateV2): Session {
  const storage = getBrowserStorage();
  if (initialState) return { notice: null, state: cloneState(initialState), storage };

  const loaded = loadState(storage);
  let state = loaded.state;
  let notice = loaded.recovered
    ? "本地配置已损坏或版本不兼容，已恢复默认值"
    : !loaded.persistenceAvailable
      ? "浏览器存储不可用，本次配置仅在当前页面保留"
      : null;
  if (typeof window !== "undefined") {
    const encoded = new URL(window.location.href).searchParams.get("config");
    if (encoded) {
      const decoded = decodeShareState(encoded);
      if (decoded.ok) state = applyShareableState(decoded.state, state);
      else notice = decoded.reason;
    }
  }
  return { notice, state, storage };
}

function useSession(initialState?: PersistedStateV2, persistenceEnabled = true): PersistedStateStore {
  const [session] = useState(() => initialize(initialState));
  const [state, setState] = useState(session.state);
  const [notice, setNotice] = useState<string | null>(session.notice);

  useEffect(() => {
    if (!persistenceEnabled) return;
    if (!saveState(session.storage, state)) {
      setNotice("浏览器存储不可用，本次配置仅在当前页面保留");
    }
  }, [persistenceEnabled, session.storage, state]);

  return { notice, setNotice, setState, state };
}

export function PersistedStateProvider({ children }: { children: ReactNode }) {
  const store = useSession();
  return <PersistedStateContext.Provider value={store}>{children}</PersistedStateContext.Provider>;
}

export function usePersistedState(initialState?: PersistedStateV2): PersistedStateStore {
  const context = useContext(PersistedStateContext);
  const local = useSession(context === null ? initialState : context.state, context === null);
  return context ?? local;
}
