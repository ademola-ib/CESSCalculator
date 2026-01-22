"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store/projectStore";
import { useFrameEditor } from "@/lib/hooks/useFrameEditor";
import { FrameVisualizer } from "./FrameVisualizer";
import { toast } from "sonner";

interface FrameInputTabProps {
  projectId: string;
}

export function FrameInputTab({ projectId }: FrameInputTabProps) {
  const project = useProjectStore((state) => state.projects.find((p) => p.id === projectId));
  const updateProject = useProjectStore((state) => state.updateProject);

  const editor = useFrameEditor({
    bays: project?.data?.bays || 2,
    stories: project?.data?.stories || 2,
    bayWidth: project?.data?.bayWidth || 6,
    storyHeight: project?.data?.storyHeight || 4,
    columnEI: project?.data?.columnEI || 80000,
    beamEI: project?.data?.beamEI || 60000,
    nodes: project?.data?.nodes || [],
    members: project?.data?.members || [],
    loads: project?.data?.loads || [],
  });

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      updateProject(projectId, {
        data: editor.state,
        updatedAt: Date.now(),
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [editor.state, projectId, updateProject]);

  const handleSave = () => {
    updateProject(projectId, {
      data: editor.state,
      updatedAt: Date.now(),
    });
    toast.success("Project saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Geometry */}
      <Card>
        <CardHeader>
          <CardTitle>Frame Geometry</CardTitle>
          <CardDescription>Define the frame dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bays">Number of Bays</Label>
              <Input
                id="bays"
                type="number"
                min="1"
                max="5"
                value={editor.state.bays}
                onChange={(e) =>
                  editor.setGeometry(
                    parseInt(e.target.value) || 1,
                    editor.state.stories,
                    editor.state.bayWidth,
                    editor.state.storyHeight
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stories">Number of Stories</Label>
              <Input
                id="stories"
                type="number"
                min="1"
                max="5"
                value={editor.state.stories}
                onChange={(e) =>
                  editor.setGeometry(
                    editor.state.bays,
                    parseInt(e.target.value) || 1,
                    editor.state.bayWidth,
                    editor.state.storyHeight
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bayWidth">Bay Width (m)</Label>
              <Input
                id="bayWidth"
                type="number"
                step="0.5"
                value={editor.state.bayWidth}
                onChange={(e) =>
                  editor.setGeometry(
                    editor.state.bays,
                    editor.state.stories,
                    parseFloat(e.target.value) || 1,
                    editor.state.storyHeight
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storyHeight">Story Height (m)</Label>
              <Input
                id="storyHeight"
                type="number"
                step="0.5"
                value={editor.state.storyHeight}
                onChange={(e) =>
                  editor.setGeometry(
                    editor.state.bays,
                    editor.state.stories,
                    editor.state.bayWidth,
                    parseFloat(e.target.value) || 1
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Member Properties</CardTitle>
          <CardDescription>Stiffness values for structural members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="columnEI">Column EI (kN·m²)</Label>
              <Input
                id="columnEI"
                type="number"
                step="1000"
                value={editor.state.columnEI}
                onChange={(e) => editor.setColumnEI(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beamEI">Beam EI (kN·m²)</Label>
              <Input
                id="beamEI"
                type="number"
                step="1000"
                value={editor.state.beamEI}
                onChange={(e) => editor.setBeamEI(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frame Visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Frame Preview</CardTitle>
          <CardDescription>Visual representation of the frame structure</CardDescription>
        </CardHeader>
        <CardContent>
          <FrameVisualizer
            bays={editor.state.bays}
            stories={editor.state.stories}
            bayWidth={editor.state.bayWidth}
            storyHeight={editor.state.storyHeight}
            nodes={editor.state.nodes}
            members={editor.state.members}
            loads={editor.state.loads}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg">
        Save Project
      </Button>
    </div>
  );
}
