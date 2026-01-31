/**
 * Fixed End Moment (FEM) Calculations
 * Implements standard structural analysis formulas for various load types
 */

import {
  BeamLoad,
  PointLoad,
  UDL,
  VDL,
  AppliedMoment,
  isPointLoad,
  isUDL,
  isVDL,
  isAppliedMoment,
  FixedEndMoments,
  SpanData,
} from "@/lib/types/beam";

/**
 * Result of FEM calculation for a single load
 */
export interface FEMResult {
  femStart: number; // FEM at start of span (kN·m)
  femEnd: number; // FEM at end of span (kN·m)
  loadType: string;
  loadId: string;
}

/**
 * Calculate FEM for a point load
 *
 * For point load P at distance 'a' from left end of span length L:
 * FEM_AB = -P * a * b² / L²
 * FEM_BA = +P * a² * b / L²
 *
 * where b = L - a
 */
export function calculatePointLoadFEM(
  magnitude: number, // P (kN), positive = downward
  spanLength: number, // L (m)
  position: number // a (m from start of span)
): { femStart: number; femEnd: number } {
  const P = magnitude;
  const L = spanLength;
  const a = Math.max(0, Math.min(L, position));
  const b = L - a;

  if (L <= 0) {
    throw new Error("Span length must be positive");
  }

  const L2 = L * L;

  // FEM_AB = -Pab²/L² (hogging at A due to downward load)
  const femStart = -(P * a * b * b) / L2;

  // FEM_BA = +Pa²b/L² (hogging at B due to downward load)
  const femEnd = (P * a * a * b) / L2;

  return { femStart, femEnd };
}

/**
 * Calculate FEM for a uniformly distributed load (UDL)
 *
 * For UDL w over full span length L:
 * FEM_AB = -wL²/12
 * FEM_BA = +wL²/12
 *
 * For partial UDL from x1 to x2:
 * Uses superposition or integration
 */
export function calculateUDLFEM(
  magnitude: number, // w (kN/m), positive = downward
  spanLength: number, // L (m)
  startPos: number, // start position from span start (m)
  endPos: number // end position from span start (m)
): { femStart: number; femEnd: number } {
  const w = magnitude;
  const L = spanLength;

  if (L <= 0) {
    throw new Error("Span length must be positive");
  }

  // Clamp positions
  const x1 = Math.max(0, Math.min(L, startPos));
  const x2 = Math.max(0, Math.min(L, endPos));

  // Ensure x1 < x2
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);

  if (Math.abs(b - a) < 1e-10) {
    return { femStart: 0, femEnd: 0 };
  }

  // For full span UDL
  if (Math.abs(a) < 1e-10 && Math.abs(b - L) < 1e-10) {
    const L2 = L * L;
    return {
      femStart: -(w * L2) / 12,
      femEnd: (w * L2) / 12,
    };
  }

  // For partial UDL, use integration or superposition
  // Using the general formula from structural analysis:
  // For UDL w from distance 'a' to 'b' measured from left:
  // These formulas are derived from integrating the basic FEM formula

  const loadLength = b - a;
  const loadCenter = (a + b) / 2;

  // Approximate using equivalent point load at centroid for partial loads
  // This is a simplification - more accurate formulas exist
  // For production, use exact integration formulas

  // More accurate: use the actual partial UDL formulas
  // FEM_A = -w * (b-a) * [(L-a-b)*(b-a)²/12 + (L-a)²*(L-b)/(2*L²) + ...]
  // This gets complex, so we use numerical integration for partial loads

  if (loadLength >= L * 0.95) {
    // Nearly full span, use full span formula
    const L2 = L * L;
    return {
      femStart: -(w * L2) / 12,
      femEnd: (w * L2) / 12,
    };
  }

  // Use numerical integration for partial UDL
  const numPoints = 20;
  let femStart = 0;
  let femEnd = 0;
  const dx = loadLength / numPoints;

  for (let i = 0; i < numPoints; i++) {
    const xi = a + (i + 0.5) * dx; // midpoint of segment
    const dP = w * dx; // equivalent point load for segment
    const fem = calculatePointLoadFEM(dP, L, xi);
    femStart += fem.femStart;
    femEnd += fem.femEnd;
  }

  return { femStart, femEnd };
}

