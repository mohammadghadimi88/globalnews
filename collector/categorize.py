"""
GlobalNews Rule-Based Classifier & Tagging Engine
Determines primary category, subcategory, geographic region, country, and normalized tags.
"""

import re
from typing import Dict, Any, List, Tuple

# Geographic and entity lookups
REGIONS = {
    "Europe": [
        "europe", "european", "eu", "brussels", "uk", "britain", "british", "london", 
        "france", "french", "paris", "germany", "german", "berlin", "italy", "italian", 
        "rome", "spain", "spanish", "madrid", "barcelona", "catalonia", "ukraine", "kyiv", "russia", "moscow", 
        "poland", "sweden", "switzerland", "netherlands", "greece", "norway"
    ],
    "Asia": [
        "asia", "asian", "china", "chinese", "beijing", "japan", "japanese", "tokyo", 
        "india", "indian", "delhi", "south korea", "korean", "seoul", "taiwan", "taipei", 
        "singapore", "indonesia", "jakarta", "philippines", "manila", "vietnam", "thailand", 
        "bangkok", "pakistan", "islamabad", "bangladesh", "dhaka"
    ],
    "Middle East": [
        "middle east", "israel", "israeli", "gaza", "palestinian", "jerusalem", "iran", 
        "iranian", "tehran", "saudi", "saudi arabia", "riyadh", "uae", "dubai", "abu dhabi", 
        "qatar", "doha", "lebanon", "beirut", "syria", "damascus", "iraq", "baghdad", 
        "yemen", "houthi", "jordan", "amman"
    ],
    "Americas": [
        "us", "usa", "united states", "washington", "biden", "trump", "congress", "senate", 
        "pentagon", "canada", "canadian", "ottawa", "mexico", "mexican", "brazil", "brazilian", 
        "argentina", "colombia", "chile", "peru", "venezuela", "cuba"
    ],
    "Africa": [
        "africa", "african", "nigeria", "lagos", "south africa", "johannesburg", "kenya", 
        "nairobi", "ethiopia", "addis ababa", "egypt", "cairo", "ghana", "accra", "congo", 
        "sudan", "somalia", "uganda", "rwanda", "morocco", "algeria"
    ],
    "Oceania": [
        "australia", "australian", "sydney", "melbourne", "canberra", "new zealand",
        "wellington", "auckland", "pacific islands", "fiji"
    ],
    "Latin America": [
        "latin america", "latin american", "argentina", "buenos aires", "brazil", "brazilian",
        "sao paulo", "rio de janeiro", "mexico", "mexican", "mexico city", "colombia",
        "bogota", "chile", "santiago", "peru", "lima", "venezuela", "cuba", "uruguay"
    ]
}

