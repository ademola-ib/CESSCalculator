"use client";

import { useState } from "react";
import { BeamLoad } from "@/lib/types/beamEditor";
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
import { Trash2, Plus } from "lucide-react";

/** Extended load type supporting VDL */
type ExtendedLoadType = BeamLoad["type"] | "vdl";

interface ExtendedBeamLoad extends BeamLoad {
  w1?: number;
  w2?: number;
}

interface LoadListProps {
  loads: (BeamLoad | ExtendedBeamLoad)[];
  beamLength: number;
  onAdd: (
    type: BeamLoad["type"],
    magnitude: number,
    positionOrStart: number,
    end?: number
  ) => void;
  onUpdate: (id: string, updates: Partial<ExtendedBeamLoad>) => void;
  onDelete: (id: string) => void;
}

export function LoadList({
  loads,
  beamLength,
  onAdd,
  onUpdate,
  onDelete,
}: LoadListProps) {
  const [addType, setAddType] = useState<ExtendedLoadType>("point");

  const handleAddLoad = () => {
    const midpoint = beamLength / 2;
    if (addType === "udl") {
      onAdd("udl", 10, midpoint - 1, midpoint + 1);
    } else if (addType === "vdl") {
      // Add as UDL-like, then user configures w1/w2 via the editor
      onAdd("udl", 10, midpoint - 1, midpoint + 1);
    } else {
      onAdd(addType as BeamLoad["type"], 50, midpoint);
    }
  };

  const getUnitLabel = (type: string) => {
    switch (type) {
      case "moment": return "kN\u00B7m";
      case "udl": return "kN/m";
      default: return "kN";
    }
  };

  const getTypeLabel = (load: BeamLoad | ExtendedBeamLoad) => {
    const extended = load as ExtendedBeamLoad;
    if (extended.w1 !== undefined && extended.w2 !== undefined) return "VDL";
    return load.type.toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Loads ({loads.length})</Label>
        <div className="flex gap-2">
          <Select value={addType} onValueChange={(v) => setAddType(v as ExtendedLoadType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="point">Point</SelectItem>
              <SelectItem value="udl">UDL</SelectItem>
              <SelectItem value="vdl">VDL</SelectItem>
              <SelectItem value="moment">Moment</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddLoad} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Load
          </Button>
        </div>
      </div>

      {loads.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No loads added. Select load type and click &quot;+ Add Load&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load, index) => {
            const extended = load as ExtendedBeamLoad;
            const isVDL = extended.w1 !== undefined && extended.w2 !== undefined;

            return (
              <div
                key={load.id}
                className="grid items-center gap-3 rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    #{index + 1} - {getTypeLabel(load)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(load.id)}
                    title="Delete load"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Magnitude (or w1/w2 for VDL) */}
                  {isVDL ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">w1 (kN/m) - Start</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={extended.w1 ?? 0}
                          onChange={(e) =>
                            onUpdate(load.id, { w1: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">w2 (kN/m) - End</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={extended.w2 ?? 0}
                          onChange={(e) =>
                            onUpdate(load.id, { w2: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor={`load-mag-${load.id}`} className="text-xs">
                        Magnitude ({getUnitLabel(load.type)})
                      </Label>
                      <Input
                        id={`load-mag-${load.id}`}
                        type="number"
                        step="0.1"
                        value={load.magnitude}
                        onChange={(e) =>
                          onUpdate(load.id, { magnitude: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                  )}

                  {/* Position fields */}
                  {load.type === "udl" || isVDL ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor={`load-start-${load.id}`} className="text-xs">
                          Start (m)
                        </Label>
                        <Input
                          id={`load-start-${load.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max={beamLength}
                          value={load.start || 0}
                          onChange={(e) =>
                            onUpdate(load.id, { start: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`load-end-${load.id}`} className="text-xs">
                          End (m)
                        </Label>
                        <Input
                          id={`load-end-${load.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max={beamLength}
                          value={load.end || 0}
                          onChange={(e) =>
                            onUpdate(load.id, { end: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor={`load-pos-${load.id}`} className="text-xs">
                        Position (m)
                      </Label>
                      <Input
                        id={`load-pos-${load.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={beamLength}
                        value={load.position || 0}
                        onChange={(e) =>
                          onUpdate(load.id, { position: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Direction toggle for non-VDL loads */}
                {!isVDL && load.type !== "moment" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Direction:</Label>
                    <Button
                      variant={load.direction !== "up" ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onUpdate(load.id, { direction: "down" })}
                    >
                      Down
                    </Button>
                    <Button
                      variant={load.direction === "up" ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onUpdate(load.id, { direction: "up" })}
                    >
                      Up
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
