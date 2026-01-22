"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectList } from "@/components/history/ProjectList";

export default function HistoryPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 pb-24">
      <PageHeader
        title="Project History"
        description="View, manage, and restore your saved projects"
        showBack
      />
      <div className="mt-6">
        <ProjectList />
      </div>
    </div>
  );
}
