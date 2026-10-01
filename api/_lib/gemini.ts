import type { GoogleGenAI as GoogleGenAIClient, Schema } from "@google/genai";
import { AnalysisResult, ChatMessage, UserPreferences } from "../../types.js";
import { cleanListingText } from "../../services/analyzerCore.js";

export const liveAiConfigured = (): boolean =>
  Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY);

// The SDK is loaded lazily so a module or SDK load problem can never take
// down /api/config or the local-mode fallback paths with it.
const loadSdk = () => import("@google/genai");

const getClient = async (): Promise<GoogleGenAIClient | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  const { GoogleGenAI } = await loadSdk();
  return new GoogleGenAI({ apiKey });
};

const buildAnalysisSchema = (Type: Awaited<ReturnType<typeof loadSdk>>["Type"]): Schema => ({
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        price: { type: Type.STRING },
        location: { type: Type.STRING },
        layout: { type: Type.STRING },
        quickSummary: { type: Type.STRING },
      },
      required: ["title", "price", "location", "layout", "quickSummary"],
    },
    matchScore: {
      type: Type.OBJECT,
      properties: {
        total: { type: Type.INTEGER },
        grade: { type: Type.STRING },
        breakdown: { type: Type.STRING },
        categoryScores: {
          type: Type.OBJECT,
          properties: {
            financial: { type: Type.INTEGER },
            lifestyle: { type: Type.INTEGER },
            condition: { type: Type.INTEGER },
          },
          required: ["financial", "lifestyle", "condition"],
        },
      },
      required: ["total", "grade", "breakdown", "categoryScores"],
    },
    details: {
      type: Type.OBJECT,
      properties: {
        pros: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceQuote: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            },
            required: ["claim", "sourceQuote", "confidence"],
          },
        },
        cons: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceQuote: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
            required: ["claim", "sourceQuote", "confidence"],
          },
        },
        redFlags: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceQuote: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
            required: ["claim", "sourceQuote", "confidence"],
          },
        },
        hiddenGems: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["pros", "cons", "redFlags", "hiddenGems"],
    },
    marketAnalysis: {
      type: Type.OBJECT,
      properties: {
        valueVerdict: { type: Type.STRING },
        investmentPotential: { type: Type.STRING },
        comparableNotes: { type: Type.STRING },
      },
      required: ["valueVerdict", "investmentPotential", "comparableNotes"],
    },
    contactDraft: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ["subject", "body"],
    },
  },
  required: ["summary", "matchScore", "details", "marketAnalysis", "contactDraft"],
});

const SYSTEM_INSTRUCTION = `
You are a Cynical Real Estate Auditor for the Canadian market.
Protect the buyer or renter. Be skeptical of marketing language.

Rules:
1. Do not invent facts. If the listing does not state something, say "Not specified in listing".
2. Every pro, con, and red flag must include a sourceQuote copied from the listing text. If you cannot quote it, do not present it as a fact.
3. Do not claim to have checked comparable sales, live market data, taxes, or documents that were not provided.
4. Treat missing information that matters to the user's preferences as a con or as a question for the agent.
5. The server will validate every quote and recalculate every score in code. Your proposed scores are advisory only.
`;

export const analyzeWithGemini = async (
  listingContent: string,
  preferences: UserPreferences,
): Promise<AnalysisResult> => {
  const ai = await getClient();
  if (!ai) throw new Error("LIVE_AI_NOT_CONFIGURED");
  const { Type } = await loadSdk();
  const cleaned = cleanListingText(listingContent).substring(0, 40_000);
  const prompt = `
USER CONTEXT: Looking to ${preferences.listingType}

USER PREFERENCES:
- Max ${preferences.listingType === "BUY" ? "Price" : "Monthly Rent"}: $${preferences.budgetMax} CAD
- Min Layout: ${preferences.minBedrooms} Bed / ${preferences.minBathrooms} Bath
- Location: ${preferences.location || "Not specified"}
- Priorities: Commute (${preferences.priorities.commute}/10), Condition (${preferences.priorities.condition}/10), Investment (${preferences.priorities.investment}/10), Amenities (${preferences.priorities.amenities}/10)
- MUST HAVES: "${preferences.customCriteria}"

RAW LISTING DATA:
${cleaned}
`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: buildAnalysisSchema(Type),
      temperature: 0.1,
    },
  });
  if (!response.text) throw new Error("EMPTY_MODEL_RESPONSE");
  return JSON.parse(response.text) as AnalysisResult;
};

export const chatWithGemini = async (
  listingContent: string,
  history: ChatMessage[],
  message: string,
): Promise<string> => {
  const ai = await getClient();
  if (!ai) throw new Error("LIVE_AI_NOT_CONFIGURED");
  const cleaned = cleanListingText(listingContent).substring(0, 30_000);
  const transcript = history
    .slice(-10)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text.substring(0, 2_000)}`)
    .join("\n");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Conversation so far:\n${transcript}\n\nUser: ${message}`,
    config: {
      systemInstruction: `
Answer questions specifically about the listing below.
Be concise. If the listing does not say, reply "The listing doesn't mention that."
Do not use outside knowledge or invent neighborhood facts.

LISTING CONTENT:
${cleaned}
`,
      temperature: 0.1,
    },
  });
  return response.text?.trim() || "I couldn't generate a response.";
};
