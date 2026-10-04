import { useEffect, useState, type CSSProperties } from "react";

export interface CharacterIconProps {
  name: string;
  element: string;
  src: string | null;
  className?: string;
}

const elementColors: Record<string, string> = {
  glacio: "#70d6ff",
  fusion: "#ff7b54",
  electro: "#b79cff",
  aero: "#66d9b8",
  spectro: "#ffd166",
  havoc: "#d49cff",
};

const fallbackStyle = (element: string): CSSProperties => ({
  alignItems: "center",
  background: `color-mix(in srgb, ${elementColors[element] ?? "#8da2b8"} 28%, #121923)`,
  border: `1px solid ${elementColors[element] ?? "#8da2b8"}`,
  borderRadius: "50%",
  color: "#f7fafc",
  display: "inline-flex",
  flex: "0 0 auto",
  fontSize: "0.8rem",
  fontWeight: 700,
  height: "2rem",
  justifyContent: "center",
  width: "2rem",
});

export function CharacterIcon({ name, element, src, className }: CharacterIconProps) {
  const [failed, setFailed] = useState(src === null || src.trim() === "");

  useEffect(() => {
    setFailed(src === null || src.trim() === "");
  }, [src]);

  if (failed || src === null) {
    return (
      <span
        aria-label={name}
        className={className}
        data-element={element}
        role="img"
        style={fallbackStyle(element)}
      >
        {Array.from(name.trim())[0] ?? "?"}
      </span>
    );
  }

  return (
    <img
      alt={name}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
      style={{ borderRadius: "50%", height: "2rem", objectFit: "cover", width: "2rem" }}
    />
  );
}
