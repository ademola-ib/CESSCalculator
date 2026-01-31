/**
 * Continuous Beam Solver using Slope-Deflection Method
 * Supports unlimited spans, variable EI, settlements, and all load types
 */

import {
  ContinuousBeamData,
  NodeData,
  SpanData,
  BeamLoad,
  BeamSolverResult,
  SpanEndMoments,
  SupportReaction,
  DiagramPoint,
  FixedEndMoments,
  CalculationLog,
  CalculationSection,
  CalculationStep,
  getSpanEI,
  isPointLoad,
  isUDL,
  isVDL,
  isAppliedMoment,
} from "@/lib/types/beam";

import { calculateSpanFEM, getFEMBreakdown, getFEMFormulaLatex, calculateVDLEffects } from "./fem";
import {
  Matrix,
  Vector,
  createZeroMatrix,
  createZeroVector,
  solveLinearSystem,
} from "./linearAlgebra";

/**
 * Main continuous beam solver class
 */
export class ContinuousBeamSolver {
  private beam: ContinuousBeamData;
  private sortedNodes: NodeData[];
  private nodeIndexMap: Map<string, number>;
  private defaultEI: number;
  private defaultE?: number;
  private defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  private defaultI?: number;
  private defaultIUnit?: "m4" | "mm4" | "cm4";

  constructor() {
    this.beam = { nodes: [], spans: [], loads: [] };
    this.sortedNodes = [];
    this.nodeIndexMap = new Map();
    this.defaultEI = 50000; // Default EI in kN·m²
    this.defaultE = undefined;
    this.defaultI = undefined;
  }

  /**
   * Main solve method
   */
  solve(beam: ContinuousBeamData): BeamSolverResult {
    this.beam = beam;
    this.defaultEI = beam.defaultEI ?? 50000;
    this.defaultE = beam.defaultE;
    this.defaultEUnit = beam.defaultEUnit;
    this.defaultI = beam.defaultI;
    this.defaultIUnit = beam.defaultIUnit;

    // 1. Sort nodes by position and create index map
    this.sortedNodes = [...beam.nodes].sort((a, b) => a.position - b.position);
    this.nodeIndexMap.clear();
    this.sortedNodes.forEach((node, index) => {
      this.nodeIndexMap.set(node.id, index);
    });

    // 2. Validate beam configuration
    this.validateBeam();

    // 3. Calculate FEM for each span
    const femBySpan = this.calculateAllFEM();

    // 4. Identify DOFs (unknown rotations)
    const dofNodes = this.identifyDOFs();
    const numDOFs = dofNodes.length;

    // 5. Build and solve system of equations
    let rotations: Map<string, number>;

    if (numDOFs === 0) {
      // Determinate structure or all fixed
      rotations = new Map();
      this.sortedNodes.forEach((node) => {
        rotations.set(node.id, 0);
      });
    } else {
      // Build stiffness matrix and load vector
      const { K, F } = this.buildSystem(dofNodes, femBySpan);

      // Solve for rotations
      const thetaVector = solveLinearSystem(K, F);

      // Map back to node IDs
      rotations = new Map();
      this.sortedNodes.forEach((node) => {
        if (node.supportType === "fixed") {
          rotations.set(node.id, 0);
        }
      });
      dofNodes.forEach((node, i) => {
        rotations.set(node.id, thetaVector[i]);
      });
    }

    // 6. Calculate member end moments
    const endMoments = this.calculateEndMoments(rotations, femBySpan);

    // 7. Calculate support reactions
    const reactions = this.calculateReactions(endMoments);

    // 8. Generate diagrams
    const diagrams = this.generateDiagrams(endMoments, reactions);

    // 9. Generate calculation log
    const calculationLog = this.generateCalculationLog(
      femBySpan,
      dofNodes,
      rotations,
      endMoments,
      reactions
    );

    // 10. Find max values
    const maxShear = this.findMaxValue(diagrams.shear);
    const maxMoment = this.findMaxValue(diagrams.moment);
    const maxDeflection = this.findMaxValue(diagrams.deflection);

    return {
      rotations,
      endMoments,
      reactions,
      shearForceDiagram: diagrams.shear,
      bendingMomentDiagram: diagrams.moment,
      deflectionDiagram: diagrams.deflection,
      maxShear,
      maxMoment,
      maxDeflection,
      calculationLog,
    };
  }

