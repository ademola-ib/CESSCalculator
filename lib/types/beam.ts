/**
 * Enhanced Beam Types for Multi-Span Continuous Beams
 * Supports variable EI, settlements, and all load types
 */

// Support types
export type SupportType = "fixed" | "pinned" | "roller" | "free";

/**
 * Node (support point) in a continuous beam
 */
export interface NodeData {
  id: string;
  position: number; // distance from left end (m)
  supportType: SupportType;
  settlement?: number; // vertical settlement (m, positive = downward)
  prescribedRotation?: number; // prescribed rotation (rad), rarely used
}

/**
 * Span data between two adjacent nodes
 */
export interface SpanData {
  id: string;
  nodeStartId: string; // left node id
  nodeEndId: string; // right node id
  length: number; // span length (m)

  // EI specification mode
  eiMode: "direct" | "multiplier" | "separate";

  // For "direct" mode: complete EI value
  ei?: number; // direct EI value (kN·m²), used when eiMode = "direct"

  // For "multiplier" mode: uses default E with I multiplier
  iMultiplier?: number; // I multiplier (e.g., 2.0 for 2I), used when eiMode = "multiplier"

  // For "separate" mode: E and I specified independently
  E?: number; // Modulus of elasticity (GPa or kN/m²)
  I?: number; // Moment of inertia (m⁴ or mm⁴ with appropriate unit indicator)
  EUnit?: "GPa" | "MPa" | "kPa" | "kN/m²"; // Unit for E
  IUnit?: "m4" | "mm4" | "cm4"; // Unit for I
}

/**
 * Point load on a span
 */
export interface PointLoad {
  id: string;
  type: "point";
  spanId: string;
  magnitude: number; // kN (positive = downward)
  position: number; // distance from span start (m)
}

/**
 * Uniformly Distributed Load on a span
 */
export interface UDL {
  id: string;
  type: "udl";
  spanId: string;
  magnitude: number; // kN/m (positive = downward)
  startPosition: number; // distance from span start (m)
  endPosition: number; // distance from span start (m)
}

/**
 * Varying Distributed Load (triangular or trapezoidal)
 */
export interface VDL {
  id: string;
  type: "vdl";
  spanId: string;
  w1: number; // intensity at start (kN/m, positive = downward)
  w2: number; // intensity at end (kN/m, positive = downward)
  startPosition: number; // distance from span start (m)
  endPosition: number; // distance from span start (m)
}

/**
 * Applied concentrated moment on a span
 */
export interface AppliedMoment {
  id: string;
  type: "moment";
  spanId: string;
  magnitude: number; // kN·m (positive = clockwise when viewed from above)
  position: number; // distance from span start (m)
}

/**
 * Union type for all beam loads
 */
export type BeamLoad = PointLoad | UDL | VDL | AppliedMoment;

/**
 * Complete continuous beam data structure
 */
export interface ContinuousBeamData {
  nodes: NodeData[];
  spans: SpanData[];
  loads: BeamLoad[];

  // Default material/section properties
  defaultE?: number; // default modulus of elasticity (GPa)
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²"; // unit for default E
  defaultI?: number; // default moment of inertia (m⁴)
  defaultIUnit?: "m4" | "mm4" | "cm4"; // unit for default I
  defaultEI?: number; // default EI value (kN·m²) - used when eiMode = "multiplier"
}

/**
 * End moments for a span
 */
export interface SpanEndMoments {
  spanId: string;
  mStart: number; // moment at start (kN·m)
  mEnd: number; // moment at end (kN·m)
}

/**
 * Support reaction
 */
export interface SupportReaction {
  nodeId: string;
  position: number; // position along beam (m)
  vertical: number; // vertical reaction (kN, positive = upward)
  moment?: number; // moment reaction (kN·m), only for fixed supports
}

/**
 * Diagram data point
 */
export interface DiagramPoint {
  x: number; // position along beam (m)
  value: number; // value at this position
}

/**
 * Results from beam solver
 */
export interface BeamSolverResult {
  // Solution values
  rotations: Map<string, number>; // node rotations (rad)
  endMoments: SpanEndMoments[];
  reactions: SupportReaction[];

  // Diagrams
  shearForceDiagram: DiagramPoint[];
  bendingMomentDiagram: DiagramPoint[];
  deflectionDiagram: DiagramPoint[];

  // Summary values
  maxShear: { value: number; position: number };
  maxMoment: { value: number; position: number };
  maxDeflection: { value: number; position: number };

  // Step-by-step calculation log
  calculationLog: CalculationLog;
}

/**
 * Fixed End Moments for a span
 */
export interface FixedEndMoments {
  spanId: string;
  femStart: number; // FEM at start (kN·m)
  femEnd: number; // FEM at end (kN·m)
}

/**
 * Calculation step for display
 */
export interface CalculationStep {
  stepNumber: number;
  description: string;
  formula?: string; // LaTeX formula
  substitution?: string; // Formula with values substituted
  result?: number | string;
  unit?: string;
  highlight?: boolean; // Highlight important results
  subSteps?: CalculationStep[]; // Nested steps
}

/**
 * Section of calculations
 */
