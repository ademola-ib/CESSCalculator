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

interface LoadListProps {
  loads: BeamLoad[];
  beamLength: number;
  onAdd: (
    type: BeamLoad["type"],
    magnitude: number,
    positionOrStart: number,
    end?: number
  ) => void;
  onUpdate: (id: string, updates: Partial<BeamLoad>) => void;
  onDelete: (id: string) => void;
}

export function LoadList({
  loads,
  beamLength,
  onAdd,
  onUpdate,
  onDelete,
}: LoadListProps) {
  const [addType, setAddType] = useState<BeamLoad["type"]>("point");

  const handleAddLoad = () => {
    const midpoint = beamLength / 2;
    if (addType === "udl") {
      onAdd(addType, 10, midpoint - 1, midpoint + 1);
    } else {
      onAdd(addType, 50, midpoint);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Loads ({loads.length})</Label>
        <div className="flex gap-2">
          <Select value={addType} onValueChange={(v) => setAddType(v as BeamLoad["type"])}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="point">Point</SelectItem>
              <SelectItem value="udl">UDL</SelectItem>
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
          No loads added. Select load type and click "+ Add Load".
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load, index) => (
            <div
              key={load.id}
              className="grid items-center gap-3 rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  #{index + 1} - {load.type.toUpperCase()}
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
                <div className="space-y-1">
                  <Label htmlFor={`load-mag-${load.id}`} className="text-xs">
                    Magnitude ({load.type === "moment" ? "kN·m" : load.type === "udl" ? "kN/m" : "kN"})
                  </Label>
                  <Input
                    id={`load-mag-${load.id}`}
                    type="number"
                    step="0.1"
                    value={load.magnitude}
                    onChange={(e) =>
                      onUpdate(load.id, {
                        magnitude: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                {load.type === "udl" ? (
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
                          onUpdate(load.id, {
                            start: parseFloat(e.target.value),
                          })
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
                          onUpdate(load.id, {
                            end: parseFloat(e.target.value),
                          })
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
                        onUpdate(load.id, {
                          position: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
