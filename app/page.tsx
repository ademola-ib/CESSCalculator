"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store/projectStore";
import { useRouter } from "next/navigation";
import { Calculator, Frame, BookOpen, Clock } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const projects = useProjectStore((state) => state.projects);
  const recentProjects = projects.slice(0, 3);

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-24">
      <PageHeader
        title="CESSCalculator"
        description="Civil Engineering Structural Slope-Deflection Analysis"
      />

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-all hover:border-primary"
          onClick={() => router.push("/beam/new")}
        >
          <CardHeader>
            <Calculator className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Beam Analysis</CardTitle>
            <CardDescription>
              Analyze single and multiple span beams with various support and loading conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Start Calculation</Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary"
          onClick={() => router.push("/frame/new")}
        >
          <CardHeader>
            <Frame className="mb-2 h-8 w-8 text-accent" />
            <CardTitle>Frame Analysis</CardTitle>
            <CardDescription>
              Rigid frame analysis for multi-bay and multi-storey structures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary">
              Start Calculation
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-accent"
          onClick={() => router.push("/manual")}
        >
          <CardHeader>
            <BookOpen className="mb-2 h-8 w-8 text-accent" />
            <CardTitle>User Manual</CardTitle>
            <CardDescription>
              Getting started guides, formulas, and workflow documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Manual
            </Button>
          </CardContent>
        </Card>
      </div>

      {recentProjects.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Recent Projects</h2>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:border-primary"
                onClick={() => router.push(`/${project.type}/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="capitalize">{project.type} Analysis</CardDescription>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Button
            variant="link"
            className="mt-2 w-full"
            onClick={() => router.push("/history")}
          >
            View All Projects →
          </Button>
        </div>
      )}
    </div>
  );
}
