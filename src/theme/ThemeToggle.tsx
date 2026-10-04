import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, transitioning } = useTheme();
  const nextLabel = theme === "dark" ? "浅色" : "深色";

  return (
    <button
      aria-label={`切换到${nextLabel}主题`}
      className={className}
      data-theme-toggle
      disabled={transitioning}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      title={`切换到${nextLabel}主题`}
      type="button"
    >
      <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
      <span>{nextLabel}</span>
    </button>
  );
}
