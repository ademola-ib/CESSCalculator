# CESSCalculator Production Upgrade - Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for upgrading CESSCalculator into a production-quality slope-deflection solver supporting:
- Unlimited continuous beam spans
- Rigid frames (sway and non-sway)
- Gemini AI Vision integration for image-based problem extraction
- Enhanced visualizers with VDL support
- Accurate step-by-step calculations

---

## Phase 1: Data Models & Type System

### 1.1 Enhanced Beam Types (`lib/types/beam.ts`)

```typescript
// New comprehensive beam types with multi-span support

export type SupportType = "fixed" | "pinned" | "roller" | "free";

export interface NodeData {
  id: string;
  position: number;           // distance from left end (m)
  supportType: SupportType;
  settlement?: number;        // vertical settlement (m, positive = downward)
  rotation?: number;          // prescribed rotation (rad)
}

export interface SpanData {
  id: string;
  nodeStartId: string;        // left node id
  nodeEndId: string;          // right node id
  length: number;             // span length (m)
  eiMode: "direct" | "multiplier";
  ei?: number;                // direct EI value (kN·m²)
  eBase?: number;             // base E (kPa)
  iBase?: number;             // base I (m⁴)
  iMultiplier?: number;       // I multiplier (e.g., 2.0 for 2I)
}

// Load types
export interface PointLoad {
  id: string;
  type: "point";
  spanId: string;
  magnitude: number;          // kN (positive = downward)
  position: number;           // distance from span start (m)
}

export interface UDL {
  id: string;
  type: "udl";
  spanId: string;
  magnitude: number;          // kN/m (positive = downward)
  startPosition: number;      // distance from span start (m)
  endPosition: number;        // distance from span start (m)
}

export interface VDL {
  id: string;
  type: "vdl";
  spanId: string;
  w1: number;                 // intensity at start (kN/m)
  w2: number;                 // intensity at end (kN/m)
  startPosition: number;      // distance from span start (m)
  endPosition: number;        // distance from span start (m)
}

export interface AppliedMoment {
  id: string;
  type: "moment";
  spanId: string;
  magnitude: number;          // kN·m (positive = clockwise)
  position: number;           // distance from span start (m)
}

export type BeamLoad = PointLoad | UDL | VDL | AppliedMoment;

export interface ContinuousBeamData {
  nodes: NodeData[];
  spans: SpanData[];
  loads: BeamLoad[];
  defaultE?: number;          // default E value (kPa)
  defaultIBase?: number;      // default I base value (m⁴)
}
```

### 1.2 Enhanced Frame Types (`lib/types/frame.ts`)

```typescript
export type FrameSupportType = "fixed" | "pinned" | "roller";

export interface FrameNodeData {
  id: string;
  x: number;                  // horizontal position (m)
  y: number;                  // vertical position (m)
  support?: FrameSupportType;
  settlement?: {
    dx: number;               // horizontal settlement (m)
    dy: number;               // vertical settlement (m)
    rotation: number;         // rotational settlement (rad)
  };
}

export interface FrameMemberData {
  id: string;
  nodeStartId: string;
  nodeEndId: string;
  memberType: "beam" | "column";
  eiMode: "direct" | "multiplier";
  ei?: number;                // direct EI value
  iMultiplier?: number;       // I multiplier (1.0, 1.5, 2.0, etc.)
}

// Frame load types
export interface FrameJointLoad {
  id: string;
  type: "joint";
  nodeId: string;
  fx?: number;                // horizontal force (kN, positive = right)
  fy?: number;                // vertical force (kN, positive = up)
  moment?: number;            // moment (kN·m, positive = CCW)
}

export interface FrameMemberPointLoad {
  id: string;
  type: "member-point";
  memberId: string;
  magnitude: number;          // kN (perpendicular to member)
  position: number;           // normalized 0-1 from start
}

export interface FrameMemberUDL {
  id: string;
  type: "member-udl";
  memberId: string;
  magnitude: number;          // kN/m
  startPosition: number;      // normalized 0-1
  endPosition: number;        // normalized 0-1
}

export interface FrameMemberVDL {
  id: string;
  type: "member-vdl";
  memberId: string;
  w1: number;                 // kN/m at start
  w2: number;                 // kN/m at end
  startPosition: number;      // normalized 0-1
  endPosition: number;        // normalized 0-1
}

export interface FrameMemberMoment {
  id: string;
  type: "member-moment";
  memberId: string;
  magnitude: number;          // kN·m
  position: number;           // normalized 0-1
}

export type FrameLoad =
  | FrameJointLoad
  | FrameMemberPointLoad
  | FrameMemberUDL
  | FrameMemberVDL
  | FrameMemberMoment;

export interface FrameData {
  nodes: FrameNodeData[];
  members: FrameMemberData[];
  loads: FrameLoad[];
  isSway: boolean;            // sway vs non-sway frame
  defaultE?: number;
  defaultIBase?: number;
}
```

