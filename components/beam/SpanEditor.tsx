"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SpanConfig {
  id: string;
  length: number;
  eiMode: "direct" | "multiplier" | "separate";
  ei?: number;
  iMultiplier: number;
  // Separate E and I values
  E?: number;
  I?: number;
  EUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  IUnit?: "m4" | "mm4" | "cm4";
}

interface NodeConfig {
  id: string;
  supportType: "fixed" | "pinned" | "roller" | "free";
  settlement: number; // mm
}

interface DefaultProperties {
  defaultEI: number;
  defaultE?: number;
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  defaultI?: number;
  defaultIUnit?: "m4" | "mm4" | "cm4";
}

interface SpanEditorProps {
  spans: SpanConfig[];
  nodes: NodeConfig[];
  defaultEI: number;
  defaultE?: number;
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  defaultI?: number;
  defaultIUnit?: "m4" | "mm4" | "cm4";
  onSpansChange: (spans: SpanConfig[]) => void;
  onNodesChange: (nodes: NodeConfig[]) => void;
  onDefaultEIChange: (ei: number) => void;
  onDefaultPropertiesChange?: (props: DefaultProperties) => void;
}

// Helper to calculate EI from separate E and I
function calculateEI(
  E: number,
  EUnit: "GPa" | "MPa" | "kPa" | "kN/m²",
  I: number,
  IUnit: "m4" | "mm4" | "cm4"
): number {
  let E_kNm2 = E;
  switch (EUnit) {
    case "GPa": E_kNm2 = E * 1e6; break;
    case "MPa": E_kNm2 = E * 1e3; break;
    case "kPa": E_kNm2 = E; break;
    case "kN/m²": E_kNm2 = E; break;
  }

  let I_m4 = I;
  switch (IUnit) {
    case "m4": I_m4 = I; break;
    case "mm4": I_m4 = I * 1e-12; break;
    case "cm4": I_m4 = I * 1e-8; break;
  }

  return E_kNm2 * I_m4;
}

