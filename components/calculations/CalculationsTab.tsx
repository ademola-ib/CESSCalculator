"use client";

import { CalculationLog } from "@/lib/solver/types";
import { CalcSection } from "./CalcSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface CalculationsTabProps {
  log?: CalculationLog;
}

export function CalculationsTab({ log }: CalculationsTabProps) {
  if (!log || log.sections.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">
              No calculation steps available
            </p>
            <p className="text-sm text-muted-foreground/70">
              Run the analysis to see detailed slope-deflection calculations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Calculations</CardTitle>
          <CardDescription>
            Detailed slope-deflection method calculations showing all intermediate steps
          </CardDescription>
        </CardHeader>
      </Card>

      {log.sections.map((section, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <CalcSection section={section} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
