import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { getRevealRadius } from "./theme";

type MediaListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(options: { dark?: boolean; reduced?: boolean } = {}) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query.includes("prefers-color-scheme") ? Boolean(options.dark) : Boolean(options.reduced),
    media: query,
    onchange: null,
    addEventListener: vi.fn((_type: string, _listener: MediaListener) => undefined),
    removeEventListener: vi.fn((_type: string, _listener: MediaListener) => undefined),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })));
}

function ThemeProbe() {
  const { targetTheme, theme, transitioning } = useTheme();
  return (
    <>
      <ThemeToggle />
      <output data-testid="theme-state">
        {theme}:{targetTheme}:{transitioning ? "busy" : "idle"}
      </output>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";
    installMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
  });

  it("uses the system theme until the user has saved a preference", () => {
    installMatchMedia({ dark: true });

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "切换到浅色主题" })).toBeEnabled();
  });

  it("prefers a valid saved theme and ignores an invalid saved value", () => {
    localStorage.setItem("wuwa-theme", "light");
    installMatchMedia({ dark: true });
    const first = render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe("light");
    first.unmount();

    localStorage.setItem("wuwa-theme", "sepia");
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps theme switching available when browser storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    installMatchMedia({ reduced: true });
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "切换到深色主题" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("theme-state")).toHaveTextContent("dark:dark:idle");
  });

  it("switches immediately without a curtain when reduced motion is requested", async () => {
    installMatchMedia({ reduced: true });
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "切换到深色主题" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("wuwa-theme")).toBe("dark");
    expect(screen.queryByTestId("theme-curtain")).not.toBeInTheDocument();
  });

  it("uses the toggle center as the fallback curtain origin and cleans it up", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const button = screen.getByRole("button", { name: "切换到深色主题" });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 20,
      y: 10,
      width: 80,
      height: 40,
      top: 10,
      right: 100,
      bottom: 50,
      left: 20,
      toJSON: () => ({}),
    });

    await user.click(button);

    const curtain = screen.getByTestId("theme-curtain");
    expect(curtain).toHaveStyle({ left: "60px", top: "30px" });
    expect(button).toBeDisabled();
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.animationEnd(curtain);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.queryByTestId("theme-curtain")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换到浅色主题" })).toBeEnabled();
  });

  it("ignores repeated clicks while a fallback transition is running", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const button = screen.getByRole("button", { name: "切换到深色主题" });

    await user.dblClick(button);

    expect(screen.getAllByTestId("theme-curtain")).toHaveLength(1);
    expect(screen.getByTestId("theme-state")).toHaveTextContent("light:dark:busy");
  });

  it("uses View Transitions when the browser exposes the API", async () => {
    installMatchMedia({ reduced: false });
    const finished = Promise.resolve();
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { finished, ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), skipTransition: vi.fn() };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: startViewTransition });
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "切换到深色主题" }));
    await finished;

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.queryByTestId("theme-curtain")).not.toBeInTheDocument();
  });
});

describe("getRevealRadius", () => {
  it("returns the farthest corner distance", () => {
    expect(getRevealRadius({ x: 0, y: 0 }, { width: 3, height: 4 })).toBe(5);
    expect(getRevealRadius({ x: 3, y: 4 }, { width: 3, height: 4 })).toBe(5);
  });
});
