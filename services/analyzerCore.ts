import { AnalysisResult, FactCheck, ListingType, UserPreferences } from "../types";

export interface ScoreDeduction {
  category: "financial" | "lifestyle" | "condition";
  points: number;
  reason: string;
}

export interface ExtractedFacts {
  cleanedText: string;
  sentences: string[];
  price: number | null;
  priceQuote: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  layoutQuote: string | null;
  feesMonthly: number | null;
  feesQuote: string | null;
  specialAssessment: number | null;
  specialAssessmentQuote: string | null;
  taxesAnnual: number | null;
  taxesQuote: string | null;
  parking: "included" | "not-included" | "unknown";
  parkingQuote: string | null;
  locker: "included" | "not-included" | "unknown";
  lockerQuote: string | null;
  petPolicy: "allowed" | "restricted" | "not-allowed" | "unknown";
  petQuote: string | null;
  laundry: "in-suite" | "shared" | "none" | "unknown";
  laundryQuote: string | null;
  utilities: "included" | "not-included" | "partial" | "unknown";
  utilitiesQuote: string | null;
  heatingQuote: string | null;
  leaseQuote: string | null;
  depositQuote: string | null;
  renovatedYear: number | null;
  renovationQuote: string | null;
  locationQuote: string | null;
  amenitiesQuote: string | null;
  risks: FactCheck[];
  missing: string[];
}

const MAX_SCORE = 100;

export const cleanListingText = (input: string): string => {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/^\s{0,3}#{1,6}\s?/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`]+/g, "")
    .replace(/^-{3,}$/gm, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const splitSentences = (text: string): string[] => {
  const chunks: string[] = [];
  for (const line of text.split(/\n+/)) {
    const parts = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence.length >= 3) chunks.push(sentence);
    }
  }
  return chunks;
};

const normalizeForMatch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findSentence = (
  sentences: string[],
  predicate: (sentence: string) => boolean,
): string | null => sentences.find(predicate) ?? null;

const includesAny = (text: string, terms: string[]): boolean => {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
};

const parseMoney = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const moneyFromSentence = (sentence: string | null): number | null => {
  if (!sentence) return null;
  const match = sentence.replace(/\u00a0/g, " ").match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  return parseMoney(match?.[1]);
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);

const fact = (claim: string, sourceQuote: string | null, confidence = "High"): FactCheck => ({
  claim,
  sourceQuote,
  confidence,
});

interface RiskRule {
  terms: string[];
  claim: string;
  category: ScoreDeduction["category"];
  points: number;
  confidence?: string;
}

const RISK_RULES: RiskRule[] = [
  {
    terms: ["special assessment"],
    claim: "Special assessment disclosed. Confirm the amount, what has already been paid, and whether more are planned.",
    category: "financial",
    points: 10,
  },
  {
    terms: ["litigation", "lawsuit", "legal dispute"],
    claim: "Litigation or a legal dispute is mentioned. This needs documentary follow-up before relying on the listing.",
    category: "condition",
    points: 15,
  },
  {
    terms: ["mold", "mould"],
    claim: "Mold or mould is mentioned. Treat this as a serious inspection item, not cosmetic wording.",
    category: "condition",
    points: 18,
  },
  {
    terms: ["termite", "pest history", "rodent"],
    claim: "A pest issue is mentioned. Ask for treatment history and whether the problem is resolved.",
    category: "condition",
    points: 12,
  },
  {
    terms: ["flooding", "flood history", "water intrusion", "foundation crack"],
    claim: "Water or foundation risk is mentioned. Ask for repair records, warranties, and insurance implications.",
    category: "condition",
    points: 15,
  },
  {
    terms: ["knob and tube", "knob-and-tube"],
    claim: "Knob and tube wiring is mentioned. Insurance and replacement cost need checking.",
    category: "condition",
    points: 15,
  },
  {
    terms: ["oil tank"],
    claim: "An oil tank is mentioned. Ask about age, inspection, insurance, and removal obligations.",
    category: "condition",
    points: 12,
  },
  {
    terms: ["asbestos"],
    claim: "Asbestos is mentioned. Renovation plans and remediation cost could be affected.",
    category: "condition",
    points: 15,
  },
  {
    terms: ["leasehold"],
    claim: "Leasehold tenure is mentioned. The remaining term and renewal terms materially affect value.",
    category: "financial",
    points: 12,
  },
  {
    terms: ["sold as is", "sold \"as is\""],
    claim: "The property is offered as is. Budget and inspection risk sit with the buyer.",
    category: "condition",
    points: 8,
  },
  {
    terms: ["roof needs replacement", "roof requires replacement", "end of life roof"],
    claim: "The roof may be near replacement. Ask for age, quotes, and whether the seller will credit the work.",
    category: "condition",
    points: 12,
  },
];

