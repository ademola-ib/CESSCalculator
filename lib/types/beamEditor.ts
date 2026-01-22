/**
 * Beam Editor Types
 * Interactive visualizer data structures
 */

export interface BeamSupport {
  id: string;
  type: "fixed" | "pinned" | "roller";
  position: number; // meters from left end
}

export interface BeamLoad {
  id: string;
  type: "point" | "udl" | "moment";
  magnitude: number; // kN, kN/m, or kN·m
  position?: number; // for point load or moment
  start?: number; // for UDL
  end?: number; // for UDL
  direction?: "down" | "up"; // for point/UDL
}

export interface BeamEditorState {
  length: number; // meters
  ei: number; // kN·m²
  supports: BeamSupport[];
  loads: BeamLoad[];
}

export interface BeamValidationError {
  id: string;
  field: string;
  message: string;
}

export interface DragState {
  isDragging: boolean;
  itemId: string | null;
  itemType: "support" | "load" | "udl-start" | "udl-end" | null;
  startX: number;
  startPosition: number;
}

export const SNAP_INCREMENT = 0.05; // meters
export const MIN_UDL_LENGTH = 0.1; // meters
