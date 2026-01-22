"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CalculationsTab } from "@/components/calculations/CalculationsTab";
import { toast } from "sonner";

interface FrameResultsTabProps {
  projectId: string;
}

export function FrameResultsTab({ projectId }: FrameResultsTabProps) {
  const project = useProjectStore((state) => state.projects.find((p) => p.id === projectId));

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

  // Placeholder calculation log for frame
  const placeholderLog = {
    sections: [
      {
        title: "1. Member Stiffness Coefficients",
        description: "Calculate stiffness coefficients for each member",
        steps: [
          {
            stepNumber: 1,
            description: "Column stiffness coefficient",
            formula: "k_col = EI/L",
            substitution: `k_col = ${project.data.columnEI}/${project.data.storyHeight}`,
            result: project.data.columnEI / project.data.storyHeight,
            unit: "kN·m",
          },
          {
            stepNumber: 2,
            description: "Beam stiffness coefficient",
            formula: "k_beam = EI/L",
            substitution: `k_beam = ${project.data.beamEI}/${project.data.bayWidth}`,
            result: project.data.beamEI / project.data.bayWidth,
            unit: "kN·m",
            highlight: true,
          },
        ],
      },
      {
        title: "2. Fixed End Moments",
        description: "Calculate FEM for loaded members",
        steps: [
          {
            stepNumber: 1,
            description: "Example: Beam with UDL",
            formula: "FEM = -wL²/12",
          },
        ],
      },
      {
        title: "3. Distribution Factors",
        description: "Calculate moment distribution factors at each joint",
        steps: [
          {
            stepNumber: 1,
            description: "Distribution factor formula",
            formula: "DF = k_member / Σk_members",
          },
        ],
      },
    ],
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
            <div>
              <h3 className="mb-3 text-lg font-semibold">Joint Displacements</h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">Joint</th>
                      <th className="p-3 text-right">Δx (mm)</th>
                      <th className="p-3 text-right">Δy (mm)</th>
                      <th className="p-3 text-right">θ (rad)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Node 1</td>
                      <td className="p-3 text-right">0.0</td>
                      <td className="p-3 text-right">0.0</td>
                      <td className="p-3 text-right">0.002</td>
                    </tr>
                    <tr>
                      <td className="p-3">Node 2</td>
                      <td className="p-3 text-right">2.5</td>
                      <td className="p-3 text-right">-1.2</td>
                      <td className="p-3 text-right">0.001</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Detailed member force diagrams and visualizations will be displayed here
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                Integrate your production solver to see actual results
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calculations">
        <CalculationsTab log={placeholderLog} />
      </TabsContent>
    </Tabs>
  );
}