export function SpanEditor({
  spans,
  nodes,
  defaultEI,
  defaultE = 200,
  defaultEUnit = "GPa",
  defaultI = 1e-4,
  defaultIUnit = "m4",
  onSpansChange,
  onNodesChange,
  onDefaultEIChange,
  onDefaultPropertiesChange,
}: SpanEditorProps) {
  const [expandedSpan, setExpandedSpan] = useState<string | null>(null);
  const [eiInputMode, setEiInputMode] = useState<"combined" | "separate">("combined");

  const addSpan = () => {
    const newSpanId = `span-${spans.length + 1}`;
    const newNodeId = `node-${nodes.length}`;

    onSpansChange([
      ...spans,
      {
        id: newSpanId,
        length: 6,
        eiMode: "multiplier",
        iMultiplier: 1.0,
      },
    ]);

    // Add a new end node
    onNodesChange([
      ...nodes,
      {
        id: newNodeId,
        supportType: "pinned",
        settlement: 0,
      },
    ]);
  };

  const removeSpan = (index: number) => {
    if (spans.length <= 1) return; // Keep at least 1 span

    const newSpans = spans.filter((_, i) => i !== index);
    onSpansChange(newSpans);

    // Remove the corresponding end node (keep start node of first span)
    // Node at index+1 corresponds to the end of this span
    if (index < nodes.length - 1) {
      const newNodes = nodes.filter((_, i) => i !== index + 1);
      onNodesChange(newNodes);
    }
  };

  const updateSpan = (index: number, updates: Partial<SpanConfig>) => {
    const newSpans = [...spans];
    newSpans[index] = { ...newSpans[index], ...updates };
    onSpansChange(newSpans);
  };

  const updateNode = (index: number, updates: Partial<NodeConfig>) => {
    const newNodes = [...nodes];
    newNodes[index] = { ...newNodes[index], ...updates };
    onNodesChange(newNodes);
  };

  const totalLength = spans.reduce((sum, s) => sum + s.length, 0);

  const calculatedDefaultEI = eiInputMode === "separate"
    ? calculateEI(defaultE, defaultEUnit, defaultI, defaultIUnit)
    : defaultEI;

  return (
    <div className="space-y-4">
      {/* Default Material Properties */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Material Properties</Label>
          <Select
            value={eiInputMode}
            onValueChange={(v) => setEiInputMode(v as "combined" | "separate")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combined">Combined EI</SelectItem>
              <SelectItem value="separate">Separate E & I</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {eiInputMode === "combined" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default EI (kN·m²)</Label>
              <Input
                type="number"
                step="1000"
                min="1"
                value={defaultEI}
                onChange={(e) => onDefaultEIChange(parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Base EI value. Spans use multipliers (e.g., 2I = 2 × {defaultEI} = {2 * defaultEI})
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p><strong>{spans.length}</strong> span(s)</p>
                <p><strong>{nodes.length}</strong> node(s)</p>
                <p>Total length: <strong>{totalLength.toFixed(1)} m</strong></p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Modulus of Elasticity (E)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="1"
                  min="0.001"
                  value={defaultE}
                  onChange={(e) => {
                    const newE = parseFloat(e.target.value) || 200;
                    onDefaultPropertiesChange?.({
                      defaultEI: calculateEI(newE, defaultEUnit, defaultI, defaultIUnit),
                      defaultE: newE,
                      defaultEUnit,
                      defaultI,
                      defaultIUnit,
                    });
                  }}
                />
                <Select
                  value={defaultEUnit}
                  onValueChange={(v) => {
                    const newUnit = v as "GPa" | "MPa" | "kPa" | "kN/m²";
                    onDefaultPropertiesChange?.({
                      defaultEI: calculateEI(defaultE, newUnit, defaultI, defaultIUnit),
                      defaultE,
                      defaultEUnit: newUnit,
                      defaultI,
                      defaultIUnit,
                    });
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GPa">GPa</SelectItem>
                    <SelectItem value="MPa">MPa</SelectItem>
                    <SelectItem value="kPa">kPa</SelectItem>
                    <SelectItem value="kN/m²">kN/m²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Steel: 200 GPa, Concrete: 25-35 GPa
              </p>
            </div>
            <div className="space-y-2">
              <Label>Moment of Inertia (I)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={defaultI}
                  onChange={(e) => {
                    const newI = parseFloat(e.target.value) || 1e-4;
                    onDefaultPropertiesChange?.({
                      defaultEI: calculateEI(defaultE, defaultEUnit, newI, defaultIUnit),
                      defaultE,
                      defaultEUnit,
                      defaultI: newI,
                      defaultIUnit,
                    });
                  }}
                />
                <Select
                  value={defaultIUnit}
                  onValueChange={(v) => {
                    const newUnit = v as "m4" | "mm4" | "cm4";
                    onDefaultPropertiesChange?.({
                      defaultEI: calculateEI(defaultE, defaultEUnit, defaultI, newUnit),
                      defaultE,
                      defaultEUnit,
                      defaultI,
                      defaultIUnit: newUnit,
                    });
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m4">m⁴</SelectItem>
                    <SelectItem value="mm4">mm⁴</SelectItem>
                    <SelectItem value="cm4">cm⁴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Can be any value based on section
              </p>
            </div>
            <div className="space-y-2">
              <Label>Calculated EI</Label>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-mono"><strong>{calculatedDefaultEI.toExponential(3)}</strong> kN·m²</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {spans.length} span(s), {totalLength.toFixed(1)} m total
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Node/Span layout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Spans & Supports</Label>
          <Button onClick={addSpan} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Span
          </Button>
        </div>

        {/* Start node */}
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-primary">Node 0</span>
            <Select
              value={nodes[0]?.supportType || "fixed"}
              onValueChange={(v) => updateNode(0, { supportType: v as any })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
                <SelectItem value="roller">Roller</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Settlement (mm)</Label>
              <Input
                type="number"
                step="0.1"
                className="w-20"
                value={nodes[0]?.settlement || 0}
                onChange={(e) => updateNode(0, { settlement: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        {/* Span + End Node pairs */}
        {spans.map((span, i) => (
          <div key={span.id} className="space-y-0">
            {/* Span card */}
            <div className="ml-4 rounded-md border border-primary/30 bg-card p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpandedSpan(expandedSpan === span.id ? null : span.id)}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  {expandedSpan === span.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Span {i + 1}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Length (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="w-20"
                      value={span.length}
                      onChange={(e) => updateSpan(i, { length: parseFloat(e.target.value) || 0.1 })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">I mult</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="w-16"
                      value={span.iMultiplier}
                      onChange={(e) => updateSpan(i, { iMultiplier: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  {spans.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpan(i)}
                      title="Remove span"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedSpan === span.id && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">EI Mode</Label>
                      <Select
                        value={span.eiMode}
                        onValueChange={(v) => updateSpan(i, { eiMode: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiplier">Multiplier ({span.iMultiplier}I)</SelectItem>
                          <SelectItem value="direct">Direct EI value</SelectItem>
                          <SelectItem value="separate">Separate E & I</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {span.eiMode === "direct" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Direct EI (kN·m²)</Label>
                        <Input
                          type="number"
                          step="1000"
                          min="1"
                          value={span.ei || defaultEI}
                          onChange={(e) => updateSpan(i, { ei: parseFloat(e.target.value) || defaultEI })}
                        />
                      </div>
                    )}
                    {span.eiMode === "multiplier" && (
                      <div className="text-sm text-muted-foreground">
                        EI = {span.iMultiplier} × {calculatedDefaultEI.toExponential(2)} = <strong>{(span.iMultiplier * calculatedDefaultEI).toExponential(3)}</strong> kN·m²
                      </div>
                    )}
                  </div>
                  {span.eiMode === "separate" && (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs">E (Modulus)</Label>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            step="1"
                            min="0.001"
                            value={span.E ?? defaultE}
                            onChange={(e) => updateSpan(i, { E: parseFloat(e.target.value) || defaultE })}
                          />
                          <Select
                            value={span.EUnit ?? defaultEUnit}
                            onValueChange={(v) => updateSpan(i, { EUnit: v as any })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GPa">GPa</SelectItem>
                              <SelectItem value="MPa">MPa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">I (Inertia)</Label>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={span.I ?? defaultI}
                            onChange={(e) => updateSpan(i, { I: parseFloat(e.target.value) || defaultI })}
                          />
                          <Select
                            value={span.IUnit ?? defaultIUnit}
                            onValueChange={(v) => updateSpan(i, { IUnit: v as any })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="m4">m⁴</SelectItem>
                              <SelectItem value="mm4">mm⁴</SelectItem>
                              <SelectItem value="cm4">cm⁴</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-muted-foreground">
                          EI = <strong>
                            {calculateEI(
                              span.E ?? defaultE,
                              span.EUnit ?? defaultEUnit,
                              span.I ?? defaultI,
                              span.IUnit ?? defaultIUnit
                            ).toExponential(3)}
                          </strong> kN·m²
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* End node */}
            {i + 1 < nodes.length && (
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-primary">Node {i + 1}</span>
                  <Select
                    value={nodes[i + 1]?.supportType || "pinned"}
                    onValueChange={(v) => updateNode(i + 1, { supportType: v as any })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="pinned">Pinned</SelectItem>
                      <SelectItem value="roller">Roller</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Settlement (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="w-20"
                      value={nodes[i + 1]?.settlement || 0}
                      onChange={(e) => updateNode(i + 1, { settlement: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
