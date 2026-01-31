/**
 * Frame Solver using Slope-Deflection / Stiffness Method
 * Supports sway and non-sway frames, variable EI, multi-bay/multi-story
 */

import {
  FrameData,
  FrameNodeData,
  FrameMemberData,
  FrameLoad,
  FrameSolverResult,
  MemberEndForces,
  NodeDisplacement,
  FrameReaction,
  MemberDiagram,
  getMemberLength,
  getMemberAngle,
  getMemberEI,
  getMemberEA,
  isJointLoad,
  isMemberUDL,
  isMemberVDL,
  isMemberPointLoad,
} from "@/lib/types/frame";
import { CalculationLog, CalculationSection, CalculationStep } from "@/lib/types/beam";
import { calculateMemberFEM, FrameFEMResult } from "./fem";
import {
  Matrix,
  Vector,
  createZeroMatrix,
  createZeroVector,
  solveLinearSystem,
  transposeMatrix,
  multiplyMatrices,
  multiplyMatrixVector,
  addMatrices,
} from "@/lib/solver/beam/linearAlgebra";

/**
 * DOF mapping for frame nodes
 * Each node has up to 3 DOFs: dx, dy, rotation
 * Fixed supports: 0 DOFs
 * Pinned supports: 1 DOF (rotation)
 * Roller supports: 2 DOFs (rotation + one translation)
 * Free joints: 3 DOFs (dx, dy, rotation)
 */
interface DOFMapping {
  nodeId: string;
  dxDOF: number | null; // DOF index for horizontal displacement, null if restrained
  dyDOF: number | null; // DOF index for vertical displacement, null if restrained
  rotDOF: number | null; // DOF index for rotation, null if restrained
}

export class FrameAnalysisSolver {
  private frame!: FrameData;
  private defaultEI!: number;
  private defaultE?: number;
  private defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  private defaultI?: number;
  private defaultIUnit?: "m4" | "mm4" | "cm4";
  private defaultA?: number;
  private defaultAUnit?: "m2" | "mm2" | "cm2";
  private dofMappings: DOFMapping[] = [];
  private totalDOFs!: number;
  private memberFEMs: Map<string, FrameFEMResult> = new Map();
  private swayDOFs: number[] = []; // Track which DOFs are sway DOFs

  /**
   * Main solve method
   */
  solve(frame: FrameData): FrameSolverResult {
    this.frame = frame;
    this.defaultEI = frame.defaultEI ?? 50000;
    this.defaultE = frame.defaultE;
    this.defaultEUnit = frame.defaultEUnit;
    this.defaultI = frame.defaultI;
    this.defaultIUnit = frame.defaultIUnit;
    this.defaultA = frame.defaultA;
    this.defaultAUnit = frame.defaultAUnit;

    // 1. Assign DOFs
    this.assignDOFs();

    // 2. Calculate member FEMs
    this.calculateAllFEM();

    // 3. Build global stiffness matrix
    const K = this.buildGlobalStiffnessMatrix();

    // 4. Build load vector (joint loads + FEM contributions)
    const F = this.buildGlobalLoadVector();

    // 5. Solve for displacements
    let displacements: Vector;
    if (this.totalDOFs > 0) {
      displacements = solveLinearSystem(K, F);
    } else {
      displacements = [];
    }

    // 6. Extract node displacements
    const nodeDisplacements = this.extractNodeDisplacements(displacements);

    // 7. Calculate member end forces
    const memberForces = this.calculateMemberForces(displacements);

    // 8. Calculate reactions
    const reactions = this.calculateReactions(displacements);

    // 9. Generate member diagrams
    const memberDiagrams = this.generateMemberDiagrams(memberForces);

    // 10. Generate calculation log
    const calculationLog = this.generateCalculationLog(
      displacements,
      nodeDisplacements,
      memberForces,
      reactions
    );

    // 11. Find max values
    const maxMoment = this.findMaxMemberValue(memberForces, "moment");
    const maxShear = this.findMaxMemberValue(memberForces, "shear");
    const maxAxial = this.findMaxMemberValue(memberForces, "axial");
    const maxDrift = this.calculateMaxDrift(nodeDisplacements);

    // 12. Sway displacement
    let swayDisplacement: number | undefined;
    if (frame.isSway) {
      swayDisplacement = this.findMaxSway(nodeDisplacements);
    }

    return {
      nodeDisplacements,
      swayDisplacement,
      memberForces,
      reactions,
      memberDiagrams,
      maxMoment,
      maxShear,
      maxAxial,
      maxDrift,
      calculationLog,
    };
  }

