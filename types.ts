export type ListingType = 'BUY' | 'RENT';

export interface UserPreferences {
  listingType: ListingType;
  budgetMax: number;
  minBedrooms: number;
  minBathrooms: number;
  location: string;
  priorities: {
    commute: number; // 1-10
    condition: number; // 1-10
    investment: number; // 1-10
    amenities: number; // 1-10
  };
  customCriteria: string; // Natural language inputs like "Must allow large dogs"
}

export interface FactCheck {
  claim: string;
  sourceQuote: string | null; // The exact text from the listing justifying this
  confidence: string; // "High", "Medium", "Low"
}

export interface AnalysisResult {
  summary: {
    title: string;
    price: string;
    location: string;
    layout: string;
    quickSummary: string;
  };
  matchScore: {
    total: number;
    grade: string;
    breakdown: string;
    categoryScores: {
      financial: number;
      lifestyle: number;
      condition: number;
    };
  };
  details: {
    pros: FactCheck[]; 
    cons: FactCheck[];
    redFlags: FactCheck[];
    hiddenGems: string[];
  };
  marketAnalysis: {
    valueVerdict: string;
    investmentPotential: string;
    comparableNotes: string;
  };
  contactDraft: {
    subject: string;
    body: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
}
