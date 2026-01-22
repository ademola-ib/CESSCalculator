"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBack?: boolean;
}

export function PageHeader({ title, description, showBack }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
