"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CalculationsTab } from "@/components/calculations/CalculationsTab";
import { FrameAnalysisSolver } from "@/lib/solver/frame/index";
import { convertLegacyFrameData, FrameSolverResult } from "@/lib/types/frame";
import { toast } from "sonner";

interface FrameResultsTabProps {
  projectId: string;
}

export function FrameResultsTab({ projectId }: FrameResultsTabProps) {
  const project = useProjectStore((state) => state.projects.find((p) => p.id === projectId));

  // Run frame solver
  const results: FrameSolverResult | null = useMemo(() => {
    if (!project?.data?.bayWidth || !project?.data?.storyHeight) {
      return null;
    }

    try {
      const frameData = convertLegacyFrameData(project.data as any);
      const solver = new FrameAnalysisSolver();
      return solver.solve(frameData);
    } catch (error) {
      console.error("Frame solver error:", error);
      return null;
    }
  }, [project?.data]);

  const handleExportPDF = () => {
    toast.info("PDF export feature coming soon");
  };

  if (!project?.data?.bayWidth || !project?.data?.storyHeight) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <p className="text-muted-foreground">
            Please complete the input form to view results
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <p className="text-muted-foreground">
            Error running frame analysis. Please check your input and ensure loads are defined.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forces">Member Forces</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
        </TabsList>
        <Button onClick={handleExportPDF} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Frame Analysis Summary</CardTitle>
            <CardDescription>Member forces, moments, and displacements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Bending Moment</p>
                <p className="text-xl font-bold text-primary">
                  {Math.abs(results.maxMoment.value).toFixed(2)} kN·m
                </p>
                <p className="text-xs text-muted-foreground">
                  Member {results.maxMoment.memberId}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Shear Force</p>
                <p className="text-xl font-bold text-destructive">
                  {Math.abs(results.maxShear.value).toFixed(2)} kN
                </p>
                <p className="text-xs text-muted-foreground">
                  Member {results.maxShear.memberId}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Axial Force</p>
                <p className="text-xl font-bold text-accent">
                  {Math.abs(results.maxAxial.value).toFixed(2)} kN
                </p>
                <p className="text-xs text-muted-foreground">
                  Member {results.maxAxial.memberId}
                </p>
              </div>
              {results.swayDisplacement !== undefined && (
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Sway Displacement</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {(results.swayDisplacement * 1000).toFixed(2)} mm
                  </p>
                </div>
              )}
            </div>

            {/* Joint Displacements */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">Joint Displacements</h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">Joint</th>
                      <th className="p-3 text-right">{"\u0394"}x (mm)</th>
                      <th className="p-3 text-right">{"\u0394"}y (mm)</th>
                      <th className="p-3 text-right">{"\u03B8"} (rad)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.nodeDisplacements.map((disp) => (
                      <tr key={disp.nodeId} className="border-b last:border-0">
                        <td className="p-3 font-medium">{disp.nodeId}</td>
                        <td className="p-3 text-right">{(disp.dx * 1000).toFixed(3)}</td>
                        <td className="p-3 text-right">{(disp.dy * 1000).toFixed(3)}</td>
                        <td className="p-3 text-right">{disp.rotation.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Support Reactions */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">Support Reactions</h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">Support</th>
                      <th className="p-3 text-right">Fx (kN)</th>
                      <th className="p-3 text-right">Fy (kN)</th>
                      <th className="p-3 text-right">M (kN·m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.reactions.map((reaction) => (
                      <tr key={reaction.nodeId} className="border-b last:border-0">
                        <td className="p-3 font-medium">{reaction.nodeId}</td>
                        <td className="p-3 text-right">{reaction.fx.toFixed(2)}</td>
                        <td className="p-3 text-right">{reaction.fy.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          {reaction.moment !== undefined ? reaction.moment.toFixed(2) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="forces" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Member End Forces</CardTitle>
            <CardDescription>Axial force, shear force, and bending moment at member ends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-right">Axial (i)</th>
                    <th className="p-3 text-right">Shear (i)</th>
                    <th className="p-3 text-right">Moment (i)</th>
                    <th className="p-3 text-right">Axial (j)</th>
                    <th className="p-3 text-right">Shear (j)</th>
                    <th className="p-3 text-right">Moment (j)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.memberForces.map((mf) => (
                    <tr key={mf.memberId} className="border-b last:border-0">
                      <td className="p-3 font-medium">{mf.memberId}</td>
                      <td className="p-3 text-right">{mf.axialStart.toFixed(2)}</td>
                      <td className="p-3 text-right">{mf.shearStart.toFixed(2)}</td>
                      <td className="p-3 text-right">{mf.momentStart.toFixed(2)}</td>
                      <td className="p-3 text-right">{mf.axialEnd.toFixed(2)}</td>
                      <td className="p-3 text-right">{mf.shearEnd.toFixed(2)}</td>
                      <td className="p-3 text-right">{mf.momentEnd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calculations">
        <CalculationsTab log={results.calculationLog} />
      </TabsContent>
    </Tabs>
  );
}
