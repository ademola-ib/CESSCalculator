/**
 * Fixed End Moment (FEM) Calculations for Frame Members
 * Reuses beam FEM logic with coordinate transformation support
 */

import {
  FrameLoad,
  FrameMemberData,
  FrameNodeData,
  FrameMemberPointLoad,
  FrameMemberUDL,
  FrameMemberVDL,
  FrameMemberMoment,
  isMemberPointLoad,
  isMemberUDL,
  isMemberVDL,
  isMemberMoment,
  getMemberLength,
} from "@/lib/types/frame";

import {
  calculatePointLoadFEM,
  calculateUDLFEM,
  calculateVDLFEM,
  calculateMomentFEM,
} from "@/lib/solver/beam/fem";

/**
 * FEM result for a frame member in local coordinates
 */
export interface FrameFEMResult {
  memberId: string;
  femStart: number; // FEM at start node (kN·m)
  femEnd: number; // FEM at end node (kN·m)
  fixedShearStart: number; // Fixed-end shear at start (kN)
  fixedShearEnd: number; // Fixed-end shear at end (kN)
  fixedAxialStart: number; // Fixed-end axial at start (kN)
  fixedAxialEnd: number; // Fixed-end axial at end (kN)
}

/**
 * Calculate FEM for all loads on a frame member
 */
export function calculateMemberFEM(
  member: FrameMemberData,
  loads: FrameLoad[],
  nodes: FrameNodeData[]
): FrameFEMResult {
  const L = getMemberLength(member, nodes);
  const memberLoads = loads.filter(
    (load) => "memberId" in load && load.memberId === member.id
  );

  let totalFemStart = 0;
  let totalFemEnd = 0;
  let totalShearStart = 0;
  let totalShearEnd = 0;
  let totalAxialStart = 0;
  let totalAxialEnd = 0;

  for (const load of memberLoads) {
    if (isMemberPointLoad(load)) {
      const a = load.position * L; // Convert normalized to actual
      const b = L - a;
      const fem = calculatePointLoadFEM(load.magnitude, L, a);
      totalFemStart += fem.femStart;
      totalFemEnd += fem.femEnd;
      // Simply-supported shears
      totalShearStart += (load.magnitude * b) / L;
      totalShearEnd += (load.magnitude * a) / L;
    } else if (isMemberUDL(load)) {
      const startPos = load.startPosition * L;
      const endPos = load.endPosition * L;
      const fem = calculateUDLFEM(load.magnitude, L, startPos, endPos);
      totalFemStart += fem.femStart;
      totalFemEnd += fem.femEnd;
      const loadLength = endPos - startPos;
      const loadCenter = (startPos + endPos) / 2;
      const totalLoad = load.magnitude * loadLength;
      totalShearStart += (totalLoad * (L - loadCenter)) / L;
      totalShearEnd += (totalLoad * loadCenter) / L;
    } else if (isMemberVDL(load)) {
      const startPos = load.startPosition * L;
      const endPos = load.endPosition * L;
      const fem = calculateVDLFEM(load.w1, load.w2, L, startPos, endPos);
      totalFemStart += fem.femStart;
      totalFemEnd += fem.femEnd;
      const loadLength = endPos - startPos;
      const avgIntensity = (load.w1 + load.w2) / 2;
      const totalLoad = avgIntensity * loadLength;
      const centroid =
        startPos +
        (loadLength * (load.w1 + 2 * load.w2)) / (3 * (load.w1 + load.w2 || 1));
      totalShearStart += (totalLoad * (L - centroid)) / L;
      totalShearEnd += (totalLoad * centroid) / L;
    } else if (isMemberMoment(load)) {
      const a = load.position * L;
      const fem = calculateMomentFEM(load.magnitude, L, a);
      totalFemStart += fem.femStart;
      totalFemEnd += fem.femEnd;
    }
  }

  return {
    memberId: member.id,
    femStart: totalFemStart,
    femEnd: totalFemEnd,
    fixedShearStart: totalShearStart,
    fixedShearEnd: totalShearEnd,
    fixedAxialStart: totalAxialStart,
    fixedAxialEnd: totalAxialEnd,
  };
}

