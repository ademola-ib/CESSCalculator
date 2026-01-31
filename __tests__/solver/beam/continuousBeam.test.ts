import { describe, it, expect } from "vitest";
import { ContinuousBeamSolver } from "@/lib/solver/beam/index";
import { ContinuousBeamData } from "@/lib/types/beam";

describe("Continuous Beam Solver", () => {
  const solver = new ContinuousBeamSolver();

  describe("Single span", () => {
    it("should solve a simply supported beam with point load at midspan", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "pinned" },
          { id: "B", position: 10, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 10,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "P1",
            type: "point",
            spanId: "AB",
            magnitude: 100,
            position: 5,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Both reactions should equal P/2 = 50 kN
      expect(result.reactions).toHaveLength(2);
      const totalReaction = result.reactions.reduce(
        (sum, r) => sum + r.vertical,
        0
      );
      expect(totalReaction).toBeCloseTo(100, 0); // Sum = applied load

      // Diagrams should be generated
      expect(result.shearForceDiagram.length).toBeGreaterThan(0);
      expect(result.bendingMomentDiagram.length).toBeGreaterThan(0);
      expect(result.deflectionDiagram.length).toBeGreaterThan(0);

      // Calculation log should have sections
      expect(result.calculationLog.sections.length).toBeGreaterThan(0);
    });

    it("should solve fixed-fixed beam with UDL", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "fixed" },
          { id: "B", position: 6, supportType: "fixed" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 6,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "W1",
            type: "udl",
            spanId: "AB",
            magnitude: 20,
            startPosition: 0,
            endPosition: 6,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Total load = 20 * 6 = 120 kN
      const totalReaction = result.reactions.reduce(
        (sum, r) => sum + r.vertical,
        0
      );
      expect(totalReaction).toBeCloseTo(120, 0);
    });
  });

  describe("Two-span beam", () => {
    it("should solve two equal spans with UDL on first span", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "pinned" },
          { id: "B", position: 5, supportType: "pinned" },
          { id: "C", position: 10, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
          {
            id: "BC",
            nodeStartId: "B",
            nodeEndId: "C",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "W1",
            type: "udl",
            spanId: "AB",
            magnitude: 10,
            startPosition: 0,
            endPosition: 5,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Total applied load = 10 * 5 = 50 kN
      const totalReaction = result.reactions.reduce(
        (sum, r) => sum + r.vertical,
        0
      );
      expect(totalReaction).toBeCloseTo(50, 0);

      // Should have 3 reactions
      expect(result.reactions).toHaveLength(3);
    });
  });

  describe("Three-span beam with varying EI", () => {
    it("should solve 3-span beam with mixed supports and varying EI multipliers", () => {
      const baseEI = 50000;
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "fixed" },
          { id: "B", position: 4, supportType: "pinned" },
          { id: "C", position: 10, supportType: "pinned" },
          { id: "D", position: 14, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 4,
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "BC",
            nodeStartId: "B",
            nodeEndId: "C",
            length: 6,
            eiMode: "multiplier",
            iMultiplier: 1.5,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            length: 4,
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
        ],
        loads: [
          {
            id: "W1",
            type: "udl",
            spanId: "AB",
            magnitude: 20,
            startPosition: 0,
            endPosition: 4,
          },
          {
            id: "P1",
            type: "point",
            spanId: "BC",
            magnitude: 50,
            position: 3,
          },
        ],
        defaultEI: baseEI,
      };

      const result = solver.solve(beam);

      // Total applied load = 20*4 + 50 = 130 kN
      const totalReaction = result.reactions.reduce(
        (sum, r) => sum + r.vertical,
        0
      );
      expect(totalReaction).toBeCloseTo(130, 0);

      // Should have 4 reactions (one per node)
      expect(result.reactions).toHaveLength(4);

      // End moments should exist
      expect(result.endMoments).toHaveLength(3);

      // Calculation log should have all 7 sections
      expect(result.calculationLog.sections.length).toBe(7);
    });
  });

  describe("Settlement support", () => {
    it("should handle support settlement in 2-span beam", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "fixed" },
          { id: "B", position: 5, supportType: "pinned", settlement: 0.01 }, // 10mm
          { id: "C", position: 10, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
          {
            id: "BC",
            nodeStartId: "B",
            nodeEndId: "C",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [], // No loads - settlement only
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Settlement should cause non-zero end moments
      const hasNonZeroMoment = result.endMoments.some(
        (em) => Math.abs(em.mStart) > 0.001 || Math.abs(em.mEnd) > 0.001
      );
      expect(hasNonZeroMoment).toBe(true);
    });
  });

  describe("Applied moment loads", () => {
    it("should solve single span with end moment", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "pinned" },
          { id: "B", position: 8, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 8,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "M1",
            type: "moment",
            spanId: "AB",
            magnitude: 60,
            position: 4,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Applied moment doesn't contribute to vertical loads
      // but FEM should be non-zero
      expect(result.endMoments).toHaveLength(1);

      // Calculation log should include moment FEM
      expect(result.calculationLog.sections.length).toBeGreaterThan(0);
    });

    it("should solve two spans with internal applied moment", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "fixed" },
          { id: "B", position: 5, supportType: "pinned" },
          { id: "C", position: 10, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
          {
            id: "BC",
            nodeStartId: "B",
            nodeEndId: "C",
            length: 5,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "M1",
            type: "moment",
            spanId: "AB",
            magnitude: 100,
            position: 2.5,
          },
          {
            id: "W1",
            type: "udl",
            spanId: "BC",
            magnitude: 10,
            startPosition: 0,
            endPosition: 5,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // Total vertical load = 10*5 = 50 kN (moment doesn't contribute)
      const totalReaction = result.reactions.reduce(
        (sum, r) => sum + r.vertical,
        0
      );
      expect(totalReaction).toBeCloseTo(50, 0);

      expect(result.endMoments).toHaveLength(2);
    });

    it("should solve continuous beam with multiple moments", () => {
      const beam: ContinuousBeamData = {
        nodes: [
          { id: "A", position: 0, supportType: "pinned" },
          { id: "B", position: 6, supportType: "pinned" },
          { id: "C", position: 12, supportType: "pinned" },
          { id: "D", position: 18, supportType: "roller" },
        ],
        spans: [
          {
            id: "AB",
            nodeStartId: "A",
            nodeEndId: "B",
            length: 6,
            eiMode: "direct",
            ei: 50000,
          },
          {
            id: "BC",
            nodeStartId: "B",
            nodeEndId: "C",
            length: 6,
            eiMode: "direct",
            ei: 50000,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            length: 6,
            eiMode: "direct",
            ei: 50000,
          },
        ],
        loads: [
          {
            id: "M1",
            type: "moment",
            spanId: "AB",
            magnitude: 50,
            position: 3,
          },
          {
            id: "M2",
            type: "moment",
            spanId: "BC",
            magnitude: -30,
            position: 3,
          },
          {
            id: "M3",
            type: "moment",
            spanId: "CD",
            magnitude: 40,
            position: 3,
          },
        ],
        defaultEI: 50000,
      };

      const result = solver.solve(beam);

      // All 4 reactions should exist
      expect(result.reactions).toHaveLength(4);

      // 3 spans should have end moments
      expect(result.endMoments).toHaveLength(3);
    });
  });
});