  /**
   * Validate beam configuration
   */
  private validateBeam(): void {
    if (this.sortedNodes.length < 2) {
      throw new Error("Beam must have at least 2 nodes");
    }

    if (this.beam.spans.length < 1) {
      throw new Error("Beam must have at least 1 span");
    }

    // Check for stability
    let numRestraints = 0;
    for (const node of this.sortedNodes) {
      if (node.supportType === "fixed") {
        numRestraints += 2; // rotation and translation
      } else if (node.supportType === "pinned" || node.supportType === "roller") {
        numRestraints += 1; // translation only
      }
    }

    if (numRestraints < 2) {
      throw new Error("Beam is unstable - insufficient supports");
    }
  }

  /**
   * Calculate FEM for all spans
   */
  private calculateAllFEM(): Map<string, FixedEndMoments> {
    const femBySpan = new Map<string, FixedEndMoments>();

    for (const span of this.beam.spans) {
      const fem = calculateSpanFEM(span, this.beam.loads);
      femBySpan.set(span.id, fem);
    }

    return femBySpan;
  }

  /**
   * Identify nodes with unknown rotations (DOFs)
   */
  private identifyDOFs(): NodeData[] {
    return this.sortedNodes.filter((node) => {
      // Fixed supports have known rotation (θ = 0)
      // Pinned, roller, and free nodes have unknown rotation
      return node.supportType !== "fixed";
    });
  }