  /**
   * Assign DOFs to each node
   * For sway frames: horizontal DOFs at each level are coupled (sway DOFs)
   * For non-sway frames: each node has independent DOFs
   */
  private assignDOFs(): void {
    this.dofMappings = [];
    this.swayDOFs = [];
    let dofIndex = 0;

    // For sway frames, we may want to identify sway DOFs per story
    const storySwayDOFs: Map<number, number> = new Map();

    for (const node of this.frame.nodes) {
      const mapping: DOFMapping = {
        nodeId: node.id,
        dxDOF: null,
        dyDOF: null,
        rotDOF: null,
      };

      if (!node.support) {
        // Free joint: 3 DOFs
        if (this.frame.isSway && node.storyIndex !== undefined && node.storyIndex > 0) {
          // For sway frames, nodes at same story share horizontal DOF
          // This enforces rigid diaphragm assumption
          if (!storySwayDOFs.has(node.storyIndex)) {
            storySwayDOFs.set(node.storyIndex, dofIndex);
            this.swayDOFs.push(dofIndex);
            dofIndex++;
          }
          mapping.dxDOF = storySwayDOFs.get(node.storyIndex)!;
        } else {
          mapping.dxDOF = dofIndex++;
        }
        mapping.dyDOF = dofIndex++;
        mapping.rotDOF = dofIndex++;
      } else if (node.support === "fixed") {
        // Fixed: 0 DOFs (all restrained)
      } else if (node.support === "pinned") {
        // Pinned: rotation is free
        mapping.rotDOF = dofIndex++;
      } else if (node.support === "roller") {
        // Roller: rotation free, one translation free
        // Determine direction based on roller orientation (default: horizontal free)
        mapping.dxDOF = dofIndex++;
        mapping.rotDOF = dofIndex++;
      }

      this.dofMappings.push(mapping);
    }

    this.totalDOFs = dofIndex;
  }

  /**
   * Get DOF mapping for a node
   */
  private getDOFMapping(nodeId: string): DOFMapping | undefined {
    return this.dofMappings.find((m) => m.nodeId === nodeId);
  }

  /**
   * Calculate FEMs for all members
   */
  private calculateAllFEM(): void {
    this.memberFEMs.clear();
    for (const member of this.frame.members) {
      const fem = calculateMemberFEM(
        member,
        this.frame.loads,
        this.frame.nodes
      );
      this.memberFEMs.set(member.id, fem);
    }
  }

