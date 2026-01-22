"use client";

import { CalculationSection } from "@/lib/solver/types";
import { CalcStep } from "./CalcStep";

interface CalcSectionProps {
  section: CalculationSection;
}

export function CalcSection({ section }: CalcSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
      </div>

      <div className="space-y-3">
        {section.steps.map((step) => (
          <CalcStep key={step.stepNumber} step={step} />
        ))}
      </div>
    </div>
  );
}