  /**
   * Build stiffness matrix and load vector
   */
  private buildSystem(
    dofNodes: NodeData[],
    femBySpan: Map<string, FixedEndMoments>
  ): { K: Matrix; F: Vector } {
    const n = dofNodes.length;
    const K = createZeroMatrix(n, n);
    const F = createZeroVector(n);

    // Create DOF index map
    const dofIndexMap = new Map<string, number>();
    dofNodes.forEach((node, i) => {
      dofIndexMap.set(node.id, i);
    });

    // For each span, add stiffness contributions
    for (const span of this.beam.spans) {
      const startNodeIdx = this.nodeIndexMap.get(span.nodeStartId)!;
      const endNodeIdx = this.nodeIndexMap.get(span.nodeEndId)!;
      const startNode = this.sortedNodes[startNodeIdx];
      const endNode = this.sortedNodes[endNodeIdx];

      const EI = getSpanEI(span, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
      const L = span.length;
      const k = EI / L; // Base stiffness

      const fem = femBySpan.get(span.id)!;

      // Get chord rotation due to settlements
      const psi = this.getChordRotation(startNode, endNode, L);

      // Stiffness coefficients
      // M_ij = FEM_ij + (2EI/L)(2θ_i + θ_j - 3ψ)
      // dM_ij/dθ_i = 4EI/L
      // dM_ij/dθ_j = 2EI/L

      const startDofIdx = dofIndexMap.get(span.nodeStartId);
      const endDofIdx = dofIndexMap.get(span.nodeEndId);

      // Start node contributions
      if (startDofIdx !== undefined) {
        K[startDofIdx][startDofIdx] += 4 * k;
        if (endDofIdx !== undefined) {
          K[startDofIdx][endDofIdx] += 2 * k;
        }

        // Load vector contribution from FEM and settlements
        // At joint equilibrium: M_BA + M_BC = 0
        // F includes -FEM terms (moved to RHS)
        F[startDofIdx] -= fem.femStart;

        // Settlement contribution
        if (endDofIdx !== undefined) {
          // If end node is also a DOF, chord rotation affects both
        } else {
          // End node is fixed, settlement term goes to load vector
          F[startDofIdx] += 6 * k * psi;
        }

        // Add settlement effects from previous span (if this node is at end)
        this.addPreviousSpanContribution(
          span,
          startDofIdx,
          K,
          F,
          dofIndexMap,
          femBySpan
        );
      }

      // End node contributions
      if (endDofIdx !== undefined) {
        K[endDofIdx][endDofIdx] += 4 * k;
        if (startDofIdx !== undefined) {
          K[endDofIdx][startDofIdx] += 2 * k;
        }

        // Load vector contribution
        F[endDofIdx] -= fem.femEnd;

        // Settlement contribution
        if (startDofIdx === undefined) {
          // Start node is fixed
          F[endDofIdx] += 6 * k * psi;
        }
      }
    }

    return { K, F };
  }

  /**
   * Add contribution from the span on the other side of a joint
   */
  private addPreviousSpanContribution(
    currentSpan: SpanData,
    dofIdx: number,
    K: Matrix,
    F: Vector,
    dofIndexMap: Map<string, number>,
    femBySpan: Map<string, FixedEndMoments>
  ): void {
    // This is handled by iterating through all spans
    // Each span adds its own contributions to the relevant DOFs
  }

  /**
   * Get chord rotation due to differential settlement
   */
  private getChordRotation(
    startNode: NodeData,
    endNode: NodeData,
    spanLength: number
  ): number {
    const deltaStart = startNode.settlement ?? 0;
    const deltaEnd = endNode.settlement ?? 0;

    // Chord rotation ψ = (δ_j - δ_i) / L
    // Positive settlement is downward
    return (deltaEnd - deltaStart) / spanLength;
  }

  /**
   * Calculate member end moments using slope-deflection equations
   */
  private calculateEndMoments(
    rotations: Map<string, number>,
    femBySpan: Map<string, FixedEndMoments>
  ): SpanEndMoments[] {
    const endMoments: SpanEndMoments[] = [];

    for (const span of this.beam.spans) {
      const startNodeIdx = this.nodeIndexMap.get(span.nodeStartId)!;
      const endNodeIdx = this.nodeIndexMap.get(span.nodeEndId)!;
      const startNode = this.sortedNodes[startNodeIdx];
      const endNode = this.sortedNodes[endNodeIdx];

      const EI = getSpanEI(span, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
      const L = span.length;
      const k = EI / L;

      const thetaStart = rotations.get(span.nodeStartId) ?? 0;
      const thetaEnd = rotations.get(span.nodeEndId) ?? 0;
      const psi = this.getChordRotation(startNode, endNode, L);

      const fem = femBySpan.get(span.id)!;

      // Slope-deflection equations:
      // M_AB = FEM_AB + (2EI/L)(2θ_A + θ_B - 3ψ)
      // M_BA = FEM_BA + (2EI/L)(2θ_B + θ_A - 3ψ)

      const mStart =
        fem.femStart +
        2 * k * (2 * thetaStart + thetaEnd - 3 * psi);
      const mEnd =
        fem.femEnd +
        2 * k * (2 * thetaEnd + thetaStart - 3 * psi);

      endMoments.push({
        spanId: span.id,
        mStart,
        mEnd,
      });
    }

    return endMoments;
  }

  /**
   * Calculate support reactions
   */
  private calculateReactions(endMoments: SpanEndMoments[]): SupportReaction[] {
    const reactions: SupportReaction[] = [];

    for (const node of this.sortedNodes) {
      if (node.supportType === "free") continue;

      // Find spans connected to this node
      const spansAtNode = this.findSpansAtNode(node.id);

      let verticalReaction = 0;
      let momentReaction: number | undefined;

      // For fixed supports, the moment reaction equals the end moment
      if (node.supportType === "fixed") {
        const adjacentSpan = spansAtNode[0];
        if (adjacentSpan) {
          const spanMoments = endMoments.find(
            (m) => m.spanId === adjacentSpan.span.id
          );
          if (spanMoments) {
            momentReaction = adjacentSpan.isStart
              ? -spanMoments.mStart
              : spanMoments.mEnd;
          }
        }
      }

      // Calculate vertical reaction from span equilibrium
      for (const { span, isStart } of spansAtNode) {
        const spanMoments = endMoments.find((m) => m.spanId === span.id);
        if (!spanMoments) continue;

        const L = span.length;

        // Simple beam reactions from end moments
        // R_A = (M_A - M_B) / L + R_A0 (from loads)
        // where R_A0 is reaction from loads alone (fixed-fixed)

        const R_fromMoments = (spanMoments.mStart - spanMoments.mEnd) / L;

        // Get reaction from loads (as if simply supported)
        const R_fromLoads = this.calculateLoadReaction(span, isStart);

        if (isStart) {
          verticalReaction += R_fromLoads - R_fromMoments;
        } else {
          verticalReaction += R_fromLoads + R_fromMoments;
        }
      }

      reactions.push({
        nodeId: node.id,
        position: node.position,
        vertical: verticalReaction,
        moment: momentReaction,
      });
    }

    return reactions;
  }

  /**
   * Find spans connected to a node
   */
  private findSpansAtNode(
    nodeId: string
  ): Array<{ span: SpanData; isStart: boolean }> {
    const spans: Array<{ span: SpanData; isStart: boolean }> = [];

    for (const span of this.beam.spans) {
      if (span.nodeStartId === nodeId) {
        spans.push({ span, isStart: true });
      }
      if (span.nodeEndId === nodeId) {
        spans.push({ span, isStart: false });
      }
    }

    return spans;
  }

  /**
   * Calculate reaction from loads (as simply supported beam)
   */
  private calculateLoadReaction(span: SpanData, isStart: boolean): number {
    const L = span.length;
    const spanLoads = this.beam.loads.filter((load) => load.spanId === span.id);

    let totalReaction = 0;

    for (const load of spanLoads) {
      if (isPointLoad(load)) {
        const a = load.position;
        const b = L - a;
        // Simply supported reactions: R_A = Pb/L, R_B = Pa/L
        totalReaction += isStart
          ? (load.magnitude * b) / L
          : (load.magnitude * a) / L;
      } else if (isUDL(load)) {
        const loadLength = load.endPosition - load.startPosition;
        const loadCenter = (load.startPosition + load.endPosition) / 2;
        const totalLoad = load.magnitude * loadLength;
        // Treat as point load at centroid
        totalReaction += isStart
          ? (totalLoad * (L - loadCenter)) / L
          : (totalLoad * loadCenter) / L;
      } else if (isVDL(load)) {
        const loadLength = load.endPosition - load.startPosition;
        const avgIntensity = (load.w1 + load.w2) / 2;
        const totalLoad = avgIntensity * loadLength;
        // Centroid of trapezoidal load
        const centroid =
          load.startPosition +
          (loadLength * (load.w1 + 2 * load.w2)) / (3 * (load.w1 + load.w2));
        totalReaction += isStart
          ? (totalLoad * (L - centroid)) / L
          : (totalLoad * centroid) / L;
      }
      // Moments don't contribute to vertical reactions directly
    }

    return totalReaction;
  }

  /**
   * Generate SFD, BMD, and deflection diagrams
   */
  private generateDiagrams(
    endMoments: SpanEndMoments[],
    reactions: SupportReaction[]
  ): {
    shear: DiagramPoint[];
    moment: DiagramPoint[];
    deflection: DiagramPoint[];
  } {
    const shear: DiagramPoint[] = [];
    const moment: DiagramPoint[] = [];
    const deflection: DiagramPoint[] = [];

    const totalLength = this.sortedNodes[this.sortedNodes.length - 1].position;
    const numPoints = 101;
    const dx = totalLength / (numPoints - 1);

    // Track running values for integration
    let currentSpanIdx = 0;
    let baseShear = reactions[0]?.vertical ?? 0;

    for (let i = 0; i < numPoints; i++) {
      const x = i * dx;

      // Find which span this point is in
      while (
        currentSpanIdx < this.beam.spans.length - 1 &&
        x > this.sortedNodes[currentSpanIdx + 1].position
      ) {
        // Add reaction at support
        const supportReaction = reactions.find(
          (r) => Math.abs(r.position - this.sortedNodes[currentSpanIdx + 1].position) < 0.001
        );
        if (supportReaction) {
          baseShear += supportReaction.vertical;
        }
        currentSpanIdx++;
      }

      const span = this.beam.spans[currentSpanIdx];
      const spanStart = this.sortedNodes[currentSpanIdx].position;
      const localX = x - spanStart;

      // Calculate shear and moment at this point
      const { V, M } = this.calculateShearMomentAtPoint(
        span,
        localX,
        baseShear,
        endMoments.find((m) => m.spanId === span.id)!
      );

      shear.push({ x, value: V });
      moment.push({ x, value: M });

      // Deflection requires integration (simplified for now)
      // TODO: Implement proper conjugate beam or numerical integration
      deflection.push({ x, value: this.estimateDeflection(x, span, M) });
    }

    return { shear, moment, deflection };
  }

  /**
   * Calculate shear and moment at a point within a span
   */
  private calculateShearMomentAtPoint(
    span: SpanData,
    localX: number,
    baseShear: number,
    spanMoments: SpanEndMoments
  ): { V: number; M: number } {
    const spanLoads = this.beam.loads.filter((load) => load.spanId === span.id);
    const L = span.length;

    let V = baseShear;
    let M = spanMoments.mStart;

    // Add shear from end moment gradient
    V -= (spanMoments.mStart - spanMoments.mEnd) / L;

    // Add effects from loads up to this point
    for (const load of spanLoads) {
      if (isPointLoad(load)) {
        if (localX >= load.position) {
          V -= load.magnitude;
          M -= load.magnitude * (localX - load.position);
        }
      } else if (isUDL(load)) {
        if (localX > load.startPosition) {
          const effectiveEnd = Math.min(localX, load.endPosition);
          const loadedLength = effectiveEnd - load.startPosition;
          const loadForce = load.magnitude * loadedLength;
          V -= loadForce;
          M -= loadForce * (localX - load.startPosition - loadedLength / 2);
        }
      } else if (isVDL(load)) {
        // Variable distributed load (triangular/trapezoidal)
        if (localX > load.startPosition) {
          const effectiveEnd = Math.min(localX, load.endPosition);
          const loadLength = load.endPosition - load.startPosition;
          const loadedLength = effectiveEnd - load.startPosition;

          if (loadedLength > 0 && loadLength > 0) {
            // Calculate load intensity at effective end
            const t_end = loadedLength / loadLength;
            const w_end = load.w1 + (load.w2 - load.w1) * t_end;

            // Area of trapezoid from start to effectiveEnd
            const loadedArea = ((load.w1 + w_end) / 2) * loadedLength;
            V -= loadedArea;

            // Centroid of partial trapezoid from load start
            let partialCentroid: number;
            if (Math.abs(load.w1 + w_end) < 1e-10) {
              partialCentroid = loadedLength / 2;
            } else {
              partialCentroid = (loadedLength * (load.w1 + 2 * w_end)) / (3 * (load.w1 + w_end));
            }

            // Moment contribution
            const momentArm = localX - (load.startPosition + partialCentroid);
            M -= loadedArea * momentArm;
          }
        }
      } else if (isAppliedMoment(load)) {
        // Applied concentrated moment
        if (localX >= load.position) {
          M -= load.magnitude;
        }
      }
    }

    // Add base moment contribution
    M += V * localX;

    return { V, M };
  }

  /**
   * Estimate deflection at a point (simplified)
   */
  private estimateDeflection(
    x: number,
    span: SpanData,
    M: number
  ): number {
    const EI = getSpanEI(span, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
    // Very simplified estimation - proper implementation needs integration
    // This is just for visualization purposes
    const totalLength = this.sortedNodes[this.sortedNodes.length - 1].position;
    const normalizedX = x / totalLength;
    const parabola = normalizedX * (1 - normalizedX);
    return -(M * parabola * totalLength * totalLength) / (8 * EI) * 1000; // Convert to mm
  }

  /**
   * Find maximum value in diagram
   */
  private findMaxValue(
    diagram: DiagramPoint[]
  ): { value: number; position: number } {
    let maxAbs = 0;
    let maxVal = 0;
    let maxPos = 0;

    for (const point of diagram) {
      if (Math.abs(point.value) > maxAbs) {
        maxAbs = Math.abs(point.value);
        maxVal = point.value;
        maxPos = point.x;
      }
    }

    return { value: maxVal, position: maxPos };
  }

  /**
   * Generate step-by-step calculation log
   */
  private generateCalculationLog(
    femBySpan: Map<string, FixedEndMoments>,
    dofNodes: NodeData[],
    rotations: Map<string, number>,
    endMoments: SpanEndMoments[],
    reactions: SupportReaction[]
  ): CalculationLog {
    const sections: CalculationSection[] = [];

    // Section 1: Problem Setup
    sections.push(this.generateSetupSection());

    // Section 2: Fixed End Moments
    sections.push(this.generateFEMSection(femBySpan));

    // Section 3: Slope-Deflection Equations
    sections.push(this.generateSlopeDeflectionSection());

    // Section 4: Joint Equilibrium
    sections.push(this.generateEquilibriumSection(dofNodes));

    // Section 5: Solve for Rotations
    sections.push(this.generateSolutionSection(dofNodes, rotations));

    // Section 6: Final End Moments
    sections.push(this.generateEndMomentsSection(endMoments, rotations));

    // Section 7: Support Reactions
    sections.push(this.generateReactionsSection(reactions));

    return { sections };
  }

  /**
   * Generate problem setup section
   */
  private generateSetupSection(): CalculationSection {
    const steps: CalculationStep[] = [
      {
        stepNumber: 1,
        description: "Beam Configuration",
        result: `${this.beam.spans.length}-span continuous beam`,
      },
      {
        stepNumber: 2,
        description: "Span Lengths",
        result: this.beam.spans
          .map((s, i) => `L${i + 1} = ${s.length} m`)
          .join(", "),
      },
      {
        stepNumber: 3,
        description: "Support Conditions",
        result: this.sortedNodes
          .map((n) => `${n.id}: ${n.supportType}`)
          .join(", "),
      },
    ];

    // Add EI information
    const eiInfo = this.beam.spans
      .map((s, i) => {
        const ei = getSpanEI(s, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
        if (s.eiMode === "separate") {
          return `Span ${i + 1}: E=${s.E ?? this.defaultE}${s.EUnit ?? this.defaultEUnit ?? "GPa"}, I=${s.I ?? this.defaultI}${s.IUnit ?? this.defaultIUnit ?? "m4"}`;
        }
        const mult = s.iMultiplier ?? 1;
        return mult !== 1 ? `Span ${i + 1}: ${mult}EI` : `Span ${i + 1}: EI`;
      })
      .join(", ");

    steps.push({
      stepNumber: 4,
      description: "Flexural Rigidity",
      result: eiInfo,
    });

    return {
      title: "1. Problem Setup",
      description: "Define the beam configuration and properties",
      steps,
    };
  }

  /**
   * Generate FEM calculation section
   */
  private generateFEMSection(
    femBySpan: Map<string, FixedEndMoments>
  ): CalculationSection {
    const steps: CalculationStep[] = [];
    let stepNum = 1;

    for (const [spanId, fem] of Array.from(femBySpan.entries())) {
      const span = this.beam.spans.find((s) => s.id === spanId)!;
      const spanLoads = this.beam.loads.filter((l) => l.spanId === spanId);

      for (const load of spanLoads) {
        const { formula, description } = getFEMFormulaLatex(load);
        const femBreakdown = getFEMBreakdown(span, [load])[0];

        steps.push({
          stepNumber: stepNum++,
          description: description,
          formula: formula,
          result: `FEM_{start} = ${femBreakdown.femStart.toFixed(2)} kN·m, FEM_{end} = ${femBreakdown.femEnd.toFixed(2)} kN·m`,
          unit: "kN·m",
        });
      }

      // Total FEM for span
      steps.push({
        stepNumber: stepNum++,
        description: `Total FEM for ${spanId}`,
        result: `FEM_{${spanId},start} = ${fem.femStart.toFixed(2)}, FEM_{${spanId},end} = ${fem.femEnd.toFixed(2)}`,
        unit: "kN·m",
        highlight: true,
      });
    }

    return {
      title: "2. Fixed End Moments",
      description: "Calculate fixed end moments for each span due to applied loads",
      steps,
    };
  }

  /**
   * Generate slope-deflection equations section
   */
  private generateSlopeDeflectionSection(): CalculationSection {
    const steps: CalculationStep[] = [];
    let stepNum = 1;

    steps.push({
      stepNumber: stepNum++,
      description: "General slope-deflection equation",
      formula: "M_{ij} = FEM_{ij} + \\frac{2EI}{L}(2\\theta_i + \\theta_j - 3\\psi)",
    });

    for (const span of this.beam.spans) {
      const startNode = this.sortedNodes.find(
        (n) => n.id === span.nodeStartId
      )!;
      const endNode = this.sortedNodes.find((n) => n.id === span.nodeEndId)!;
      const mult = span.iMultiplier ?? 1;
      const eiStr = mult !== 1 ? `${mult}EI` : "EI";

      steps.push({
        stepNumber: stepNum++,
        description: `End moment M_{${span.nodeStartId}${span.nodeEndId}}`,
        formula: `M_{${span.nodeStartId}${span.nodeEndId}} = FEM_{${span.nodeStartId}${span.nodeEndId}} + \\frac{2(${eiStr})}{${span.length}}(2\\theta_{${span.nodeStartId}} + \\theta_{${span.nodeEndId}})`,
      });

      steps.push({
        stepNumber: stepNum++,
        description: `End moment M_{${span.nodeEndId}${span.nodeStartId}}`,
        formula: `M_{${span.nodeEndId}${span.nodeStartId}} = FEM_{${span.nodeEndId}${span.nodeStartId}} + \\frac{2(${eiStr})}{${span.length}}(2\\theta_{${span.nodeEndId}} + \\theta_{${span.nodeStartId}})`,
      });
    }

    return {
      title: "3. Slope-Deflection Equations",
      description: "Express end moments in terms of unknown rotations",
      steps,
    };
  }

  /**
   * Generate joint equilibrium section
   */
  private generateEquilibriumSection(dofNodes: NodeData[]): CalculationSection {
    const steps: CalculationStep[] = [];
    let stepNum = 1;

    for (const node of dofNodes) {
      const spansAtNode = this.findSpansAtNode(node.id);

      if (spansAtNode.length === 0) continue;

      const momentTerms = spansAtNode
        .map(({ span, isStart }) => {
          const otherNodeId = isStart ? span.nodeEndId : span.nodeStartId;
          return `M_{${node.id}${otherNodeId}}`;
        })
        .join(" + ");

      steps.push({
        stepNumber: stepNum++,
        description: `Equilibrium at joint ${node.id}`,
        formula: `\\sum M_{${node.id}} = 0 \\Rightarrow ${momentTerms} = 0`,
      });
    }

    return {
      title: "4. Joint Equilibrium Equations",
      description: "Apply moment equilibrium at each joint with unknown rotation",
      steps,
    };
  }

  /**
   * Generate solution section
   */
  private generateSolutionSection(
    dofNodes: NodeData[],
    rotations: Map<string, number>
  ): CalculationSection {
    const steps: CalculationStep[] = [];

    if (dofNodes.length === 0) {
      steps.push({
        stepNumber: 1,
        description: "All rotations are known (fixed supports)",
        result: "θ = 0 for all joints",
      });
    } else {
      steps.push({
        stepNumber: 1,
        description: "System of equations in matrix form",
        formula: "[K]\\{\\theta\\} = \\{F\\}",
      });

      steps.push({
        stepNumber: 2,
        description: "Solve using Gaussian elimination",
      });

      let stepNum = 3;
      for (const node of dofNodes) {
        const theta = rotations.get(node.id) ?? 0;
        steps.push({
          stepNumber: stepNum++,
          description: `Rotation at ${node.id}`,
          result: theta.toExponential(4),
          unit: "rad",
          highlight: true,
        });
      }
    }

    return {
      title: "5. Solve for Joint Rotations",
      description: "Solve the system of equilibrium equations",
      steps,
    };
  }

  /**
   * Generate final end moments section
   */
  private generateEndMomentsSection(
    endMoments: SpanEndMoments[],
    rotations: Map<string, number>
  ): CalculationSection {
    const steps: CalculationStep[] = [];
    let stepNum = 1;

    for (const em of endMoments) {
      const span = this.beam.spans.find((s) => s.id === em.spanId)!;

      steps.push({
        stepNumber: stepNum++,
        description: `M_{${span.nodeStartId}${span.nodeEndId}}`,
        result: em.mStart.toFixed(2),
        unit: "kN·m",
        highlight: true,
      });

      steps.push({
        stepNumber: stepNum++,
        description: `M_{${span.nodeEndId}${span.nodeStartId}}`,
        result: em.mEnd.toFixed(2),
        unit: "kN·m",
        highlight: true,
      });
    }

    return {
      title: "6. Final Member End Moments",
      description: "Substitute rotations back into slope-deflection equations",
      steps,
    };
  }

  /**
   * Generate reactions section
   */
  private generateReactionsSection(
    reactions: SupportReaction[]
  ): CalculationSection {
    const steps: CalculationStep[] = [];
    let stepNum = 1;

    for (const reaction of reactions) {
      steps.push({
        stepNumber: stepNum++,
        description: `Vertical reaction at ${reaction.nodeId}`,
        result: reaction.vertical.toFixed(2),
        unit: "kN",
        highlight: true,
      });

      if (reaction.moment !== undefined) {
        steps.push({
          stepNumber: stepNum++,
          description: `Moment reaction at ${reaction.nodeId}`,
          result: reaction.moment.toFixed(2),
          unit: "kN·m",
          highlight: true,
        });
      }
    }

    // Verification
    const totalReaction = reactions.reduce((sum, r) => sum + r.vertical, 0);
    steps.push({
      stepNumber: stepNum++,
      description: "Total vertical reaction (verification)",
      result: totalReaction.toFixed(2),
      unit: "kN",
    });

    return {
      title: "7. Support Reactions",
      description: "Calculate reactions using equilibrium",
      steps,
    };
  }
}
