/**
 * Enhanced Frame Types for Rigid Frames
 * Supports sway/non-sway, variable EI, and all load types
 */

// Support types for frames
export type FrameSupportType = "fixed" | "pinned" | "roller";

// Roller direction for inclined or special support conditions
export type RollerDirection = "horizontal" | "vertical" | "inclined";

/**
 * Frame node (joint)
 */
export interface FrameNodeData {
  id: string;
  x: number; // horizontal position (m)
  y: number; // vertical position (m)

  // Support conditions (only for base nodes typically)
  support?: FrameSupportType;

  // Roller-specific options
  rollerDirection?: RollerDirection; // Direction roller can move
  rollerAngle?: number; // Angle of roller track from horizontal (rad) for inclined rollers

  // Support spring stiffnesses (for elastic supports)
  springKx?: number; // Horizontal spring stiffness (kN/m)
  springKy?: number; // Vertical spring stiffness (kN/m)
  springKr?: number; // Rotational spring stiffness (kN·m/rad)

  // Support settlements (if applicable)
  settlement?: {
    dx: number; // horizontal settlement (m, positive = right)
    dy: number; // vertical settlement (m, positive = down)
    rotation: number; // rotational settlement (rad, positive = clockwise)
  };

  // For grid-based frames
  bayIndex?: number; // 0, 1, 2... for multi-bay
  storyIndex?: number; // 0 = ground, 1, 2... for multi-story

  // For complex geometry
  label?: string; // User-friendly label
}

/**
 * Frame member (beam or column)
 */
export interface FrameMemberData {
  id: string;
  nodeStartId: string;
  nodeEndId: string;
  memberType: "beam" | "column";

  // EI specification mode
  eiMode: "direct" | "multiplier" | "separate";

  // For "direct" mode: complete EI value
  ei?: number; // direct EI value (kN·m²)

  // For "multiplier" mode
  iMultiplier?: number; // I multiplier (1.0, 1.5, 2.0, etc.)

  // For "separate" mode: E and I specified independently
  E?: number; // Modulus of elasticity
  I?: number; // Moment of inertia
  A?: number; // Cross-sectional area (m² or mm²)
  EUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  IUnit?: "m4" | "mm4" | "cm4";
  AUnit?: "m2" | "mm2" | "cm2";

  // Member release (for pin-ended members)
  releaseStart?: boolean; // moment release at start
  releaseEnd?: boolean; // moment release at end
}

/**
 * Joint load (force/moment applied at a node)
 */
export interface FrameJointLoad {
  id: string;
  type: "joint";
  nodeId: string;
  fx?: number; // horizontal force (kN, positive = right)
  fy?: number; // vertical force (kN, positive = up)
  moment?: number; // moment (kN·m, positive = counter-clockwise)
}

/**
 * Point load on a member
 */
export interface FrameMemberPointLoad {
  id: string;
  type: "member-point";
  memberId: string;
  magnitude: number; // kN (perpendicular to member axis, positive = towards member)
  position: number; // normalized 0-1 from start node
}

/**
 * Uniformly distributed load on a member
 */
export interface FrameMemberUDL {
  id: string;
  type: "member-udl";
  memberId: string;
  magnitude: number; // kN/m (perpendicular to member axis)
  startPosition: number; // normalized 0-1 from start
  endPosition: number; // normalized 0-1 from start
}

/**
 * Varying distributed load on a member
 */
export interface FrameMemberVDL {
  id: string;
  type: "member-vdl";
  memberId: string;
  w1: number; // kN/m at start of load
  w2: number; // kN/m at end of load
  startPosition: number; // normalized 0-1
  endPosition: number; // normalized 0-1
}

/**
 * Applied moment on a member
 */
export interface FrameMemberMoment {
  id: string;
  type: "member-moment";
  memberId: string;
  magnitude: number; // kN·m (positive = counter-clockwise)
  position: number; // normalized 0-1
}

/**
 * Union type for all frame loads
 */
