"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { BeamInputTab } from "@/components/beam/BeamInputTab";
import { BeamResultsTab } from "@/components/beam/BeamResultsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera } from "lucide-react";
import { ImageUploadModal } from "@/components/gemini/ImageUploadModal";
import { ExtractionReviewScreen } from "@/components/gemini/ExtractionReviewScreen";

export default function BeamProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const project = useProjectStore((state) => state.projects.find((p) => p.id === id));
  const [showImageModal, setShowImageModal] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

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

  const handleExtractionComplete = (data: any) => {
    setShowImageModal(false);
    setExtractedData(data);
  };

  const handleConfirmExtraction = (data: any) => {
    // TODO: Apply extracted data to the project
    // This will populate the editor with the extracted beam parameters
    setExtractedData(null);
  };

  // Show review screen if data was extracted
  if (extractedData) {
    return (
      <div className="container mx-auto max-w-6xl p-4 pb-24">
        <PageHeader title={project.name} description="Review Extracted Data" showBack />
        <div className="mt-6">
          <ExtractionReviewScreen
            data={extractedData}
            onConfirm={handleConfirmExtraction}
            onCancel={() => setExtractedData(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader title={project.name} description="Beam Analysis" showBack />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImageModal(true)}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Solve from Image
        </Button>
      </div>

      <Tabs defaultValue="input" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="input">
          <BeamInputTab projectId={id} />
        </TabsContent>
        <TabsContent value="results">
          <BeamResultsTab projectId={id} />
        </TabsContent>
      </Tabs>

      {showImageModal && (
        <ImageUploadModal
          isOpen={showImageModal}
          problemType="beam"
          onExtracted={handleExtractionComplete}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
