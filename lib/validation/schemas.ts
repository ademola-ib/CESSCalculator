import { z } from "zod";

export const beamInputSchema = z.object({
  length: z.number().positive("Length must be positive"),
  ei: z.number().positive("EI must be positive"),
  spans: z.number().int().min(1).max(5),
  loadType: z.enum(["point", "udl", "moment"]),
  loadValue: z.number(),
  loadPosition: z.number().optional(),
});

export const frameInputSchema = z.object({
  bays: z.number().int().min(1).max(10),
  stories: z.number().int().min(1).max(10),
  bayWidth: z.number().positive(),
  storyHeight: z.number().positive(),
  columnEI: z.number().positive(),
  beamEI: z.number().positive(),
});

export type BeamInputData = z.infer<typeof beamInputSchema>;
export type FrameInputData = z.infer<typeof frameInputSchema>;