---

## Phase 2: Generalized Slope-Deflection Solver

### 2.1 Mathematical Foundation

The slope-deflection equations for a member i-j are:

```
M_ij = FEM_ij + (2EI/L)[2θ_i + θ_j - 3ψ]
M_ji = FEM_ji + (2EI/L)[2θ_j + θ_i - 3ψ]
```

Where:
- FEM_ij, FEM_ji = Fixed End Moments
- θ_i, θ_j = Rotations at ends i and j
- ψ = Chord rotation = Δ/L (due to settlement or sway)
- L = Member length
- EI = Flexural rigidity

### 2.2 Fixed End Moment Formulas

**Point Load P at distance a from left:**
```
FEM_AB = -Pab²/L²
FEM_BA = Pa²b/L²
```

**UDL w over full span:**
```
FEM_AB = -wL²/12
FEM_BA = wL²/12
```

**Partial UDL w from x1 to x2:**
```
Use superposition or integrate directly
```

**VDL (Triangular, 0 to w):**
```
FEM_AB = -wL²/20
FEM_BA = wL²/30
```

**VDL (Triangular, w to 0):**
```
FEM_AB = -wL²/30
FEM_BA = wL²/20
```

**Trapezoidal VDL (w1 to w2):**
```
Decompose into rectangular (UDL) + triangular
```

**Applied Moment M at distance a from left:**
```
FEM_AB = -Mab(a-L)/(L²) = -M·b·(b-2a)/(L²)  [simplified: -M·b(L-2a)/L²]
FEM_BA = -Ma(a-L)(L-a)/(L²) = M·a·(L-2a)/(L²) [simplified: Ma(2b-L)/L²]

Alternative (cleaner):
FEM_AB = M·b·(b-L)/(L²) = -M·b·(L-b)/L²
FEM_BA = M·a·(a-L)/(L²) = -M·a·(L-a)/L²

Most standard (for clockwise M at distance a):
FEM_AB = M(b)(b-2a)/L² where b = L-a
FEM_BA = M(a)(a-2b)/L²

Correct standard formulas for moment M at distance 'a':
FEM_AB = -M·b(L + a) / L² + M·a·b / L = M·b(3a - L) / L²
Actually, use:
FEM_AB = M(b)(b-2a)/L² = M(L-a)(L-a-2a)/L² = M(L-a)(L-3a)/L²

Let me use the correct textbook formula:
For applied moment M at distance 'a' from A:
FEM_AB = -M·(3ab - 2aL - b²)/L² simplified
FEM_BA = -M·(3ab - 2bL - a²)/L² simplified

Most accurate (Hibbler/structural analysis texts):
FEM_AB = M[b(3a-L)/L²] when b = L-a
FEM_BA = M[a(3b-L)/L²]

For moment at midspan (a=L/2): FEM_AB = FEM_BA = -M/4 (approximately)
```

### 2.3 Solver Architecture (`lib/solver/beam/`)

