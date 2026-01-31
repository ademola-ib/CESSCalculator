/**
 * Gemini Vision API Route for Structural Problem Extraction
 * POST /api/gemini/parse-structure
 *
 * Accepts image as multipart/form-data or base64 string
 * Returns extracted structural data in JSON format
 */

import { NextRequest, NextResponse } from "next/server";
import { EXTRACTION_PROMPT, parseGeminiResponse } from "@/lib/types/gemini";

export async function POST(req: NextRequest) {
  // Validate API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Gemini API key not configured. Set GEMINI_API_KEY in your .env.local file.",
      },
      { status: 500 }
    );
  }

  try {
    // Parse the request
    const contentType = req.headers.get("content-type") || "";
    let base64Image: string;
    let mimeType: string;
    let additionalContext = "";

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart/form-data upload
      const formData = await req.formData();
      const imageFile = formData.get("image") as File | null;
      additionalContext = (formData.get("context") as string) || "";

      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: "No image file provided" },
          { status: 400 }
        );
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(imageFile.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid image type: ${imageFile.type}. Supported: JPEG, PNG, WebP, GIF`,
          },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Image too large. Maximum size is 10MB." },
          { status: 400 }
        );
      }

      const imageBuffer = await imageFile.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString("base64");
      mimeType = imageFile.type;
    } else if (contentType.includes("application/json")) {
      // Handle base64 JSON body
      const body = await req.json();
      base64Image = body.image;
      mimeType = body.mimeType || "image/jpeg";
      additionalContext = body.context || "";

      if (!base64Image) {
        return NextResponse.json(
          { success: false, error: "No image data provided" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Request must be multipart/form-data or application/json",
        },
        { status: 400 }
      );
    }

    // Build prompt with optional additional context
    let prompt = EXTRACTION_PROMPT;
    if (additionalContext) {
      prompt += `\n\nAdditional context from user: ${additionalContext}`;
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for precise extraction
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorBody);
      return NextResponse.json(
        {
          success: false,
          error: `Gemini API returned status ${geminiResponse.status}`,
          details: errorBody,
        },
        { status: 502 }
      );
    }

    const geminiResult = await geminiResponse.json();

    // Extract text from response
    const responseText =
      geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return NextResponse.json(
        {
          success: false,
          error: "No response text from Gemini",
          rawResponse: JSON.stringify(geminiResult),
        },
        { status: 422 }
      );
    }

    // Parse and validate the response
    try {
      const extractedData = parseGeminiResponse(responseText);

      return NextResponse.json({
        success: true,
        data: extractedData,
      });
    } catch (parseError) {
      // Return partial data with the raw response for manual editing
      console.error("Parse error:", parseError);

      // Try to extract JSON even if validation fails
      let partialData = null;
      try {
        const jsonMatch =
          responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
          responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          partialData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
      } catch {
        // Ignore parse failure
      }

      return NextResponse.json({
        success: false,
        error: "Could not validate extracted data. Please review and correct.",
        data: partialData,
        rawResponse: responseText,
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
