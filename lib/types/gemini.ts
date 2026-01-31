/**
 * Gemini Vision API Types and Schemas
 * For extracting structural engineering problems from images
 */

import { z } from "zod";

/**
 * Extracted support data
 */
export const ExtractedSupportSchema = z.object({
  position: z.number().describe("Position from left end in meters"),
  type: z.enum(["fixed", "pinned", "roller"]),
  settlement: z.number().optional().describe("Settlement in meters if specified"),
});

export type ExtractedSupport = z.infer<typeof ExtractedSupportSchema>;

/**
 * Extracted span data
 */
export const ExtractedSpanSchema = z.object({
  length: z.number().describe("Span length in meters"),
  iMultiplier: z.number().default(1.0).describe("I multiplier (e.g., 2 for 2I)"),
});

export type ExtractedSpan = z.infer<typeof ExtractedSpanSchema>;

/**
 * Extracted point load
 */
export const ExtractedPointLoadSchema = z.object({
  type: z.literal("point"),
  magnitude: z.number().describe("Load magnitude in kN"),
  position: z.number().describe("Position from left end in meters"),
  direction: z.enum(["down", "up"]).default("down"),
});

/**
 * Extracted UDL
 */
export const ExtractedUDLSchema = z.object({
  type: z.literal("udl"),
  magnitude: z.number().describe("Load intensity in kN/m"),
  start: z.number().describe("Start position in meters"),
  end: z.number().describe("End position in meters"),
  direction: z.enum(["down", "up"]).default("down"),
});

/**
 * Extracted VDL (triangular/trapezoidal)
 */
export const ExtractedVDLSchema = z.object({
  type: z.literal("vdl"),
  w1: z.number().describe("Intensity at start in kN/m"),
  w2: z.number().describe("Intensity at end in kN/m"),
  start: z.number().describe("Start position in meters"),
  end: z.number().describe("End position in meters"),
});

/**
 * Extracted moment
 */
export const ExtractedMomentSchema = z.object({
  type: z.literal("moment"),
  magnitude: z.number().describe("Moment magnitude in kN·m"),
  position: z.number().describe("Position in meters"),
  direction: z.enum(["clockwise", "counterclockwise"]).default("clockwise"),
});

/**
 * Union of all load types
 */
export const ExtractedLoadSchema = z.discriminatedUnion("type", [
  ExtractedPointLoadSchema,
  ExtractedUDLSchema,
  ExtractedVDLSchema,
  ExtractedMomentSchema,
]);

export type ExtractedLoad = z.infer<typeof ExtractedLoadSchema>;

/**
 * Complete beam extraction result
 */
export const BeamExtractionSchema = z.object({
  problemType: z.literal("beam"),
  totalLength: z.number().optional().describe("Total beam length if explicitly stated"),
  spans: z.array(ExtractedSpanSchema).min(1),
  supports: z.array(ExtractedSupportSchema).min(2),
  loads: z.array(ExtractedLoadSchema),
  ei: z.number().optional().describe("Base EI value in kN·m² if specified"),
  e: z.number().optional().describe("Elastic modulus if specified"),
  i: z.number().optional().describe("Moment of inertia if specified"),
  confidence: z.number().min(0).max(1).describe("Extraction confidence score"),
  unknowns: z.array(z.string()).optional().describe("List of values that couldn't be extracted"),
  notes: z.string().optional().describe("Additional observations about the problem"),
});

export type BeamExtraction = z.infer<typeof BeamExtractionSchema>;

/**
 * Frame member properties
 */
export const ExtractedMemberPropertiesSchema = z.object({
  memberType: z.enum(["beam", "column"]),
  bayIndex: z.number().optional(),
  storyIndex: z.number().optional(),
  iMultiplier: z.number().default(1.0),
});

/**
 * Frame joint load
 */
export const ExtractedFrameJointLoadSchema = z.object({
  type: z.literal("joint"),
  nodePosition: z.object({
    bay: z.number(),
    story: z.number(),
  }),
  fx: z.number().optional().describe("Horizontal force in kN"),
  fy: z.number().optional().describe("Vertical force in kN"),
  moment: z.number().optional().describe("Moment in kN·m"),
});

/**
 * Frame member load
 */
export const ExtractedFrameMemberLoadSchema = z.object({
  type: z.enum(["member-point", "member-udl", "member-vdl", "member-moment"]),
  memberType: z.enum(["beam", "column"]),
  bayIndex: z.number().optional(),
  storyIndex: z.number().optional(),
  magnitude: z.number().optional(),
  w1: z.number().optional(),
  w2: z.number().optional(),
  position: z.number().optional().describe("Normalized position 0-1"),
});

/**
 * Frame load union
 */
export const ExtractedFrameLoadSchema = z.union([
  ExtractedFrameJointLoadSchema,
  ExtractedFrameMemberLoadSchema,
]);

export type ExtractedFrameLoad = z.infer<typeof ExtractedFrameLoadSchema>;

/**
 * Complete frame extraction result
 */