/**
 * Calculate FEM for varying distributed load (VDL)
 *
 * This implementation handles true variable distributed loads (triangular, trapezoidal)
 * using analytical formulas where possible and high-precision numerical integration otherwise.
 *
 * For triangular load (0 to w) over full span:
 * FEM_AB = -wL²/20
 * FEM_BA = +wL²/30
 *
 * For triangular load (w to 0) over full span:
 * FEM_AB = -wL²/30
 * FEM_BA = +wL²/20
 *
 * For trapezoidal load (w1 to w2):
 * Decompose into rectangular + triangular
 *
 * For partial span VDL, use analytical integration:
 * Load intensity at position x within the load region: w(x) = w1 + (w2-w1)*(x-a)/(b-a)
 * where a = start position, b = end position
 *
 * The FEM contribution from a differential element dP = w(x)*dx at position x is:
 * dFEM_A = -dP * x * (L-x)² / L²
 * dFEM_B = +dP * x² * (L-x) / L²
 */
export function calculateVDLFEM(
  w1: number, // intensity at start of load (kN/m)
  w2: number, // intensity at end of load (kN/m)
  spanLength: number, // L (m)
  startPos: number = 0, // start position from span start (m)
  endPos?: number // end position from span start (m), defaults to span length
): { femStart: number; femEnd: number } {
  const L = spanLength;
  const actualEndPos = endPos ?? L;

  if (L <= 0) {
    throw new Error("Span length must be positive");
  }

  // Clamp positions
  const a = Math.max(0, Math.min(L, startPos));
  const b = Math.max(0, Math.min(L, actualEndPos));

  if (Math.abs(b - a) < 1e-10) {
    return { femStart: 0, femEnd: 0 };
  }

  const loadLength = b - a;
  const L2 = L * L;
  const L3 = L2 * L;

  // For full span VDL, use analytical formulas
  if (Math.abs(a) < 1e-10 && Math.abs(b - L) < 1e-10) {
    // Decompose trapezoidal into rectangular (min value) + triangular (excess)
    const wMin = Math.min(w1, w2);
    const wMax = Math.max(w1, w2);
    const wRect = wMin;
    const wTri = wMax - wMin;

    // Rectangular part (UDL)
    let femStart = -(wRect * L2) / 12;
    let femEnd = (wRect * L2) / 12;

    // Triangular part
    if (wTri > 0) {
      if (w2 > w1) {
        // Increasing from left to right (0 to wTri)
        femStart += -(wTri * L2) / 20;
        femEnd += (wTri * L2) / 30;
      } else {
        // Decreasing from left to right (wTri to 0)
        femStart += -(wTri * L2) / 30;
        femEnd += (wTri * L2) / 20;
      }
    }

    return { femStart, femEnd };
  }

  // For partial span VDL, use Gauss-Legendre quadrature for high accuracy
  // This provides exact results for polynomial loads up to degree 2*n-1
  // Using 10-point quadrature (exact for polynomials up to degree 19)
  const gaussPoints = [
    { t: -0.9739065285171717, w: 0.0666713443086881 },
    { t: -0.8650633666889845, w: 0.1494513491505806 },
    { t: -0.6794095682990244, w: 0.2190863625159820 },
    { t: -0.4333953941292472, w: 0.2692667193099963 },
    { t: -0.1488743389816312, w: 0.2955242247147529 },
    { t: 0.1488743389816312, w: 0.2955242247147529 },
    { t: 0.4333953941292472, w: 0.2692667193099963 },
    { t: 0.6794095682990244, w: 0.2190863625159820 },
    { t: 0.8650633666889845, w: 0.1494513491505806 },
    { t: 0.9739065285171717, w: 0.0666713443086881 },
  ];

  let femStart = 0;
  let femEnd = 0;

  // Transform from [-1, 1] to [a, b]
  const halfLength = loadLength / 2;
  const midPoint = (a + b) / 2;

  for (const gp of gaussPoints) {
    const x = midPoint + halfLength * gp.t; // Position along span
    const localT = (x - a) / loadLength; // 0 to 1 within load region
    const w_x = w1 + (w2 - w1) * localT; // Load intensity at x

    // Differential load contribution
    const dP = w_x * halfLength * gp.w;

    // FEM contributions
    const x_minus_L = L - x;
    femStart += -(dP * x * x_minus_L * x_minus_L) / L2;
    femEnd += (dP * x * x * x_minus_L) / L2;
  }

  return { femStart, femEnd };
}

/**
 * Calculate shear and moment distribution for VDL within a span
 * Returns arrays of values at specified positions
 */
