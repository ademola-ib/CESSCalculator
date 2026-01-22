"use client";

import { useRef, useState, useCallback } from "react";
import { BeamSupport, BeamLoad } from "@/lib/types/beamEditor";

interface BeamVisualizerProps {
  length: number;
  supports: BeamSupport[];
  loads: BeamLoad[];
  onSupportDrag?: (id: string, newPosition: number) => void;
  onLoadDrag?: (id: string, newPosition: number) => void;
  onUDLDrag?: (id: string, newStart: number, newEnd: number) => void;
  onSupportClick?: (position: number) => void;
  onLoadClick?: (position: number) => void;
  snapIncrement?: number;
}

export function BeamVisualizer({
  length,
  supports,
  loads,
  onSupportDrag,
  onLoadDrag,
  onUDLDrag,
  onSupportClick,
  onLoadClick,
  snapIncrement = 0.05,
}: BeamVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{
    type: "support" | "load" | "udl-start" | "udl-end" | null;
    id: string | null;
  }>({ type: null, id: null });

  // SVG dimensions
  const width = 800;
  const height = 300;
  const padding = 60;
  const beamY = height / 2;
  const beamLength = width - 2 * padding;
  const scale = beamLength / length;

  // Convert beam position (meters) to SVG x coordinate
  const toSVGX = useCallback(
    (position: number) => padding + position * scale,
    [scale]
  );

  // Convert SVG x coordinate to beam position (meters)
  const toBeamPos = useCallback(
    (svgX: number) => {
      const pos = (svgX - padding) / scale;
      const snapped = Math.round(pos / snapIncrement) * snapIncrement;
      return Math.max(0, Math.min(length, snapped));
    },
    [scale, length, snapIncrement]
  );

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "support" | "load" | "udl-start" | "udl-end",
    id: string
  ) => {
    e.stopPropagation();
    setDragState({ type, id });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.type || !dragState.id || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const newPosition = toBeamPos(svgX);

    if (dragState.type === "support" && onSupportDrag) {
      onSupportDrag(dragState.id, newPosition);
    } else if (dragState.type === "load" && onLoadDrag) {
      onLoadDrag(dragState.id, newPosition);
    } else if (
      (dragState.type === "udl-start" || dragState.type === "udl-end") &&
      onUDLDrag
    ) {
      const load = loads.find((l) => l.id === dragState.id);
      if (load && load.type === "udl" && load.start !== undefined && load.end !== undefined) {
        if (dragState.type === "udl-start") {
          onUDLDrag(dragState.id, newPosition, load.end);
        } else {
          onUDLDrag(dragState.id, load.start, newPosition);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDragState({ type: null, id: null });
  };

  const handleBeamClick = (e: React.MouseEvent) => {
    if (dragState.type) return; // Don't add if dragging

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const svgX = e.clientX - rect.left;
    const position = toBeamPos(svgX);

    // You can decide whether to add support or load based on mode
    // For now, we'll just trigger the click callbacks
    if (onSupportClick) {
      onSupportClick(position);
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border bg-card p-4">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="mx-auto"
      >
        {/* Grid lines */}
        {Array.from({ length: Math.floor(length) + 1 }).map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={toSVGX(i)}
              y1={beamY - 10}
              x2={toSVGX(i)}
              y2={beamY + 10}
              stroke="hsl(217 19% 35%)"
              strokeWidth="1"
            />
            <text
              x={toSVGX(i)}
              y={beamY + 30}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
            >
              {i}m
            </text>
          </g>
        ))}

        {/* Beam line */}
        <line
          x1={padding}
          y1={beamY}
          x2={padding + beamLength}
          y2={beamY}
          stroke="hsl(213 31% 91%)"
          strokeWidth="4"
          onClick={handleBeamClick}
          className="cursor-crosshair"
        />

        {/* Supports */}
        {supports.map((support) => {
          const x = toSVGX(support.position);
          return (
            <g
              key={support.id}
              onMouseDown={(e) => handleMouseDown(e, "support", support.id)}
              className="cursor-move"
            >
              {support.type === "fixed" && (
                <>
                  <rect
                    x={x - 8}
                    y={beamY}
                    width="16"
                    height="30"
                    fill="hsl(212 92% 55%)"
                    stroke="hsl(212 92% 65%)"
                    strokeWidth="2"
                  />
                  <line
                    x1={x - 12}
                    y1={beamY + 30}
                    x2={x + 12}
                    y2={beamY + 30}
                    stroke="hsl(212 92% 55%)"
                    strokeWidth="3"
                  />
                </>
              )}
              {support.type === "pinned" && (
                <>
                  <polygon
                    points={`${x},${beamY} ${x - 12},${beamY + 24} ${x + 12},${beamY + 24}`}
                    fill="hsl(212 92% 55%)"
                    stroke="hsl(212 92% 65%)"
                    strokeWidth="2"
                  />
                  <line
                    x1={x - 15}
                    y1={beamY + 24}
                    x2={x + 15}
                    y2={beamY + 24}
                    stroke="hsl(212 92% 55%)"
                    strokeWidth="3"
                  />
                </>
              )}
              {support.type === "roller" && (
                <>
                  <polygon
                    points={`${x},${beamY} ${x - 12},${beamY + 20} ${x + 12},${beamY + 20}`}
                    fill="hsl(188 94% 43%)"
                    stroke="hsl(188 94% 53%)"
                    strokeWidth="2"
                  />
                  <circle cx={x - 8} cy={beamY + 26} r="4" fill="hsl(188 94% 43%)" />
                  <circle cx={x} cy={beamY + 26} r="4" fill="hsl(188 94% 43%)" />
                  <circle cx={x + 8} cy={beamY + 26} r="4" fill="hsl(188 94% 43%)" />
                  <line
                    x1={x - 15}
                    y1={beamY + 30}
                    x2={x + 15}
                    y2={beamY + 30}
                    stroke="hsl(188 94% 43%)"
                    strokeWidth="3"
                  />
                </>
              )}
              <text
                x={x}
                y={beamY + 50}
                textAnchor="middle"
                className="fill-primary text-xs font-semibold"
              >
                {support.position.toFixed(2)}m
              </text>
            </g>
          );
        })}

        {/* Loads */}
        {loads.map((load) => {
          if (load.type === "point" && load.position !== undefined) {
            const x = toSVGX(load.position);
            const isDown = load.direction !== "up";
            return (
              <g
                key={load.id}
                onMouseDown={(e) => handleMouseDown(e, "load", load.id)}
                className="cursor-move"
              >
                {/* Arrow */}
                <defs>
                  <marker
                    id={`arrowhead-${load.id}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="5"
                    refY="5"
                    orient={isDown ? "auto" : "auto-start-reverse"}
                  >
                    <polygon
                      points="0,0 10,5 0,10"
                      fill="hsl(0 63% 50%)"
                    />
                  </marker>
                </defs>
                <line
                  x1={x}
                  y1={isDown ? beamY - 60 : beamY + 60}
                  x2={x}
                  y2={beamY}
                  stroke="hsl(0 63% 50%)"
                  strokeWidth="2"
                  markerEnd={`url(#arrowhead-${load.id})`}
                />
                <text
                  x={x + 15}
                  y={isDown ? beamY - 45 : beamY + 55}
                  className="fill-destructive text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN
                </text>
              </g>
            );
          }

          if (load.type === "udl" && load.start !== undefined && load.end !== undefined) {
            const x1 = toSVGX(load.start);
            const x2 = toSVGX(load.end);
            const isDown = load.direction !== "up";
            const arrowCount = Math.max(3, Math.floor((load.end - load.start) * 2));
            return (
              <g key={load.id}>
                {/* Multiple arrows */}
                {Array.from({ length: arrowCount }).map((_, i) => {
                  const xPos = x1 + ((x2 - x1) * i) / (arrowCount - 1);
                  return (
                    <line
                      key={i}
                      x1={xPos}
                      y1={isDown ? beamY - 40 : beamY + 40}
                      x2={xPos}
                      y2={beamY}
                      stroke="hsl(249 47% 55%)"
                      strokeWidth="2"
                      markerEnd="url(#udl-arrowhead)"
                    />
                  );
                })}
                <defs>
                  <marker
                    id="udl-arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="4"
                    refY="4"
                    orient={isDown ? "auto" : "auto-start-reverse"}
                  >
                    <polygon points="0,0 8,4 0,8" fill="hsl(249 47% 55%)" />
                  </marker>
                </defs>
                {/* Top line */}
                <line
                  x1={x1}
                  y1={isDown ? beamY - 40 : beamY + 40}
                  x2={x2}
                  y2={isDown ? beamY - 40 : beamY + 40}
                  stroke="hsl(249 47% 55%)"
                  strokeWidth="2"
                />
                {/* Draggable handles */}
                <circle
                  cx={x1}
                  cy={isDown ? beamY - 40 : beamY + 40}
                  r="6"
                  fill="hsl(249 47% 55%)"
                  className="cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, "udl-start", load.id)}
                />
                <circle
                  cx={x2}
                  cy={isDown ? beamY - 40 : beamY + 40}
                  r="6"
                  fill="hsl(249 47% 55%)"
                  className="cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, "udl-end", load.id)}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={isDown ? beamY - 50 : beamY + 60}
                  textAnchor="middle"
                  className="fill-purple-400 text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN/m
                </text>
              </g>
            );
          }

          if (load.type === "moment" && load.position !== undefined) {
            const x = toSVGX(load.position);
            return (
              <g
                key={load.id}
                onMouseDown={(e) => handleMouseDown(e, "load", load.id)}
                className="cursor-move"
              >
                {/* Circular arrow for moment */}
                <circle
                  cx={x}
                  cy={beamY - 40}
                  r="15"
                  fill="none"
                  stroke="hsl(39 100% 50%)"
                  strokeWidth="2"
                />
                <path
                  d={`M ${x + 15} ${beamY - 40} l 5 -5 l -2 8 z`}
                  fill="hsl(39 100% 50%)"
                />
                <text
                  x={x}
                  y={beamY - 65}
                  textAnchor="middle"
                  className="fill-yellow-500 text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN·m
                </text>
              </g>
            );
          }

          return null;
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-primary" />
          <span>Fixed/Pinned Support</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-accent" />
          <span>Roller Support</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-destructive" />
          <span>Point Load</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-purple-500" />
          <span>UDL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-yellow-500" />
          <span>Moment</span>
        </div>
      </div>
    </div>
  );
}
