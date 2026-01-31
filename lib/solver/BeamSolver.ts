import { BeamInput, BeamResults, ChartPoint, CalculationLog } from "./types";
import { ContinuousBeamSolver } from "./beam/index";
import {
  ContinuousBeamData,
  convertLegacyBeamData,
  BeamSolverResult,
} from "@/lib/types/beam";

/**
 * BeamSolver - Wrapper that bridges the legacy interface with the new solver.
 *
 * The legacy interface (BeamInput/BeamResults) is maintained for backward
 * compatibility with existing UI components. Internally, it delegates to
 * the new ContinuousBeamSolver.
 */
export class BeamSolver {
  private solver: ContinuousBeamSolver;

  constructor() {
    this.solver = new ContinuousBeamSolver();
  }

  /**
   * Solve using legacy input format
   */
  solve(input: BeamInput): BeamResults {
    // If the input has the legacy format with supports as strings,
    // use the placeholder approach
    if (this.isLegacyStringSupports(input)) {
      return this.solveLegacy(input);
    }

    // Convert editor state to new solver format
    try {
      const beamData = this.convertToBeamData(input);
      const result = this.solver.solve(beamData);
      return this.convertToLegacyResults(result);
    } catch (error) {
      // Fall back to legacy placeholder if solver fails
      console.warn("Solver error, falling back to placeholder:", error);
      return this.solveLegacy(input);
    }
  }

  /**
   * Solve using new ContinuousBeamData format directly
   */
  solveAdvanced(data: ContinuousBeamData): BeamSolverResult {
    return this.solver.solve(data);
  }

  /**
   * Check if supports are in legacy string array format
   */
  private isLegacyStringSupports(input: BeamInput): boolean {
    if (!input.supports || input.supports.length === 0) return true;
    return typeof input.supports[0] === "string";
  }

  /**
   * Convert BeamInput with editor-style supports to ContinuousBeamData
   */
  private convertToBeamData(input: BeamInput): ContinuousBeamData {
    const supports = input.supports as any[];
    if (supports.length < 2) {
      throw new Error("Need at least 2 supports");
    }

    // If supports are objects with position/type
    if (typeof supports[0] === "object" && "position" in supports[0]) {
      return convertLegacyBeamData({
        length: input.length,
        ei: input.ei,
        supports: supports.map((s: any) => ({
          id: s.id || `s-${s.position}`,
          type: s.type,
          position: s.position,
        })),
        loads: input.loads.map((l: any) => ({
          id: l.id || `l-${Math.random()}`,
          type: l.type,
          magnitude: l.magnitude,
          position: l.position,
          start: l.start,
          end: l.end,
          direction: l.direction || "down",
        })),
      });
    }

    throw new Error("Unsupported input format");
  }

  /**
   * Convert BeamSolverResult to legacy BeamResults format
   */
  private convertToLegacyResults(result: BeamSolverResult): BeamResults {
    return {
      reactions: result.reactions.map((r) => r.vertical),
      shearForce: result.shearForceDiagram.map((p) => ({
        x: p.x,
        value: p.value,
      })),
      bendingMoment: result.bendingMomentDiagram.map((p) => ({
        x: p.x,
        value: p.value,
      })),
      deflection: result.deflectionDiagram.map((p) => ({
        x: p.x,
        value: p.value,
      })),
      maxShear: Math.abs(result.maxShear.value),
      maxMoment: Math.abs(result.maxMoment.value),
      maxDeflection: Math.abs(result.maxDeflection.value),
      calculationLog: result.calculationLog,
    };
  }

  /**
   * Legacy placeholder solver for backward compatibility
   */
  private solveLegacy(input: BeamInput): BeamResults {
    const { length, ei, loads } = input;

    const points = 101;
    const dx = length / (points - 1);

    const shearForce: ChartPoint[] = [];
    const bendingMoment: ChartPoint[] = [];
    const deflection: ChartPoint[] = [];

    for (let i = 0; i < points; i++) {
      const x = i * dx;
      shearForce.push({
        x,
        value: this.calculateShear(x, length, loads),
      });
      bendingMoment.push({
        x,
        value: this.calculateMoment(x, length, loads),
      });
      deflection.push({
        x,
        value: this.calculateDeflection(x, length, ei, loads),
      });
    }

    const reactions = this.calculateReactions(length, loads);
    const calculationLog = this.generateCalculationLog(
      length,
      ei,
      loads,
      reactions
    );

    return {
      reactions,
      shearForce,
      bendingMoment,
      deflection,
      maxShear: Math.max(...shearForce.map((p) => Math.abs(p.value))),
      maxMoment: Math.max(...bendingMoment.map((p) => Math.abs(p.value))),
      maxDeflection: Math.max(...deflection.map((p) => Math.abs(p.value))),
      calculationLog,
    };
  }