```
lib/solver/beam/
├── index.ts                    # Main ContinuousBeamSolver class
├── fem.ts                      # Fixed End Moment calculations
├── stiffness.ts                # Stiffness matrix assembly
├── linearAlgebra.ts            # Matrix operations, Gaussian elimination
├── diagrams.ts                 # SFD, BMD, deflection generation
├── reactions.ts                # Support reaction calculations
├── calculations.ts             # Step-by-step calculation log generation
└── types.ts                    # Solver-specific types

lib/solver/frame/
├── index.ts                    # FrameSolver class
├── fem.ts                      # Frame FEM calculations
├── stiffness.ts                # Global stiffness matrix
├── sway.ts                     # Sway analysis handling
├── diagrams.ts                 # Member diagrams
├── reactions.ts                # Frame reactions
├── calculations.ts             # Calculation log
└── types.ts
```

### 2.4 Continuous Beam Solver Algorithm

```typescript
class ContinuousBeamSolver {
  solve(beam: ContinuousBeamData): BeamSolverResult {
    // 1. Build node list sorted by position
    const sortedNodes = this.sortNodes(beam.nodes);

    // 2. Identify DOFs (Degrees of Freedom)
    // - Fixed: θ = 0 (known)
    // - Pinned/Roller: θ unknown (DOF)
    // - Free end: θ unknown (DOF)

    // 3. Calculate FEM for each span
    const femBySpan = this.calculateAllFEM(beam.spans, beam.loads);

    // 4. Build system of equations
    // For each internal node (and free ends), sum of moments = 0
    // M_left + M_right = 0 (or = external moment at joint)

    // 5. Assemble stiffness matrix K and load vector F
    // Kθ = F

    // 6. Solve for unknown rotations θ
    const rotations = this.solveSystem(K, F);

    // 7. Back-substitute to get member end moments
    const endMoments = this.calculateEndMoments(rotations, femBySpan);

    // 8. Calculate reactions
    const reactions = this.calculateReactions(endMoments, beam);

    // 9. Generate diagrams
    const diagrams = this.generateDiagrams(endMoments, reactions, beam);

    // 10. Generate calculation log
    const log = this.generateCalculationLog(...);

    return { endMoments, reactions, diagrams, log };
  }
}
```

### 2.5 Frame Solver Algorithm

```typescript
class FrameSolver {
  solve(frame: FrameData): FrameSolverResult {
    // 1. Number nodes and identify DOFs
    // Each node: 3 DOFs (dx, dy, rotation) unless restrained

    // 2. Transform member stiffness to global coordinates
    // [K_global] = [T]^T [K_local] [T]

    // 3. Calculate FEM in local coordinates
    const femLocal = this.calculateMemberFEM(frame);

    // 4. Transform FEM to global
    const femGlobal = this.transformFEMToGlobal(femLocal);

    // 5. If sway frame:
    //    - Add sidesway DOF(s)
    //    - Use shear equilibrium equation(s)

    // 6. Assemble global stiffness matrix

    // 7. Solve [K]{D} = {F}
    const displacements = this.solveSystem(K, F);

    // 8. Extract member forces
    const memberForces = this.calculateMemberForces(displacements);

    // 9. Calculate reactions

    // 10. Generate diagrams per member

    return { displacements, memberForces, reactions, diagrams, log };
  }
}
```

---

## Phase 3: Gemini AI Integration

### 3.1 API Route (`app/api/gemini/parse-structure/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Response schemas
const BeamExtractionSchema = z.object({
  problemType: z.literal("beam"),
  spans: z.array(z.object({
    length: z.number(),
    iMultiplier: z.number().optional().default(1.0),
  })),
  supports: z.array(z.object({
    position: z.number(),
    type: z.enum(["fixed", "pinned", "roller"]),
    settlement: z.number().optional(),
  })),
  loads: z.array(z.union([
    z.object({
      type: z.literal("point"),
      magnitude: z.number(),
      position: z.number(),
    }),
    z.object({
      type: z.literal("udl"),
      magnitude: z.number(),
      start: z.number(),
      end: z.number(),
    }),
    z.object({
      type: z.literal("vdl"),
      w1: z.number(),
      w2: z.number(),
      start: z.number(),
      end: z.number(),
    }),
    z.object({
      type: z.literal("moment"),
      magnitude: z.number(),
      position: z.number(),
    }),
  ])),
  ei: z.number().optional(),
  confidence: z.number(),
  unknowns: z.array(z.string()).optional(),
});

