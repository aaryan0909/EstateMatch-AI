import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  answerListingQuestion,
  buildLocalAnalysis,
  cleanListingText,
  extractFacts,
  quoteExistsInListing,
  validateAnalysisGrounding,
} from "../services/analyzerCore";
import { AnalysisResult, UserPreferences } from "../types";

const readFixture = (name: string): string =>
  readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

const riskyListing = readFixture("sample-listing.md");
const cleanListing = readFixture("sample-clean-condo.md");
const rentalListing = readFixture("sample-rental.md");

const buyPrefs: UserPreferences = {
  listingType: "BUY",
  budgetMax: 750000,
  minBedrooms: 2,
  minBathrooms: 1,
  location: "",
  priorities: { commute: 5, condition: 5, investment: 5, amenities: 5 },
  customCriteria: "",
};

const rentPrefs: UserPreferences = { ...buyPrefs, listingType: "RENT", budgetMax: 2500 };

describe("fact extraction: risky condo sample", () => {
  const facts = extractFacts(riskyListing, "BUY");

  it("extracts price, fees, and the special assessment", () => {
    expect(facts.price).toBe(789000);
    expect(facts.feesMonthly).toBe(685);
    expect(facts.specialAssessment).toBe(4200);
  });

  it("extracts layout and pet restriction", () => {
    expect(facts.bedrooms).toBe(2);
    expect(facts.bathrooms).toBe(2);
    expect(facts.sqft).toBe(875);
    expect(facts.petPolicy).toBe("restricted");
  });
});

describe("deterministic scoring", () => {
  it("flags the risky condo as over budget with a grounded red flag", () => {
    const result = buildLocalAnalysis(riskyListing, buyPrefs);
    expect(result.marketAnalysis.valueVerdict).toBe("Over your budget");
    expect(result.details.redFlags.length).toBeGreaterThan(0);
    for (const item of [...result.details.pros, ...result.details.cons, ...result.details.redFlags]) {
      if (item.sourceQuote) {
        expect(quoteExistsInListing(item.sourceQuote, riskyListing)).toBe(true);
      }
    }
  });

  it("scores the risky condo below the clean condo", () => {
    const risky = buildLocalAnalysis(riskyListing, buyPrefs);
    const clean = buildLocalAnalysis(cleanListing, buyPrefs);
    expect(clean.matchScore.total).toBeGreaterThan(risky.matchScore.total);
    expect(clean.marketAnalysis.valueVerdict).toBe("Within your budget");
  });

  it("rescoring with a higher budget improves the financial score", () => {
    const base = buildLocalAnalysis(riskyListing, buyPrefs);
    const raised = buildLocalAnalysis(riskyListing, { ...buyPrefs, budgetMax: 850000 });
    expect(raised.matchScore.categoryScores.financial).toBeGreaterThan(
      base.matchScore.categoryScores.financial,
    );
    expect(raised.marketAnalysis.valueVerdict).toBe("Within your budget");
  });

  it("surfaces rental traps for the rental fixture", () => {
    const result = buildLocalAnalysis(rentalListing, rentPrefs);
    expect(result.marketAnalysis.valueVerdict).toBe("Over your budget");
    const claims = result.details.cons.map((item) => item.claim).join(" ");
    expect(claims).toMatch(/over the stated maximum/i);
    const risks = result.details.redFlags.map((item) => item.claim).join(" ");
    expect(risks).toMatch(/pets are not allowed/i);
  });
});

describe("quote grounding", () => {
  it("drops claims whose quote is fabricated", () => {
    const result = buildLocalAnalysis(cleanListing, buyPrefs);
    const poisoned: AnalysisResult = {
      ...result,
      details: {
        ...result.details,
        pros: [
          {
            claim: "It has a private helipad.",
            sourceQuote: "The roof includes a private helipad for residents",
            confidence: "High",
          },
        ],
      },
    };
    const validated = validateAnalysisGrounding(poisoned, cleanListing);
    expect(validated.details.pros).toHaveLength(0);
  });
});

describe("local Q&A", () => {
  it("answers parking and assessment questions from quotes", () => {
    expect(answerListingQuestion(riskyListing, "Is parking included?")).toMatch(/parking/i);
    expect(answerListingQuestion(riskyListing, "What about the special assessment?")).toMatch(
      /assessment/i,
    );
  });

  it("says not mentioned instead of inventing an answer", () => {
    expect(answerListingQuestion(riskyListing, "What is the heating system?")).toMatch(
      /doesn't mention/i,
    );
  });
});

describe("HTML cleaning", () => {
  it("strips tags and scripts before analysis", () => {
    const cleaned = cleanListingText(
      '<div><script>alert(1)</script><p>List price: $500,000</p></div>',
    );
    expect(cleaned).not.toContain("<");
    expect(cleaned).not.toContain("alert");
    expect(cleaned).toContain("$500,000");
  });
});