CATEGORY_KEYWORDS = {
    "technology": {
        "ai": ["ai", "artificial intelligence", "machine learning", "deep learning", "llm", "openai", "chatgpt", "gemini", "anthropic", "claude", "neural", "genai", "nvidia"],
        "cybersecurity": ["cybersecurity", "hacker", "hacking", "malware", "ransomware", "breach", "zero-day", "vulnerability", "phishing", "encryption"],
        "software": ["software", "coding", "linux", "cloud", "aws", "microsoft", "google", "meta", "apple", "app", "browser", "developer", "open-source"],
        "hardware": ["semiconductor", "chip", "chips", "hardware", "processor", "gpu", "tsmc", "intel", "amd", "quantum computer", "quantum computing"],
        "crypto": ["bitcoin", "ethereum", "crypto", "cryptocurrency", "blockchain", "solana", "binance", "coinbase", "defi"],
        "gadgets": ["smartphone", "iphone", "pixel", "galaxy", "wearable", "headphones", "vr", "headset"]
    },
    "business": {
        "markets": ["stocks", "wall street", "dow jones", "s&p 500", "nasdaq", "bonds", "yields", "treasuries", "shares", "rally", "equities", "oil prices", "gold"],
        "economy": ["inflation", "gdp", "recession", "interest rate", "interest rates", "federal reserve", "fed", "ecb", "central bank", "unemployment", "jobs report", "tariff", "trade deficit"],
        "banking": ["banking", "bank", "jpmorgan", "goldman sachs", "credit", "mortgage", "imf", "world bank", "debt"],
        "companies": ["earnings", "revenue", "merger", "acquisition", "antitrust", "ceo", "layoffs", "ipo", "profit", "quarterly"]
    },
    "politics": {
        "us politics": ["biden", "trump", "white house", "congress", "senate", "democrats", "republicans", "gop", "capitol hill", "supreme court", "kamala", "election"],
        "european politics": ["eu parliament", "macron", "scholz", "starmer", "parliament", "downing street", "bundestag", "brexit"],
        "elections": ["poll", "polling", "voters", "ballot", "primary", "campaign", "race", "presidential election"],
        "diplomacy": ["summit", "treaty", "ambassador", "sanctions", "nato", "united nations", "un security council", "peace talks", "ceasefire", "diplomatic"]
    },
    "science": {
        "space": ["nasa", "space", "spacex", "telescope", "moon", "mars", "satellite", "orbit", "astronomy", "asteroid", "artemis", "jwst", "galaxy"],
        "physics": ["physics", "quantum", "particle", "cern", "fusion", "laser", "relativity"],
        "biology": ["species", "fossil", "genetics", "dna", "evolution", "marine", "ecosystem"],
        "research": ["study finds", "researchers", "scientists", "discovery", "laboratory", "experiment", "nature journal"]
    },
    "health": {
        "medicine": ["vaccine", "drug", "fda", "clinical trial", "therapy", "treatment", "pharmaceutical", "antibiotic", "cancer research"],
        "public health": ["pandemic", "virus", "who", "cdc", "outbreak", "disease", "infection", "epidemic", "flu"],
        "wellness": ["nutrition", "mental health", "sleep", "diet", "fitness", "cardiovascular"]
    },
    "environment": {
        "climate": ["climate change", "global warming", "emissions", "greenhouse", "carbon", "ipcc", "extreme heat", "wildfire", "drought", "glacier"],
        "energy": ["solar energy", "wind farm", "renewable energy", "electric vehicle", "ev", "clean energy", "grid", "battery storage"],
        "conservation": ["deforestation", "amazon rainforest", "pollution", "plastics", "ocean", "biodiversity", "wildlife"]
    },
    "sports": {
        "football": ["premier league", "champions league", "fifa", "world cup", "messi", "ronaldo", "arsenal", "real madrid", "soccer"],
        "basketball": ["nba", "lakers", "celtics", "playoffs", "basketball"],
        "tennis": ["tennis", "grand slam", "wimbledon", "djokovic", "alcaraz", "federer", "us open"],
        "motorsport": ["formula 1", "f1", "verstappen", "hamilton", "ferrari", "grand prix"],
        "olympics": ["olympic", "olympics", "medal", "paralympics"]
    },
    "culture": {
        "film": ["box office", "oscar", "oscars", "cinema", "director", "hollywood", "actor", "actress", "film festival", "movie"],
        "music": ["album", "billboard", "grammy", "grammys", "concert", "tour", "musician", "band", "singer"],
        "books": ["novel", "booker prize", "author", "publishing", "bestseller", "literature"],
        "art": ["exhibition", "gallery", "auction", "curator", "sculpture", "painting", "museum"]
    }
}

