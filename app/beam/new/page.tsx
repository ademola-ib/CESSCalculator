"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { nanoid } from "@/lib/utils";

export default function NewBeamPage() {
  const router = useRouter();
  const createProject = useProjectStore((state) => state.createProject);

  useEffect(() => {
    const newId = nanoid();
    createProject({
      id: newId,
      name: "Untitled Beam Project",
      type: "beam",
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    router.replace(`/beam/${newId}`);
  }, [createProject, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Creating new beam project...</p>
    </div>
  );
}