export const extractFacts = (
  listingContent: string,
  listingType: ListingType,
): ExtractedFacts => {
  const cleanedText = cleanListingText(listingContent);
  const sentences = splitSentences(cleanedText);
  const allText = cleanedText.toLowerCase();

  const priceSentence =
    findSentence(sentences, (s) =>
      /(list price|asking price|monthly rent|rent\s*:|price\s*:)/i.test(s),
    ) ?? findSentence(sentences, (s) => /\$\s*[\d,]+/.test(s));
  let price = moneyFromSentence(priceSentence);
  if (price === null) {
    const fallback = cleanedText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    price = parseMoney(fallback?.[1]);
  }

  const layoutQuote =
    findSentence(sentences, (s) => /bed(room)?|bath(room)?/i.test(s)) ?? null;
  const bedMatches = [...cleanedText.matchAll(/(\d+(?:\.\d+)?)\s*(?:-| )?(?:bedrooms?|beds?|br)\b/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 12);
  const bathMatches = [...cleanedText.matchAll(/(\d+(?:\.\d+)?)\s*(?:-| )?(?:bathrooms?|baths?|ba)\b/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 12);
  const bedrooms = bedMatches.length ? Math.max(...bedMatches) : null;
  const bathrooms = bathMatches.length ? Math.max(...bathMatches) : null;

  const sqftMatch = cleanedText.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|square feet)/i);
  const sqft = sqftMatch ? Number(sqftMatch[1].replace(/,/g, "")) : null;

  const feesQuote = findSentence(sentences, (s) =>
    /(maintenance|strata|condo).{0,40}(fee|fees)|\bfees?\b.{0,30}\$/i.test(s),
  );
  const specialAssessmentQuote = findSentence(sentences, (s) =>
    /special assessment/i.test(s),
  );
  const taxesQuote = findSentence(sentences, (s) =>
    /(property taxes|annual taxes|taxes\s*(?:are|:))/i.test(s),
  );

  const parkingQuote = findSentence(sentences, (s) => /parking/i.test(s));
  const parking: ExtractedFacts["parking"] = !parkingQuote
    ? "unknown"
    : /no parking|parking (?:is )?not (?:included|available)/i.test(parkingQuote)
      ? "not-included"
      : "included";

  const lockerQuote = findSentence(sentences, (s) => /locker|storage unit/i.test(s));
  const locker: ExtractedFacts["locker"] = !lockerQuote
    ? "unknown"
    : /no locker|locker (?:is )?not included/i.test(lockerQuote)
      ? "not-included"
      : "included";

  const petQuote = findSentence(sentences, (s) =>
    /pet|dog|cat/i.test(s),
  );
  const petPolicy: ExtractedFacts["petPolicy"] = !petQuote
    ? "unknown"
    : /no (pets|dogs|cats)|pets? (are )?not (allowed|permitted)|dogs? not allowed/i.test(petQuote)
      ? "not-allowed"
      : /without (?:a |any )?(?:stated )?size restriction|no size restriction/i.test(petQuote)
        ? "allowed"
        : /up to \d+\s*(?:lb|kg)|board approval|breed restriction/i.test(petQuote)
          ? "restricted"
          : /allow|welcome|friendly|permitted/i.test(petQuote)
            ? "allowed"
            : "restricted";

  const laundryQuote = findSentence(sentences, (s) => /laundry/i.test(s));
  const laundry: ExtractedFacts["laundry"] = !laundryQuote
    ? "unknown"
    : /shared laundry|laundry facilities are shared/i.test(laundryQuote)
      ? "shared"
      : /no laundry/i.test(laundryQuote)
        ? "none"
        : /(in-suite|ensuite|in-unit|private) laundry|washer and dryer/i.test(laundryQuote)
          ? "in-suite"
          : "unknown";

  const utilitiesQuote = findSentence(sentences, (s) =>
    /utilities|hydro|heat and water|water and heat/i.test(s),
  );
  const utilities: ExtractedFacts["utilities"] = !utilitiesQuote
    ? "unknown"
    : /not included|tenant pays|plus hydro|utilities extra/i.test(utilitiesQuote)
      ? "not-included"
      : /some utilities|water included|heat included/i.test(utilitiesQuote) &&
          !/all utilities included/i.test(utilitiesQuote)
        ? "partial"
        : /included/i.test(utilitiesQuote)
          ? "included"
          : "unknown";

  const heatingQuote = findSentence(sentences, (s) =>
    /heating|furnace|baseboard|forced air|heat pump/i.test(s),
  );
  const leaseQuote = findSentence(sentences, (s) =>
    /lease term|month-to-month|one-year lease|12-month lease|lease is/i.test(s),
  );
  const depositQuote = findSentence(sentences, (s) => /deposit|first and last/i.test(s));
  const amenitiesQuote = findSentence(sentences, (s) =>
    /amenities|concierge|fitness|gym|pool|rooftop terrace|guest suites/i.test(s),
  );
  const locationQuote = findSentence(sentences, (s) =>
    /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*(?:ON|BC|AB|MB|SK|NS|NB|NL|PE|QC)\b/.test(s) ||
    /Toronto|Vancouver|Calgary|Ottawa|Montreal|Winnipeg|Edmonton|Halifax/i.test(s),
  );

  const renovationSentences = sentences.filter((s) =>
    /updated|renovated|remodel|new roof|new furnace|new hvac/i.test(s),
  );
  const years = renovationSentences
    .flatMap((s) => [...s.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((m) => Number(m[1])))
    .filter((year) => year >= 1950 && year <= 2026);
  const renovatedYear = years.length ? Math.max(...years) : null;
  const renovationQuote = renovatedYear
    ? renovationSentences.find((s) => s.includes(String(renovatedYear))) ?? null
    : renovationSentences[0] ?? null;

  const risks: FactCheck[] = [];
  for (const rule of RISK_RULES) {
    const quote = findSentence(sentences, (s) => {
      if (!includesAny(s, rule.terms)) return false;
      // Negated disclosures ("No special assessment is planned") are the
      // opposite of a red flag. Do not flag them.
      if (/^no\b|not (?:currently )?(?:approved|planned|permitted)/i.test(s)) return false;
      if (/no special assessment|no litigation|no known/i.test(s)) return false;
      return true;
    });
    if (quote && !risks.some((risk) => risk.sourceQuote === quote)) {
      risks.push(fact(rule.claim, quote, rule.confidence ?? "High"));
    }
  }
  if (petPolicy === "restricted" && petQuote) {
    risks.push(
      fact(
        "Pet policy has restrictions. Confirm the exact size, breed, and approval rules before treating this as pet-friendly.",
        petQuote,
      ),
    );
  } else if (petPolicy === "not-allowed" && petQuote) {
    risks.push(fact("Pets are not allowed according to the listing.", petQuote));
  }

  const missing: string[] = [];
  if (price === null) missing.push("the list price or rent");
  if (bedrooms === null || bathrooms === null) missing.push("the exact bedroom and bathroom count");
  if (listingType === "BUY") {
    if (!feesQuote) missing.push("maintenance or strata fees");
    if (!taxesQuote) missing.push("property taxes");
    if (!specialAssessmentQuote) missing.push("whether any special assessment is planned");
    if (parking === "unknown") missing.push("parking details");
    if (!heatingQuote) missing.push("the heating system and its age");
  } else {
    if (utilities === "unknown") missing.push("which utilities are included");
    if (!leaseQuote) missing.push("the lease term");
    if (!depositQuote) missing.push("deposit requirements");
    if (laundry === "unknown") missing.push("laundry access");
    if (petPolicy === "unknown") missing.push("the pet policy");
  }

  return {
    cleanedText,
    sentences,
    price,
    priceQuote: priceSentence,
    bedrooms,
    bathrooms,
    sqft,
    layoutQuote,
    feesMonthly: moneyFromSentence(feesQuote),
    feesQuote,
    specialAssessment: moneyFromSentence(specialAssessmentQuote),
    specialAssessmentQuote,
    taxesAnnual: moneyFromSentence(taxesQuote),
    taxesQuote,
    parking,
    parkingQuote,
    locker,
    lockerQuote,
    petPolicy,
    petQuote,
    laundry,
    laundryQuote,
    utilities,
    utilitiesQuote,
    heatingQuote,
    leaseQuote,
    depositQuote,
    renovatedYear,
    renovationQuote,
    locationQuote,
    amenitiesQuote,
    risks,
    missing,
  };
};

const clampScore = (value: number): number =>
  Math.max(0, Math.min(MAX_SCORE, Math.round(value)));

const gradeForScore = (score: number): string => {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 40) return "D";
  return "F";
};

