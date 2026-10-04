import type { PanelFormState } from "../../store/persistedState";
import styles from "./Workbench.module.css";

type EditableField = keyof PanelFormState;

interface PanelEditorProps {
  state: PanelFormState;
  fieldErrors: Partial<Record<EditableField, string>>;
  onChange: (field: EditableField, value: string) => void;
}

const fields: Array<{
  key: EditableField;
  group: "基础面板" | "暴击" | "伤害乘区";
  label: string;
  suffix: string;
  hint: string;
}> = [
  { key: "attack", group: "基础面板", label: "面板攻击", suffix: "", hint: "角色结算后的总攻击" },
  { key: "hp", group: "基础面板", label: "面板生命", suffix: "", hint: "生命倍率动作使用此值" },
  { key: "def", group: "基础面板", label: "面板防御", suffix: "", hint: "防御倍率动作使用此值" },
  { key: "critRate", group: "暴击", label: "暴击率", suffix: "%", hint: "期望伤害按 0–100% 计入" },
  { key: "critDamage", group: "暴击", label: "暴击伤害", suffix: "%", hint: "填写游戏面板总值" },
  { key: "atkPercent", group: "伤害乘区", label: "当前攻击加成", suffix: "%", hint: "用于词条稀释的攻击区构成" },
  { key: "multiplier", group: "伤害乘区", label: "技能倍率", suffix: "%", hint: "当前伤害段的倍率" },
  { key: "resistance", group: "伤害乘区", label: "目标抗性", suffix: "%", hint: "演示目标默认为 10%" },
  { key: "damageBonus", group: "伤害乘区", label: "伤害加成", suffix: "%", hint: "属性与类型伤害加成合计" },
  { key: "deepen", group: "伤害乘区", label: "伤害加深", suffix: "%", hint: "独立伤害加深乘区" },
];

const groups = ["基础面板", "暴击", "伤害乘区"] as const;

export function PanelEditor({ state, fieldErrors, onChange }: PanelEditorProps) {
  return (
    <section className={styles.panel} aria-labelledby="panel-editor-title">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.kicker}>INPUT / PANEL</p>
          <h2 id="panel-editor-title">面板参数</h2>
        </div>
        <span className={styles.stepBadge}>01</span>
      </div>

      <div className={styles.fieldList}>
        {groups.map((group) => (
          <section className={styles.fieldGroup} key={group}>
            <h3>{group}</h3>
            <div>
              {fields.filter((field) => field.group === group).map((field) => {
                const error = fieldErrors[field.key];
                const invalid = error !== undefined;
                const feedbackId = `${field.key}-feedback`;
                return (
                  <label className={styles.field} key={field.key}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <span className={styles.inputShell} data-invalid={invalid || undefined}>
                      <input
                        aria-label={field.label}
                        aria-describedby={feedbackId}
                        aria-invalid={invalid}
                        inputMode="decimal"
                        value={state[field.key]}
                        onChange={(event) => onChange(field.key, event.target.value)}
                      />
                      {field.suffix && <span>{field.suffix}</span>}
                    </span>
                    <span className={error ? styles.fieldError : styles.fieldHint} id={feedbackId}>
                      {error ?? field.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className={styles.targetStrip}>
        <span>攻击者 Lv.90</span>
        <span>目标 Lv.90</span>
        <span>防御区 0.500</span>
      </div>
    </section>
  );
}
