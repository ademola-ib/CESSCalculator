import { BeamEditorState, BeamValidationError } from "@/lib/types/beamEditor";

export function validateBeamEditor(state: BeamEditorState): BeamValidationError[] {
  const errors: BeamValidationError[] = [];

  // Validate geometry
  if (state.length <= 0) {
    errors.push({
      id: "length",
      field: "length",
      message: "Beam length must be greater than 0",
    });
  }

  if (state.ei <= 0) {
    errors.push({
      id: "ei",
      field: "ei",
      message: "EI must be greater than 0",
    });
  }

  // Validate supports
  if (state.supports.length < 2) {
    errors.push({
      id: "supports-count",
      field: "supports",
      message: "At least 2 supports are required",
    });
  }

  state.supports.forEach((support) => {
    if (support.position < 0 || support.position > state.length) {
      errors.push({
        id: `support-${support.id}`,
        field: "supports",
        message: `Support at ${support.position.toFixed(2)}m is outside beam length`,
      });
    }
  });

  // Check for duplicate support positions
  const supportPositions = state.supports.map((s) => s.position);
  const duplicates = supportPositions.filter(
    (pos, index) => supportPositions.indexOf(pos) !== index
  );
  if (duplicates.length > 0) {
    errors.push({
      id: "support-duplicates",
      field: "supports",
      message: `Multiple supports at same position: ${duplicates.map((p) => p.toFixed(2)).join(", ")}m`,
    });
  }

  // Validate loads
  state.loads.forEach((load) => {
    if (load.type === "point" || load.type === "moment") {
      if (
        load.position === undefined ||
        load.position < 0 ||
        load.position > state.length
      ) {
        errors.push({
          id: `load-${load.id}`,
          field: "loads",
          message: `${load.type} load position is outside beam length`,
        });
      }
    }

    if (load.type === "udl") {
      if (
        load.start === undefined ||
        load.end === undefined ||
        load.start < 0 ||
        load.end > state.length
      ) {
        errors.push({
          id: `load-${load.id}`,
          field: "loads",
          message: `UDL boundaries are outside beam length`,
        });
      }

      if (load.start !== undefined && load.end !== undefined && load.start >= load.end) {
        errors.push({
          id: `load-${load.id}`,
          field: "loads",
          message: `UDL start position must be less than end position`,
        });
      }

      if (
        load.start !== undefined &&
        load.end !== undefined &&
        load.end - load.start < 0.1
      ) {
        errors.push({
          id: `load-${load.id}`,
          field: "loads",
          message: `UDL must span at least 0.1m`,
        });
      }
    }

    if (load.magnitude === 0) {
      errors.push({
        id: `load-${load.id}`,
        field: "loads",
        message: `Load magnitude cannot be zero`,
      });
    }
  });

  return errors;
}

export function getErrorsForField(
  errors: BeamValidationError[],
  field: string
): string[] {
  return errors.filter((e) => e.field === field).map((e) => e.message);
}