export interface ScoredFacts {
  categoryScores: AnalysisResult["matchScore"]["categoryScores"];
  total: number;
  grade: string;
  deductions: ScoreDeduction[];
  breakdown: string;
}

export const scoreFacts = (
  facts: ExtractedFacts,
  preferences: UserPreferences,
): ScoredFacts => {
  const deductions: ScoreDeduction[] = [];
  const deduct = (
    category: ScoreDeduction["category"],
    points: number,
    reason: string,
  ) => {
    if (points > 0) deductions.push({ category, points, reason });
  };

  if (facts.price === null) {
    deduct("financial", 20, "price or rent was not specified");
  } else if (facts.price > preferences.budgetMax) {
    const overPct = (facts.price - preferences.budgetMax) / preferences.budgetMax;
    deduct(
      "financial",
      Math.min(35, Math.round(20 + overPct * 100)),
      `${formatMoney(facts.price - preferences.budgetMax)} over the ${formatMoney(preferences.budgetMax)} budget`,
    );
  } else if (facts.price >= preferences.budgetMax * 0.95) {
    deduct("financial", 3, "price is close to the maximum budget");
  }

  if (preferences.listingType === "BUY" && facts.feesMonthly !== null) {
    const fee = facts.feesMonthly;
    const points = fee >= 750 ? 15 : fee >= 600 ? 12 : fee >= 450 ? 9 : fee >= 300 ? 6 : 3;
    deduct("financial", points, `${formatMoney(fee)}/month in maintenance or strata fees`);
  }
  if (preferences.listingType === "RENT" && facts.utilities === "not-included") {
    deduct("financial", 8, "utilities are not included");
  }
  if (facts.specialAssessment !== null) {
    deduct("financial", 10, `${formatMoney(facts.specialAssessment)} special assessment`);
    deduct("condition", 5, "special assessment points to building repair work");
  }
  if (preferences.listingType === "BUY" && !facts.taxesQuote) {
    deduct("financial", 3, "property taxes were not specified");
  }
  for (const rule of RISK_RULES) {
    // Special assessment cost is already deducted explicitly above from the
    // extracted amount. Do not double count it through the generic rule loop.
    if (rule.terms.includes("special assessment")) continue;
    const matched = facts.risks.find((risk) =>
      risk.sourceQuote && includesAny(risk.sourceQuote, rule.terms),
    );
    if (matched) deduct(rule.category, rule.points, rule.claim.split(".")[0].toLowerCase());
  }

  if (facts.bedrooms !== null && facts.bedrooms < preferences.minBedrooms) {
    deduct(
      "lifestyle",
      15 * (preferences.minBedrooms - facts.bedrooms),
      `${preferences.minBedrooms - facts.bedrooms} fewer bedroom(s) than requested`,
    );
  }
  if (facts.bathrooms !== null && facts.bathrooms < preferences.minBathrooms) {
    deduct(
      "lifestyle",
      10 * Math.ceil(preferences.minBathrooms - facts.bathrooms),
      "fewer bathrooms than requested",
    );
  }
  if (facts.sqft !== null && facts.bedrooms && facts.sqft / facts.bedrooms < 450) {
    deduct("lifestyle", 7, "living area is tight for the bedroom count");
  }
  if (facts.parking === "not-included") deduct("lifestyle", 10, "parking is not included");
  if (facts.parking === "unknown") deduct("lifestyle", 3, "parking was not confirmed");
  if (facts.petPolicy === "not-allowed") deduct("lifestyle", 15, "pets are not allowed");
  if (facts.petPolicy === "restricted") deduct("lifestyle", 7, "pet policy is restricted");
  if (facts.laundry === "shared") deduct("lifestyle", 8, "laundry is shared");
  if (facts.laundry === "none") deduct("lifestyle", 12, "no laundry access was stated");
  if (preferences.listingType === "RENT" && facts.laundry === "unknown") {
    deduct("lifestyle", 4, "laundry access was not specified");
  }

  if (preferences.location.trim()) {
    const target = normalizeForMatch(preferences.location);
    const locationText = normalizeForMatch(facts.cleanedText);
    const targetWords = target.split(" ").filter((word) => word.length > 2);
    if (!targetWords.some((word) => locationText.includes(word))) {
      deduct("lifestyle", 6, "location target was not confirmed in the listing");
    }
  }

  const criteria = preferences.customCriteria
    .split(/[\n,;]+|\band\b/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .slice(0, 6);
  const criteriaSynonyms: Record<string, string[]> = {
    dog: ["dog", "pet"],
    dogs: ["dog", "pet"],
    pet: ["pet", "dog", "cat"],
    parking: ["parking"],
    balcony: ["balcony", "terrace", "patio"],
    dishwasher: ["dishwasher"],
    laundry: ["laundry", "washer"],
    ensuite: ["ensuite", "en-suite"],
    elevator: ["elevator", "lift"],
    gym: ["gym", "fitness"],
    "south facing": ["south facing", "south-facing"],
  };
  for (const criterion of criteria) {
    const lower = criterion.toLowerCase().replace(/^(must have|must|need|no)\s+/i, "");
    const synonyms = criteriaSynonyms[lower] ?? [lower];
    const found = synonyms.some((term) => facts.cleanedText.toLowerCase().includes(term));
    if (!found) deduct("lifestyle", 7, `must-have not confirmed: ${criterion}`);
  }

  if (facts.renovatedYear === null) {
    deduct("condition", 5, "renovation or system age was not specified");
  } else {
    const age = 2026 - facts.renovatedYear;
    if (age >= 10) deduct("condition", 12, `most recent stated update was ${facts.renovatedYear}`);
    else if (age >= 7) deduct("condition", 8, `most recent stated update was ${facts.renovatedYear}`);
    else if (age >= 4) deduct("condition", 4, `most recent stated update was ${facts.renovatedYear}`);
  }

  const sum = (category: ScoreDeduction["category"]) =>
    deductions
      .filter((item) => item.category === category)
      .reduce((total, item) => total + item.points, 0);
  const categoryScores = {
    financial: clampScore(100 - sum("financial")),
    lifestyle: clampScore(100 - sum("lifestyle")),
    condition: clampScore(100 - sum("condition")),
  };

  const financialWeight = 0.4 * (0.7 + preferences.priorities.investment * 0.06);
  const lifestyleWeight =
    0.35 *
    (0.7 + ((preferences.priorities.commute + preferences.priorities.amenities) / 2) * 0.06);
  const conditionWeight = 0.25 * (0.7 + preferences.priorities.condition * 0.06);
  const weightTotal = financialWeight + lifestyleWeight + conditionWeight;
  const total = clampScore(
    (categoryScores.financial * financialWeight +
      categoryScores.lifestyle * lifestyleWeight +
      categoryScores.condition * conditionWeight) /
      weightTotal,
  );

  const topDeductions = [...deductions]
    .sort((a, b) => b.points - a.points)
    .slice(0, 6)
    .map((item) => `-${item.points} ${item.reason}`);
  const breakdown = topDeductions.length
    ? `Score calculated in code from the listing and your preferences. Main deductions: ${topDeductions.join("; ")}.`
    : "Score calculated in code from the listing and your preferences. No material deductions were triggered by the stated facts.";

  return { categoryScores, total, grade: gradeForScore(total), deductions, breakdown };
};

const firstMeaningfulLine = (text: string): string => {
  const line = text
    .split(/\n+/)
    .map((item) => item.trim())
    .find((item) => item.length >= 12 && !/sample listing|synthetic demo/i.test(item));
  return (line ?? "Listing analysis").replace(/\.$/, "").slice(0, 110);
};

const buildPros = (facts: ExtractedFacts, preferences: UserPreferences): FactCheck[] => {
  const pros: FactCheck[] = [];
  if (
    facts.bedrooms !== null &&
    facts.bathrooms !== null &&
    facts.bedrooms >= preferences.minBedrooms &&
    facts.bathrooms >= preferences.minBathrooms &&
    facts.layoutQuote
  ) {
    pros.push(
      fact(
        `Meets the requested layout at ${facts.bedrooms} bed and ${facts.bathrooms} bath${facts.sqft ? `, ${facts.sqft.toLocaleString("en-CA")} sq ft` : ""}.`,
        facts.layoutQuote,
      ),
    );
  }
  if (facts.parking === "included" && facts.parkingQuote) {
    pros.push(fact("Parking is included or provided with the property.", facts.parkingQuote));
  }
  if (facts.locker === "included" && facts.lockerQuote) {
    pros.push(fact("A locker or storage unit is included.", facts.lockerQuote));
  }
  if (facts.laundry === "in-suite" && facts.laundryQuote) {
    pros.push(fact("Laundry is in-suite or in-unit.", facts.laundryQuote));
  }
  if (facts.utilities === "included" && facts.utilitiesQuote) {
    pros.push(fact("Utilities are included, reducing monthly uncertainty.", facts.utilitiesQuote));
  }
  if (facts.amenitiesQuote) {
    pros.push(fact("Building amenities or shared facilities are stated in the listing.", facts.amenitiesQuote));
  }
  if (facts.renovatedYear !== null && facts.renovatedYear >= 2023 && facts.renovationQuote) {
    pros.push(fact(`Recent work is stated from ${facts.renovatedYear}.`, facts.renovationQuote));
  }
  return pros.slice(0, 6);
};

const buildCons = (
  facts: ExtractedFacts,
  preferences: UserPreferences,
  deductions: ScoreDeduction[],
): FactCheck[] => {
  const cons: FactCheck[] = [];
  if (facts.price !== null && facts.price > preferences.budgetMax) {
    cons.push(
      fact(
        `${preferences.listingType === "BUY" ? "Price" : "Rent"} is ${formatMoney(facts.price - preferences.budgetMax)} over the stated maximum.`,
        facts.priceQuote,
      ),
    );
  }
  if (facts.feesMonthly !== null && facts.feesQuote) {
    cons.push(
      fact(
        `Maintenance or strata fees are ${formatMoney(facts.feesMonthly)}/month, or ${formatMoney(facts.feesMonthly * 12)}/year.`,
        facts.feesQuote,
      ),
    );
  }
  if (facts.laundry === "shared" && facts.laundryQuote) {
    cons.push(fact("Laundry is shared rather than in-suite.", facts.laundryQuote));
  }
  if (facts.renovatedYear !== null && facts.renovatedYear <= 2022 && facts.renovationQuote) {
    cons.push(
      fact(
        `The most recent stated update was in ${facts.renovatedYear}, so condition should not be treated as newly renovated.`,
        facts.renovationQuote,
      ),
    );
  }
  for (const item of facts.missing.slice(0, 4)) {
    cons.push(fact(`Not specified in listing: ${item}.`, null, "High"));
  }
  const relevant = deductions.filter((item) => item.points >= 10).length;
  void relevant;
  return cons.slice(0, 7);
};

const buildContactDraft = (
  facts: ExtractedFacts,
  preferences: UserPreferences,
  title: string,
): AnalysisResult["contactDraft"] => {
  const questions: string[] = [];
  if (facts.specialAssessment !== null) {
    questions.push(
      `The listing mentions a ${formatMoney(facts.specialAssessment)} special assessment. How much has the seller already paid, and are further assessments expected?`,
    );
  }
  for (const item of facts.missing.slice(0, 4)) {
    questions.push(`Could you confirm ${item}? It was not specified in the listing text.`);
  }
  for (const risk of facts.risks.slice(0, 3)) {
    if (!questions.some((question) => question.includes(risk.claim.split(".")[0]))) {
      questions.push(`The listing raises this point: ${risk.claim} Could you provide the relevant details or documents?`);
    }
  }
  if (preferences.listingType === "BUY" && !questions.some((q) => /status certificate|strata documents/i.test(q))) {
    questions.push("Could you share the status certificate or strata documents, including the reserve fund position?");
  }
  if (!questions.length) {
    questions.push("Could you confirm the price, availability, and any costs or restrictions not stated in the listing?");
  }
  return {
    subject: `Questions about ${title}`,
    body: `Hi,\n\nI'm interested in this property and had a few questions before booking a showing:\n\n${questions
      .slice(0, 6)
      .map((question, index) => `${index + 1}. ${question}`)
      .join("\n")}\n\nThanks for your time.`,
  };
};

export const buildLocalAnalysis = (
  listingContent: string,
  preferences: UserPreferences,
): AnalysisResult => {
  const facts = extractFacts(listingContent, preferences.listingType);
  const scored = scoreFacts(facts, preferences);
  const title = firstMeaningfulLine(facts.cleanedText);
  const priceLabel =
    facts.price === null
      ? "Price not specified"
      : preferences.listingType === "BUY"
        ? formatMoney(facts.price)
        : `${formatMoney(facts.price)}/month`;
  const layoutParts = [
    facts.bedrooms === null ? null : `${facts.bedrooms} Bed`,
    facts.bathrooms === null ? null : `${facts.bathrooms} Bath`,
    facts.sqft === null ? null : `${facts.sqft.toLocaleString("en-CA")} sq ft`,
  ].filter(Boolean);
  const topRisk = facts.risks[0]?.claim;
  const quickSummary = [
    facts.price !== null && facts.price > preferences.budgetMax
      ? `This listing is ${formatMoney(facts.price - preferences.budgetMax)} over your maximum.`
      : facts.price !== null
        ? "The stated price is within your maximum."
        : "The listing does not state a usable price.",
    facts.feesMonthly ? `Fees are ${formatMoney(facts.feesMonthly)}/month.` : null,
    facts.specialAssessment
      ? `It discloses a ${formatMoney(facts.specialAssessment)} special assessment.`
      : null,
    topRisk && facts.specialAssessment === null ? topRisk : null,
    facts.missing.length
      ? `Important information is missing on ${facts.missing.slice(0, 2).join(" and ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const hiddenGems: string[] = [];
  if (facts.locker === "included") hiddenGems.push("Locker or storage is included according to the listing.");
  if (facts.utilities === "included") hiddenGems.push("Utilities are included, which makes the monthly cost easier to predict.");
  if (facts.amenitiesQuote) hiddenGems.push("The listing states building amenities that may offset some monthly costs.");
  if (facts.laundry === "in-suite") hiddenGems.push("In-suite laundry is stated, which is a real day-to-day convenience.");

  const pricePerSqft =
    facts.price !== null && facts.sqft ? Math.round(facts.price / facts.sqft) : null;

  return {
    summary: {
      title,
      price: priceLabel,
      location: facts.locationQuote ?? "Location not specified in listing",
      layout: layoutParts.length ? layoutParts.join(" / ") : "Layout not specified in listing",
      quickSummary: quickSummary || "The listing text did not contain enough structured facts for a detailed summary.",
    },
    matchScore: {
      total: scored.total,
      grade: scored.grade,
      breakdown: scored.breakdown,
      categoryScores: scored.categoryScores,
    },
    details: {
      pros: buildPros(facts, preferences),
      cons: buildCons(facts, preferences, scored.deductions),
      redFlags: facts.risks,
      hiddenGems,
    },
    marketAnalysis: {
      valueVerdict:
        facts.price === null
          ? "Price not specified"
          : facts.price > preferences.budgetMax
            ? "Over your budget"
            : "Within your budget",
      investmentPotential: "Not assessed from listing alone",
      comparableNotes:
        preferences.listingType === "BUY" && pricePerSqft
          ? `The stated price and area work out to about ${formatMoney(pricePerSqft)}/sq ft. No comparable sales, live market data, tax record, or status certificate was provided or checked, so value cannot be verified from this listing alone.`
          : "No comparable sales or live market data was provided or checked. This result only evaluates the listing text against your stated preferences and budget.",
    },
    contactDraft: buildContactDraft(facts, preferences, title),
  };
};

export const quoteExistsInListing = (quote: string, listingContent: string): boolean => {
  const normalizedQuote = normalizeForMatch(quote);
  if (!normalizedQuote) return false;
  return normalizeForMatch(cleanListingText(listingContent)).includes(normalizedQuote);
};

export const validateAnalysisGrounding = (
  result: AnalysisResult,
  listingContent: string,
): AnalysisResult => {
  const keepFact = (item: FactCheck): boolean => {
    if (!item.sourceQuote) {
      return /not specified|missing|does not mention|not confirmed/i.test(item.claim);
    }
    return quoteExistsInListing(item.sourceQuote, listingContent);
  };
  return {
    ...result,
    details: {
      ...result.details,
      pros: Array.isArray(result.details?.pros) ? result.details.pros.filter(keepFact) : [],
      cons: Array.isArray(result.details?.cons) ? result.details.cons.filter(keepFact) : [],
      redFlags: Array.isArray(result.details?.redFlags)
        ? result.details.redFlags.filter(keepFact)
        : [],
    },
  };
};

export const applyDeterministicScoring = (
  result: AnalysisResult,
  listingContent: string,
  preferences: UserPreferences,
): AnalysisResult => {
  const grounded = validateAnalysisGrounding(result, listingContent);
  const local = buildLocalAnalysis(listingContent, preferences);
  return {
    ...grounded,
    matchScore: local.matchScore,
    marketAnalysis: local.marketAnalysis,
    details: {
      ...grounded.details,
      hiddenGems: local.details.hiddenGems,
    },
  };
};

interface QuestionTopic {
  terms: string[];
  quote: (facts: ExtractedFacts) => string | null;
  prefix: string;
}

const QUESTION_TOPICS: QuestionTopic[] = [
  {
    terms: ["assessment", "special levy", "levy"],
    quote: (f) => f.specialAssessmentQuote,
    prefix: "On the special assessment",
  },
  {
    terms: ["fee", "strata", "maintenance", "condo fee"],
    quote: (f) => f.feesQuote,
    prefix: "On fees",
  },
  {
    terms: ["parking", "garage", "car"],
    quote: (f) => f.parkingQuote,
    prefix: "On parking",
  },
  {
    terms: ["locker", "storage"],
    quote: (f) => f.lockerQuote,
    prefix: "On storage",
  },
  {
    terms: ["pet", "dog", "cat"],
    quote: (f) => f.petQuote,
    prefix: "On pets",
  },
  {
    terms: ["laundry", "washer", "dryer"],
    quote: (f) => f.laundryQuote,
    prefix: "On laundry",
  },
  {
    terms: ["utilities", "hydro", "internet", "electric"],
    quote: (f) => f.utilitiesQuote,
    prefix: "On utilities",
  },
  {
    terms: ["heat", "heating", "furnace"],
    quote: (f) => f.heatingQuote,
    prefix: "On heating",
  },
  {
    terms: ["lease", "term", "month to month"],
    quote: (f) => f.leaseQuote,
    prefix: "On the lease",
  },
  {
    terms: ["deposit", "first and last"],
    quote: (f) => f.depositQuote,
    prefix: "On deposits",
  },
  {
    terms: ["tax", "taxes"],
    quote: (f) => f.taxesQuote,
    prefix: "On taxes",
  },
  {
    terms: ["renovat", "updated", "condition", "age", "new"],
    quote: (f) => f.renovationQuote,
    prefix: "On condition and updates",
  },
  {
    terms: ["amenit", "gym", "pool", "concierge"],
    quote: (f) => f.amenitiesQuote,
    prefix: "On amenities",
  },
  {
    terms: ["price", "cost", "rent", "how much"],
    quote: (f) => f.priceQuote,
    prefix: "On price",
  },
  {
    terms: ["bed", "bath", "layout", "size", "sqft", "square"],
    quote: (f) => f.layoutQuote,
    prefix: "On layout",
  },
  {
    terms: ["where", "location", "address"],
    quote: (f) => f.locationQuote,
    prefix: "On location",
  },
];

const STOP_WORDS = new Set([
  "what",
  "does",
  "the",
  "listing",
  "about",
  "with",
  "have",
  "there",
  "this",
  "that",
  "please",
  "tell",
  "mention",
  "mentions",
  "include",
  "included",
]);

export const answerListingQuestion = (
  listingContent: string,
  question: string,
): string => {
  const listingType: ListingType = /\$\s*[\d,]{2,}\s*(?:\/month|per month)/i.test(listingContent)
    ? "RENT"
    : "BUY";
  const facts = extractFacts(listingContent, listingType);
  const lowerQuestion = question.toLowerCase();

  if (/red flag|risk|concern|problem/.test(lowerQuestion)) {
    if (!facts.risks.length) return "I did not find a stated red flag in the listing text. That is not the same as a professional inspection or document review.";
    return `The clearest stated risks are: ${facts.risks.map((risk) => risk.claim).join(" ")}`;
  }
  if (/score|match|worth it|good fit/.test(lowerQuestion)) {
    const preferences: UserPreferences = {
      listingType,
      budgetMax: listingType === "BUY" ? 750000 : 2500,
      minBedrooms: 2,
      minBathrooms: 1,
      location: "",
      priorities: { commute: 5, condition: 5, investment: 5, amenities: 5 },
      customCriteria: "",
    };
    const result = buildLocalAnalysis(listingContent, preferences);
    return `Using the default preferences, the deterministic score is ${result.matchScore.total}/100. ${result.matchScore.breakdown}`;
  }

  for (const topic of QUESTION_TOPICS) {
    if (topic.terms.some((term) => lowerQuestion.includes(term))) {
      const quote = topic.quote(facts);
      return quote
        ? `${topic.prefix}, the listing says: "${quote}"`
        : "The listing doesn't mention that.";
    }
  }

  const words = lowerQuestion
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  let best: { sentence: string; score: number } | null = null;
  for (const sentence of facts.sentences) {
    const lowerSentence = sentence.toLowerCase();
    const score = words.reduce((total, word) => total + (lowerSentence.includes(word) ? 1 : 0), 0);
    if (!best || score > best.score) best = { sentence, score };
  }
  if (best && best.score >= Math.min(2, words.length) && words.length > 0) {
    return `The listing says: "${best.sentence}"`;
  }
  return "The listing doesn't mention that.";
};