IMPORTANT_TAGS = [
    ("Artificial Intelligence", ["artificial intelligence", "ai", "llm", "chatgpt"]),
    ("OpenAI", ["openai"]),
    ("Apple", ["apple", "iphone", "ipad", "macbook"]),
    ("Google", ["google", "alphabet"]),
    ("Microsoft", ["microsoft", "azure"]),
    ("NVIDIA", ["nvidia"]),
    ("Tesla", ["tesla", "elon musk"]),
    ("Amazon", ["amazon", "aws"]),
    ("Meta", ["meta", "facebook", "instagram"]),
    ("Bitcoin", ["bitcoin", "btc"]),
    ("Federal Reserve", ["federal reserve", "fed", "jerome powell"]),
    ("Wall Street", ["wall street", "nyse", "nasdaq"]),
    ("Donald Trump", ["trump", "donald trump"]),
    ("Joe Biden", ["biden", "joe biden"]),
    ("Kamala Harris", ["kamala harris", "harris"]),
    ("Ukraine", ["ukraine", "kyiv", "zelenskiy", "zelensky"]),
    ("Russia", ["russia", "moscow", "putin"]),
    ("China", ["china", "beijing", "xi jinping"]),
    ("Middle East", ["middle east", "gaza", "israel", "iran", "lebanon"]),
    ("European Union", ["european union", "eu commission", "brussels"]),
    ("United Kingdom", ["britain", "uk", "westminster", "starmer"]),
    ("NATO", ["nato"]),
    ("NASA", ["nasa"]),
    ("SpaceX", ["spacex"]),
    ("Climate Change", ["climate change", "global warming", "emissions"]),
    ("Renewable Energy", ["clean energy", "solar power", "wind energy"]),
    ("Cybersecurity", ["cybersecurity", "cyberattack", "ransomware"]),
    ("Public Health", ["public health", "cdc", "who", "epidemic"]),
    ("Formula 1", ["formula 1", "f1", "grand prix"]),
    ("Premier League", ["premier league"]),
]

def detect_region_and_country(text_lower: str, source_region: str, source_country: str) -> Tuple[str, str]:
    """Identify geographic region and specific country if confident."""
    for region, keywords in REGIONS.items():
        for kw in keywords:
            # Word boundary check for short keywords
            if len(kw) <= 3:
                if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                    return region, kw.capitalize() if kw in ["uk", "us", "usa", "eu"] else kw.title()
            else:
                if kw in text_lower:
                    return region, kw.capitalize() if kw in ["uk", "us", "usa", "eu"] else kw.title()

    # Fallback to source's own geographic location
    return source_region or "Global", source_country or ""

def classify_story(title: str, summary: str, source_meta: Dict[str, Any]) -> Tuple[str, str, str, str, List[str]]:
    """
    Returns: (category, subcategory, region, country, tags)
    """
    text = (title + " " + summary).lower()
    default_cat = source_meta.get("defaultCategory", "world").lower()
    source_region = source_meta.get("sourceRegion", "Global")
    source_country = source_meta.get("sourceCountry", "")

    best_cat = default_cat
    best_subcat = "general"
    highest_score = 0

    # Score categories based on keyword matches
    for cat, subcats in CATEGORY_KEYWORDS.items():
        for subcat, keywords in subcats.items():
            score = 0
            for kw in keywords:
                if len(kw) <= 3:
                    if re.search(r"\b" + re.escape(kw) + r"\b", text):
                        score += 3
                else:
                    if kw in text:
                        # Higher weight if keyword is in title
                        if kw in title.lower():
                            score += 4
                        else:
                            score += 2

            if score > highest_score:
                highest_score = score
                best_cat = cat
                best_subcat = subcat

    # If no keyword matched strongly, retain default category
    if highest_score < 2:
        best_cat = default_cat
        best_subcat = "general"

    # Detect region and country
    region, country = detect_region_and_country(text, source_region, source_country)

    # Extract high-value normalized tags
    tags = []
    for tag_name, keywords in IMPORTANT_TAGS:
        for kw in keywords:
            if len(kw) <= 3:
                if re.search(r"\b" + re.escape(kw) + r"\b", text):
                    tags.append(tag_name)
                    break
            elif kw in text:
                tags.append(tag_name)
                break

    # Add category and subcategory tags if not already present
    if best_cat.capitalize() not in tags:
        tags.append(best_cat.capitalize())
    if best_subcat != "general" and best_subcat.title() not in tags:
        tags.append(best_subcat.title())

    return best_cat, best_subcat, region, country, tags[:5]
