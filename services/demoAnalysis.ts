import { AnalysisResult } from "../types";

// Demo mode (no Gemini API key configured):
// - The bundled sample listing returns the canned analysis below.
// - Any other listing still requires a real GEMINI_API_KEY.
// This analysis is hand-written for the fictional fixture in
// sample-listing.md (88 Queens Wharf Blvd, Toronto). Every quote below
// is copied from that listing text. Scores use the app's default
// preferences (BUY, $750,000 max, 2 bed / 1 bath minimum).

export const isSampleListing = (listingContent: string): boolean => {
  const text = listingContent.toLowerCase();
  return (
    text.includes("88 queens wharf") ||
    text.includes("sample listing (synthetic demo fixture)")
  );
};

export const DEMO_ANALYSIS: AnalysisResult = {
  summary: {
    title: "Stunning Bright Corner Suite — 88 Queens Wharf Blvd, Toronto",
    price: "$789,000",
    location: "2103 - 88 Queens Wharf Blvd, Toronto, ON M5J 0B5",
    layout: "2 Bed / 2 Bath, 875 sq ft corner unit",
    quickSummary:
      "Demo mode: sample analysis. A bright 2-bed, 2-bath corner suite that meets the layout minimums and includes parking and a locker, but it is $39,000 over the $750,000 default budget, carries $685/month in maintenance fees, and has an approved $4,200 special assessment in 2026. Good lifestyle fit, mediocre financial fit.",
  },
  matchScore: {
    total: 64,
    grade: "C+",
    breakdown:
      "Starts strong on layout and location, then loses points for being $39,000 over budget, for $685/month maintenance fees, and for the approved $4,200 special assessment for balcony membrane repairs.",
    categoryScores: {
      financial: 58,
      lifestyle: 82,
      condition: 71,
    },
  },
  details: {
    pros: [
      {
        claim: "Meets the layout minimums: a real 2 bedroom, 2 bathroom unit at 875 sq ft",
        sourceQuote: "2 bedroom, 2 bathroom corner unit offers 875 sq ft",
        confidence: "High",
      },
      {
        claim: "Corner unit with floor-to-ceiling windows and city views",
        sourceQuote: "floor-to-ceiling windows and breathtaking city views",
        confidence: "High",
      },
      {
        claim: "Strong building amenities are included",
        sourceQuote: "24-hr concierge, fitness centre, rooftop terrace",
        confidence: "High",
      },
      {
        claim: "Parking and a locker are included, which is not a given downtown",
        sourceQuote: "Parking: 1 underground spot (#B-142), locker included",
        confidence: "High",
      },
      {
        claim: "Walkable to transit, shops, and the waterfront",
        sourceQuote: "Steps to transit, shops, and the waterfront trail.",
        confidence: "High",
      },
    ],
    cons: [
      {
        claim: "Priced $39,000 over the $750,000 default budget",
        sourceQuote: "List price: $789,000",
        confidence: "High",
      },
      {
        claim: "Maintenance fees are $685/month ($8,220/year) on top of the mortgage",
        sourceQuote:
          "Maintenance / strata fees: $685/month (includes heat, water, building insurance)",
        confidence: "High",
      },
      {
        claim: "The second bedroom sounds small. 'Cozy' plus 'den or home office' is classic listing softening",
        sourceQuote: "Cozy second bedroom ideal as a den or home office.",
        confidence: "Medium",
      },
      {
        claim: "Kitchen was updated in 2019, not recently. Budget for wear, not a brand-new reno",
        sourceQuote: "quartz countertops (updated 2019)",
        confidence: "High",
      },
    ],
    redFlags: [
      {
        claim:
          "Approved special assessment of $4,200 per unit for balcony membrane repairs, payable in two instalments in 2026. Ask for the status certificate and whether more assessments are planned",
        sourceQuote:
          "the building has approved a special assessment of $4,200 per unit for balcony membrane repairs, payable in two instalments in 2026",
        confidence: "High",
      },
      {
        claim:
          "Restrictive pet policy: dogs only up to 25 lbs and only with board approval, so a larger dog is a deal-breaker",
        sourceQuote: "building allows dogs up to 25 lbs with board approval",
        confidence: "High",
      },
      {
        claim:
          "'Motivated seller! Priced to sell.' is pressure language, not evidence of value. Verify against comparable sales before treating this as a deal",
        sourceQuote: "Motivated seller! Priced to sell.",
        confidence: "Medium",
      },
    ],
    hiddenGems: [
      "Locker is included, not rented. Easy to miss, and downtown lockers often cost extra.",
      "Primary bedroom has a 4-piece ensuite and walk-in closet, per the listing.",
      "Heat, water, and building insurance are already included in the $685/month fees, so the fee is less bad than it first looks.",
      "Corner suite means extra windows and light on two sides, which the listing supports with 'floor-to-ceiling windows'.",
    ],
  },
  marketAnalysis: {
    valueVerdict: "Slightly Over Budget",
    investmentPotential: "Moderate",
    comparableNotes:
      "At $789,000 for 875 sq ft this is about $902/sq ft, before the $685/month fees and the $4,200 special assessment. The listing itself provides no comparable sales, taxes, or status certificate, so value cannot be verified from this text alone. Demo mode does not check live market data.",
  },
  contactDraft: {
    subject: "Questions about 2103 - 88 Queens Wharf Blvd ($789,000)",
    body: "Hi,\n\nI'm interested in 2103 - 88 Queens Wharf Blvd and had a few questions before booking a showing:\n\n1. The listing mentions an approved special assessment of $4,200 per unit for balcony membrane repairs, payable in two instalments in 2026. Has any part been paid by the seller, and are further assessments expected?\n2. Could you share the status certificate, plus the current reserve fund balance?\n3. What are the monthly property taxes, and are they included anywhere in the $685/month maintenance fees?\n4. The pet policy says dogs up to 25 lbs with board approval. What does that approval process involve?\n5. Is parking spot #B-142 owned or assigned, and is the locker on the same level?\n\nThanks for your time.",
  },
};
