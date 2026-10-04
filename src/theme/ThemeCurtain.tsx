import type { CSSProperties } from "react";
import type { Theme, ThemeOrigin } from "./theme";

type CurtainStyle = CSSProperties & { "--curtain-radius": string };

interface ThemeCurtainProps {
  origin: ThemeOrigin;
  radius: number;
  targetTheme: Theme;
  onComplete(): void;
}

export function ThemeCurtain({ origin, radius, targetTheme, onComplete }: ThemeCurtainProps) {
  const style: CurtainStyle = {
    left: `${origin.x}px`,
    top: `${origin.y}px`,
    "--curtain-radius": `${radius}px`,
  };

  return (
    <span
      aria-hidden="true"
      className="theme-curtain"
      data-testid="theme-curtain"
      data-theme={targetTheme}
      onAnimationEnd={onComplete}
      style={style}
    />
  );
}
