"use client";

import { CalculationStep } from "@/lib/solver/types";
import { cn } from "@/lib/utils";

interface CalcStepProps {
  step: CalculationStep;
}

export function CalcStep({ step }: CalcStepProps) {
  return (
    <div className="space-y-2 rounded-md border-l-2 border-primary/30 bg-card/50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
          {step.stepNumber}
        </span>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">{step.description}</p>

          {step.formula && (
            <div className="rounded bg-muted/50 p-3 font-mono text-sm">
              {step.formula}
            </div>
          )}

          {step.substitution && (
            <div className="rounded bg-muted/30 p-3 font-mono text-sm text-foreground/80">
              {step.substitution}
            </div>
          )}

          {step.result !== undefined && (
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold",
                step.highlight
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/20 text-accent-foreground"
              )}
            >
              <span>=</span>
              <span>
                {typeof step.result === "number"
                  ? step.result.toFixed(3)
                  : step.result}
              </span>
              {step.unit && <span className="text-sm opacity-80">{step.unit}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
