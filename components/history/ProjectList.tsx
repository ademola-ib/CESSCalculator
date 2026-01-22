"use client";

import { useProjectStore } from "@/lib/store/projectStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Trash2, Edit2, Copy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export function ProjectList() {
  const router = useRouter();
  const { projects, deleteProject, renameProject, duplicateProject } = useProjectStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProject(id);
      toast.success("Project deleted");
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
      setEditingId(null);
      toast.success("Project renamed");
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateProject(id);
    toast.success("Project duplicated");
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No projects yet</p>
          <Button onClick={() => router.push("/")}>Create Your First Project</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <Card key={project.id} className="transition-all hover:border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editingId === project.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(project.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRename(project.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle
                      className="cursor-pointer hover:text-primary"
                      onClick={() => router.push(`/${project.type}/${project.id}`)}
                    >
                      {project.name}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {project.type} Analysis · Updated {formatDate(project.updatedAt)}
                    </CardDescription>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingId(project.id);
                    setEditName(project.name);
                  }}
                  title="Rename"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDuplicate(project.id)}
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(project.id, project.name)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
