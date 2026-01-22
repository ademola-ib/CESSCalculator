# Solver Module

This directory contains the structural analysis solver implementations.

## Overview

The MVP includes **placeholder solvers** with simplified calculations for demonstration purposes. These solvers provide the correct data structure and interface, but use simplified formulas instead of full slope-deflection analysis.

## Replacing the Solvers

To integrate your production slope-deflection solver:

### 1. Review the Interface

Check `types.ts` for the input/output interfaces:
- `BeamInput` / `BeamResults`
- `FrameInput` / `FrameResults`

### 2. Implement Your Solver

Replace the implementation in `BeamSolver.ts` and `FrameSolver.ts` while keeping the same interface:

```typescript
export class BeamSolver {
  solve(input: BeamInput): BeamResults {
    // Your implementation here
    // Must return BeamResults structure
  }
}
```

### 3. No UI Changes Needed

The UI components consume the results through the defined interfaces. As long as your solver returns the correct structure, everything will work seamlessly.

## Current Implementation

**BeamSolver.ts:**
- Placeholder reactions calculation
- Simplified SFD/BMD/deflection curves
- Uses trigonometric functions for demo visualization

**FrameSolver.ts:**
- Placeholder joint displacements
- Random member forces for demonstration
- Basic geometry-based node/member generation

## Testing Your Solver

1. Create a test project in the UI
2. Input your test case parameters
3. Compare results with hand calculations or reference software
4. Iterate until validated

## File Structure

```
lib/solver/
├── types.ts           # Interface definitions
├── BeamSolver.ts      # Beam analysis implementation
├── FrameSolver.ts     # Frame analysis implementation
└── README.md          # This file
```
