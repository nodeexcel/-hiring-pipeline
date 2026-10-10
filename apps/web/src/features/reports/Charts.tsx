"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Neutral greys with one cream series. Green and red are kept for pass and fail only.
const AXIS = { stroke: "#8a8a8a", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = "rgba(255,247,237,0.12)";
const TOOLTIP = {
  contentStyle: {
    background: "#1a1a1a",
    border: "1px solid rgba(255,247,237,0.3)",
    borderRadius: 10,
    color: "#fafafa",
    fontSize: 12,
  },
  labelStyle: { color: "#a3a3a3" },
  cursor: { fill: "rgba(255,247,237,0.05)" },
} as const;
const LEGEND = { wrapperStyle: { fontSize: 12, color: "#a3a3a3" } } as const;

export function PassRates({ data }: { data: { round: string; passed: number; failed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="round" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Bar dataKey="passed" name="Passed" stackId="a" fill="#4ade80" />
        <Bar dataKey="failed" name="Failed" stackId="a" fill="#f87171" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Distribution({ data }: { data: { bucket: string; r1: number; r2: number; r3: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Bar dataKey="r1" name="Round 1" fill="#ffedd5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="r2" name="Round 2" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
        <Bar dataKey="r3" name="Round 3" fill="#525252" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
