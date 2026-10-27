import { createGoogleGenerativeAI } from "@ai-sdk/google"

// Pinned to the newest responsive Flash-Lite model with a documented free tier.
// Verified 2026-10-27: 3.8 Flash timed out, 3.5 Flash-Lite returned successfully.
// Free usage requires a free-tier Google API project; model selection cannot set billing.
export const GENERATION_MODEL_ID = "gemini-3.5-flash-lite"

export function getGenerationModel() {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required")
  }

  return createGoogleGenerativeAI({ apiKey })(GENERATION_MODEL_ID)
}
