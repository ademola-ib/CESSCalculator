"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { ChartPoint } from "@/lib/solver/types";

interface BeamDiagramProps {
  data: any;
  /** Real solver output: shear force diagram points */
  shearForce?: ChartPoint[];
  /** Real solver output: bending moment diagram points */
  bendingMoment?: ChartPoint[];
  /** Real solver output: deflection diagram points */
  deflection?: ChartPoint[];
  /** Support positions to show as reference lines */
  supportPositions?: number[];
}

/**
 * Custom tooltip for beam diagrams
 */
function DiagramTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">x = {parseFloat(label).toFixed(2)} m</p>
      <p className="font-semibold" style={{ color: payload[0]?.stroke }}>
        {parseFloat(value).toFixed(3)} {unit}
      </p>
    </div>
  );
}

export function BeamDiagram({
  data,
  shearForce,
  bendingMoment,
  deflection,
  supportPositions,
}: BeamDiagramProps) {
  // Use real solver data if provided, otherwise generate mock data
  const hasRealData = shearForce && bendingMoment && deflection;

  const chartData = hasRealData
    ? shearForce.map((pt, i) => ({
        x: pt.x.toFixed(2),
        shear: pt.value,
        moment: bendingMoment[i]?.value ?? 0,
        deflection: deflection[i]?.value ?? 0,
      }))
    : Array.from({ length: 21 }, (_, i) => {
        const x = (i / 20) * parseFloat(data?.length || 10);
        return {
          x: x.toFixed(2),
          shear: Math.sin(x) * 10,
          moment: Math.cos(x) * 50,
          deflection: -Math.pow(x - 5, 2) * 0.5,
        };
      });

  // Calculate Y-axis domains for better visualization
  const shearValues = chartData.map((d) => d.shear);
  const momentValues = chartData.map((d) => d.moment);
  const deflValues = chartData.map((d) => d.deflection);

  const getSymmetricDomain = (values: number[]): [number, number] => {
    const max = Math.max(...values.map(Math.abs));
    const padding = max * 0.15 || 1;
    return [-(max + padding), max + padding];
  };

  const shearDomain = getSymmetricDomain(shearValues);
  const momentDomain = getSymmetricDomain(momentValues);
  const deflDomain = getSymmetricDomain(deflValues);

  const commonXAxisProps = {
    dataKey: "x" as const,
    stroke: "#9CA3AF",
    tick: { fill: "#9CA3AF", fontSize: 11 },
    tickLine: { stroke: "#4B5563" },
  };

  const commonGridProps = {
    strokeDasharray: "3 3",
    stroke: "#374151",
  };

  return (
    <div className="space-y-8">
      {!hasRealData && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-center text-sm text-yellow-400">
          Showing placeholder data. Run the solver with valid inputs to see real diagrams.
        </div>
      )}

      {/* Shear Force Diagram */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Shear Force Diagram (SFD)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid {...commonGridProps} />
            <XAxis
              {...commonXAxisProps}
              label={{
                value: "Position (m)",
                position: "insideBottom",
                offset: -10,
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              domain={shearDomain}
              label={{
                value: "V (kN)",
                angle: -90,
                position: "insideLeft",
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <Tooltip content={<DiagramTooltip unit="kN" />} />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1} />
            {supportPositions?.map((pos, i) => (
              <ReferenceLine
                key={`sup-shear-${i}`}
                x={pos.toFixed(2)}
                stroke="#4B5563"
                strokeDasharray="4 4"
              />
            ))}
            <defs>
              <linearGradient id="shearGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <Area
              type="linear"
              dataKey="shear"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#shearGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#3B82F6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bending Moment Diagram */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Bending Moment Diagram (BMD)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid {...commonGridProps} />
            <XAxis
              {...commonXAxisProps}
              label={{
                value: "Position (m)",
                position: "insideBottom",
                offset: -10,
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              domain={momentDomain}
              reversed
              label={{
                value: "M (kN\u00B7m)",
                angle: -90,
                position: "insideLeft",
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <Tooltip content={<DiagramTooltip unit="kN\u00B7m" />} />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1} />
            {supportPositions?.map((pos, i) => (
              <ReferenceLine
                key={`sup-moment-${i}`}
                x={pos.toFixed(2)}
                stroke="#4B5563"
                strokeDasharray="4 4"
              />
            ))}
            <defs>
              <linearGradient id="momentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#10B981" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <Area
              type="linear"
              dataKey="moment"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#momentGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#10B981" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Deflection Diagram */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Deflection Diagram</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid {...commonGridProps} />
            <XAxis
              {...commonXAxisProps}
              label={{
                value: "Position (m)",
                position: "insideBottom",
                offset: -10,
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              domain={deflDomain}
              label={{
                value: "\u03B4 (mm)",
                angle: -90,
                position: "insideLeft",
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />
            <Tooltip content={<DiagramTooltip unit="mm" />} />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1} />
            {supportPositions?.map((pos, i) => (
              <ReferenceLine
                key={`sup-defl-${i}`}
                x={pos.toFixed(2)}
                stroke="#4B5563"
                strokeDasharray="4 4"
              />
            ))}
            <defs>
              <linearGradient id="deflGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <Area
              type="linear"
              dataKey="deflection"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#deflGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#F59E0B" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