export interface CalculationSection {
  title: string;
  description?: string;
  steps: CalculationStep[];
}

/**
 * Complete calculation log
 */
export interface CalculationLog {
  sections: CalculationSection[];
}

/**
 * Type guard functions
 */
export function isPointLoad(load: BeamLoad): load is PointLoad {
  return load.type === "point";
}

export function isUDL(load: BeamLoad): load is UDL {
  return load.type === "udl";
}

export function isVDL(load: BeamLoad): load is VDL {
  return load.type === "vdl";
}

export function isAppliedMoment(load: BeamLoad): load is AppliedMoment {
  return load.type === "moment";
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
      return E * 1e6; // Default assumes GPa
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
      return I * 1e-12; // 1 mm⁴ = 1e-12 m⁴
    case "cm4":
      return I * 1e-8; // 1 cm⁴ = 1e-8 m⁴
    default:
      return I;
  }
}

/**
 * Calculate EI from separate E and I values
 */
export function calculateEI(
  E: number,
  EUnit: "GPa" | "MPa" | "kPa" | "kN/m²",
  I: number,
  IUnit: "m4" | "mm4" | "cm4"
): number {
  const E_kNm2 = convertEToKNm2(E, EUnit);
  const I_m4 = convertIToM4(I, IUnit);
  return E_kNm2 * I_m4; // Result in kN·m²
}

/**
 * Helper to get effective EI for a span
 */
export function getSpanEI(
  span: SpanData,
  defaultEI: number,
  defaultE?: number,
  defaultEUnit?: "GPa" | "MPa" | "kPa" | "kN/m²",
  defaultI?: number,
  defaultIUnit?: "m4" | "mm4" | "cm4"
): number {
  if (span.eiMode === "direct" && span.ei !== undefined) {
    return span.ei;
  }

  if (span.eiMode === "separate") {
    // Use span-specific E and I if provided, otherwise use defaults
    const E = span.E ?? defaultE ?? 200; // Default 200 GPa (steel)
    const EUnit = span.EUnit ?? defaultEUnit ?? "GPa";
    const I = span.I ?? defaultI ?? 1e-4; // Default 1e-4 m⁴
    const IUnit = span.IUnit ?? defaultIUnit ?? "m4";

    return calculateEI(E, EUnit, I, IUnit);
  }

  // Multiplier mode
  return defaultEI * (span.iMultiplier ?? 1.0);
}

/**
 * Convert legacy BeamEditorState to ContinuousBeamData
 */
export function convertLegacyBeamData(legacy: {
  length: number;
  ei: number;
  supports: Array<{ id: string; type: "fixed" | "pinned" | "roller"; position: number }>;
  loads: Array<{
    id: string;
    type: "point" | "udl" | "moment";
    magnitude: number;
    position?: number;
    start?: number;
    end?: number;
    direction?: "down" | "up";
  }>;
}): ContinuousBeamData {
  // Sort supports by position
  const sortedSupports = [...legacy.supports].sort((a, b) => a.position - b.position);

  // Create nodes from supports
  const nodes: NodeData[] = sortedSupports.map((sup) => ({
    id: sup.id,
    position: sup.position,
    supportType: sup.type,
  }));

  // Create spans between consecutive nodes
  const spans: SpanData[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    spans.push({
      id: `span-${i + 1}`,
      nodeStartId: nodes[i].id,
      nodeEndId: nodes[i + 1].id,
      length: nodes[i + 1].position - nodes[i].position,
      eiMode: "direct",
      ei: legacy.ei,
    });
  }

  // Convert loads
  const beamLoads: BeamLoad[] = [];
  for (const load of legacy.loads) {
    // Find which span this load belongs to
    const spanIndex = findSpanForPosition(
      load.type === "udl" ? (load.start ?? 0) : (load.position ?? 0),
      nodes
    );
    if (spanIndex === -1) continue;

    const span = spans[spanIndex];
    const spanStart = nodes[spanIndex].position;
    const sign = load.direction === "up" ? -1 : 1;

    if (load.type === "point" && load.position !== undefined) {
      beamLoads.push({
        id: load.id,
        type: "point",
        spanId: span.id,
        magnitude: load.magnitude * sign,
        position: load.position - spanStart,
      });
    } else if (load.type === "udl" && load.start !== undefined && load.end !== undefined) {
      beamLoads.push({
        id: load.id,
        type: "udl",
        spanId: span.id,
        magnitude: load.magnitude * sign,
        startPosition: load.start - spanStart,
        endPosition: load.end - spanStart,
      });
    } else if (load.type === "moment" && load.position !== undefined) {
      beamLoads.push({
        id: load.id,
        type: "moment",
        spanId: span.id,
        magnitude: load.magnitude, // Moment sign convention is different
        position: load.position - spanStart,
      });
    }
  }

  return {
    nodes,
    spans,
    loads: beamLoads,
    defaultEI: legacy.ei,
  };
}

/**
 * Find which span a position falls into
 */
function findSpanForPosition(position: number, nodes: NodeData[]): number {
  for (let i = 0; i < nodes.length - 1; i++) {
    if (position >= nodes[i].position && position <= nodes[i + 1].position) {
      return i;
    }
  }
  return -1;
}
