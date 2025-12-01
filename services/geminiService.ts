import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { UserPreferences, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Strict Schema for Deterministic Output
const analysisSchema: Schema = {
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
            financial: { type: Type.INTEGER, description: "0-100 score on price/value" },
            lifestyle: { type: Type.INTEGER, description: "0-100 score on layout/amenities" },
            condition: { type: Type.INTEGER, description: "0-100 score on age/renovations" },
          },
          required: ["financial", "lifestyle", "condition"]
        }
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
              sourceQuote: { type: Type.STRING, description: "Exact text snippet from listing verifying this." },
              confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["claim", "sourceQuote", "confidence"]
          } 
        },
        cons: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceQuote: { type: Type.STRING },
              confidence: { type: Type.STRING }
            },
            required: ["claim", "sourceQuote", "confidence"]
          } 
        },
        redFlags: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceQuote: { type: Type.STRING },
              confidence: { type: Type.STRING }
            },
            required: ["claim", "sourceQuote", "confidence"]
          } 
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
      description: "A draft email to send to the listing agent/landlord inquiring about the property and specifically asking about the red flags or missing info.",
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ["subject", "body"],
    },
  },
  required: ["summary", "matchScore", "details", "marketAnalysis", "contactDraft"],
};

// 2. The "Cynical Auditor" System Prompt
const SYSTEM_INSTRUCTION = `
You are a Cynical Real Estate Auditor and Data Scientist for the Canadian Market.
Your goal is to protect the buyer/renter. You are skeptical of marketing fluff ("cozy" = small, "up and coming" = high crime).

RULES:
1. GROUNDING: Every major claim (Pro/Con/Red Flag) must have a source quote. If you can't find it in the text, do not invent it.
2. SCORING: 
   - Start at 100.
   - Deduct 20 points immediately if price > budgetMax.
   - Deduct 10 points for every missing bedroom/bathroom vs requirements.
   - Deduct 15 points for MAJOR red flags.
   - Add 5 points for matching "Custom Criteria".
3. CONTEXT: Adjust analysis based on Listing Type (BUY vs RENT).
   - IF BUY: Watch for Strata Fees, Taxes, Leasehold, Oil Tanks, Knob & Tube.
   - IF RENT: Watch for "Utilities not included", "Pet damage deposit", "Fixed term lease", "Basement suite noise".
`;

export const analyzeListing = async (
  listingContent: string,
  preferences: UserPreferences
): Promise<AnalysisResult> => {
  
  const prompt = `
    USER CONTEXT: Looking to ${preferences.listingType}
    
    USER PREFERENCES:
    - Max ${preferences.listingType === 'BUY' ? 'Price' : 'Monthly Rent'}: $${preferences.budgetMax} CAD
    - Min Layout: ${preferences.minBedrooms} Bed / ${preferences.minBathrooms} Bath
    - Location: ${preferences.location}
    - Priorities: Commute(${preferences.priorities.commute}), Condition(${preferences.priorities.condition}), Investment(${preferences.priorities.investment})
    - MUST HAVES: "${preferences.customCriteria}"

    RAW LISTING DATA:
    ${listingContent.substring(0, 40000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Near zero for maximum determinism
      },
    });

    if (!response.text) throw new Error("No response");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

// 3. Contextual Chat Implementation
export const createListingChat = (listingContent: string): Chat => {
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `
        You are an assistant answering questions SPECIFICALLY about the real estate listing provided below.
        - Be concise.
        - If the listing doesn't say, say "The listing doesn't mention that."
        - Do not use outside knowledge about the neighborhood unless explicitly asked.
        
        LISTING CONTENT:
        ${listingContent.substring(0, 30000)}
      `
    }
  });
};
