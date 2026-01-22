export interface BeamInput {
  length: number;
  ei: number;
  spans: number;
  supports: SupportCondition[];
  loads: Load[];
}

export interface FrameInput {
  bays: number;
  stories: number;
  bayWidth: number;
  storyHeight: number;
  columnEI: number;
  beamEI: number;
  loads: Load[];
}

export type SupportCondition = "fixed" | "pinned" | "roller";

export interface Load {
  type: "point" | "udl" | "moment";
  magnitude: number;
  position?: number;
  start?: number;
  end?: number;
}

export interface ChartPoint {
  x: number;
  value: number;
}

export interface JointDisplacement {
  nodeId: number;
  dx: number;
  dy: number;
  rotation: number;
}

export interface MemberForce {
  memberId: number;
  axialForce: number;
  shearForce: number;
  bendingMoment: number;
}

// Calculation Log Types for step-by-step display
export interface CalculationStep {
  stepNumber: number;
  description: string;
  formula?: string; // LaTeX-like or plain text formula
  substitution?: string; // Formula with numbers substituted
  result?: number | string;
  unit?: string;
  highlight?: boolean; // Highlight final results
}

export interface CalculationSection {
  title: string;
  description?: string;
  steps: CalculationStep[];
}

export interface CalculationLog {
  sections: CalculationSection[];
}

// Results with Calculation Logs
export interface BeamResults {
  reactions: number[];
  shearForce: ChartPoint[];
  bendingMoment: ChartPoint[];
  deflection: ChartPoint[];
  maxShear: number;
  maxMoment: number;
  maxDeflection: number;
  calculationLog?: CalculationLog;
}

export interface FrameResults {
  jointDisplacements: JointDisplacement[];
  memberForces: MemberForce[];
  reactions: number[];
  calculationLog?: CalculationLog;
}
