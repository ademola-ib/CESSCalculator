import { describe, it, expect } from "vitest";
import { FrameAnalysisSolver } from "@/lib/solver/frame/index";
import { FrameData } from "@/lib/types/frame";

describe("Frame Solver", () => {
  const solver = new FrameAnalysisSolver();

  describe("Non-sway frame", () => {
    it("should solve single-bay single-story non-sway frame with UDL on beam", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 6, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 4 },
          { id: "D", x: 6, y: 4 },
        ],
        members: [
          {
            id: "AC",
            nodeStartId: "A",
            nodeEndId: "C",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "BD",
            nodeStartId: "B",
            nodeEndId: "D",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            memberType: "beam",
            eiMode: "multiplier",
            iMultiplier: 2.0,
          },
        ],
        loads: [
          {
            id: "W1",
            type: "member-udl",
            memberId: "CD",
            magnitude: 20,
            startPosition: 0,
            endPosition: 1,
          },
        ],
        isSway: false,
        defaultEI: 50000,
      };

      const result = solver.solve(frame);

      // Should have forces for all 3 members
      expect(result.memberForces).toHaveLength(3);

      // Should have 2 reactions (supports A and B)
      expect(result.reactions).toHaveLength(2);

      // Vertical reactions should sum to total load (20 * 6 = 120 kN)
      const totalVertical = result.reactions.reduce(
        (sum, r) => sum + r.fy,
        0
      );
      expect(Math.abs(totalVertical)).toBeCloseTo(120, -1); // Approximate

      // Should have member diagrams
      expect(result.memberDiagrams.length).toBeGreaterThan(0);

      // Should have calculation log
      expect(result.calculationLog.sections.length).toBeGreaterThan(0);

      // Node displacements should exist for all nodes
      expect(result.nodeDisplacements).toHaveLength(4);
    });

    it("should produce zero horizontal reactions for symmetric non-sway frame", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 6, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 4 },
          { id: "D", x: 6, y: 4 },
        ],
        members: [
          {
            id: "AC",
            nodeStartId: "A",
            nodeEndId: "C",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "BD",
            nodeStartId: "B",
            nodeEndId: "D",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            memberType: "beam",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
        ],
        loads: [
          {
            id: "W1",
            type: "member-udl",
            memberId: "CD",
            magnitude: 20,
            startPosition: 0,
            endPosition: 1,
          },
        ],
        isSway: false,
        defaultEI: 50000,
      };

      const result = solver.solve(frame);

      // For symmetric frame with vertical loads only, horizontal reactions should be small
      // (may not be exactly zero due to numerical precision)
      const totalHorizontal = result.reactions.reduce(
        (sum, r) => sum + r.fx,
        0
      );
      // Total horizontal should be approximately zero (equilibrium)
      expect(Math.abs(totalHorizontal)).toBeLessThan(1);
    });
  });

  describe("Sway frame", () => {
    it("should solve frame with lateral load", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 6, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 4 },
          { id: "D", x: 6, y: 4 },
        ],
        members: [
          {
            id: "AC",
            nodeStartId: "A",
            nodeEndId: "C",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "BD",
            nodeStartId: "B",
            nodeEndId: "D",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            memberType: "beam",
            eiMode: "multiplier",
            iMultiplier: 2.0,
          },
        ],
        loads: [
          {
            id: "H1",
            type: "joint",
            nodeId: "C",
            fx: 50,
          },
        ],
        isSway: true,
        defaultEI: 50000,
      };

      const result = solver.solve(frame);

      // Free joints (C, D) should have horizontal displacement
      const nodeC = result.nodeDisplacements.find((d) => d.nodeId === "C");
      const nodeD = result.nodeDisplacements.find((d) => d.nodeId === "D");

      expect(nodeC).toBeDefined();
      expect(nodeD).toBeDefined();

      // Both top nodes should sway to the right
      expect(nodeC!.dx).toBeGreaterThan(0);
      expect(nodeD!.dx).toBeGreaterThan(0);

      // Horizontal reactions should sum to applied horizontal force
      const totalHorizontal = result.reactions.reduce(
        (sum, r) => sum + r.fx,
        0
      );
      // Equilibrium: reactions should balance applied load (sign depends on convention)
      expect(Math.abs(totalHorizontal)).toBeCloseTo(50, -1);

      // Should have member forces
      expect(result.memberForces).toHaveLength(3);
    });

    it("should handle variable EI members", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 5, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 3 },
          { id: "D", x: 5, y: 3 },
        ],
        members: [
          {
            id: "AC",
            nodeStartId: "A",
            nodeEndId: "C",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 0.8,
          },
          {
            id: "BD",
            nodeStartId: "B",
            nodeEndId: "D",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.5,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            memberType: "beam",
            eiMode: "multiplier",
            iMultiplier: 2.0,
          },
        ],
        loads: [
          {
            id: "P1",
            type: "member-point",
            memberId: "CD",
            magnitude: 30,
            position: 0.5,
          },
        ],
        isSway: false,
        defaultEI: 40000,
      };

      const result = solver.solve(frame);

      // Should produce valid results with different EI values
      expect(result.memberForces).toHaveLength(3);
      expect(result.reactions).toHaveLength(2);

      // Asymmetric stiffness should cause unequal reactions
      const rA = result.reactions.find((r) => r.nodeId === "A");
      const rB = result.reactions.find((r) => r.nodeId === "B");
      expect(rA).toBeDefined();
      expect(rB).toBeDefined();
      // With different column stiffnesses, reactions won't be equal
      expect(rA!.fy).not.toBeCloseTo(rB!.fy, 0);
    });
  });

  describe("Result structure", () => {
    it("should include complete calculation log", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 4, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 3 },
          { id: "D", x: 4, y: 3 },
        ],
        members: [
          {
            id: "AC",
            nodeStartId: "A",
            nodeEndId: "C",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "BD",
            nodeStartId: "B",
            nodeEndId: "D",
            memberType: "column",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
          {
            id: "CD",
            nodeStartId: "C",
            nodeEndId: "D",
            memberType: "beam",
            eiMode: "multiplier",
            iMultiplier: 1.0,
          },
        ],
        loads: [],
        isSway: false,
        defaultEI: 50000,
      };

      const result = solver.solve(frame);

      // Calculation log should have sections
      expect(result.calculationLog).toBeDefined();
      expect(result.calculationLog.sections.length).toBeGreaterThanOrEqual(4);

      // Each section should have title and steps
      for (const section of result.calculationLog.sections) {
        expect(section.title).toBeTruthy();
        expect(section.steps).toBeDefined();
        expect(section.steps.length).toBeGreaterThan(0);
      }
    });
  });
});
