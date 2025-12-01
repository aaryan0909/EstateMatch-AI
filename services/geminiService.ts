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

CORE DIRECTIVES:
1. **ANTI-HALLUCINATION**: If the listing does not explicitly state a fact (e.g., parking availability, heating type, specific fees), YOU MUST STATE "Not specified in listing". Do not guess based on "typical" features.
2. **STRICT GROUNDING**: Every entry in 'pros', 'cons', and 'redFlags' MUST include a 'sourceQuote' directly from the text. If you cannot quote it, do not include it as a fact.
3. **MISSING INFO HANDLING**: If a specific User Preference (e.g., "Must have dishwasher") is not mentioned in the text, list it as a "Missing Information" point in the analysis or a neutral/negative factor, do not assume it exists.
4. **SCORING LOGIC**:
   - Start at 100.
   - **Price**: Deduct 20 points if Price/Rent > Budget.
   - **Specs**: Deduct 10 points per missing Bedroom/Bathroom.
   - **Red Flags**: Deduct 15 points for severe risks (Mold, Litigation, Special Assessments, Pest History).
   - **Custom**: Add 5-10 points for matching "Must Haves".
5. **MODE SPECIFICITY**:
   - **BUY Mode**: Focus on long-term value, Strata/Condo fees, Property Taxes, Leasehold vs Freehold, Age of Roof/HVAC, Oil Tanks, Wiring (Knob & Tube).
   - **RENT Mode**: Focus on monthly inclusions (Hydro/Heat/Internet), Lease terms (Fixed vs Month-to-month), Damage deposits, Pet policies, Laundry access (Shared vs In-suite), Noise transfer (Basement suites).

OUTPUT STYLE:
- Be direct and professional.
- Use "The listing states..." or "No mention of..." phrasing.
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