export function calculateVDLEffects(
  w1: number,
  w2: number,
  spanLength: number,
  startPos: number,
  endPos: number,
  positions: number[]
): { shear: number[]; moment: number[] } {
  const L = spanLength;
  const a = Math.max(0, Math.min(L, startPos));
  const b = Math.max(0, Math.min(L, endPos));
  const loadLength = b - a;

  if (loadLength < 1e-10) {
    return {
      shear: positions.map(() => 0),
      moment: positions.map(() => 0),
    };
  }

  // Calculate total load and centroid
  const avgIntensity = (w1 + w2) / 2;
  const totalLoad = avgIntensity * loadLength;

  // Centroid of trapezoidal load from start of load region
  let centroidFromA: number;
  if (Math.abs(w1 + w2) < 1e-10) {
    centroidFromA = loadLength / 2;
  } else {
    centroidFromA = (loadLength * (w1 + 2 * w2)) / (3 * (w1 + w2));
  }
  const centroid = a + centroidFromA;

  // Simply-supported reactions due to VDL
  const R_A = (totalLoad * (L - centroid)) / L;
  const R_B = (totalLoad * centroid) / L;

  const shear: number[] = [];
  const moment: number[] = [];

  for (const x of positions) {
    let V = R_A; // Start with left reaction
    let M = 0;

    if (x > a) {
      // We're past the start of the load
      const effectiveEnd = Math.min(x, b);
      const loadedLength = effectiveEnd - a;

      if (loadedLength > 0) {
        // Calculate load intensity at effective end
        const t_end = loadedLength / loadLength;
        const w_end = w1 + (w2 - w1) * t_end;

        // Area of trapezoid from a to effectiveEnd
        const loadedArea = ((w1 + w_end) / 2) * loadedLength;
        V -= loadedArea;

        // Moment arm: centroid of partial trapezoid from a to effectiveEnd
        let partialCentroid: number;
        if (Math.abs(w1 + w_end) < 1e-10) {
          partialCentroid = loadedLength / 2;
        } else {
          partialCentroid = (loadedLength * (w1 + 2 * w_end)) / (3 * (w1 + w_end));
        }

        // Moment due to load
        const momentArm = x - (a + partialCentroid);
        M = R_A * x - loadedArea * momentArm;
      }
    } else {
      M = R_A * x;
    }

    shear.push(V);
    moment.push(M);
  }

  return { shear, moment };
}

/**
 * Calculate FEM for an applied concentrated moment
 *
 * For moment M at distance 'a' from left end:
 * FEM_AB = M * b * (b - 2a) / L²  = M * b * (L - 3a) / L²
 * FEM_BA = M * a * (a - 2b) / L² = M * a * (3b - L) / L²
 *
 * Alternative formulation (more common in textbooks):
 * FEM_AB = -M * a * b * (L + a) / L³  + M * a² * b / L² ... (complex)
 *
 * Using the simplified standard formula:
 * For clockwise moment M at distance 'a':
 * FEM_AB = M * (L - 3a)(L - a) / L²  = M * b(L - 3a) / L²
 * FEM_BA = M * (3a - L) * a / L² = M * a(3a - L) / L²
 *
 * Most reliable formula (from matrix structural analysis):
 * FEM_AB = M * (1 - 3*(a/L)²) when at distance a from A
 * FEM_BA = M * (3*(a/L)² - 2*(a/L)³) when at distance a from A... not quite
 *
 * Correct formulas from Beer & Johnston:
 * FEM_AB = -M * b(L - 3a) / L²
 * FEM_BA = M * a(L - 3b) / L²
 * where b = L - a
 */
export function calculateMomentFEM(
  magnitude: number, // M (kN·m), positive = clockwise
  spanLength: number, // L (m)
  position: number // a (m from start of span)
): { femStart: number; femEnd: number } {
  const M = magnitude;
  const L = spanLength;
  const a = Math.max(0, Math.min(L, position));
  const b = L - a;

  if (L <= 0) {
    throw new Error("Span length must be positive");
  }

  const L2 = L * L;

  // Using standard formulas for concentrated moment at distance 'a' from left
  // FEM_AB = M * b * (b - 2a) / L² = M * b * (L - 3a) / L²
  // FEM_BA = M * a * (a - 2b) / L² = M * a * (3a - L) / L² = -M * a * (L - 3a) / L²

  // Alternative (equivalent) form:
  // FEM_AB = -M * b * (L + a) / L³ + ... this gets messy

  // Let's use the formula from structural analysis textbooks:
  // For a clockwise moment M at distance a from end A:
  const femStart = (M * b * (L - 3 * a)) / L2;
  const femEnd = (M * a * (3 * a - L)) / L2;

  return { femStart, femEnd };
}

/**
 * Calculate total FEM for a span with multiple loads
 */