const FrameExtractionSchema = z.object({
  problemType: z.literal("frame"),
  bays: z.number(),
  stories: z.number(),
  bayWidths: z.array(z.number()),
  storyHeights: z.array(z.number()),
  supports: z.array(z.object({
    position: z.number(),
    type: z.enum(["fixed", "pinned", "roller"]),
  })),
  memberProperties: z.array(z.object({
    memberType: z.enum(["beam", "column"]),
    iMultiplier: z.number(),
  })).optional(),
  loads: z.array(z.any()),
  isSway: z.boolean(),
  confidence: z.number(),
  unknowns: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Parse multipart form data or base64
  const formData = await req.formData();
  const imageFile = formData.get("image") as File;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const imageData = await imageFile.arrayBuffer();
  const base64Image = Buffer.from(imageData).toString("base64");
  const mimeType = imageFile.type;

  const prompt = `Analyze this structural engineering problem image and extract the following information in JSON format:

1. Determine if this is a BEAM or FRAME problem
2. For BEAMS:
   - Number and lengths of spans
   - Support types (fixed, pinned/hinged, roller) and positions
   - All loads: point loads (P, in kN), UDL (w, in kN/m), VDL/triangular (w1 to w2), applied moments (M, in kN·m)
   - EI values or I multipliers (like "2I", "1.5I") per span
   - Any support settlements

3. For FRAMES:
   - Number of bays and stories
   - Bay widths and story heights
   - Support conditions at base
   - Whether it's a sway or non-sway frame
   - Member EI multipliers
   - All loads (joint forces, member loads)

4. Convert all "2I", "1.5I", "0.8I" notations to numeric multipliers (2.0, 1.5, 0.8)
5. Convert loads like "10kN/m" to numeric values with units noted
6. If any values are unclear, include them in an "unknowns" array

Return ONLY valid JSON matching this schema:
{
  "problemType": "beam" | "frame",
  "confidence": 0-1,
  "unknowns": ["list of unclear items"],
  // ... rest of extracted data
}`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const response = result.response.text();
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({
        error: "Could not parse extraction",
        raw: response
      }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Validate with appropriate schema
    const validated = extracted.problemType === "beam"
      ? BeamExtractionSchema.parse(extracted)
      : FrameExtractionSchema.parse(extracted);

    return NextResponse.json(validated);
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({
      error: "Failed to analyze image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
```

### 3.2 Frontend Components

**ImageUploadModal** (`components/gemini/ImageUploadModal.tsx`):
- Camera capture (mobile)
- File upload
- Preview
- Upload progress

**ExtractionReviewScreen** (`components/gemini/ExtractionReviewScreen.tsx`):
- Display extracted data
- Editable fields for corrections
- Confidence indicators
- "Apply to Visualizer" button

---

## Phase 4: Visualizer Enhancements

### 4.1 Enhanced BeamVisualizer

New features:
- VDL (varying distributed load) rendering with gradient arrows
- Multi-span support lines showing span divisions
- Settlement indicators at supports
- I-multiplier labels per span
- Touch support for mobile

### 4.2 Enhanced FrameVisualizer

New features:
- Member selection highlighting
- Load application on members (not just joints)
- Sway/non-sway toggle
- Member property labels (EI multipliers)
- Proper column/beam orientation

### 4.3 VDL Rendering

```typescript
// Trapezoidal load rendering
function renderVDL(load: VDL, scale: number) {
  const x1 = toSVGX(load.startPosition);
  const x2 = toSVGX(load.endPosition);
  const h1 = load.w1 * intensityScale;
  const h2 = load.w2 * intensityScale;

  return (
    <g>
      {/* Trapezoidal fill */}
      <polygon
        points={`
          ${x1},${beamY}
          ${x1},${beamY - h1}
          ${x2},${beamY - h2}
          ${x2},${beamY}
        `}
        fill="rgba(147, 51, 234, 0.2)"
        stroke="rgb(147, 51, 234)"
      />
      {/* Intensity arrows */}
      {generateGradientArrows(x1, x2, load.w1, load.w2)}
      {/* Labels */}
      <text x={x1} y={beamY - h1 - 10}>{load.w1} kN/m</text>
      <text x={x2} y={beamY - h2 - 10}>{load.w2} kN/m</text>
    </g>
  );
}
```

---

## Phase 5: Step-by-Step Calculations Display

### 5.1 KaTeX Integration

Install: `npm install katex react-katex`

```typescript
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// Usage in CalcStep component
function CalcStep({ step }: { step: CalculationStep }) {
  return (
    <div className="step">
      <p>{step.description}</p>
      {step.formula && (
        <BlockMath math={step.formula} />
      )}
      {step.substitution && (
        <BlockMath math={step.substitution} />
      )}
      {step.result !== undefined && (
        <p className="result">
          = {step.result} {step.unit}
        </p>
      )}
    </div>
  );
}
```

### 5.2 Calculation Log Structure

```typescript
interface EnhancedCalculationLog {
  sections: [
    {
      title: "1. Problem Setup",
      steps: [
        { description: "Beam configuration", content: "3-span continuous beam" },
        { description: "Span lengths", content: "L₁ = 4m, L₂ = 6m, L₃ = 4m" },
        { description: "Support conditions", content: "Fixed at A, Pinned at B, C, Roller at D" },
      ]
    },
    {
      title: "2. Fixed End Moments",
      steps: [
        {
          description: "Span AB with UDL w = 20 kN/m",
          formula: "FEM_{AB} = -\\frac{wL^2}{12}",
          substitution: "FEM_{AB} = -\\frac{20 \\times 4^2}{12}",
          result: -26.67,
          unit: "kN·m"
        },
        // ... more FEM calculations
      ]
    },
    {
      title: "3. Slope-Deflection Equations",
      steps: [
        {
          description: "End moment M_AB",
          formula: "M_{AB} = FEM_{AB} + \\frac{2EI}{L}(2\\theta_A + \\theta_B)",
          substitution: "M_{AB} = -26.67 + \\frac{2EI}{4}(2(0) + \\theta_B)",
        },
        // ... all member equations
      ]
    },
    {
      title: "4. Joint Equilibrium",
      steps: [
        {
          description: "Joint B equilibrium",
          formula: "\\sum M_B = 0 \\Rightarrow M_{BA} + M_{BC} = 0",
        },
        // ... all joints
      ]
    },
    {
      title: "5. System of Equations",
      steps: [
        {
          description: "Matrix form [K]{θ} = {F}",
          formula: "\\begin{bmatrix} k_{11} & k_{12} \\\\ k_{21} & k_{22} \\end{bmatrix} \\begin{bmatrix} \\theta_B \\\\ \\theta_C \\end{bmatrix} = \\begin{bmatrix} F_1 \\\\ F_2 \\end{bmatrix}",
        },
        {
          description: "Solving using Gaussian elimination",
          result: "θ_B = 0.00234 rad, θ_C = -0.00156 rad"
        }
      ]
    },
    {
      title: "6. Final End Moments",
      // Back-substitution results
    },
    {
      title: "7. Support Reactions",
      // Equilibrium calculations for reactions
    }
  ]
}
```

---

## Phase 6: File Structure Changes

### New Files to Create:

```
lib/
├── types/
│   ├── beam.ts                 # Enhanced beam types (NEW)
│   ├── frame.ts                # Enhanced frame types (NEW)
│   └── gemini.ts               # Gemini extraction schemas (NEW)
│
├── solver/
│   ├── beam/
│   │   ├── index.ts            # ContinuousBeamSolver (NEW)
│   │   ├── fem.ts              # FEM calculations (NEW)
│   │   ├── stiffness.ts        # Stiffness matrix (NEW)
│   │   ├── linearAlgebra.ts    # Matrix operations (NEW)
│   │   ├── diagrams.ts         # Diagram generation (NEW)
│   │   ├── reactions.ts        # Reaction calculations (NEW)
│   │   ├── calculations.ts     # Calculation log (NEW)
│   │   └── types.ts            # Solver types (NEW)
│   │
│   ├── frame/
│   │   ├── index.ts            # FrameSolver (NEW)
│   │   ├── fem.ts              # Frame FEM (NEW)
│   │   ├── stiffness.ts        # Global stiffness (NEW)
│   │   ├── transformation.ts   # Coordinate transforms (NEW)
│   │   ├── sway.ts             # Sway analysis (NEW)
│   │   ├── diagrams.ts         # Member diagrams (NEW)
│   │   ├── reactions.ts        # Frame reactions (NEW)
│   │   ├── calculations.ts     # Calculation log (NEW)
│   │   └── types.ts            # Frame solver types (NEW)
│   │
│   ├── BeamSolver.ts           # KEEP - update to use new solver
│   ├── FrameSolver.ts          # KEEP - update to use new solver
│   └── types.ts                # KEEP - extend for compatibility
│
├── hooks/
│   ├── useBeamEditor.ts        # UPDATE for multi-span
│   ├── useFrameEditor.ts       # UPDATE for enhanced features
│   └── useGeminiExtraction.ts  # NEW hook
│
└── validation/
    ├── beamValidation.ts       # UPDATE
    └── frameValidation.ts      # UPDATE/NEW

components/
├── beam/
│   ├── BeamVisualizer.tsx      # UPDATE - add VDL, multi-span
│   ├── BeamInputTab.tsx        # UPDATE - spans editor
│   ├── SpanEditor.tsx          # NEW - span properties editor
│   ├── NodeEditor.tsx          # NEW - node/support editor
│   └── LoadEditor.tsx          # NEW - enhanced load editor
│
├── frame/
│   ├── FrameVisualizer.tsx     # UPDATE - member selection, loads
│   ├── FrameInputTab.tsx       # UPDATE - sway toggle
│   └── MemberEditor.tsx        # NEW - member properties
│
├── gemini/
│   ├── ImageUploadModal.tsx    # NEW
│   ├── ExtractionReviewScreen.tsx # NEW
│   ├── CameraCapture.tsx       # NEW
│   └── ConfidenceIndicator.tsx # NEW
│
├── calculations/
│   ├── CalculationsTab.tsx     # UPDATE - KaTeX support
│   ├── CalcSection.tsx         # UPDATE
│   ├── CalcStep.tsx            # UPDATE - math rendering
│   └── MathBlock.tsx           # NEW - KaTeX wrapper
│
└── charts/
    ├── BeamDiagram.tsx         # UPDATE - use real solver data
    ├── FrameDiagram.tsx        # NEW - frame diagrams
    └── DiagramLegend.tsx       # NEW

app/
├── api/
│   └── gemini/
│       └── parse-structure/
│           └── route.ts        # NEW - Gemini API route
│
├── beam/
│   ├── new/
│   │   └── page.tsx            # UPDATE - add image upload
│   └── [id]/
│       └── page.tsx            # UPDATE - add image upload option
│
└── frame/
    ├── new/
    │   └── page.tsx            # UPDATE
    └── [id]/
        └── page.tsx            # UPDATE

__tests__/
├── solver/
│   ├── beam/
│   │   ├── fem.test.ts         # NEW
│   │   ├── continuousBeam.test.ts # NEW
│   │   └── appliedMoment.test.ts  # NEW
│   └── frame/
│       ├── nonSway.test.ts     # NEW
│       └── sway.test.ts        # NEW
└── ...
```

---

## Phase 7: Test Cases

### 7.1 FEM Tests

```typescript
describe("Fixed End Moments", () => {
  describe("Point Load", () => {
    it("should calculate FEM for point load at midspan", () => {
      const result = calculatePointLoadFEM(100, 10, 5); // P=100kN, L=10m, a=5m
      expect(result.femAB).toBeCloseTo(-125); // -PL/8
      expect(result.femBA).toBeCloseTo(125);  // PL/8
    });

    it("should calculate FEM for point load at quarter span", () => {
      const result = calculatePointLoadFEM(100, 10, 2.5);
      // FEM_AB = -Pab²/L² = -100*2.5*7.5²/100 = -140.625
      expect(result.femAB).toBeCloseTo(-140.625);
    });
  });

  describe("UDL", () => {
    it("should calculate FEM for full span UDL", () => {
      const result = calculateUDLFEM(10, 6, 0, 6); // w=10kN/m, L=6m
      expect(result.femAB).toBeCloseTo(-30); // -wL²/12
      expect(result.femBA).toBeCloseTo(30);
    });
  });

  describe("VDL", () => {
    it("should calculate FEM for triangular load (0 to w)", () => {
      const result = calculateVDLFEM(0, 10, 6); // 0 to 10 kN/m over 6m
      expect(result.femAB).toBeCloseTo(-18); // -wL²/20
      expect(result.femBA).toBeCloseTo(12);  // wL²/30
    });
  });

  describe("Applied Moment", () => {
    it("should calculate FEM for moment at midspan", () => {
      const result = calculateMomentFEM(100, 10, 5); // M=100kN·m at midspan
      expect(result.femAB).toBeCloseTo(-25); // Verify formula
      expect(result.femBA).toBeCloseTo(25);
    });

    it("should calculate FEM for moment at quarter span", () => {
      const result = calculateMomentFEM(100, 10, 2.5);
      // Use exact formula
      expect(result.femAB).toBeDefined();
      expect(result.femBA).toBeDefined();
    });
  });
});
```

### 7.2 Continuous Beam Tests

```typescript
describe("Continuous Beam Solver", () => {
  it("should solve 3-span beam with varying EI", () => {
    const beam: ContinuousBeamData = {
      nodes: [
        { id: "A", position: 0, supportType: "fixed" },
        { id: "B", position: 4, supportType: "pinned" },
        { id: "C", position: 10, supportType: "pinned" },
        { id: "D", position: 14, supportType: "roller" },
      ],
      spans: [
        { id: "AB", nodeStartId: "A", nodeEndId: "B", length: 4, iMultiplier: 1.0 },
        { id: "BC", nodeStartId: "B", nodeEndId: "C", length: 6, iMultiplier: 1.5 },
        { id: "CD", nodeStartId: "C", nodeEndId: "D", length: 4, iMultiplier: 1.0 },
      ],
      loads: [
        { type: "udl", spanId: "AB", magnitude: 20, startPosition: 0, endPosition: 4 },
        { type: "point", spanId: "BC", magnitude: 50, position: 3 },
        { type: "moment", spanId: "CD", magnitude: 30, position: 2 },
      ],
    };

    const solver = new ContinuousBeamSolver();
    const result = solver.solve(beam);

    // Verify equilibrium
    const totalApplied = 20 * 4 + 50; // 80 + 50 = 130 kN
    const totalReaction = result.reactions.reduce((sum, r) => sum + r.vertical, 0);
    expect(totalReaction).toBeCloseTo(totalApplied, 1);
  });

  it("should handle support settlement", () => {
    const beam: ContinuousBeamData = {
      nodes: [
        { id: "A", position: 0, supportType: "fixed" },
        { id: "B", position: 5, supportType: "pinned", settlement: 0.01 }, // 10mm settlement
        { id: "C", position: 10, supportType: "roller" },
      ],
      spans: [
        { id: "AB", nodeStartId: "A", nodeEndId: "B", length: 5, iMultiplier: 1.0 },
        { id: "BC", nodeStartId: "B", nodeEndId: "C", length: 5, iMultiplier: 1.0 },
      ],
      loads: [],
    };

    const solver = new ContinuousBeamSolver();
    const result = solver.solve(beam);

    // Settlement should induce moments even without loads
    expect(result.endMoments.AB.mBA).not.toBe(0);
  });
});
```

### 7.3 Frame Tests

```typescript
describe("Frame Solver", () => {
  describe("Non-sway frame", () => {
    it("should solve single-bay single-story frame", () => {
      const frame: FrameData = {
        nodes: [
          { id: "A", x: 0, y: 0, support: "fixed" },
          { id: "B", x: 6, y: 0, support: "fixed" },
          { id: "C", x: 0, y: 4 },
          { id: "D", x: 6, y: 4 },
        ],
        members: [
          { id: "AC", nodeStartId: "A", nodeEndId: "C", memberType: "column", iMultiplier: 1.0 },
          { id: "BD", nodeStartId: "B", nodeEndId: "D", memberType: "column", iMultiplier: 1.0 },
          { id: "CD", nodeStartId: "C", nodeEndId: "D", memberType: "beam", iMultiplier: 2.0 },
        ],
        loads: [
          { type: "member-udl", memberId: "CD", magnitude: 20, startPosition: 0, endPosition: 1 },
        ],
        isSway: false,
      };

      const solver = new FrameSolver();
      const result = solver.solve(frame);

      expect(result.memberForces.CD).toBeDefined();
      expect(result.reactions.A.vertical).toBeGreaterThan(0);
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
          { id: "AC", nodeStartId: "A", nodeEndId: "C", memberType: "column", iMultiplier: 1.0 },
          { id: "BD", nodeStartId: "B", nodeEndId: "D", memberType: "column", iMultiplier: 1.0 },
          { id: "CD", nodeStartId: "C", nodeEndId: "D", memberType: "beam", iMultiplier: 2.0 },
        ],
        loads: [
          { type: "joint", nodeId: "C", fx: 50 }, // 50kN lateral load
        ],
        isSway: true,
      };

      const solver = new FrameSolver();
      const result = solver.solve(frame);

      // Sway should cause lateral displacement
      expect(result.displacements.C.dx).toBeGreaterThan(0);

      // Column shears should sum to applied lateral load
      const totalShear = Math.abs(result.memberForces.AC.shearStart) +
                         Math.abs(result.memberForces.BD.shearStart);
      expect(totalShear).toBeCloseTo(50, 1);
    });
  });
});
```

---

## Phase 8: Implementation Order

### Week 1: Core Solver Infrastructure
1. Create new type definitions
2. Implement FEM calculation module
3. Implement linear algebra utilities
4. Create basic continuous beam solver (2-span)

### Week 2: Generalized Beam Solver
1. Extend to n-span support
2. Add settlement handling
3. Add variable EI support
4. Add VDL and moment load support
5. Write comprehensive tests

### Week 3: Frame Solver
1. Implement non-sway frame solver
2. Add sway analysis capability
3. Implement member force extraction
4. Write frame tests

### Week 4: UI Enhancements
1. Update BeamVisualizer for VDL and multi-span
2. Update FrameVisualizer for member loads
3. Create span/node editors
4. Add KaTeX for calculations display

### Week 5: Gemini Integration
1. Set up Gemini API route
2. Create image upload components
3. Implement extraction review screen
4. Connect to visualizers

### Week 6: Testing & Polish
1. End-to-end testing
2. Performance optimization
3. Error handling refinement
4. Documentation

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "katex": "^0.16.9",
    "react-katex": "^3.0.1"
  },
  "devDependencies": {
    "@types/katex": "^0.16.7"
  }
}
```

---

## Environment Variables

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Migration Notes

1. **Backward Compatibility**: Existing projects will continue to work. The new solver will detect legacy format and convert automatically.

2. **Data Migration**: Add a migration utility to convert old BeamEditorState to new ContinuousBeamData format.

3. **API Stability**: The existing BeamSolver and FrameSolver classes will be maintained as wrappers around the new implementation.

This implementation plan provides a complete roadmap for upgrading CESSCalculator to a production-quality structural analysis tool.
