"use client";

import { useRef, useState, useMemo } from "react";
import { FrameNode, FrameMember, FrameLoad } from "@/lib/types/frameEditor";

interface FrameVisualizerProps {
  bays: number;
  stories: number;
  bayWidth: number;
  storyHeight: number;
  nodes: FrameNode[];
  members: FrameMember[];
  loads: FrameLoad[];
  /** Sway frame indicator */
  isSway?: boolean;
  /** Callback when sway toggle changes */
  onSwayToggle?: (isSway: boolean) => void;
  /** Currently selected member (for editing) */
  selectedMemberId?: string | null;
  /** Callback when a member is clicked */
  onMemberClick?: (memberId: string) => void;
  /** EI multiplier per member (memberId -> multiplier) */
  memberEIMultipliers?: Record<string, number>;
}

export function FrameVisualizer({
  bays,
  stories,
  bayWidth,
  storyHeight,
  nodes,
  members,
  loads,
  isSway = false,
  onSwayToggle,
  selectedMemberId,
  onMemberClick,
  memberEIMultipliers,
}: FrameVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

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

  // Categorize loads
  const jointLoads = useMemo(
    () => loads.filter((l) => l.type.startsWith("joint")) as any[],
    [loads]
  );
  const memberLoads = useMemo(
    () => loads.filter((l) => l.type.startsWith("member")) as any[],
    [loads]
  );

  // Helper: get SVG coords for a node by id
  const getNodeSVG = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: toSVGX(node.x), y: toSVGY(node.y) };
  };

  // Render member loads (UDL, point load on member)
  const renderMemberLoad = (load: any) => {
    const member = members.find((m) => m.id === load.memberId);
    if (!member) return null;

    const nodeA = nodes.find((n) => n.id === member.nodeA);
    const nodeB = nodes.find((n) => n.id === member.nodeB);
    if (!nodeA || !nodeB) return null;

    const x1 = toSVGX(nodeA.x);
    const y1 = toSVGY(nodeA.y);
    const x2 = toSVGX(nodeB.x);
    const y2 = toSVGY(nodeB.y);

    // Member direction vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;

    // Unit vector along member and perpendicular (left-hand normal)
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy; // perpendicular normal
    const ny = ux;

    if (load.type === "member-udl") {
      const arrowCount = Math.max(4, Math.floor(len / 30));
      const arrowLen = 25;
      const magnitude = load.magnitude;
      const sign = magnitude >= 0 ? 1 : -1;

      return (
        <g key={load.id}>
          {/* UDL arrows along member */}
          {Array.from({ length: arrowCount }).map((_, i) => {
            const t = (i + 0.5) / arrowCount;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            const tipX = px;
            const tipY = py;
            const baseX = px + nx * arrowLen * sign;
            const baseY = py + ny * arrowLen * sign;

            return (
              <line
                key={i}
                x1={baseX}
                y1={baseY}
                x2={tipX}
                y2={tipY}
                stroke="hsl(249 47% 55%)"
                strokeWidth="1.5"
                markerEnd="url(#frame-udl-arrow)"
              />
            );
          })}
          {/* Top line connecting arrow bases */}
          <line
            x1={x1 + nx * arrowLen * sign + ux * (len / arrowCount) * 0.5}
            y1={y1 + ny * arrowLen * sign + uy * (len / arrowCount) * 0.5}
            x2={x2 + nx * arrowLen * sign - ux * (len / arrowCount) * 0.5}
            y2={y2 + ny * arrowLen * sign - uy * (len / arrowCount) * 0.5}
            stroke="hsl(249 47% 55%)"
            strokeWidth="2"
          />
          {/* Label */}
          <text
            x={(x1 + x2) / 2 + nx * (arrowLen + 12) * sign}
            y={(y1 + y2) / 2 + ny * (arrowLen + 12) * sign}
            textAnchor="middle"
            className="fill-purple-400 text-xs font-semibold"
          >
            {Math.abs(magnitude)} kN/m
          </text>
        </g>
      );
    }

    if (load.type === "member-point") {
      const t = load.position ?? 0.5;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const arrowLen = 35;
      const sign = load.magnitude >= 0 ? 1 : -1;

      return (
        <g key={load.id}>
          <line
            x1={px + nx * arrowLen * sign}
            y1={py + ny * arrowLen * sign}
            x2={px}
            y2={py}
            stroke="hsl(0 63% 50%)"
            strokeWidth="2"
            markerEnd="url(#frame-point-arrow)"
          />
          <text
            x={px + nx * (arrowLen + 10) * sign}
            y={py + ny * (arrowLen + 10) * sign}
            textAnchor="middle"
            className="fill-destructive text-xs font-semibold"
          >
            {Math.abs(load.magnitude)} kN
          </text>
        </g>
      );
    }

    return null;
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border bg-card p-4">
      {/* Sway toggle */}
      {onSwayToggle && (
        <div className="mb-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isSway}
              onChange={(e) => onSwayToggle(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
            />
            Sway Frame (lateral displacement allowed)
          </label>
          {isSway && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
              Sway
            </span>
          )}
        </div>
      )}

      <svg ref={svgRef} width={width} height={height} className="mx-auto">
        {/* Arrow marker defs */}
        <defs>
          <marker
            id="frame-force-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="0,0 10,5 0,10" fill="hsl(0 63% 50%)" />
          </marker>
          <marker
            id="frame-udl-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <polygon points="0,0 8,4 0,8" fill="hsl(249 47% 55%)" />
          </marker>
          <marker
            id="frame-point-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="0,0 10,5 0,10" fill="hsl(0 63% 50%)" />
          </marker>
          <marker
            id="frame-lateral-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="0,0 10,5 0,10" fill="hsl(39 100% 50%)" />
          </marker>
        </defs>

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

          const isSelected = selectedMemberId === member.id;
          const isHovered = hoveredMember === member.id;
          const eiMult = memberEIMultipliers?.[member.id];

          const mx = (toSVGX(nodeA.x) + toSVGX(nodeB.x)) / 2;
          const my = (toSVGY(nodeA.y) + toSVGY(nodeB.y)) / 2;

          return (
            <g key={member.id}>
              {/* Clickable hit area (wider) */}
              <line
                x1={toSVGX(nodeA.x)}
                y1={toSVGY(nodeA.y)}
                x2={toSVGX(nodeB.x)}
                y2={toSVGY(nodeB.y)}
                stroke="transparent"
                strokeWidth="16"
                className="cursor-pointer"
                onClick={() => onMemberClick?.(member.id)}
                onMouseEnter={() => setHoveredMember(member.id)}
                onMouseLeave={() => setHoveredMember(null)}
              />
              {/* Visible line */}
              <line
                x1={toSVGX(nodeA.x)}
                y1={toSVGY(nodeA.y)}
                x2={toSVGX(nodeB.x)}
                y2={toSVGY(nodeB.y)}
                stroke={
                  isSelected
                    ? "hsl(39 100% 50%)"
                    : isHovered
                      ? "hsl(212 92% 70%)"
                      : member.type === "beam"
                        ? "hsl(212 92% 55%)"
                        : "hsl(188 94% 43%)"
                }
                strokeWidth={isSelected ? 5 : isHovered ? 5 : 4}
                className="pointer-events-none"
              />

              {/* Member label (id) */}
              <text
                x={mx + (member.type === "column" ? 12 : 0)}
                y={my + (member.type === "beam" ? -10 : 0)}
                textAnchor="middle"
                className="pointer-events-none fill-muted-foreground text-[10px]"
              >
                {member.id}
              </text>

              {/* EI multiplier label */}
              {eiMult !== undefined && eiMult !== 1.0 && (
                <text
                  x={mx + (member.type === "column" ? 12 : 0)}
                  y={my + (member.type === "beam" ? -22 : 12)}
                  textAnchor="middle"
                  className="pointer-events-none fill-yellow-400 text-[10px] font-semibold"
                >
                  {eiMult}I
                </text>
              )}
            </g>
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
                  {node.support === "roller" && (
                    <>
                      <polygon
                        points={`${x},${y} ${x - 12},${y + 16} ${x + 12},${y + 16}`}
                        fill="hsl(188 94% 43%)"
                        stroke="hsl(188 94% 53%)"
                        strokeWidth="2"
                      />
                      <circle cx={x - 6} cy={y + 22} r="4" fill="hsl(188 94% 43%)" />
                      <circle cx={x + 6} cy={y + 22} r="4" fill="hsl(188 94% 43%)" />
                      <line
                        x1={x - 15}
                        y1={y + 26}
                        x2={x + 15}
                        y2={y + 26}
                        stroke="hsl(188 94% 43%)"
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
                {node.id.length > 5 ? node.id.slice(0, 5) : node.id}
              </text>
            </g>
          );
        })}

        {/* Joint loads */}
        {jointLoads.map((load) => {
          const node = nodes.find((n) => n.id === load.nodeId);
          if (!node) return null;

          const x = toSVGX(node.x);
          const y = toSVGY(node.y);

          if (load.type === "joint-force-y") {
            const isDown = load.magnitude > 0;
            return (
              <g key={load.id}>
                <line
                  x1={x}
                  y1={isDown ? y - 45 : y + 45}
                  x2={x}
                  y2={y}
                  stroke="hsl(0 63% 50%)"
                  strokeWidth="2"
                  markerEnd="url(#frame-force-arrow)"
                />
                <text
                  x={x + 10}
                  y={isDown ? y - 30 : y + 40}
                  className="fill-destructive text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN
                </text>
              </g>
            );
          }

          if (load.type === "joint-force-x") {
            const isRight = load.magnitude > 0;
            return (
              <g key={load.id}>
                <line
                  x1={isRight ? x - 45 : x + 45}
                  y1={y}
                  x2={x}
                  y2={y}
                  stroke="hsl(39 100% 50%)"
                  strokeWidth="2"
                  markerEnd="url(#frame-lateral-arrow)"
                />
                <text
                  x={isRight ? x - 50 : x + 50}
                  y={y - 8}
                  textAnchor={isRight ? "end" : "start"}
                  className="fill-yellow-400 text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN
                </text>
              </g>
            );
          }

          if (load.type === "joint-moment") {
            const isCW = load.magnitude > 0;
            return (
              <g key={load.id}>
                <circle
                  cx={x}
                  cy={y}
                  r="15"
                  fill="none"
                  stroke="hsl(39 100% 50%)"
                  strokeWidth="2"
                />
                <path
                  d={
                    isCW
                      ? `M ${x + 15} ${y} l 5 -5 l -2 8 z`
                      : `M ${x - 15} ${y} l -5 -5 l 2 8 z`
                  }
                  fill="hsl(39 100% 50%)"
                />
                <text
                  x={x}
                  y={y - 22}
                  textAnchor="middle"
                  className="fill-yellow-400 text-xs font-semibold"
                >
                  {Math.abs(load.magnitude)} kN·m
                </text>
              </g>
            );
          }

          return null;
        })}

        {/* Member loads */}
        {memberLoads.map(renderMemberLoad)}

        {/* Sway indicator */}
        {isSway && (
          <g>
            <line
              x1={toSVGX(0) - 30}
              y1={toSVGY(stories)}
              x2={toSVGX(0) - 30}
              y2={toSVGY(0)}
              stroke="hsl(39 100% 50%)"
              strokeWidth="1"
              strokeDasharray="6 3"
              opacity={0.5}
            />
            <text
              x={toSVGX(0) - 35}
              y={toSVGY(stories / 2)}
              textAnchor="middle"
              className="fill-yellow-400 text-[10px]"
              transform={`rotate(-90, ${toSVGX(0) - 35}, ${toSVGY(stories / 2)})`}
            >
              SWAY
            </text>
            {/* Double-headed arrow */}
            <line
              x1={toSVGX(0) - 20}
              y1={toSVGY(stories) - 5}
              x2={toSVGX(0) - 10}
              y2={toSVGY(stories) - 5}
              stroke="hsl(39 100% 50%)"
              strokeWidth="1.5"
              opacity={0.6}
            />
            <line
              x1={toSVGX(0) - 20}
              y1={toSVGY(stories) + 5}
              x2={toSVGX(0) - 10}
              y2={toSVGY(stories) + 5}
              stroke="hsl(39 100% 50%)"
              strokeWidth="1.5"
              opacity={0.6}
            />
          </g>
        )}

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
          <span>Vertical Load</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-yellow-500" />
          <span>Lateral Load / Moment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-purple-500" />
          <span>Member UDL</span>
        </div>
        {isSway && (
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 border-t-2 border-dashed border-yellow-500" />
            <span>Sway</span>
          </div>
        )}
      </div>
    </div>
  );
}