  /**
   * Build member stiffness matrix in local coordinates (6x6)
   * DOFs: [u1, v1, θ1, u2, v2, θ2]
   * u = axial, v = transverse, θ = rotation
   *
   * Supports:
   * - Inclined members (handled via transformation matrix)
   * - Member end releases (hinges)
   * - Variable EI along member (separate E and I)
   */
  private buildLocalStiffnessMatrix(member: FrameMemberData): Matrix {
    const L = getMemberLength(member, this.frame.nodes);
    const EI = getMemberEI(member, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
    const EA = getMemberEA(member, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultA, this.defaultAUnit);

    const L2 = L * L;
    const L3 = L2 * L;

    // 6x6 beam element stiffness matrix
    let k: Matrix = createZeroMatrix(6, 6);

    // Check for member end releases (hinges)
    const hasStartHinge = member.releaseStart === true;
    const hasEndHinge = member.releaseEnd === true;

    if (hasStartHinge && hasEndHinge) {
      // Both ends released - member acts as a truss (axial only)
      k[0][0] = EA / L;
      k[0][3] = -EA / L;
      k[3][0] = -EA / L;
      k[3][3] = EA / L;
    } else if (hasStartHinge) {
      // Hinge at start - modified stiffness
      // Axial terms
      k[0][0] = EA / L;
      k[0][3] = -EA / L;
      k[3][0] = -EA / L;
      k[3][3] = EA / L;

      // Flexural terms (modified for hinge at start)
      k[1][1] = 3 * EI / L3;
      k[1][4] = -3 * EI / L3;
      k[1][5] = 3 * EI / L2;

      k[4][1] = -3 * EI / L3;
      k[4][4] = 3 * EI / L3;
      k[4][5] = -3 * EI / L2;

      k[5][1] = 3 * EI / L2;
      k[5][4] = -3 * EI / L2;
      k[5][5] = 3 * EI / L;
    } else if (hasEndHinge) {
      // Hinge at end - modified stiffness
      // Axial terms
      k[0][0] = EA / L;
      k[0][3] = -EA / L;
      k[3][0] = -EA / L;
      k[3][3] = EA / L;

      // Flexural terms (modified for hinge at end)
      k[1][1] = 3 * EI / L3;
      k[1][2] = 3 * EI / L2;
      k[1][4] = -3 * EI / L3;

      k[2][1] = 3 * EI / L2;
      k[2][2] = 3 * EI / L;
      k[2][4] = -3 * EI / L2;

      k[4][1] = -3 * EI / L3;
      k[4][2] = -3 * EI / L2;
      k[4][4] = 3 * EI / L3;
    } else {
      // No releases - standard beam-column element
      // Axial terms
      k[0][0] = EA / L;
      k[0][3] = -EA / L;
      k[3][0] = -EA / L;
      k[3][3] = EA / L;

      // Flexural terms
      k[1][1] = 12 * EI / L3;
      k[1][2] = 6 * EI / L2;
      k[1][4] = -12 * EI / L3;
      k[1][5] = 6 * EI / L2;

      k[2][1] = 6 * EI / L2;
      k[2][2] = 4 * EI / L;
      k[2][4] = -6 * EI / L2;
      k[2][5] = 2 * EI / L;

      k[4][1] = -12 * EI / L3;
      k[4][2] = -6 * EI / L2;
      k[4][4] = 12 * EI / L3;
      k[4][5] = -6 * EI / L2;

      k[5][1] = 6 * EI / L2;
      k[5][2] = 2 * EI / L;
      k[5][4] = -6 * EI / L2;
      k[5][5] = 4 * EI / L;
    }

    return k;
  }

  /**
   * Build transformation matrix from local to global coordinates
   *
   * For a member inclined at angle θ from horizontal:
   * Local axes: x along member (axial), y perpendicular (transverse)
   * Global axes: X horizontal, Y vertical
   *
   * The transformation relates local displacements to global:
   * {d_local} = [T] {d_global}
   *
   * For forces: {F_global} = [T]^T {F_local}
   *
   * The 6x6 transformation matrix consists of two 3x3 rotation matrices
   * for the two nodes of the element.
   */
  private buildTransformationMatrix(member: FrameMemberData): Matrix {
    const angle = getMemberAngle(member, this.frame.nodes);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // 6x6 transformation matrix
    // Transforms from global [dx, dy, θ] to local [u, v, θ]
    // Local u = global dx*cos + global dy*sin (along member)
    // Local v = -global dx*sin + global dy*cos (perpendicular to member)
    // Local θ = global θ (rotation unchanged)
    const T: Matrix = createZeroMatrix(6, 6);

    // Node 1 (start)
    T[0][0] = c;   // u1 from dx1
    T[0][1] = s;   // u1 from dy1
    T[1][0] = -s;  // v1 from dx1
    T[1][1] = c;   // v1 from dy1
    T[2][2] = 1;   // θ1 = θ1

    // Node 2 (end)
    T[3][3] = c;   // u2 from dx2
    T[3][4] = s;   // u2 from dy2
    T[4][3] = -s;  // v2 from dx2
    T[4][4] = c;   // v2 from dy2
    T[5][5] = 1;   // θ2 = θ2

    return T;
  }

  /**
   * Get member properties for calculation log
   */
  private getMemberProperties(member: FrameMemberData): {
    length: number;
    angle: number;
    angleDeg: number;
    EI: number;
    EA: number;
  } {
    const length = getMemberLength(member, this.frame.nodes);
    const angle = getMemberAngle(member, this.frame.nodes);
    const EI = getMemberEI(member, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultI, this.defaultIUnit);
    const EA = getMemberEA(member, this.defaultEI, this.defaultE, this.defaultEUnit, this.defaultA, this.defaultAUnit);

    return {
      length,
      angle,
      angleDeg: (angle * 180) / Math.PI,
      EI,
      EA,
    };
  }

  /**
   * Build global stiffness matrix
   */
  private buildGlobalStiffnessMatrix(): Matrix {
    const K = createZeroMatrix(this.totalDOFs, this.totalDOFs);

    for (const member of this.frame.members) {
      const kLocal = this.buildLocalStiffnessMatrix(member);
      const T = this.buildTransformationMatrix(member);
      const TT = transposeMatrix(T);

      // K_global = T^T * K_local * T
      const kGlobal = multiplyMatrices(
        multiplyMatrices(TT, kLocal),
        T
      );

      // Get DOF indices for start and end nodes
      const startMapping = this.getDOFMapping(member.nodeStartId);
      const endMapping = this.getDOFMapping(member.nodeEndId);

      if (!startMapping || !endMapping) continue;

      // Map local DOFs [0,1,2,3,4,5] to global DOFs
      const globalDOFs: (number | null)[] = [
        startMapping.dxDOF,
        startMapping.dyDOF,
        startMapping.rotDOF,
        endMapping.dxDOF,
        endMapping.dyDOF,
        endMapping.rotDOF,
      ];

      // Assemble into global matrix
      for (let i = 0; i < 6; i++) {
        const gi = globalDOFs[i];
        if (gi === null) continue;

        for (let j = 0; j < 6; j++) {
          const gj = globalDOFs[j];
          if (gj === null) continue;

          K[gi][gj] += kGlobal[i][j];
        }
      }
    }

    return K;
  }

  /**
   * Build global load vector
   */
  private buildGlobalLoadVector(): Vector {
    const F = createZeroVector(this.totalDOFs);

    // Add joint loads
    for (const load of this.frame.loads) {
      if (isJointLoad(load)) {
        const mapping = this.getDOFMapping(load.nodeId);
        if (!mapping) continue;

        if (load.fx !== undefined && mapping.dxDOF !== null) {
          F[mapping.dxDOF] += load.fx;
        }
        if (load.fy !== undefined && mapping.dyDOF !== null) {
          F[mapping.dyDOF] += load.fy;
        }
        if (load.moment !== undefined && mapping.rotDOF !== null) {
          F[mapping.rotDOF] += load.moment;
        }
      }
    }

    // Add equivalent nodal loads from member FEMs
    for (const member of this.frame.members) {
      const fem = this.memberFEMs.get(member.id);
      if (!fem) continue;

      const T = this.buildTransformationMatrix(member);
      const TT = transposeMatrix(T);

      // Local fixed-end forces (negative because we move them to RHS)
      const fLocal: Vector = [
        -fem.fixedAxialStart,
        -fem.fixedShearStart,
        -fem.femStart,
        -fem.fixedAxialEnd,
        -fem.fixedShearEnd,
        -fem.femEnd,
      ];

      // Transform to global: F_global = T^T * F_local
      const fGlobal = multiplyMatrixVector(TT, fLocal);

      const startMapping = this.getDOFMapping(member.nodeStartId);
      const endMapping = this.getDOFMapping(member.nodeEndId);

      if (!startMapping || !endMapping) continue;

      const globalDOFs: (number | null)[] = [
        startMapping.dxDOF,
        startMapping.dyDOF,
        startMapping.rotDOF,
        endMapping.dxDOF,
        endMapping.dyDOF,
        endMapping.rotDOF,
      ];

      for (let i = 0; i < 6; i++) {
        const gi = globalDOFs[i];
        if (gi === null) continue;
        F[gi] += fGlobal[i];
      }
    }

    return F;
  }

  /**
   * Extract node displacements from DOF solution
   */
  private extractNodeDisplacements(displacements: Vector): NodeDisplacement[] {
    return this.frame.nodes.map((node) => {
      const mapping = this.getDOFMapping(node.id);
      if (!mapping) {
        return { nodeId: node.id, dx: 0, dy: 0, rotation: 0 };
      }

      return {
        nodeId: node.id,
        dx: mapping.dxDOF !== null ? displacements[mapping.dxDOF] : 0,
        dy: mapping.dyDOF !== null ? displacements[mapping.dyDOF] : 0,
        rotation: mapping.rotDOF !== null ? displacements[mapping.rotDOF] : 0,
      };
    });
  }

  /**
   * Calculate member end forces from displacements
   */
  private calculateMemberForces(displacements: Vector): MemberEndForces[] {
    const results: MemberEndForces[] = [];

    for (const member of this.frame.members) {
      const kLocal = this.buildLocalStiffnessMatrix(member);
      const T = this.buildTransformationMatrix(member);

      const startMapping = this.getDOFMapping(member.nodeStartId);
      const endMapping = this.getDOFMapping(member.nodeEndId);

      if (!startMapping || !endMapping) continue;

      // Get global displacements for this member
      const globalDOFs: (number | null)[] = [
        startMapping.dxDOF,
        startMapping.dyDOF,
        startMapping.rotDOF,
        endMapping.dxDOF,
        endMapping.dyDOF,
        endMapping.rotDOF,
      ];

      const dGlobal: Vector = globalDOFs.map((gi) =>
        gi !== null ? displacements[gi] : 0
      );

      // Transform to local: d_local = T * d_global
      const dLocal = multiplyMatrixVector(T, dGlobal);

      // Member forces in local: f = K_local * d_local + f_fixed
      const fFromDisp = multiplyMatrixVector(kLocal, dLocal);

      const fem = this.memberFEMs.get(member.id);

      results.push({
        memberId: member.id,
        axialStart: fFromDisp[0] + (fem?.fixedAxialStart ?? 0),
        shearStart: fFromDisp[1] + (fem?.fixedShearStart ?? 0),
        momentStart: fFromDisp[2] + (fem?.femStart ?? 0),
        axialEnd: fFromDisp[3] + (fem?.fixedAxialEnd ?? 0),
        shearEnd: fFromDisp[4] + (fem?.fixedShearEnd ?? 0),
        momentEnd: fFromDisp[5] + (fem?.femEnd ?? 0),
      });
    }

    return results;
  }

  /**
   * Calculate support reactions
   */
  private calculateReactions(displacements: Vector): FrameReaction[] {
    const reactions: FrameReaction[] = [];

    for (const node of this.frame.nodes) {
      if (!node.support) continue;

      let fx = 0;
      let fy = 0;
      let moment: number | undefined;

      // Sum forces from connected members at this node
      for (const member of this.frame.members) {
        if (
          member.nodeStartId !== node.id &&
          member.nodeEndId !== node.id
        )
          continue;

        const isStart = member.nodeStartId === node.id;
        const kLocal = this.buildLocalStiffnessMatrix(member);
        const T = this.buildTransformationMatrix(member);
        const TT = transposeMatrix(T);

        const startMapping = this.getDOFMapping(member.nodeStartId);
        const endMapping = this.getDOFMapping(member.nodeEndId);

        if (!startMapping || !endMapping) continue;

        const globalDOFs: (number | null)[] = [
          startMapping.dxDOF,
          startMapping.dyDOF,
          startMapping.rotDOF,
          endMapping.dxDOF,
          endMapping.dyDOF,
          endMapping.rotDOF,
        ];

        const dGlobal: Vector = globalDOFs.map((gi) =>
          gi !== null ? displacements[gi] : 0
        );

        const dLocal = multiplyMatrixVector(T, dGlobal);
        const fLocal = multiplyMatrixVector(kLocal, dLocal);

        // Add fixed-end forces
        const fem = this.memberFEMs.get(member.id);
        if (fem) {
          fLocal[0] += fem.fixedAxialStart;
          fLocal[1] += fem.fixedShearStart;
          fLocal[2] += fem.femStart;
          fLocal[3] += fem.fixedAxialEnd;
          fLocal[4] += fem.fixedShearEnd;
          fLocal[5] += fem.femEnd;
        }

        // Transform forces to global
        const fGlobal = multiplyMatrixVector(TT, fLocal);

        if (isStart) {
          fx += fGlobal[0];
          fy += fGlobal[1];
          if (node.support === "fixed") {
            moment = (moment ?? 0) + fGlobal[2];
          }
        } else {
          fx += fGlobal[3];
          fy += fGlobal[4];
          if (node.support === "fixed") {
            moment = (moment ?? 0) + fGlobal[5];
          }
        }
      }

      // Subtract applied joint loads to get reactions
      for (const load of this.frame.loads) {
        if (isJointLoad(load) && load.nodeId === node.id) {
          if (load.fx !== undefined) fx -= load.fx;
          if (load.fy !== undefined) fy -= load.fy;
          if (load.moment !== undefined && moment !== undefined) {
            moment -= load.moment;
          }
        }
      }

      reactions.push({
        nodeId: node.id,
        fx,
        fy,
        moment,
      });
    }

    return reactions;
  }

  /**
   * Generate member diagrams
   * Properly handles inclined members and all load types including VDL
   */
  private generateMemberDiagrams(
    memberForces: MemberEndForces[]
  ): MemberDiagram[] {
    const diagrams: MemberDiagram[] = [];

    for (const member of this.frame.members) {
      const forces = memberForces.find((f) => f.memberId === member.id);
      if (!forces) continue;

      const L = getMemberLength(member, this.frame.nodes);
      const numPoints = 21;
      const dx = L / (numPoints - 1);

      const axialForce: Array<{ position: number; value: number }> = [];
      const shearForce: Array<{ position: number; value: number }> = [];
      const bendingMoment: Array<{ position: number; value: number }> = [];

      // Get all loads on this member
      const memberLoads = this.frame.loads.filter(
        (load) => "memberId" in load && load.memberId === member.id
      );

      for (let i = 0; i < numPoints; i++) {
        const x = i * dx;

        // Axial force (constant along member unless there are axial loads)
        let N = forces.axialStart;
        axialForce.push({ position: x, value: N });

        // Shear and moment vary with loads
        let V = forces.shearStart;
        let M = forces.momentStart;

        // Add effects of member loads
        for (const load of memberLoads) {
          if (isMemberPointLoad(load)) {
            const loadPos = load.position * L;
            if (x >= loadPos) {
              V -= load.magnitude;
            }
            // Moment contribution will be handled by integration
          } else if (isMemberUDL(load)) {
            const startPos = load.startPosition * L;
            const endPos = load.endPosition * L;
            if (x > startPos) {
              const effectiveEnd = Math.min(x, endPos);
              const loadedLength = effectiveEnd - startPos;
              V -= load.magnitude * loadedLength;
            }
          } else if (isMemberVDL(load)) {
            // Variable distributed load (triangular/trapezoidal)
            const startPos = load.startPosition * L;
            const endPos = load.endPosition * L;
            const loadLength = endPos - startPos;

            if (x > startPos && loadLength > 0) {
              const effectiveEnd = Math.min(x, endPos);
              const loadedLength = effectiveEnd - startPos;

              // Calculate load intensity at effective end
              const t_end = loadedLength / loadLength;
              const w_end = load.w1 + (load.w2 - load.w1) * t_end;

              // Area of trapezoid from start to effectiveEnd
              const loadedArea = ((load.w1 + w_end) / 2) * loadedLength;
              V -= loadedArea;
            }
          }
        }

        // Calculate moment using integration from start
        // M(x) = M_start + integral(V(x))dx from 0 to x
        // For accurate results, we use trapezoidal integration
        if (i === 0) {
          M = forces.momentStart;
        } else {
          // Trapezoidal integration of shear to get moment
          const prevX = (i - 1) * dx;
          const prevV = shearForce[i - 1]?.value ?? forces.shearStart;
          const prevM = bendingMoment[i - 1]?.value ?? forces.momentStart;
          M = prevM + ((prevV + V) / 2) * dx;
        }

        shearForce.push({ position: x, value: V });
        bendingMoment.push({ position: x, value: M });
      }

      diagrams.push({
        memberId: member.id,
        memberType: member.memberType,
        length: L,
        axialForce,
        shearForce,
        bendingMoment,
      });
    }

    return diagrams;
  }

  /**
   * Find max value across all members
   */
  private findMaxMemberValue(
    forces: MemberEndForces[],
    type: "moment" | "shear" | "axial"
  ): { memberId: string; value: number; position: number } {
    let maxVal = 0;
    let maxMemberId = "";
    let maxPos = 0;

    for (const f of forces) {
      let startVal: number;
      let endVal: number;

      if (type === "moment") {
        startVal = Math.abs(f.momentStart);
        endVal = Math.abs(f.momentEnd);
      } else if (type === "shear") {
        startVal = Math.abs(f.shearStart);
        endVal = Math.abs(f.shearEnd);
      } else {
        startVal = Math.abs(f.axialStart);
        endVal = Math.abs(f.axialEnd);
      }

      if (startVal > maxVal) {
        maxVal = startVal;
        maxMemberId = f.memberId;
        maxPos = 0;
      }
      if (endVal > maxVal) {
        maxVal = endVal;
        maxMemberId = f.memberId;
        maxPos = 1;
      }
    }

    return {
      memberId: maxMemberId,
      value: maxVal,
      position: maxPos,
    };
  }

  /**
   * Calculate max inter-story drift
   */
  private calculateMaxDrift(
    nodeDisplacements: NodeDisplacement[]
  ): { storyIndex: number; value: number } {
    let maxDrift = 0;
    let maxStory = 0;

    if (!this.frame.storyHeights) {
      return { storyIndex: 0, value: 0 };
    }

    for (let story = 0; story < (this.frame.stories ?? 0); story++) {
      const nodesBelow = this.frame.nodes.filter(
        (n) => n.storyIndex === story
      );
      const nodesAbove = this.frame.nodes.filter(
        (n) => n.storyIndex === story + 1
      );

      if (nodesBelow.length === 0 || nodesAbove.length === 0) continue;

      const avgDxBelow =
        nodesBelow.reduce((sum, n) => {
          const disp = nodeDisplacements.find((d) => d.nodeId === n.id);
          return sum + (disp?.dx ?? 0);
        }, 0) / nodesBelow.length;

      const avgDxAbove =
        nodesAbove.reduce((sum, n) => {
          const disp = nodeDisplacements.find((d) => d.nodeId === n.id);
          return sum + (disp?.dx ?? 0);
        }, 0) / nodesAbove.length;

      const storyHeight = this.frame.storyHeights[story] ?? 3;
      const drift = Math.abs(avgDxAbove - avgDxBelow) / storyHeight;

      if (drift > maxDrift) {
        maxDrift = drift;
        maxStory = story + 1;
      }
    }

    return { storyIndex: maxStory, value: maxDrift };
  }

  /**
   * Find maximum sway displacement
   */
  private findMaxSway(displacements: NodeDisplacement[]): number {
    let maxSway = 0;
    for (const d of displacements) {
      if (Math.abs(d.dx) > Math.abs(maxSway)) {
        maxSway = d.dx;
      }
    }
    return maxSway;
  }

  /**
   * Generate calculation log
   */
  private generateCalculationLog(
    displacements: Vector,
    nodeDisplacements: NodeDisplacement[],
    memberForces: MemberEndForces[],
    reactions: FrameReaction[]
  ): CalculationLog {
    const sections: CalculationSection[] = [];

    // Section 1: Problem Setup
    const memberDetails = this.frame.members.map((m) => {
      const props = this.getMemberProperties(m);
      const angleStr = Math.abs(props.angleDeg) < 0.1 ? "horizontal" :
        Math.abs(props.angleDeg - 90) < 0.1 || Math.abs(props.angleDeg + 90) < 0.1 ? "vertical" :
        `${props.angleDeg.toFixed(1)}°`;
      const eiStr = m.eiMode === "separate" ?
        `E=${m.E ?? this.defaultE}${m.EUnit ?? "GPa"}, I=${m.I ?? this.defaultI}${m.IUnit ?? "m4"}` :
        `${m.iMultiplier ?? 1}EI`;
      return `${m.id} (${m.memberType}, ${angleStr}, ${eiStr})`;
    });

    sections.push({
      title: "1. Frame Configuration",
      description: "Define the frame geometry and properties",
      steps: [
        {
          stepNumber: 1,
          description: "Frame type",
          result: this.frame.isSway ? "Sway frame (lateral displacement allowed)" : "Non-sway (braced) frame",
        },
        {
          stepNumber: 2,
          description: "Geometry",
          result: `${this.frame.bays ?? "?"} bay(s), ${this.frame.stories ?? "?"} story(ies)`,
        },
        {
          stepNumber: 3,
          description: "Total DOFs",
          result: `${this.totalDOFs} unknowns${this.swayDOFs.length > 0 ? ` (${this.swayDOFs.length} sway DOFs)` : ""}`,
        },
        {
          stepNumber: 4,
          description: "Members",
          result: memberDetails.slice(0, 5).join("; ") + (memberDetails.length > 5 ? ` ... (${memberDetails.length} total)` : ""),
        },
      ],
    });

    // Add section for inclined members if any
    const inclinedMembers = this.frame.members.filter((m) => {
      const angle = getMemberAngle(m, this.frame.nodes);
      const angleDeg = (angle * 180) / Math.PI;
      return Math.abs(angleDeg) > 0.1 && Math.abs(angleDeg - 90) > 0.1 && Math.abs(angleDeg + 90) > 0.1;
    });

    if (inclinedMembers.length > 0) {
      sections.push({
        title: "1a. Inclined Members",
        description: "Members with inclination requiring coordinate transformation",
        steps: inclinedMembers.map((m, idx) => {
          const props = this.getMemberProperties(m);
          return {
            stepNumber: idx + 1,
            description: `Member ${m.id}`,
            result: `L = ${props.length.toFixed(2)} m, θ = ${props.angleDeg.toFixed(1)}°`,
            formula: `\\cos\\theta = ${Math.cos(props.angle).toFixed(4)}, \\sin\\theta = ${Math.sin(props.angle).toFixed(4)}`,
          };
        }),
      });
    }

    // Section 2: FEM
    const femSteps: CalculationStep[] = [];
    let stepNum = 1;
    for (const [memberId, fem] of Array.from(this.memberFEMs.entries())) {
      if (Math.abs(fem.femStart) > 0.001 || Math.abs(fem.femEnd) > 0.001) {
        femSteps.push({
          stepNumber: stepNum++,
          description: `Member ${memberId}`,
          result: `FEM_start = ${fem.femStart.toFixed(2)}, FEM_end = ${fem.femEnd.toFixed(2)} kN·m`,
          highlight: true,
        });
      }
    }
    if (femSteps.length > 0) {
      sections.push({
        title: "2. Fixed End Moments",
        description: "Calculate FEMs for member loads",
        steps: femSteps,
      });
    }

    // Section 3: Stiffness equations
    sections.push({
      title: "3. Stiffness Equations",
      description: "Build global stiffness matrix and solve",
      steps: [
        {
          stepNumber: 1,
          description: "Global stiffness matrix assembled",
          formula: "[K]\\{D\\} = \\{F\\}",
        },
        {
          stepNumber: 2,
          description: "System size",
          result: `${this.totalDOFs} × ${this.totalDOFs} matrix`,
        },
      ],
    });

    // Section 4: Joint Displacements
    const dispSteps: CalculationStep[] = [];
    stepNum = 1;
    for (const nd of nodeDisplacements) {
      if (
        Math.abs(nd.dx) > 1e-8 ||
        Math.abs(nd.dy) > 1e-8 ||
        Math.abs(nd.rotation) > 1e-8
      ) {
        dispSteps.push({
          stepNumber: stepNum++,
          description: `Node ${nd.nodeId}`,
          result: `dx = ${(nd.dx * 1000).toFixed(4)} mm, dy = ${(nd.dy * 1000).toFixed(4)} mm, θ = ${nd.rotation.toExponential(4)} rad`,
          highlight: true,
        });
      }
    }
    sections.push({
      title: "4. Joint Displacements",
      description: "Solved displacements at each node",
      steps:
        dispSteps.length > 0
          ? dispSteps
          : [{ stepNumber: 1, description: "All joints restrained", result: "0" }],
    });

    // Section 5: Member End Forces
    const forceSteps: CalculationStep[] = [];
    stepNum = 1;
    for (const mf of memberForces) {
      forceSteps.push({
        stepNumber: stepNum++,
        description: `Member ${mf.memberId}`,
        result: `M_start = ${mf.momentStart.toFixed(2)}, M_end = ${mf.momentEnd.toFixed(2)} kN·m | V_start = ${mf.shearStart.toFixed(2)}, V_end = ${mf.shearEnd.toFixed(2)} kN`,
        highlight: true,
      });
    }
    sections.push({
      title: "5. Member End Forces",
      description: "Calculate forces from displacements",
      steps: forceSteps,
    });

    // Section 6: Support Reactions
    const reactSteps: CalculationStep[] = [];
    stepNum = 1;
    for (const r of reactions) {
      reactSteps.push({
        stepNumber: stepNum++,
        description: `Support ${r.nodeId}`,
        result: `Fx = ${r.fx.toFixed(2)} kN, Fy = ${r.fy.toFixed(2)} kN${r.moment !== undefined ? `, M = ${r.moment.toFixed(2)} kN·m` : ""}`,
        highlight: true,
      });
    }
    sections.push({
      title: "6. Support Reactions",
      description: "Calculate reactions at supports",
      steps: reactSteps,
    });

    return { sections };
  }
}

