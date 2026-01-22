"use client";

import { useProjectStore } from "@/lib/store/projectStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { FrameInputTab } from "@/components/frame/FrameInputTab";
import { FrameResultsTab } from "@/components/frame/FrameResultsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FrameProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const project = useProjectStore((state) => state.projects.find((p) => p.id === id));

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 pb-24">
      <PageHeader title={project.name} description="Frame Analysis" showBack />

      <Tabs defaultValue="input" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="input">
          <FrameInputTab projectId={id} />
        </TabsContent>
        <TabsContent value="results">
          <FrameResultsTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