export function calculateSpanFEM(
  span: SpanData,
  loads: BeamLoad[]
): FixedEndMoments {
  let totalFemStart = 0;
  let totalFemEnd = 0;

  const spanLoads = loads.filter((load) => load.spanId === span.id);

  for (const load of spanLoads) {
    let fem: { femStart: number; femEnd: number };

    if (isPointLoad(load)) {
      fem = calculatePointLoadFEM(load.magnitude, span.length, load.position);
    } else if (isUDL(load)) {
      fem = calculateUDLFEM(
        load.magnitude,
        span.length,
        load.startPosition,
        load.endPosition
      );
    } else if (isVDL(load)) {
      fem = calculateVDLFEM(
        load.w1,
        load.w2,
        span.length,
        load.startPosition,
        load.endPosition
      );
    } else if (isAppliedMoment(load)) {
      fem = calculateMomentFEM(load.magnitude, span.length, load.position);
    } else {
      continue;
    }

    totalFemStart += fem.femStart;
    totalFemEnd += fem.femEnd;
  }

  return {
    spanId: span.id,
    femStart: totalFemStart,
    femEnd: totalFemEnd,
  };
}

/**
 * Get detailed FEM breakdown for calculation log
 */
export function getFEMBreakdown(
  span: SpanData,
  loads: BeamLoad[]
): FEMResult[] {
  const results: FEMResult[] = [];
  const spanLoads = loads.filter((load) => load.spanId === span.id);

  for (const load of spanLoads) {
    let fem: { femStart: number; femEnd: number };
    let loadType: string;

    if (isPointLoad(load)) {
      fem = calculatePointLoadFEM(load.magnitude, span.length, load.position);
      loadType = "Point Load";
    } else if (isUDL(load)) {
      fem = calculateUDLFEM(
        load.magnitude,
        span.length,
        load.startPosition,
        load.endPosition
      );
      loadType = "UDL";
    } else if (isVDL(load)) {
      fem = calculateVDLFEM(
        load.w1,
        load.w2,
        span.length,
        load.startPosition,
        load.endPosition
      );
      loadType = load.w1 === 0 || load.w2 === 0 ? "Triangular Load" : "Trapezoidal Load";
    } else if (isAppliedMoment(load)) {
      fem = calculateMomentFEM(load.magnitude, span.length, load.position);
      loadType = "Applied Moment";
    } else {
      continue;
    }

    results.push({
      ...fem,
      loadType,
      loadId: load.id,
    });
  }

  return results;
}

/**
 * Get formula string for calculation display (LaTeX format)
 */
export function getFEMFormulaLatex(load: BeamLoad): {
  formula: string;
  description: string;
} {
  if (isPointLoad(load)) {
    return {
      description: `Point load P = ${load.magnitude} kN at ${load.position} m`,
      formula: `FEM_{AB} = -\\frac{Pab^2}{L^2}, \\quad FEM_{BA} = \\frac{Pa^2b}{L^2}`,
    };
  }

  if (isUDL(load)) {
    const isFullSpan =
      Math.abs(load.startPosition) < 0.01 &&
      load.endPosition > load.startPosition;
    return {
      description: `UDL w = ${load.magnitude} kN/m from ${load.startPosition} to ${load.endPosition} m`,
      formula: isFullSpan
        ? `FEM_{AB} = -\\frac{wL^2}{12}, \\quad FEM_{BA} = \\frac{wL^2}{12}`
        : `FEM = \\int \\text{(partial UDL integration)}`,
    };
  }

  if (isVDL(load)) {
    if (load.w1 === 0) {
      return {
        description: `Triangular load (0 to ${load.w2} kN/m)`,
        formula: `FEM_{AB} = -\\frac{wL^2}{20}, \\quad FEM_{BA} = \\frac{wL^2}{30}`,
      };
    }
    if (load.w2 === 0) {
      return {
        description: `Triangular load (${load.w1} to 0 kN/m)`,
        formula: `FEM_{AB} = -\\frac{wL^2}{30}, \\quad FEM_{BA} = \\frac{wL^2}{20}`,
      };
    }
    return {
      description: `Trapezoidal load (${load.w1} to ${load.w2} kN/m)`,
      formula: `FEM = FEM_{rect} + FEM_{tri}`,
    };
  }

  if (isAppliedMoment(load)) {
    return {
      description: `Applied moment M = ${load.magnitude} kN·m at ${load.position} m`,
      formula: `FEM_{AB} = \\frac{Mb(L-3a)}{L^2}, \\quad FEM_{BA} = \\frac{Ma(3a-L)}{L^2}`,
    };
  }

  return {
    description: "Unknown load type",
    formula: "",
  };
}
