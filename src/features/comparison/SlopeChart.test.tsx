import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BuildComparisonResult } from "../../domain/types";
import { SlopeChart } from "./SlopeChart";

const result: BuildComparisonResult = {
  nonCrit: { a: 100, b: 110, absolute: 10, relative: 0.1 },
  crit: { a: 200, b: 220, absolute: 20, relative: 0.1 },
  expected: { a: 150, b: 165, absolute: 15, relative: 0.1 },
  winner: "b",
};

describe("SlopeChart", () => {
  it("uses semantic chart colors that update with the active theme", () => {
    render(<SlopeChart result={result} />);

    const chart = screen.getByRole("img", { name: "方案 A 与方案 B 的伤害斜率图" });
    expect(chart.querySelector('line[data-series="nonCrit"]')).toHaveAttribute(
      "stroke",
      "var(--chart-series-neutral)",
    );
    expect(chart.querySelector('line[data-series="crit"]')).toHaveAttribute(
      "stroke",
      "var(--accent-secondary)",
    );
    expect(chart.querySelector('line[data-series="expected"]')).toHaveAttribute(
      "stroke",
      "var(--accent-primary)",
    );
  });
});