export type FrameLoad =
  | FrameJointLoad
  | FrameMemberPointLoad
  | FrameMemberUDL
  | FrameMemberVDL
  | FrameMemberMoment;

/**
 * Complete frame data structure
 */
export interface FrameData {
  nodes: FrameNodeData[];
  members: FrameMemberData[];
  loads: FrameLoad[];

  // Frame behavior
  isSway: boolean; // true for sway frames, false for non-sway (braced)

  // Default properties
  defaultE?: number; // default modulus of elasticity
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²";
  defaultI?: number; // default moment of inertia
  defaultIUnit?: "m4" | "mm4" | "cm4";
  defaultA?: number; // default cross-sectional area
  defaultAUnit?: "m2" | "mm2" | "cm2";
  defaultEI?: number; // default EI (kN·m²) - for backward compatibility

  // Grid parameters (for regular frames)
  bays?: number;
  stories?: number;
  bayWidths?: number[]; // width of each bay (m)
  storyHeights?: number[]; // height of each story (m)
}

/**
 * Member end forces in local coordinates
 */
export interface MemberEndForces {
  memberId: string;

  // Forces at start (i-end)
  axialStart: number; // axial force (kN, positive = tension)
  shearStart: number; // shear force (kN)
  momentStart: number; // bending moment (kN·m)

  // Forces at end (j-end)
  axialEnd: number;
  shearEnd: number;
  momentEnd: number;
}

/**
 * Node displacement results
 */
export interface NodeDisplacement {
  nodeId: string;
  dx: number; // horizontal displacement (m)
  dy: number; // vertical displacement (m)
  rotation: number; // rotation (rad)
}

/**
 * Support reaction
 */
export interface FrameReaction {
  nodeId: string;
  fx: number; // horizontal reaction (kN)
  fy: number; // vertical reaction (kN)
  moment?: number; // moment reaction (kN·m), only for fixed supports
}

/**
 * Member diagram data
 */
export interface MemberDiagram {
  memberId: string;
  memberType: "beam" | "column";
  length: number;

  // Diagram points (position is 0 to length)
  axialForce: Array<{ position: number; value: number }>;
  shearForce: Array<{ position: number; value: number }>;
  bendingMoment: Array<{ position: number; value: number }>;
}

/**
 * Results from frame solver
 */
export interface FrameSolverResult {
  // Displacements
  nodeDisplacements: NodeDisplacement[];

  // Sway displacement (for sway frames)
  swayDisplacement?: number; // lateral displacement at top level (m)

  // Member forces
  memberForces: MemberEndForces[];

  // Reactions
  reactions: FrameReaction[];

  // Diagrams per member
  memberDiagrams: MemberDiagram[];

  // Summary
  maxMoment: { memberId: string; value: number; position: number };
  maxShear: { memberId: string; value: number; position: number };
  maxAxial: { memberId: string; value: number };
  maxDrift: { storyIndex: number; value: number }; // for sway frames

  // Calculation log
  calculationLog: CalculationLog;
}

/**
 * Import calculation log types
 */
import { CalculationLog } from "./beam";

/**
 * Type guard functions
 */
export function isJointLoad(load: FrameLoad): load is FrameJointLoad {
  return load.type === "joint";
}

export function isMemberPointLoad(load: FrameLoad): load is FrameMemberPointLoad {
  return load.type === "member-point";
}

export function isMemberUDL(load: FrameLoad): load is FrameMemberUDL {
  return load.type === "member-udl";
}

export function isMemberVDL(load: FrameLoad): load is FrameMemberVDL {
  return load.type === "member-vdl";
}

export function isMemberMoment(load: FrameLoad): load is FrameMemberMoment {
  return load.type === "member-moment";
}

/**
 * Get member length from nodes
 */
