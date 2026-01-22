"use client";

import { useRef } from "react";
import { FrameNode, FrameMember, FrameLoad } from "@/lib/types/frameEditor";

interface FrameVisualizerProps {
  bays: number;
  stories: number;
  bayWidth: number;
  storyHeight: number;
  nodes: FrameNode[];
  members: FrameMember[];
  loads: FrameLoad[];
}

export function FrameVisualizer({
  bays,
  stories,
  bayWidth,
  storyHeight,
  nodes,
  members,
  loads,
}: FrameVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG dimensions
  const width = 800;
  const height = 600;
  const padding = 80;

  // Calculate scale based on frame dimensions
  const frameWidth = bays * bayWidth;
  const frameHeight = stories * storyHeight;
  const scaleX = (width - 2 * padding) / Math.max(frameWidth, 1);
  const scaleY = (height - 2 * padding) / Math.max(frameHeight, 1);
  const scale = Math.min(scaleX, scaleY);

  // Convert grid coordinates to SVG coordinates
  const toSVGX = (gridX: number) => padding + gridX * bayWidth * scale;
  const toSVGY = (gridY: number) => height - padding - gridY * storyHeight * scale;

  return (
    <div className="w-full overflow-x-auto rounded-md border bg-card p-4">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="mx-auto"
      >
        {/* Grid lines */}
        {Array.from({ length: bays + 1 }).map((_, i) => (
          <line
            key={`grid-v-${i}`}
            x1={toSVGX(i)}
            y1={toSVGY(0)}
            x2={toSVGX(i)}
            y2={toSVGY(stories)}
            stroke="hsl(217 19% 25%)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        ))}
        {Array.from({ length: stories + 1 }).map((_, i) => (
          <line
            key={`grid-h-${i}`}
            x1={toSVGX(0)}
            y1={toSVGY(i)}
            x2={toSVGX(bays)}
            y2={toSVGY(i)}
            stroke="hsl(217 19% 25%)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        ))}

        {/* Members */}
        {members.map((member) => {
          const nodeA = nodes.find((n) => n.id === member.nodeA);
          const nodeB = nodes.find((n) => n.id === member.nodeB);
          if (!nodeA || !nodeB) return null;

          return (
            <line
              key={member.id}
              x1={toSVGX(nodeA.x)}
              y1={toSVGY(nodeA.y)}
              x2={toSVGX(nodeB.x)}
              y2={toSVGY(nodeB.y)}
              stroke={member.type === "beam" ? "hsl(212 92% 55%)" : "hsl(188 94% 43%)"}
              strokeWidth="4"
              className="hover:opacity-80"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const x = toSVGX(node.x);
          const y = toSVGY(node.y);

          return (
            <g key={node.id}>
              <circle
                cx={x}
                cy={y}
                r="6"
                fill="hsl(213 31% 91%)"
                stroke="hsl(212 92% 55%)"
                strokeWidth="2"
              />

              {/* Support symbols at base */}
              {node.y === 0 && node.support && (
                <g>
                  {node.support === "fixed" && (
                    <>
                      <rect
                        x={x - 10}
                        y={y}
                        width="20"
                        height="25"
                        fill="hsl(212 92% 55%)"
                        stroke="hsl(212 92% 65%)"
                        strokeWidth="2"
                      />
                      <line
                        x1={x - 15}
                        y1={y + 25}
                        x2={x + 15}
                        y2={y + 25}
                        stroke="hsl(212 92% 55%)"
                        strokeWidth="3"
                      />
                    </>
                  )}
                  {node.support === "pinned" && (
                    <>
                      <polygon
                        points={`${x},${y} ${x - 12},${y + 20} ${x + 12},${y + 20}`}
                        fill="hsl(212 92% 55%)"
                        stroke="hsl(212 92% 65%)"
                        strokeWidth="2"
                      />
                      <line
                        x1={x - 15}
                        y1={y + 20}
                        x2={x + 15}
                        y2={y + 20}
                        stroke="hsl(212 92% 55%)"
                        strokeWidth="3"
                      />
                    </>
                  )}
                </g>
              )}

              {/* Node labels */}
              <text
                x={x + 12}
                y={y - 8}
                className="fill-muted-foreground text-xs"
              >
                N{node.id.slice(0, 3)}
              </text>
            </g>
          );
        })}

        {/* Loads */}
        {loads.map((load) => {
          if (load.type.startsWith("joint")) {
            const jointLoad = load as any;
            const node = nodes.find((n) => n.id === jointLoad.nodeId);
            if (!node) return null;

            const x = toSVGX(node.x);
            const y = toSVGY(node.y);

            if (load.type === "joint-force-y") {
              return (
                <g key={load.id}>
                  <line
                    x1={x}
                    y1={y - 40}
                    x2={x}
                    y2={y}
                    stroke="hsl(0 63% 50%)"
                    strokeWidth="2"
                    markerEnd="url(#force-arrow)"
                  />
                  <defs>
                    <marker
                      id="force-arrow"
                      markerWidth="10"
                      markerHeight="10"
                      refX="5"
                      refY="5"
                      orient="auto"
                    >
                      <polygon points="0,0 10,5 0,10" fill="hsl(0 63% 50%)" />
                    </marker>
                  </defs>
                  <text
                    x={x + 10}
                    y={y - 30}
                    className="fill-destructive text-xs font-semibold"
                  >
                    {Math.abs(jointLoad.magnitude)} kN
                  </text>
                </g>
              );
            }
          }
          return null;
        })}

        {/* Dimension labels */}
        <text
          x={toSVGX(bays / 2)}
          y={height - 20}
          textAnchor="middle"
          className="fill-muted-foreground text-sm"
        >
          {bays} bay(s) × {bayWidth}m = {frameWidth}m
        </text>
        <text
          x={20}
          y={toSVGY(stories / 2)}
          textAnchor="middle"
          className="fill-muted-foreground text-sm"
          transform={`rotate(-90, 20, ${toSVGY(stories / 2)})`}
        >
          {stories} stor{stories === 1 ? "y" : "ies"} × {storyHeight}m = {frameHeight}m
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-primary" />
          <span>Beam</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-accent" />
          <span>Column</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-destructive" />
          <span>Load</span>
        </div>
      </div>
    </div>
  );
}
