import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserPreferences, AnalysisResult } from "../types";

// Schema definition for structured output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        price: { type: Type.STRING },
        location: { type: Type.STRING },
        layout: { type: Type.STRING, description: "e.g., 2 Bed / 2 Bath, 1200 sqft" },
        quickSummary: { type: Type.STRING, description: "2-3 sentence overview" },
      },
      required: ["title", "price", "location", "layout", "quickSummary"],
    },
    matchScore: {
      type: Type.OBJECT,
      properties: {
        total: { type: Type.INTEGER, description: "0 to 100 score based on user preferences" },
        grade: { type: Type.STRING, description: "A+, A, B, C, D, or F" },
        breakdown: { type: Type.STRING, description: "Explanation of why this score was given" },
      },
      required: ["total", "grade", "breakdown"],
    },
    details: {
      type: Type.OBJECT,
      properties: {
        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
        redFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Serious warnings like 'mold', 'litigation', 'high hoa'" },
        hiddenGems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Positive features not immediately obvious" },
      },
      required: ["pros", "cons", "redFlags", "hiddenGems"],
    },
    marketAnalysis: {
      type: Type.OBJECT,
      properties: {
        valueVerdict: { type: Type.STRING, description: "One of: Overpriced, Fair Value, Underpriced/Steal" },
        investmentPotential: { type: Type.STRING, description: "Short assessment of resale/rental potential" },
      },
      required: ["valueVerdict", "investmentPotential"],
    },
  },
  required: ["summary", "matchScore", "details", "marketAnalysis"],
};

export const analyzeListing = async (
  listingContent: string,
  preferences: UserPreferences
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct a prompt that injects user preferences effectively
  const prompt = `
    You are an elite Real Estate Analyst and Investment Advisor specializing in the Canadian Market. 
    Analyze the following raw text from a real estate listing.
    
    CONTEXT:
    - Market: Canada.
    - Currency: CAD ($).
    - Measurement: Square feet (sqft) is standard, but check for meters.
    - Specific Canadian Red Flags to Watch: 
      - "Knob and tube wiring" or "Aluminum wiring" (older homes).
      - "Kitec plumbing" (condos/homes 1995-2007).
      - "Special assessments" or "Cash calls" (Condo/Strata).
      - "Oil tanks" (buried fuel tanks).
      - "Grow-op" remediation history.
      - "Rental restrictions" (Strata bylaws).
      - "Heritage designation" (Restrictions on renovation).

    USER PREFERENCES:
    - Max Budget: $${preferences.budgetMax} CAD
    - Minimum: ${preferences.minBedrooms} Beds, ${preferences.minBathrooms} Baths
    - Desired Location/Area: ${preferences.location}
    - Priority - Commute/Transit: ${preferences.priorities.commute}/10
    - Priority - Property Condition: ${preferences.priorities.condition}/10
    - Priority - Investment/Resale: ${preferences.priorities.investment}/10
    - Priority - Luxury Amenities: ${preferences.priorities.amenities}/10
    - SPECIFIC MUST-HAVES/NOTES: "${preferences.customCriteria}"

    TASK:
    1. Extract key details (Price, Layout, Location).
    2. Identify Pros and Cons based SPECIFICALLY on the User Preferences above.
    3. Detect "Red Flags" (including the Canadian-specific ones listed above).
    4. Calculate a Match Score (0-100). 
       - Deduct heavily if it exceeds budget or misses bedroom/bathroom count.
       - Deduct if it violates "Red Flags".
       - Reward for hitting custom criteria.
    5. Evaluate market value in the context of the Canadian market.

    RAW LISTING TEXT:
    ${listingContent.substring(0, 30000)} // Truncate to avoid token limits if massive
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Low temperature for factual extraction
      },
    });

    if (!response.text) {
      throw new Error("No response generated from Gemini.");
    }

    const result = JSON.parse(response.text) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};