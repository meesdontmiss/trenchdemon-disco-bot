export type NarrativeExtraction = {
  title: string;
  summary: string;
  entities: string[];
  meme_angles: string[];
  keywords: string[];
  alternate_keywords: string[];
  possible_tickers: string[];
  negative_keywords: string[];
  time_sensitivity: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
};

export type NarrativeTerms = {
  title: string;
  summary: string;
  entities: string[];
  keywords: string[];
  possibleTickers: string[];
  negativeKeywords: string[];
};
