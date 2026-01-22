"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const manualLinks = [
  { href: "/manual", label: "Overview" },
  { href: "/manual/getting-started", label: "Getting Started" },
  { href: "/manual/beam-analysis", label: "Beam Analysis" },
  { href: "/manual/frame-analysis", label: "Frame Analysis" },
  { href: "/manual/workflow", label: "Workflow" },
];

export function ManualNav() {
  const pathname = usePathname();

  return (
    <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
      {manualLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
            pathname === href
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
