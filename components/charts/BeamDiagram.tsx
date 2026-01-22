"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface BeamDiagramProps {
  data: any;
}

export function BeamDiagram({ data }: BeamDiagramProps) {
  // Generate sample data for visualization (in real app, this comes from solver)
  const mockChartData = Array.from({ length: 21 }, (_, i) => {
    const x = (i / 20) * parseFloat(data.length || 10);
    return {
      x: x.toFixed(1),
      shear: Math.sin(x) * 10,
      moment: Math.cos(x) * 50,
      deflection: -Math.pow(x - 5, 2) * 0.5,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-lg font-semibold">Shear Force Diagram</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="x" label={{ value: "Position (m)", position: "insideBottom", offset: -5 }} stroke="#9CA3AF" />
            <YAxis label={{ value: "Shear (kN)", angle: -90, position: "insideLeft" }} stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
            <Line type="monotone" dataKey="shear" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Bending Moment Diagram</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="x" label={{ value: "Position (m)", position: "insideBottom", offset: -5 }} stroke="#9CA3AF" />
            <YAxis label={{ value: "Moment (kN·m)", angle: -90, position: "insideLeft" }} stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
            <Line type="monotone" dataKey="moment" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Deflection Diagram</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="x" label={{ value: "Position (m)", position: "insideBottom", offset: -5 }} stroke="#9CA3AF" />
            <YAxis label={{ value: "Deflection (mm)", angle: -90, position: "insideLeft" }} stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
            <Line type="monotone" dataKey="deflection" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