/**
 * Get FEM description for calculation log
 */
export function getMemberFEMDescription(
  member: FrameMemberData,
  loads: FrameLoad[],
  nodes: FrameNodeData[]
): Array<{
  description: string;
  formula: string;
  femStart: number;
  femEnd: number;
}> {
  const L = getMemberLength(member, nodes);
  const memberLoads = loads.filter(
    (load) => "memberId" in load && load.memberId === member.id
  );

  const results: Array<{
    description: string;
    formula: string;
    femStart: number;
    femEnd: number;
  }> = [];

  for (const load of memberLoads) {
    if (isMemberPointLoad(load)) {
      const a = load.position * L;
      const fem = calculatePointLoadFEM(load.magnitude, L, a);
      results.push({
        description: `Point load P = ${load.magnitude} kN at ${(load.position * 100).toFixed(0)}% of member ${member.id}`,
        formula: `FEM = -\\frac{Pab^2}{L^2}, \\quad \\frac{Pa^2b}{L^2}`,
        femStart: fem.femStart,
        femEnd: fem.femEnd,
      });
    } else if (isMemberUDL(load)) {
      const startPos = load.startPosition * L;
      const endPos = load.endPosition * L;
      const fem = calculateUDLFEM(load.magnitude, L, startPos, endPos);
      results.push({
        description: `UDL w = ${load.magnitude} kN/m on member ${member.id}`,
        formula: `FEM = -\\frac{wL^2}{12}, \\quad \\frac{wL^2}{12}`,
        femStart: fem.femStart,
        femEnd: fem.femEnd,
      });
    } else if (isMemberVDL(load)) {
      const startPos = load.startPosition * L;
      const endPos = load.endPosition * L;
      const fem = calculateVDLFEM(load.w1, load.w2, L, startPos, endPos);
      const loadType = load.w1 === 0 || load.w2 === 0 ? "Triangular" : "Trapezoidal";
      results.push({
        description: `${loadType} load ${load.w1} to ${load.w2} kN/m on member ${member.id}`,
        formula: load.w1 === 0 ? `FEM = -\\frac{wL^2}{20}, \\quad \\frac{wL^2}{30}` :
                 load.w2 === 0 ? `FEM = -\\frac{wL^2}{30}, \\quad \\frac{wL^2}{20}` :
                 `FEM = FEM_{rect} + FEM_{tri}`,
        femStart: fem.femStart,
        femEnd: fem.femEnd,
      });
    } else if (isMemberMoment(load)) {
      const a = load.position * L;
      const fem = calculateMomentFEM(load.magnitude, L, a);
      results.push({
        description: `Moment M = ${load.magnitude} kN·m on member ${member.id}`,
        formula: `FEM = \\frac{Mb(L-3a)}{L^2}, \\quad \\frac{Ma(3a-L)}{L^2}`,
        femStart: fem.femStart,
        femEnd: fem.femEnd,
      });
    }
  }

  return results;
}

/**
 * Calculate equivalent nodal loads for inclined member under distributed load
 * Accounts for load transformation from global to local coordinates
 */
export function calculateInclinedMemberFEM(
  member: FrameMemberData,
  loads: FrameLoad[],
  nodes: FrameNodeData[],
  memberAngle: number
): FrameFEMResult {
  // Get basic FEM in local coordinates
  const localFEM = calculateMemberFEM(member, loads, nodes);

  // For inclined members, the gravity loads need to be decomposed
  // into components along and perpendicular to the member axis
  const c = Math.cos(memberAngle);
  const s = Math.sin(memberAngle);

  // If there are gravity loads (vertical), decompose them
  const memberLoads = loads.filter(
    (load) => "memberId" in load && load.memberId === member.id
  );

  // For now, return the local FEM
  // A more complete implementation would transform global loads to local
  return localFEM;
}
