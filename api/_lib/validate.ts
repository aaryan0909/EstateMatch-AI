import { UserPreferences } from "../../types.js";

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const cleanString = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.substring(0, maxLength) : "";

export const sanitizePreferences = (input: unknown): UserPreferences => {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const prioritiesRaw = (raw.priorities && typeof raw.priorities === "object"
    ? raw.priorities
    : {}) as Record<string, unknown>;
  const listingType = raw.listingType === "RENT" ? "RENT" : "BUY";
  return {
    listingType,
    budgetMax: clampNumber(raw.budgetMax, 0, 100_000_000, listingType === "BUY" ? 750_000 : 2_500),
    minBedrooms: clampNumber(raw.minBedrooms, 0, 20, 2),
    minBathrooms: clampNumber(raw.minBathrooms, 0, 20, 1),
    location: cleanString(raw.location, 200),
    priorities: {
      commute: clampNumber(prioritiesRaw.commute, 1, 10, 5),
      condition: clampNumber(prioritiesRaw.condition, 1, 10, 5),
      investment: clampNumber(prioritiesRaw.investment, 1, 10, 5),
      amenities: clampNumber(prioritiesRaw.amenities, 1, 10, 5),
    },
    customCriteria: cleanString(raw.customCriteria, 1_000),
  };
};

export const sanitizeListing = (value: unknown, maxLength = 40_000): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength * 2) return null;
  return trimmed.substring(0, maxLength);
};
