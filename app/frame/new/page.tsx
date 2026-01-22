"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { nanoid } from "@/lib/utils";

export default function NewFramePage() {
  const router = useRouter();
  const createProject = useProjectStore((state) => state.createProject);

  useEffect(() => {
    const newId = nanoid();
    createProject({
      id: newId,
      name: "Untitled Frame Project",
      type: "frame",
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    router.replace(`/frame/${newId}`);
  }, [createProject, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Creating new frame project...</p>
    </div>
  );
}