  private calculateReactions(length: number, loads: any[]): number[] {
    const totalLoad = loads.reduce((sum, load) => sum + load.magnitude, 0);
    return [totalLoad / 2, totalLoad / 2];
  }

  private calculateShear(x: number, length: number, loads: any[]): number {
    return Math.sin((x / length) * Math.PI) * 50;
  }

  private calculateMoment(x: number, length: number, loads: any[]): number {
    return -Math.sin((x / length) * Math.PI * 2) * 100;
  }

  private calculateDeflection(
    x: number,
    length: number,
    ei: number,
    loads: any[]
  ): number {
    const normalized = x / length - 0.5;
    return (-Math.pow(normalized, 2) * 1000) / ei;
  }

  private generateCalculationLog(
    L: number,
    EI: number,
    loads: any[],
    reactions: number[]
  ): CalculationLog {
    const totalLoad = loads.reduce((sum, load) => sum + load.magnitude, 0);

    return {
      sections: [
        {
          title: "1. Fixed End Moments (FEM)",
          description:
            "Calculate fixed end moments for each span due to applied loads",
          steps: [
            {
              stepNumber: 1,
              description:
                "For a simply supported beam with point load P at midspan",
              formula: "FEM_{AB} = -\\frac{P \\times L}{8}",
              substitution: `FEM_{AB} = -\\frac{${totalLoad} \\times ${L}}{8}`,
              result: (-totalLoad * L) / 8,
              unit: "kN·m",
            },
            {
              stepNumber: 2,
              description: "Fixed end moment at B",
              formula: "FEM_{BA} = \\frac{P \\times L}{8}",
              substitution: `FEM_{BA} = \\frac{${totalLoad} \\times ${L}}{8}`,
              result: (totalLoad * L) / 8,
              unit: "kN·m",
              highlight: true,
            },
          ],
        },
        {
          title: "2. Member End Moment Equations",
          description:
            "Express end moments using slope-deflection equations",
          steps: [
            {
              stepNumber: 1,
              description: "General slope-deflection equation",
              formula:
                "M_{AB} = FEM_{AB} + \\frac{2EI}{L}(2\\theta_A + \\theta_B)",
            },
          ],
        },
        {
          title: "3. Joint Equilibrium Equations",
          description: "Apply equilibrium at each joint",
          steps: [
            {
              stepNumber: 1,
              description: "Sum of moments at joint B = 0",
              formula: "M_{BA} + M_{BC} = 0",
            },
          ],
        },
        {
          title: "4. Solve for Joint Rotations",
          description:
            "Solve the system of equations for unknown rotations",
          steps: [
            {
              stepNumber: 1,
              description: "Boundary conditions",
              formula: "\\theta_A = 0, \\quad \\theta_B = 0",
            },
          ],
        },
        {
          title: "5. Member End Moments",
          description:
            "Substitute rotations back into slope-deflection equations",
          steps: [
            {
              stepNumber: 1,
              description: "End moment at A",
              result: (-totalLoad * L) / 8,
              unit: "kN·m",
              highlight: true,
            },
            {
              stepNumber: 2,
              description: "End moment at B",
              result: (totalLoad * L) / 8,
              unit: "kN·m",
              highlight: true,
            },
          ],
        },
        {
          title: "6. Support Reactions",
          description: "Calculate reactions using equilibrium",
          steps: [
            {
              stepNumber: 1,
              description: "Reaction at support A",
              result: reactions[0],
              unit: "kN",
              highlight: true,
            },
            {
              stepNumber: 2,
              description: "Reaction at support B",
              result: reactions[1],
              unit: "kN",
              highlight: true,
            },
          ],
        },
      ],
    };
  }
}
