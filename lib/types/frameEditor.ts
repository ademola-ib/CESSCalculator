/**
 * Frame Editor Types
 * Interactive frame visualizer data structures
 */

export interface FrameNode {
  id: string;
  x: number; // bay index (0, 1, 2...)
  y: number; // story index (0, 1, 2...)
  support?: "fixed" | "pinned" | "roller";
}

export interface FrameMember {
  id: string;
  nodeA: string; // node ID
  nodeB: string; // node ID
  type: "beam" | "column";
  ei: number; // kN·m²
}

export interface FrameJointLoad {
  id: string;
  type: "joint-force-x" | "joint-force-y" | "joint-moment";
  nodeId: string;
  magnitude: number; // kN or kN·m
}

export interface FrameMemberLoad {
  id: string;
  type: "member-udl" | "member-point";
  memberId: string;
  magnitude: number; // kN or kN/m
  position?: number; // normalized 0-1 for point load
}

export type FrameLoad = FrameJointLoad | FrameMemberLoad;

export interface FrameEditorState {
  bays: number;
  stories: number;
  bayWidth: number; // meters
  storyHeight: number; // meters
  columnEI: number; // kN·m²
  beamEI: number; // kN·m²
  nodes: FrameNode[];
  members: FrameMember[];
  loads: FrameLoad[];
}

export interface FrameValidationError {
  id: string;
  field: string;
  message: string;
}
