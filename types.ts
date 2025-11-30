export interface UserPreferences {
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

export interface ScoredFeature {
  name: string;
  score: number; // -5 to +5 impact
  reason: string;
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
    total: number; // 0-100
    grade: string; // A, B, C, F
    breakdown: string;
  };
  details: {
    pros: string[];
    cons: string[];
    redFlags: string[];
    hiddenGems: string[];
  };
  marketAnalysis: {
    valueVerdict: string; // "Overpriced", "Fair", "Steal"
    investmentPotential: string;
  };
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
}
