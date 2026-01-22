"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store/projectStore";
import { toast } from "sonner";
import { Trash2, Download, Upload } from "lucide-react";

export default function SettingsPage() {
  const { clearAllProjects, projects } = useProjectStore();

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete all projects? This cannot be undone.")) {
      clearAllProjects();
      toast.success("All projects deleted");
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cess-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            // Validate and import (simplified for MVP)
            toast.success("Data import feature coming soon");
          } catch (error) {
            toast.error("Invalid backup file");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-24">
      <PageHeader title="Settings" description="Manage your application preferences" showBack />

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export or import your project data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExportData} variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export All Projects
            </Button>
            <Button onClick={handleImportData} variant="outline" className="w-full justify-start">
              <Upload className="mr-2 h-4 w-4" />
              Import Projects
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleClearAll}
              variant="destructive"
              className="w-full justify-start"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Projects
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>Build:</strong> MVP
            </p>
            <p className="pt-2">
              CESSCalculator is a civil engineering structural analysis tool for slope deflection
              calculations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