export const FrameExtractionSchema = z.object({
  problemType: z.literal("frame"),
  bays: z.number().min(1),
  stories: z.number().min(1),
  bayWidths: z.array(z.number()).describe("Width of each bay in meters"),
  storyHeights: z.array(z.number()).describe("Height of each story in meters"),
  supports: z.array(
    z.object({
      bayIndex: z.number(),
      type: z.enum(["fixed", "pinned", "roller"]),
    })
  ),
  memberProperties: z.array(ExtractedMemberPropertiesSchema).optional(),
  loads: z.array(ExtractedFrameLoadSchema),
  isSway: z.boolean().describe("Whether the frame can sway laterally"),
  ei: z.number().optional().describe("Default EI value"),
  confidence: z.number().min(0).max(1),
  unknowns: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type FrameExtraction = z.infer<typeof FrameExtractionSchema>;

/**
 * Combined extraction result
 */
export const ExtractionResultSchema = z.discriminatedUnion("problemType", [
  BeamExtractionSchema,
  FrameExtractionSchema,
]);

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * API response wrapper
 */
export interface GeminiExtractionResponse {
  success: boolean;
  data?: ExtractionResult;
  error?: string;
  rawResponse?: string; // For debugging
}

/**
 * Image upload request
 */
export interface ImageUploadRequest {
  image: File | string; // File object or base64 string
  mimeType?: string;
  additionalContext?: string; // User hints about the problem
}

/**
 * Gemini prompt for structural analysis
 */
export const EXTRACTION_PROMPT = `You are an expert structural engineering assistant. Analyze this image of a structural engineering problem and extract all relevant information.

IMPORTANT: Look carefully at the image and extract:

1. **Problem Type**: Is this a BEAM or FRAME problem?

2. **For BEAMS**:
   - Count the number of spans
   - Measure or estimate span lengths (in meters)
   - Identify support types at each location:
     - Fixed (built-in, clamped): shows a solid wall/connection
     - Pinned (hinged): shows a triangle with a line at base
     - Roller: shows a triangle with circles underneath
   - Identify all loads:
     - Point loads (P): single arrows, magnitude in kN
     - UDL (w): distributed arrows, magnitude in kN/m
     - VDL/Triangular: varying intensity distributed loads
     - Moments (M): curved arrows, magnitude in kN·m
   - Note any EI variations (2I, 1.5I, 0.8I etc.)
   - Note any support settlements

3. **For FRAMES**:
   - Count bays (columns - 1) and stories
   - Measure bay widths and story heights
   - Identify base support conditions
   - Determine if it's a sway or non-sway frame
   - Identify joint loads (forces at nodes)
   - Identify member loads (loads on beams/columns)
   - Note EI variations per member type

4. **Value Conversion**:
   - Convert "2I" to iMultiplier: 2.0
   - Convert "1.5I" to iMultiplier: 1.5
   - Convert "20 kN/m" to magnitude: 20
   - Handle both metric and imperial units (prefer metric output)

5. **Confidence Assessment**:
   - Set confidence 0.8-1.0 if values are clearly visible
   - Set confidence 0.5-0.8 if some estimation was needed
   - Set confidence < 0.5 if significant guessing was required
   - List any unclear values in the "unknowns" array

Return ONLY valid JSON matching the required schema. Do not include any explanation text outside the JSON.`;

/**
 * Validate and parse Gemini response
 */
export function parseGeminiResponse(responseText: string): ExtractionResult {
  // Try to extract JSON from the response
  let jsonStr = responseText;

  // Handle markdown code blocks
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  } else {
    // Try to find raw JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
  }

  // Parse JSON
  const parsed = JSON.parse(jsonStr);

  // Validate with schema
  return ExtractionResultSchema.parse(parsed);
}

/**
 * Convert extraction result to beam editor format
 */
export function extractionToBeamData(extraction: BeamExtraction) {
  // Calculate cumulative positions
  let position = 0;
  const nodePositions: number[] = [0];
  for (const span of extraction.spans) {
    position += span.length;
    nodePositions.push(position);
  }

  // Map supports (ensure they match node positions)
  const supports = extraction.supports.map((s, i) => ({
    id: `support-${i}`,
    type: s.type,
    position: s.position,
    settlement: s.settlement,
  }));

  // Map spans
  const spans = extraction.spans.map((s, i) => ({
    id: `span-${i + 1}`,
    length: s.length,
    startPosition: nodePositions[i],
    endPosition: nodePositions[i + 1],
    iMultiplier: s.iMultiplier,
  }));

  // Map loads
  const loads = extraction.loads.map((l, i) => {
    const base = { id: `load-${i}` };

    if (l.type === "point") {
      return {
        ...base,
        type: "point" as const,
        magnitude: l.magnitude * (l.direction === "up" ? -1 : 1),
        position: l.position,
      };
    } else if (l.type === "udl") {
      return {
        ...base,
        type: "udl" as const,
        magnitude: l.magnitude * (l.direction === "up" ? -1 : 1),
        start: l.start,
        end: l.end,
      };
    } else if (l.type === "vdl") {
      return {
        ...base,
        type: "vdl" as const,
        w1: l.w1,
        w2: l.w2,
        start: l.start,
        end: l.end,
      };
    } else {
      return {
        ...base,
        type: "moment" as const,
        magnitude: l.magnitude * (l.direction === "counterclockwise" ? -1 : 1),
        position: l.position,
      };
    }
  });

  return {
    totalLength: position,
    supports,
    spans,
    loads,
    ei: extraction.ei,
    confidence: extraction.confidence,
    unknowns: extraction.unknowns,
  };
}

/**
 * Convert extraction result to frame editor format
 */
export function extractionToFrameData(extraction: FrameExtraction) {
  return {
    bays: extraction.bays,
    stories: extraction.stories,
    bayWidths: extraction.bayWidths,
    storyHeights: extraction.storyHeights,
    baseSupports: extraction.supports,
    memberProperties: extraction.memberProperties,
    loads: extraction.loads,
    isSway: extraction.isSway,
    defaultEI: extraction.ei,
    confidence: extraction.confidence,
    unknowns: extraction.unknowns,
  };
}