export function getMemberLength(
  member: FrameMemberData,
  nodes: FrameNodeData[]
): number {
  const startNode = nodes.find((n) => n.id === member.nodeStartId);
  const endNode = nodes.find((n) => n.id === member.nodeEndId);
  if (!startNode || !endNode) return 0;

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get member angle from horizontal (radians)
 */
export function getMemberAngle(
  member: FrameMemberData,
  nodes: FrameNodeData[]
): number {
  const startNode = nodes.find((n) => n.id === member.nodeStartId);
  const endNode = nodes.find((n) => n.id === member.nodeEndId);
  if (!startNode || !endNode) return 0;

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  return Math.atan2(dy, dx);
}

/**
 * Convert E value to kN/m² based on unit
 */
export function convertEToKNm2(E: number, unit: "GPa" | "MPa" | "kPa" | "kN/m²" = "GPa"): number {
  switch (unit) {
    case "GPa":
      return E * 1e6; // 1 GPa = 1,000,000 kN/m²
    case "MPa":
      return E * 1e3; // 1 MPa = 1,000 kN/m²
    case "kPa":
      return E; // 1 kPa = 1 kN/m²
    case "kN/m²":
      return E;
    default:
      return E * 1e6;
  }
}

/**
 * Convert I value to m⁴ based on unit
 */
export function convertIToM4(I: number, unit: "m4" | "mm4" | "cm4" = "m4"): number {
  switch (unit) {
    case "m4":
      return I;
    case "mm4":
      return I * 1e-12;
    case "cm4":
      return I * 1e-8;
    default:
      return I;
  }
}

/**
 * Convert A value to m² based on unit
 */
export function convertAToM2(A: number, unit: "m2" | "mm2" | "cm2" = "m2"): number {
  switch (unit) {
    case "m2":
      return A;
    case "mm2":
      return A * 1e-6;
    case "cm2":
      return A * 1e-4;
    default:
      return A;
  }
}

/**
 * Get effective EI for a member
 */
export function getMemberEI(
  member: FrameMemberData,
  defaultEI: number,
  defaultE?: number,
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²",
  defaultI?: number,
  defaultIUnit?: "m4" | "mm4" | "cm4"
): number {
  if (member.eiMode === "direct" && member.ei !== undefined) {
    return member.ei;
  }

  if (member.eiMode === "separate") {
    const E = member.E ?? defaultE ?? 200; // Default 200 GPa (steel)
    const EUnit = member.EUnit ?? defaultEUnit ?? "GPa";
    const I = member.I ?? defaultI ?? 1e-4;
    const IUnit = member.IUnit ?? defaultIUnit ?? "m4";

    const E_kNm2 = convertEToKNm2(E, EUnit);
    const I_m4 = convertIToM4(I, IUnit);
    return E_kNm2 * I_m4;
  }

  return defaultEI * (member.iMultiplier ?? 1.0);
}

/**
 * Get effective EA for a member (axial stiffness)
 */
export function getMemberEA(
  member: FrameMemberData,
  defaultEI: number,
  defaultE?: number,
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²",
  defaultA?: number,
  defaultAUnit?: "m2" | "mm2" | "cm2"
): number {
  if (member.eiMode === "separate" && member.A !== undefined) {
    const E = member.E ?? defaultE ?? 200;
    const EUnit = member.EUnit ?? defaultEUnit ?? "GPa";
    const A = member.A ?? defaultA ?? 0.01; // Default 0.01 m²
    const AUnit = member.AUnit ?? defaultAUnit ?? "m2";

    const E_kNm2 = convertEToKNm2(E, EUnit);
    const A_m2 = convertAToM2(A, AUnit);
    return E_kNm2 * A_m2;
  }

  // Fallback: estimate EA from EI (assuming typical cross-section ratios)
  const EI = getMemberEI(member, defaultEI, defaultE, defaultEUnit, defaultI, defaultAUnit as any);
  return EI * 1000; // Approximate ratio
}

// Helper variable for getMemberEA fallback
const defaultI: number | undefined = undefined;

/**
 * Create a regular grid frame
 */
export function createGridFrame(
  bays: number,
  stories: number,
  bayWidth: number,
  storyHeight: number,
  baseSupport: FrameSupportType = "fixed"
): Pick<FrameData, "nodes" | "members"> {
  const nodes: FrameNodeData[] = [];
  const members: FrameMemberData[] = [];

  // Create nodes
  for (let story = 0; story <= stories; story++) {
    for (let bay = 0; bay <= bays; bay++) {
      const node: FrameNodeData = {
        id: `N${story}-${bay}`,
        x: bay * bayWidth,
        y: story * storyHeight,
        bayIndex: bay,
        storyIndex: story,
      };

      // Add support at base level
      if (story === 0) {
        node.support = baseSupport;
      }

      nodes.push(node);
    }
  }

  // Create columns
  for (let story = 0; story < stories; story++) {
    for (let bay = 0; bay <= bays; bay++) {
      members.push({
        id: `C${story}-${bay}`,
        nodeStartId: `N${story}-${bay}`,
        nodeEndId: `N${story + 1}-${bay}`,
        memberType: "column",
        eiMode: "multiplier",
        iMultiplier: 1.0,
      });
    }
  }

  // Create beams
  for (let story = 1; story <= stories; story++) {
    for (let bay = 0; bay < bays; bay++) {
      members.push({
        id: `B${story}-${bay}`,
        nodeStartId: `N${story}-${bay}`,
        nodeEndId: `N${story}-${bay + 1}`,
        memberType: "beam",
        eiMode: "multiplier",
        iMultiplier: 1.0,
      });
    }
  }

  return { nodes, members };
}

/**
 * Create a portal frame (single bay, single story with inclined rafters)
 */
export function createPortalFrame(
  span: number,
  eaveHeight: number,
  ridgeHeight: number,
  baseSupport: FrameSupportType = "fixed"
): Pick<FrameData, "nodes" | "members"> {
  const nodes: FrameNodeData[] = [
    { id: "N1", x: 0, y: 0, support: baseSupport, label: "Left Base" },
    { id: "N2", x: span, y: 0, support: baseSupport, label: "Right Base" },
    { id: "N3", x: 0, y: eaveHeight, label: "Left Eave" },
    { id: "N4", x: span, y: eaveHeight, label: "Right Eave" },
    { id: "N5", x: span / 2, y: ridgeHeight, label: "Ridge" },
  ];

  const members: FrameMemberData[] = [
    { id: "C1", nodeStartId: "N1", nodeEndId: "N3", memberType: "column", eiMode: "multiplier", iMultiplier: 1.0 },
    { id: "C2", nodeStartId: "N2", nodeEndId: "N4", memberType: "column", eiMode: "multiplier", iMultiplier: 1.0 },
    { id: "R1", nodeStartId: "N3", nodeEndId: "N5", memberType: "beam", eiMode: "multiplier", iMultiplier: 1.0 },
    { id: "R2", nodeStartId: "N5", nodeEndId: "N4", memberType: "beam", eiMode: "multiplier", iMultiplier: 1.0 },
  ];

  return { nodes, members };
}

/**
 * Create a gable frame with tie
 */
export function createGableFrameWithTie(
  span: number,
  eaveHeight: number,
  ridgeHeight: number,
  baseSupport: FrameSupportType = "pinned"
): Pick<FrameData, "nodes" | "members"> {
  const { nodes, members } = createPortalFrame(span, eaveHeight, ridgeHeight, baseSupport);

  // Add tie between eaves
  members.push({
    id: "T1",
    nodeStartId: "N3",
    nodeEndId: "N4",
    memberType: "beam",
    eiMode: "multiplier",
    iMultiplier: 0.5, // Tie is usually smaller
  });

  return { nodes, members };
}

/**
 * Create a frame with inclined columns
 */
export function createInclinedColumnFrame(
  topWidth: number,
  bottomWidth: number,
  height: number,
  baseSupport: FrameSupportType = "fixed"
): Pick<FrameData, "nodes" | "members"> {
  const leftOffset = (bottomWidth - topWidth) / 2;

  const nodes: FrameNodeData[] = [
    { id: "N1", x: 0, y: 0, support: baseSupport, label: "Left Base" },
    { id: "N2", x: bottomWidth, y: 0, support: baseSupport, label: "Right Base" },
    { id: "N3", x: leftOffset, y: height, label: "Left Top" },
    { id: "N4", x: leftOffset + topWidth, y: height, label: "Right Top" },
  ];

  const members: FrameMemberData[] = [
    { id: "C1", nodeStartId: "N1", nodeEndId: "N3", memberType: "column", eiMode: "multiplier", iMultiplier: 1.0 },
    { id: "C2", nodeStartId: "N2", nodeEndId: "N4", memberType: "column", eiMode: "multiplier", iMultiplier: 1.0 },
    { id: "B1", nodeStartId: "N3", nodeEndId: "N4", memberType: "beam", eiMode: "multiplier", iMultiplier: 1.0 },
  ];

  return { nodes, members };
}

/**
 * Calculate the centroid of a frame for load application
 */
export function getFrameCentroid(nodes: FrameNodeData[]): { x: number; y: number } {
  const n = nodes.length;
  if (n === 0) return { x: 0, y: 0 };

  const sumX = nodes.reduce((sum, node) => sum + node.x, 0);
  const sumY = nodes.reduce((sum, node) => sum + node.y, 0);

  return { x: sumX / n, y: sumY / n };
}

/**
 * Get the bounding box of a frame
 */
export function getFrameBounds(nodes: FrameNodeData[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert legacy FrameEditorState to new FrameData format
 */
export function convertLegacyFrameData(legacy: {
  bays: number;
  stories: number;
  bayWidth: number;
  storyHeight: number;
  columnEI: number;
  beamEI: number;
  nodes: Array<{ id: string; x: number; y: number; support?: "fixed" | "pinned" | "roller" }>;
  members: Array<{ id: string; nodeA: string; nodeB: string; type: "beam" | "column"; ei: number }>;
  loads: Array<any>;
}): FrameData {
  const nodes: FrameNodeData[] = legacy.nodes.map((n) => ({
    id: n.id,
    x: n.x * legacy.bayWidth,
    y: n.y * legacy.storyHeight,
    support: n.support,
    bayIndex: n.x,
    storyIndex: n.y,
  }));

  const members: FrameMemberData[] = legacy.members.map((m) => ({
    id: m.id,
    nodeStartId: m.nodeA,
    nodeEndId: m.nodeB,
    memberType: m.type,
    eiMode: "direct" as const,
    ei: m.ei,
  }));

  const loads: FrameLoad[] = legacy.loads.map((l) => {
    if (l.type === "joint-force-x" || l.type === "joint-force-y" || l.type === "joint-moment") {
      return {
        id: l.id,
        type: "joint" as const,
        nodeId: l.nodeId,
        fx: l.type === "joint-force-x" ? l.magnitude : undefined,
        fy: l.type === "joint-force-y" ? l.magnitude : undefined,
        moment: l.type === "joint-moment" ? l.magnitude : undefined,
      };
    } else if (l.type === "member-point") {
      return {
        id: l.id,
        type: "member-point" as const,
        memberId: l.memberId,
        magnitude: l.magnitude,
        position: l.position ?? 0.5,
      };
    } else if (l.type === "member-udl") {
      return {
        id: l.id,
        type: "member-udl" as const,
        memberId: l.memberId,
        magnitude: l.magnitude,
        startPosition: 0,
        endPosition: 1,
      };
    }
    // Default case
    return {
      id: l.id,
      type: "joint" as const,
      nodeId: "",
    };
  });

  return {
    nodes,
    members,
    loads,
    isSway: false, // Default to non-sway
    defaultEI: legacy.beamEI,
    bays: legacy.bays,
    stories: legacy.stories,
    bayWidths: Array(legacy.bays).fill(legacy.bayWidth),
    storyHeights: Array(legacy.stories).fill(legacy.storyHeight),
  };
}
