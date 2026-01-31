import { describe, it, expect } from "vitest";
import {
  calculatePointLoadFEM,
  calculateUDLFEM,
  calculateVDLFEM,
  calculateMomentFEM,
} from "@/lib/solver/beam/fem";

describe("Fixed End Moments", () => {
  describe("Point Load", () => {
    it("should calculate FEM for point load at midspan", () => {
      // P = 100 kN at midspan of L = 10m
      const { femStart, femEnd } = calculatePointLoadFEM(100, 10, 5);

      // FEM_AB = -Pab²/L² = -100*5*25/100 = -125 kN·m
      expect(femStart).toBeCloseTo(-125, 1);
      // FEM_BA = Pa²b/L² = 100*25*5/100 = 125 kN·m
      expect(femEnd).toBeCloseTo(125, 1);
    });

    it("should calculate FEM for point load at quarter span", () => {
      // P = 100 kN at a = 2.5m on L = 10m
      const { femStart, femEnd } = calculatePointLoadFEM(100, 10, 2.5);

      // FEM_AB = -P*a*b²/L² = -100*2.5*56.25/100 = -140.625
      expect(femStart).toBeCloseTo(-140.625, 1);
      // FEM_BA = P*a²*b/L² = 100*6.25*7.5/100 = 46.875
      expect(femEnd).toBeCloseTo(46.875, 1);
    });

    it("should return zero FEM for load at support", () => {
      const { femStart, femEnd } = calculatePointLoadFEM(100, 10, 0);
      expect(femStart).toBeCloseTo(0, 5);
      // FEM at other end is also zero when load is at the support
      expect(femEnd).toBeCloseTo(0, 5);
    });

    it("should handle negative loads (upward)", () => {
      const { femStart, femEnd } = calculatePointLoadFEM(-50, 8, 4);
      expect(femStart).toBeCloseTo(50, 1); // Opposite sign
      expect(femEnd).toBeCloseTo(-50, 1);
    });
  });

  describe("UDL", () => {
    it("should calculate FEM for full span UDL", () => {
      // w = 10 kN/m over full span of L = 6m
      const { femStart, femEnd } = calculateUDLFEM(10, 6, 0, 6);

      // FEM_AB = -wL²/12 = -10*36/12 = -30
      expect(femStart).toBeCloseTo(-30, 0);
      // FEM_BA = wL²/12 = 30
      expect(femEnd).toBeCloseTo(30, 0);
    });

    it("should calculate FEM for larger UDL", () => {
      // w = 20 kN/m over L = 4m
      const { femStart, femEnd } = calculateUDLFEM(20, 4, 0, 4);

      // FEM_AB = -20*16/12 = -26.667
      expect(femStart).toBeCloseTo(-26.667, 0);
      expect(femEnd).toBeCloseTo(26.667, 0);
    });

    it("should return zero for zero-length UDL", () => {
      const { femStart, femEnd } = calculateUDLFEM(10, 6, 3, 3);
      expect(femStart).toBeCloseTo(0);
      expect(femEnd).toBeCloseTo(0);
    });
  });

  describe("VDL (Varying Distributed Load)", () => {
    it("should calculate FEM for triangular load (0 to w)", () => {
      // Triangular load 0 to 10 kN/m over L = 6m
      const { femStart, femEnd } = calculateVDLFEM(0, 10, 6);

      // FEM_AB = -(wL²/20) for rectangular + triangular decomposition
      // Full triangular: FEM_AB = -wL²/20 = -10*36/20 = -18
      expect(femStart).toBeCloseTo(-18, 0);
      // FEM_BA = wL²/30 = 10*36/30 = 12
      expect(femEnd).toBeCloseTo(12, 0);
    });

    it("should calculate FEM for triangular load (w to 0)", () => {
      // Triangular load 10 to 0 kN/m over L = 6m
      const { femStart, femEnd } = calculateVDLFEM(10, 0, 6);

      // FEM_AB = -wL²/30 = -10*36/30 = -12
      expect(femStart).toBeCloseTo(-12, 0);
      // FEM_BA = wL²/20 = 10*36/20 = 18
      expect(femEnd).toBeCloseTo(18, 0);
    });

    it("should calculate FEM for trapezoidal load", () => {
      // Trapezoidal 5 to 15 kN/m over L = 6m
      // Decompose: rectangular 5 kN/m + triangular 0 to 10 kN/m
      const { femStart, femEnd } = calculateVDLFEM(5, 15, 6);

      // Rectangular part: FEM_AB = -5*36/12 = -15, FEM_BA = 15
      // Triangular part (0 to 10): FEM_AB = -10*36/20 = -18, FEM_BA = 10*36/30 = 12
      // Total: FEM_AB = -15 + -18 = -33, FEM_BA = 15 + 12 = 27
      expect(femStart).toBeCloseTo(-33, 0);
      expect(femEnd).toBeCloseTo(27, 0);
    });

    it("should handle uniform load (w1 = w2)", () => {
      // This should give same result as UDL
      const vdlResult = calculateVDLFEM(10, 10, 6);
      const udlResult = calculateUDLFEM(10, 6, 0, 6);

      expect(vdlResult.femStart).toBeCloseTo(udlResult.femStart, 0);
      expect(vdlResult.femEnd).toBeCloseTo(udlResult.femEnd, 0);
    });
  });

  describe("Applied Moment", () => {
    it("should calculate FEM for moment at midspan", () => {
      // M = 100 kN·m at midspan of L = 10m
      const { femStart, femEnd } = calculateMomentFEM(100, 10, 5);

      // Using formula: FEM_AB = M*b*(L-3a)/L²
      // a = 5, b = 5
      // FEM_AB = 100*5*(10-15)/100 = 100*5*(-5)/100 = -25
      expect(femStart).toBeCloseTo(-25, 1);
      // FEM_BA = M*a*(3a-L)/L² = 100*5*(15-10)/100 = 25
      expect(femEnd).toBeCloseTo(25, 1);
    });

    it("should calculate FEM for moment at quarter span", () => {
      // M = 100 kN·m at a = 2.5m on L = 10m
      const { femStart, femEnd } = calculateMomentFEM(100, 10, 2.5);

      // FEM_AB = M*b*(L-3a)/L² = 100*7.5*(10-7.5)/100 = 100*7.5*2.5/100 = 18.75
      expect(femStart).toBeCloseTo(18.75, 1);
      // FEM_BA = M*a*(3a-L)/L² = 100*2.5*(7.5-10)/100 = 100*2.5*(-2.5)/100 = -6.25
      expect(femEnd).toBeCloseTo(-6.25, 1);
    });

    it("should handle zero moment", () => {
      const { femStart, femEnd } = calculateMomentFEM(0, 10, 5);
      expect(femStart).toBeCloseTo(0);
      expect(femEnd).toBeCloseTo(0);
    });

    it("should handle negative moment (counter-clockwise)", () => {
      const pos = calculateMomentFEM(100, 10, 5);
      const neg = calculateMomentFEM(-100, 10, 5);

      expect(neg.femStart).toBeCloseTo(-pos.femStart, 5);
      expect(neg.femEnd).toBeCloseTo(-pos.femEnd, 5);
    });
  });
});
