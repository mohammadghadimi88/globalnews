/**
 * GlobalNews Central Application Configuration
 * Strictly isolated configuration parameters.
 */
export const CONFIG = {
  // Feed limits & pagination
  newsLimit: 500,
  retentionHours: 48,
  initialResults: 30,
  resultsPerPage: 30,

  // Feature flags
  enableSearch: true,
  enableCategories: true,
  enableDarkMode: true,
  enableAds: false, // Keep disabled until publisher approval and consent requirements are configured.
  enableAnalytics: false,

  // Polling / auto-refresh in milliseconds (5 minutes)
  refreshInterval: 300000,

  // Precision Search Relevance Weights
  searchWeights: {
    exactTitlePhrase: 100,
    titleWordMatch: 60,
    exactTag: 50,
    summaryMatch: 30,
    categoryMatch: 20,
    subcategoryMatch: 20,
    sourceMatch: 15,
    regionMatch: 10,
    allTermsBonus: 40
  },

  // Primary categories & default subcategories
  categories: [
    { id: "all", name: "All News" },
    {
      id: "world",
      name: "World",
      subcategories: ["europe", "asia", "middle east", "africa", "americas", "latin america", "oceania"]
    },
    {
      id: "politics",
      name: "Politics",
      subcategories: ["us politics", "european politics", "elections", "diplomacy", "policy"]
    },
    {
      id: "business",
      name: "Business",
      subcategories: ["markets", "economy", "banking", "companies", "startups"]
    },
    {
      id: "technology",
      name: "Technology",
      subcategories: ["ai", "cybersecurity", "software", "hardware", "gadgets"]
    },
    {
      id: "science",
      name: "Science",
      subcategories: ["space", "physics", "biology", "research"]
    },
    {
      id: "health",
      name: "Health",
      subcategories: ["medicine", "public health", "wellness"]
    },
    {
      id: "sports",
      name: "Sports",
      subcategories: ["football", "basketball", "tennis", "motorsport", "olympics"]
    },
    {
      id: "culture",
      name: "Culture",
      subcategories: ["books", "art", "film", "music"]
    },
    {
      id: "environment",
      name: "Environment",
      subcategories: ["climate", "energy", "conservation"]
    }
  ]
};
