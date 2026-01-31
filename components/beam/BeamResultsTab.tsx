"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BeamDiagram } from "@/components/charts/BeamDiagram";
import { CalculationsTab } from "@/components/calculations/CalculationsTab";
import { BeamSolver } from "@/lib/solver/BeamSolver";
import { toast } from "sonner";

interface BeamResultsTabProps {
  projectId: string;
}

export function BeamResultsTab({ projectId }: BeamResultsTabProps) {
  const project = useProjectStore((state) => state.projects.find((p) => p.id === projectId));

  // Run solver to get results
  const results = useMemo(() => {
    if (!project?.data?.length || !project?.data?.ei) {
      return null;
    }

    const solver = new BeamSolver();

    // Convert editor state to solver input
    const input = {
      length: project.data.length,
      ei: project.data.ei,
      spans: 1,
      supports: project.data.supports || [],
      loads: project.data.loads || [],
    };

    try {
      return solver.solve(input);
    } catch (error) {
      console.error("Solver error:", error);
      return null;
    }
  }, [project?.data]);

  // Extract support positions for reference lines on diagrams
  const supportPositions = useMemo(() => {
    if (!project?.data?.supports) return [];
    return project.data.supports
      .filter((s: any) => typeof s === "object" && "position" in s)
      .map((s: any) => s.position as number);
  }, [project?.data?.supports]);

  const handleExportPDF = () => {
    toast.info("PDF export feature coming soon");
  };

  if (!project?.data?.length || !project?.data?.ei) {
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
            Error running analysis. Please check your input.
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
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
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
            <CardTitle>Analysis Summary</CardTitle>
            <CardDescription>Key results and support reactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold">Support Reactions</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.reactions.map((reaction, index) => (
                  <div key={index} className="rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">
                      Support {index + 1}
                    </p>
                    <p className="text-2xl font-bold">
                      {reaction.toFixed(2)} kN
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Shear Force</p>
                <p className="text-xl font-bold text-destructive">
                  {results.maxShear.toFixed(2)} kN
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Bending Moment</p>
                <p className="text-xl font-bold text-primary">
                  {results.maxMoment.toFixed(2)} kN·m
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Max Deflection</p>
                <p className="text-xl font-bold text-accent">
                  {results.maxDeflection.toFixed(2)} mm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="graphs" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Diagrams</CardTitle>
            <CardDescription>
              Shear force, bending moment, and deflection diagrams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BeamDiagram
              data={project.data}
              shearForce={results.shearForce}
              bendingMoment={results.bendingMoment}
              deflection={results.deflection}
              supportPositions={supportPositions}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calculations">
        {results.calculationLog ? (
          <CalculationsTab log={results.calculationLog} />
        ) : (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <p className="text-muted-foreground">
                Calculation log not available for this input.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
