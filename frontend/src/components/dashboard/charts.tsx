"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

import {
  type AttendanceChartPoint,
  type HiringTrendPoint,
  type DepartmentDistributionPoint,
} from "@hrms/shared";

const COLORS = {
  primary: "#2563eb",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#0ea5e9",
  purple: "#8b5cf6",
  muted: "#94a3b8",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function AttendanceBarChart({ data }: { data: AttendanceChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.success} radius={[0, 0, 4, 4]} />
        <Bar dataKey="halfDay" name="Half day" stackId="a" fill={COLORS.warning} />
        <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HiringTrendChart({ data }: { data: HiringTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="hiringFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="count" name="New hires" stroke={COLORS.primary} strokeWidth={2} fill="url(#hiringFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LeavePieChart({ data }: { data: { name: string; value: number }[] }) {
  const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          stroke="hsl(var(--background))"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DepartmentBarChart({ data }: { data: DepartmentDistributionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
        <Bar dataKey="count" name="Employees" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { LineChart as BaseLineChart };
