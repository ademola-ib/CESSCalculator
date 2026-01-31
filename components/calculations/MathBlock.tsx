"use client";

/**
 * MathBlock component for rendering mathematical formulas.
 * Uses a monospace/code-like display format for broad compatibility.
 * When KaTeX is installed, it can be upgraded to use LaTeX rendering.
 */

interface MathBlockProps {
  math: string;
  display?: boolean; // block display (true) or inline (false)
  className?: string;
}

/**
 * Render a math formula.
 * Currently uses styled code blocks for compatibility.
 * To upgrade to KaTeX:
 * 1. npm install katex react-katex @types/katex
 * 2. Import: import { BlockMath, InlineMath } from 'react-katex'
 * 3. Import CSS: import 'katex/dist/katex.min.css'
 * 4. Replace the return below with the KaTeX components
 */
export function MathBlock({ math, display = true, className }: MathBlockProps) {
  // Convert common LaTeX patterns to readable text
  const readable = formatMathToReadable(math);

  if (display) {
    return (
      <div
        className={`my-2 overflow-x-auto rounded-md bg-muted/50 px-4 py-3 font-mono text-sm ${className ?? ""}`}
      >
        {readable}
      </div>
    );
  }

  return (
    <code className={`rounded bg-muted/50 px-1.5 py-0.5 font-mono text-sm ${className ?? ""}`}>
      {readable}
    </code>
  );
}

/**
 * Convert LaTeX-style formula strings to readable text
 * This is a temporary formatter until KaTeX is installed
 */
function formatMathToReadable(latex: string): string {
  let text = latex;

  // Remove LaTeX commands and convert to readable format
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)");
  text = text.replace(/\\times/g, "\u00D7");
  text = text.replace(/\\cdot/g, "\u00B7");
  text = text.replace(/\\theta/g, "\u03B8");
  text = text.replace(/\\psi/g, "\u03C8");
  text = text.replace(/\\Delta/g, "\u0394");
  text = text.replace(/\\delta/g, "\u03B4");
  text = text.replace(/\\sum/g, "\u03A3");
  text = text.replace(/\\Rightarrow/g, "\u21D2");
  text = text.replace(/\\rightarrow/g, "\u2192");
  text = text.replace(/\\neq/g, "\u2260");
  text = text.replace(/\\leq/g, "\u2264");
  text = text.replace(/\\geq/g, "\u2265");
  text = text.replace(/\\quad/g, "    ");
  text = text.replace(/\\qquad/g, "        ");
  text = text.replace(/\\text\{([^}]+)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  text = text.replace(/\^2/g, "\u00B2");
  text = text.replace(/\^3/g, "\u00B3");
  text = text.replace(/\^{([^}]+)}/g, "^($1)");
  text = text.replace(/_{([^}]+)}/g, "_$1");
  text = text.replace(/\\begin\{[^}]+\}/g, "");
  text = text.replace(/\\end\{[^}]+\}/g, "");
  text = text.replace(/\\\\/g, "\n");
  text = text.replace(/\\,/g, " ");
  text = text.replace(/\\;/g, "  ");
  text = text.replace(/\\!/g, "");
  text = text.replace(/\\\s/g, " ");
  text = text.replace(/\{/g, "");
  text = text.replace(/\}/g, "");

  return text.trim();
}

/**
 * Math formula with description
 */
interface MathStepProps {
  description: string;
  formula?: string;
  substitution?: string;
  result?: number | string;
  unit?: string;
  highlight?: boolean;
}

export function MathStep({
  description,
  formula,
  substitution,
  result,
  unit,
  highlight,
}: MathStepProps) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border"
      }`}
    >
      <p className="mb-1 text-sm text-muted-foreground">{description}</p>

      {formula && <MathBlock math={formula} />}

      {substitution && (
        <MathBlock math={substitution} className="bg-muted/30" />
      )}

      {result !== undefined && (
        <p
          className={`mt-1 font-mono text-sm ${
            highlight ? "font-bold text-primary" : ""
          }`}
        >
          = {typeof result === "number" ? result.toFixed(4) : result}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}
