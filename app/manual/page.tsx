import { PageHeader } from "@/components/layout/PageHeader";
import { ManualNav } from "@/components/layout/ManualNav";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calculator, Frame, Workflow } from "lucide-react";

export default function ManualPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 pb-24">
      <PageHeader
        title="User Manual"
        description="Documentation and guides for using CESSCalculator"
        showBack
      />

      <ManualNav />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Link href="/manual/getting-started">
          <Card className="h-full cursor-pointer transition-all hover:border-primary">
            <CardHeader>
              <BookOpen className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Learn the basics of creating and managing projects
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/manual/beam-analysis">
          <Card className="h-full cursor-pointer transition-all hover:border-primary">
            <CardHeader>
              <Calculator className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Beam Analysis</CardTitle>
              <CardDescription>
                Guide to analyzing beams with various support and loading conditions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/manual/frame-analysis">
          <Card className="h-full cursor-pointer transition-all hover:border-primary">
            <CardHeader>
              <Frame className="mb-2 h-8 w-8 text-accent" />
              <CardTitle>Frame Analysis</CardTitle>
              <CardDescription>
                Instructions for multi-bay and multi-storey frame analysis
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/manual/workflow">
          <Card className="h-full cursor-pointer transition-all hover:border-primary">
            <CardHeader>
              <Workflow className="mb-2 h-8 w-8 text-accent" />
              <CardTitle>Workflow Guide</CardTitle>
              <CardDescription>
                Best practices and tips for efficient structural analysis
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
