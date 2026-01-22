import { describe, it, expect } from "vitest";
import { BeamSolver } from "@/lib/solver/BeamSolver";
import { BeamInput } from "@/lib/solver/types";

describe("BeamSolver", () => {
  const solver = new BeamSolver();

  it("should solve a simple beam case", () => {
    const input: BeamInput = {
      length: 10,
      ei: 50000,
      spans: 1,
      supports: ["pinned", "roller"],
      loads: [
        {
          type: "point",
          magnitude: 100,
          position: 5,
        },
      ],
    };

    const result = solver.solve(input);

    expect(result).toBeDefined();
    expect(result.reactions).toHaveLength(2);
    expect(result.shearForce).toBeDefined();
    expect(result.bendingMoment).toBeDefined();
    expect(result.deflection).toBeDefined();
  });

  it("should generate correct number of data points", () => {
    const input: BeamInput = {
      length: 10,
      ei: 50000,
      spans: 1,
      supports: ["pinned", "roller"],
      loads: [],
    };

    const result = solver.solve(input);
    expect(result.shearForce.length).toBe(101);
    expect(result.bendingMoment.length).toBe(101);
    expect(result.deflection.length).toBe(101);
  });
});
