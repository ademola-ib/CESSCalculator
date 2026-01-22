"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/projectStore";
import { useBeamEditor } from "@/lib/hooks/useBeamEditor";
import { BeamVisualizer } from "./BeamVisualizer";
import { SupportList } from "./SupportList";
import { LoadList } from "./LoadList";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface BeamInputTabProps {
  projectId: string;
}

export function BeamInputTab({ projectId }: BeamInputTabProps) {
  const project = useProjectStore((state) => state.projects.find((p) => p.id === projectId));
  const updateProject = useProjectStore((state) => state.updateProject);

  const editor = useBeamEditor({
    length: project?.data?.length || 10,
    ei: project?.data?.ei || 50000,
    supports: project?.data?.supports || [],
    loads: project?.data?.loads || [],
  });

  // Auto-save to store whenever state changes (with debounce in production)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateProject(projectId, {
        data: {
          ...editor.state,
        },
        updatedAt: Date.now(),
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [editor.state, projectId, updateProject]);

  const handleSave = () => {
    const isValid = editor.validate();
    if (!isValid) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    updateProject(projectId, {
      data: editor.state,
      updatedAt: Date.now(),
    });
    toast.success("Project saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Geometry Section */}
      <Card>
        <CardHeader>
          <CardTitle>Beam Geometry</CardTitle>
          <CardDescription>Define the basic beam properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="length">Total Length (m)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                min="0.1"
                value={editor.state.length}
                onChange={(e) => editor.setLength(parseFloat(e.target.value) || 0.1)}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ei">EI (kN·m²)</Label>
              <Input
                id="ei"
                type="number"
                step="1000"
                min="1"
                value={editor.state.ei}
                onChange={(e) => editor.setEI(parseFloat(e.target.value) || 1)}
                placeholder="e.g., 50000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Beam Editor</CardTitle>
          <CardDescription>
            Drag supports and loads on the beam or use the lists below for precise editing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visualizer */}
          <BeamVisualizer
            length={editor.state.length}
            supports={editor.state.supports}
            loads={editor.state.loads}
            onSupportDrag={(id, position) => {
              editor.updateSupport(id, { position: editor.snapPosition(position) });
            }}
            onLoadDrag={(id, position) => {
              editor.updateLoad(id, { position: editor.snapPosition(position) });
            }}
            onUDLDrag={(id, start, end) => {
              editor.updateLoad(id, {
                start: editor.snapPosition(start),
                end: editor.snapPosition(end),
              });
            }}
            snapIncrement={0.05}
          />

          {/* Tabs for Supports and Loads */}
          <Tabs defaultValue="supports" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="supports">
                Supports ({editor.state.supports.length})
              </TabsTrigger>
              <TabsTrigger value="loads">
                Loads ({editor.state.loads.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="supports" className="space-y-4">
              <SupportList
                supports={editor.state.supports}
                beamLength={editor.state.length}
                onAdd={(type, position) => editor.addSupport(type, position)}
                onUpdate={(id, updates) => editor.updateSupport(id, updates)}
                onDelete={(id) => editor.deleteSupport(id)}
              />
            </TabsContent>

            <TabsContent value="loads" className="space-y-4">
              <LoadList
                loads={editor.state.loads}
                beamLength={editor.state.length}
                onAdd={(type, mag, pos, end) => editor.addLoad(type, mag, pos, end)}
                onUpdate={(id, updates) => editor.updateLoad(id, updates)}
                onDelete={(id) => editor.deleteLoad(id)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {editor.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
              {editor.errors.map((error) => (
                <li key={error.id}>{error.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full" size="lg">
        Save Project
      </Button>
    </div>
  );
}
