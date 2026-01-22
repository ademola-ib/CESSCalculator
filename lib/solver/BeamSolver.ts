import { BeamInput, BeamResults, ChartPoint, CalculationLog } from "./types";

/**
 * PLACEHOLDER BEAM SOLVER with Calculation Log
 *
 * This is a simplified solver for MVP demonstration.
 * Replace this with your production slope-deflection solver.
 *
 * The interface defined here should remain stable - only the implementation changes.
 */
export class BeamSolver {
  solve(input: BeamInput): BeamResults {
    // Placeholder: Generate sample results for visualization
    const { length, ei, loads } = input;

    const points = 101;
    const dx = length / (points - 1);

    const shearForce: ChartPoint[] = [];
    const bendingMoment: ChartPoint[] = [];
    const deflection: ChartPoint[] = [];

    for (let i = 0; i < points; i++) {
      const x = i * dx;

      // Placeholder formulas - replace with actual analysis
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
    const calculationLog = this.generateCalculationLog(length, ei, loads, reactions);

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
    // Placeholder: Simple symmetric reactions
    const totalLoad = loads.reduce((sum, load) => sum + load.magnitude, 0);
    return [totalLoad / 2, totalLoad / 2];
  }

  private calculateShear(x: number, length: number, loads: any[]): number {
    // Placeholder formula
    return Math.sin((x / length) * Math.PI) * 50;
  }

  private calculateMoment(x: number, length: number, loads: any[]): number {
    // Placeholder formula
    return -Math.sin((x / length) * Math.PI * 2) * 100;
  }

  private calculateDeflection(x: number, length: number, ei: number, loads: any[]): number {
    // Placeholder formula
    const normalized = x / length - 0.5;
    return -Math.pow(normalized, 2) * 1000 / ei;
  }

  /**
   * Generate calculation log showing step-by-step slope-deflection calculations
   */
  private generateCalculationLog(
    L: number,
    EI: number,
    loads: any[],
    reactions: number[]
  ): CalculationLog {
    // Example calculation log - replace with actual slope-deflection steps
    const totalLoad = loads.reduce((sum, load) => sum + load.magnitude, 0);

    return {
      sections: [
        {
          title: "1. Fixed End Moments (FEM)",
          description: "Calculate fixed end moments for each span due to applied loads",
          steps: [
            {
              stepNumber: 1,
              description: "For a simply supported beam with point load P at midspan",
              formula: "FEM_AB = -P×L/8",
              substitution: `FEM_AB = -(${totalLoad})×(${L})/8`,
              result: (-totalLoad * L) / 8,
              unit: "kN·m",
            },
            {
              stepNumber: 2,
              description: "Fixed end moment at B",
              formula: "FEM_BA = P×L/8",
              substitution: `FEM_BA = (${totalLoad})×(${L})/8`,
              result: (totalLoad * L) / 8,
              unit: "kN·m",
              highlight: true,
            },
          ],
        },
        {
          title: "2. Member End Moment Equations",
          description: "Express end moments using slope-deflection equations",
          steps: [
            {
              stepNumber: 1,
              description: "General slope-deflection equation",
              formula: "M_AB = FEM_AB + (2EI/L)(2θ_A + θ_B)",
            },
            {
              stepNumber: 2,
              description: "For simply supported beam, θ_A = θ_B = 0",
              formula: "M_AB = FEM_AB",
              result: (-totalLoad * L) / 8,
              unit: "kN·m",
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
              formula: "M_BA + M_BC = 0",
            },
            {
              stepNumber: 2,
              description: "For single span, M_BC = 0",
              formula: "M_BA = 0",
              result: 0,
              unit: "kN·m",
            },
          ],
        },
        {
          title: "4. Solve for Joint Rotations",
          description: "Solve the system of equations for unknown rotations",
          steps: [
            {
              stepNumber: 1,
              description: "For simply supported beam, boundary conditions give:",
              formula: "θ_A = 0, θ_B = 0",
            },
            {
              stepNumber: 2,
              description: "Rotation at support A",
              result: 0,
              unit: "rad",
              highlight: true,
            },
            {
              stepNumber: 3,
              description: "Rotation at support B",
              result: 0,
              unit: "rad",
              highlight: true,
            },
          ],
        },
        {
          title: "5. Member End Moments",
          description: "Substitute rotations back into slope-deflection equations",
          steps: [
            {
              stepNumber: 1,
              description: "End moment at A",
              formula: "M_AB = FEM_AB + (2EI/L)(2θ_A + θ_B)",
              substitution: `M_AB = ${(-totalLoad * L) / 8} + 0`,
              result: (-totalLoad * L) / 8,
              unit: "kN·m",
              highlight: true,
            },
            {
              stepNumber: 2,
              description: "End moment at B",
              formula: "M_BA = FEM_BA + (2EI/L)(2θ_B + θ_A)",
              substitution: `M_BA = ${(totalLoad * L) / 8} + 0`,
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
              description: "Sum of vertical forces = 0",
              formula: "R_A + R_B = P",
            },
            {
              stepNumber: 2,
              description: "Taking moments about A",
              formula: "R_B × L = P × (L/2)",
              substitution: `R_B × ${L} = ${totalLoad} × ${L / 2}`,
              result: reactions[1],
              unit: "kN",
            },
            {
              stepNumber: 3,
              description: "Reaction at support A",
              formula: "R_A = P - R_B",
              substitution: `R_A = ${totalLoad} - ${reactions[1]}`,
              result: reactions[0],
              unit: "kN",
              highlight: true,
            },
            {
              stepNumber: 4,
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
