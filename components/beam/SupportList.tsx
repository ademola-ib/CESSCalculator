"use client";

import { BeamSupport } from "@/lib/types/beamEditor";
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

interface SupportListProps {
  supports: BeamSupport[];
  beamLength: number;
  onAdd: (type: BeamSupport["type"], position: number) => void;
  onUpdate: (id: string, updates: Partial<BeamSupport>) => void;
  onDelete: (id: string) => void;
}

export function SupportList({
  supports,
  beamLength,
  onAdd,
  onUpdate,
  onDelete,
}: SupportListProps) {
  const handleAddSupport = () => {
    // Add at midpoint by default
    onAdd("pinned", beamLength / 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Supports ({supports.length})</Label>
        <Button onClick={handleAddSupport} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Support
        </Button>
      </div>

      {supports.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No supports added. Click "+ Add Support" or click on the beam to add supports.
        </div>
      ) : (
        <div className="space-y-3">
          {supports.map((support, index) => (
            <div
              key={support.id}
              className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 rounded-md border p-3"
            >
              <span className="text-sm font-medium text-muted-foreground">
                #{index + 1}
              </span>

              <div className="space-y-1">
                <Label htmlFor={`support-type-${support.id}`} className="text-xs">
                  Type
                </Label>
                <Select
                  value={support.type}
                  onValueChange={(value) =>
                    onUpdate(support.id, {
                      type: value as BeamSupport["type"],
                    })
                  }
                >
                  <SelectTrigger id={`support-type-${support.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="pinned">Pinned</SelectItem>
                    <SelectItem value="roller">Roller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`support-pos-${support.id}`} className="text-xs">
                  Position (m)
                </Label>
                <Input
                  id={`support-pos-${support.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max={beamLength}
                  value={support.position}
                  onChange={(e) =>
                    onUpdate(support.id, {
                      position: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(support.id)}
                title="Delete support"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
