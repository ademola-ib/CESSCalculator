"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  AlertTriangle,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExtractionReviewScreenProps {
  data: any;
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

export function ExtractionReviewScreen({
  data,
  onConfirm,
  onCancel,
}: ExtractionReviewScreenProps) {
  const [editedData, setEditedData] = useState(data);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    spans: true,
    supports: true,
    loads: true,
  });

  const confidence = data.confidence ?? 0;
  const unknowns = data.unknowns ?? [];
  const isPartial = data._partial === true;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateSpan = (index: number, field: string, value: number) => {
    setEditedData((prev: any) => {
      const newSpans = [...(prev.spans || [])];
      newSpans[index] = { ...newSpans[index], [field]: value };
      return { ...prev, spans: newSpans };
    });
  };

  const updateSupport = (index: number, field: string, value: any) => {
    setEditedData((prev: any) => {
      const newSupports = [...(prev.supports || [])];
      newSupports[index] = { ...newSupports[index], [field]: value };
      return { ...prev, supports: newSupports };
    });
  };

  const updateLoad = (index: number, field: string, value: any) => {
    setEditedData((prev: any) => {
      const newLoads = [...(prev.loads || [])];
      newLoads[index] = { ...newLoads[index], [field]: value };
      return { ...prev, loads: newLoads };
    });
  };

  const removeLoad = (index: number) => {
    setEditedData((prev: any) => ({
      ...prev,
      loads: prev.loads.filter((_: any, i: number) => i !== index),
    }));
  };

  const removeSupport = (index: number) => {
    setEditedData((prev: any) => ({
      ...prev,
      supports: prev.supports.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Review Extracted Data
                </CardTitle>
                <CardDescription>
                  Verify and edit the extracted values before applying
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Confidence indicator */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-sm">
                  <span>Extraction Confidence</span>
                  <span>{(confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      confidence >= 0.8
                        ? "bg-green-500"
                        : confidence >= 0.5
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Warnings */}
            {(isPartial || unknowns.length > 0) && (
              <div className="mt-3 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-500">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    {isPartial && (
                      <p>
                        Partial extraction - some values may need correction.
                      </p>
                    )}
                    {unknowns.length > 0 && (
                      <p>
                        Unclear values: {unknowns.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Problem type */}
            <div className="mt-3 rounded-md border p-3">
              <span className="text-sm font-medium">Problem Type: </span>
              <span className="text-sm capitalize">
                {editedData.problemType ?? "Unknown"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Spans section (for beams) */}
        {editedData.spans && (
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("spans")}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <span>Spans ({editedData.spans.length})</span>
                {expandedSections.spans ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.spans && (
              <CardContent className="space-y-3">
                {editedData.spans.map((span: any, i: number) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-3 rounded-md border p-3"
                  >
                    <div>
                      <Label className="text-xs">
                        Span {i + 1} Length (m)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={span.length}
                        onChange={(e) =>
                          updateSpan(i, "length", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">I Multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={span.iMultiplier ?? 1}
                        onChange={(e) =>
                          updateSpan(
                            i,
                            "iMultiplier",
                            parseFloat(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Supports section */}
        {editedData.supports && (
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("supports")}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <span>Supports ({editedData.supports.length})</span>
                {expandedSections.supports ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.supports && (
              <CardContent className="space-y-3">
                {editedData.supports.map((support: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-end gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1">
                      <Label className="text-xs">Position (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={support.position ?? support.bayIndex ?? 0}
                        onChange={(e) =>
                          updateSupport(
                            i,
                            "position",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Type</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={support.type}
                        onChange={(e) => updateSupport(i, "type", e.target.value)}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="pinned">Pinned</option>
                        <option value="roller">Roller</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Settlement (m)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={support.settlement ?? 0}
                        onChange={(e) =>
                          updateSupport(
                            i,
                            "settlement",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupport(i)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Loads section */}
        {editedData.loads && (
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("loads")}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <span>Loads ({editedData.loads.length})</span>
                {expandedSections.loads ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.loads && (
              <CardContent className="space-y-3">
                {editedData.loads.map((load: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-md border p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {load.type === "point"
                          ? "Point Load"
                          : load.type === "udl"
                            ? "UDL"
                            : load.type === "vdl"
                              ? "VDL"
                              : load.type === "moment"
                                ? "Moment"
                                : load.type}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLoad(i)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {load.magnitude !== undefined && (
                        <div>
                          <Label className="text-xs">
                            Magnitude
                            {load.type === "point"
                              ? " (kN)"
                              : load.type === "udl"
                                ? " (kN/m)"
                                : load.type === "moment"
                                  ? " (kN·m)"
                                  : ""}
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.magnitude}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "magnitude",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                      {load.w1 !== undefined && (
                        <div>
                          <Label className="text-xs">w1 (kN/m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.w1}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "w1",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                      {load.w2 !== undefined && (
                        <div>
                          <Label className="text-xs">w2 (kN/m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.w2}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "w2",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                      {load.position !== undefined && (
                        <div>
                          <Label className="text-xs">Position (m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.position}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "position",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                      {load.start !== undefined && (
                        <div>
                          <Label className="text-xs">Start (m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.start}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "start",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                      {load.end !== undefined && (
                        <div>
                          <Label className="text-xs">End (m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={load.end}
                            onChange={(e) =>
                              updateLoad(
                                i,
                                "end",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Frame-specific sections */}
        {editedData.problemType === "frame" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Frame Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Bays</Label>
                  <Input
                    type="number"
                    value={editedData.bays ?? 1}
                    onChange={(e) =>
                      setEditedData((prev: any) => ({
                        ...prev,
                        bays: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Stories</Label>
                  <Input
                    type="number"
                    value={editedData.stories ?? 1}
                    onChange={(e) =>
                      setEditedData((prev: any) => ({
                        ...prev,
                        stories: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSway"
                  checked={editedData.isSway ?? false}
                  onChange={(e) =>
                    setEditedData((prev: any) => ({
                      ...prev,
                      isSway: e.target.checked,
                    }))
                  }
                  className="rounded border"
                />
                <Label htmlFor="isSway" className="text-sm">
                  Sway frame (lateral displacement allowed)
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(editedData)} className="flex-1">
            <Check className="mr-2 h-4 w-4" />
            Apply to Visualizer
          </Button>
        </div>
      </div>
    </div>
  );
}
