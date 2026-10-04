import { useEffect, useRef } from "react";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { MarginalValueResult } from "../../domain/types";
import { useTheme } from "../../theme/ThemeProvider";
import styles from "./DilutionLab.module.css";

use([LineChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

export type ChartMetric = "relative" | "damage" | "marginal";

interface DilutionChartProps {
  metric: ChartMetric;
  result: MarginalValueResult;
}

const colors = ["#67e8f9", "#ffd166", "#b79cff", "#75e6a4", "#ff8f70", "#9eb4c6"];
const lineTypes = ["solid", "dashed", "dotted", "dashdot", "solid", "dashed"] as const;

function pointValue(metric: ChartMetric, point: MarginalValueResult["curvePoints"][number]) {
  if (metric === "damage") return point.damage;
  if (metric === "marginal") return point.marginalGain * 100;
  return point.relativeGain * 100;
}

function metricName(metric: ChartMetric): string {
  if (metric === "damage") return "期望伤害";
  if (metric === "marginal") return "本单位边际提升（%）";
  return "相对当前提升（%）";
}

export function DilutionChart({ metric, result }: DilutionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return undefined;
    const firstCrossing = result.crossings[0];
    const capPoint = result.candidates
      .find((candidate) => candidate.stat === "critRate")
      ?.curve.find((point) => point.overflowLoss > 0);
    const rootStyle = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => rootStyle.getPropertyValue(name).trim() || fallback;
    const chartLabel = token("--chart-label", theme === "dark" ? "#8e9aa7" : "#657680");
    const chartAxis = token("--chart-axis", theme === "dark" ? "#3a4958" : "#aebdc5");
    const chartGrid = token("--chart-grid", theme === "dark" ? "#2b3744" : "#d4dee2");
    const tooltip = token("--chart-tooltip", theme === "dark" ? "#0b1118" : "#ffffff");
    const textStrong = token("--text-strong", theme === "dark" ? "#f4f8fb" : "#101a22");
    const chart = init(container, undefined, { renderer: "canvas" });
    const option: EChartsCoreOption = {
      animationDuration: 220,
      backgroundColor: "transparent",
      grid: { left: 68, right: 28, top: 66, bottom: 52 },
      legend: {
        top: 8,
        textStyle: { color: chartLabel, fontSize: 10 },
        itemWidth: 22,
        itemHeight: 3,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltip,
        borderColor: chartAxis,
        textStyle: { color: textStrong, fontSize: 11 },
        valueFormatter: (value: unknown) =>
          metric === "damage"
            ? Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 0 })
            : `${Number(value).toFixed(2)}%`,
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 20,
        interval: 2,
        name: "继续投入的预算单位",
        nameLocation: "middle",
        nameGap: 31,
        nameTextStyle: { color: chartLabel, fontSize: 10 },
        axisLabel: { color: chartLabel, fontSize: 9 },
        axisLine: { lineStyle: { color: chartAxis } },
        splitLine: { lineStyle: { color: chartGrid, opacity: 0.55 } },
      },
      yAxis: {
        type: "value",
        name: metricName(metric),
        nameTextStyle: { color: chartLabel, fontSize: 10, padding: [0, 0, 8, 0] },
        axisLabel: {
          color: chartLabel,
          fontSize: 9,
          formatter: metric === "damage" ? "{value}" : "{value}%",
        },
        splitLine: { lineStyle: { color: chartGrid, opacity: 0.72 } },
      },
      series: result.candidates.map((candidate, index) => ({
        name: candidate.label,
        type: "line",
        showSymbol: false,
        symbol: "circle",
        smooth: false,
        data: candidate.curve.map((point) => [point.budgetUnits, pointValue(metric, point)]),
        lineStyle: { color: colors[index % colors.length], type: lineTypes[index % lineTypes.length], width: 2 },
        itemStyle: { color: colors[index % colors.length] },
        emphasis: { focus: "series" },
        markLine: index === 0
          ? {
              silent: true,
              symbol: ["none", "none"],
              label: { color: chartLabel, fontSize: 9, formatter: "{b}" },
              lineStyle: { color: chartAxis, type: "dashed", width: 1 },
              data: [
                { name: "当前", xAxis: 0 },
                ...(firstCrossing ? [{ name: "首次交叉", xAxis: firstCrossing.budgetUnits }] : []),
                ...(capPoint ? [{ name: "暴击封顶", xAxis: capPoint.budgetUnits }] : []),
              ],
            }
          : undefined,
      })),
    };
    chart.setOption(option);

    const resize = () => chart.resize();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize);
      observer.observe(container);
    } else {
      window.addEventListener("resize", resize);
    }
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [metric, result, theme]);

  const firstCrossing = result.crossings[0];
  const critCap = result.candidates
    .find((candidate) => candidate.stat === "critRate")
    ?.curve.find((point) => point.overflowLoss > 0);

  return (
    <section className={styles.chartPanel} aria-labelledby="dilution-chart-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>COUNTERFACTUAL / 0–20</p>
          <h2 id="dilution-chart-title">继续投入会发生什么</h2>
        </div>
        <span>{metricName(metric)}</span>
      </div>
      <div className={styles.chartScroller}>
        <div
          aria-label="词条投入边际收益曲线"
          className={styles.chart}
          data-chart-theme={theme}
          ref={containerRef}
          role="img"
        />
      </div>
      <div className={styles.chartAnnotations}>
        <span>当前配置：预算单位 0</span>
        <span>{firstCrossing ? `首次交叉：第 ${firstCrossing.budgetUnits} 单位` : "20 单位内暂无交叉"}</span>
        <span>{critCap ? `暴击溢出起点：第 ${critCap.budgetUnits} 单位` : "当前区间无暴击溢出"}</span>
      </div>
    </section>
  );
}
