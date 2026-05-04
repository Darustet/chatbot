// Nokia Entities
const NOKIA_ENTITIES = [
  "nokia oyj",
  "nokia corporation",
  "nokia bell labs",
  "nokia solutions and networks",
  "nokia cloud and network services", // major business division 
  "nokia mobile networks",
  "nokia technologies", // Usually the IP/Patent unit
  "nokia oulu",
  "nokia espoo",
  "nokia headquarters",
  "nokia tampere",
  "nokia cns", // cloud and network services
];

// Collaboration phrases
const COLLABORATION_PHRASES = [
  "collaboration with nokia",
  "commissioned by nokia",
  "conducted for nokia",
  "thesis for nokia",
  "project for nokia",
  "case company nokia",
  "customer project for nokia",
  "nokia project",
  "nokia case study",
  "nokia collaboration",
  "nokia partnership",
  "trainee at nokia",
  "intern at nokia",
  "thesis worker at nokia",
  "work at nokia",
  "working for nokia",
  "carried out at nokia",
  "conducted at nokia",
  "supervised by nokia",
  "commissioned by nokia",
  "supported by nokia",
  "guidance from nokia",
  "assistance from nokia",
  "employee at nokia",
  "while working at nokia",
  "during employment at nokia",
  "as part of work at nokia"
];

// Data/Resource access markers
const RESOURCE_PHRASES = [
  "nokia's internal",
  "nokia specialists",
  "nokia engineers",
  "nokia's live networks",
  "proprietary data from nokia",
  "nokia data"
];

// To exclude theses that mention Nokia only in a geographic context (e.g., "City of Nokia") or only in a technology context without indicating collaboration (e.g., "using Nokia technology").
const TECH_ONLY_PHRASES = [
  "using nokia technology",
  "using nokia technologies",
  "nokia technology",
  "nokia equipment",
  "nokia device",
  "nokia 5g equipment"
];

const GEOGRAPHY_PHRASES = [
  "city of nokia",
  "nokian kaupunki",
  "nokia municipality",
  "nokia region",
  "nokia province"
];

const OTHER_COMPANY_PHRASES = [
  "nokia tyres",
  "nokia renkkaat",
];

// Regex patterns
const ACKNOWLEDGEMENT_REGEX =
/thank(s| you)? .{0,40}nokia|grateful .{0,40}nokia|acknowledg(e|ement)?.{0,40}nokia/i;

const EMPLOYMENT_REGEX =
/(work(ed|ing)?|employee|employment|intern(ship)?|trainee).{0,20}nokia/i;

const PROXIMITY_COLLAB_REGEX =
/(collaboration|project|intern|trainee|commissioned|employment).{0,20}nokia|nokia.{0,20}(collaboration|project|intern|trainee|commissioned|employment)/i;

const RESOURCE_REGEX =
/nokia.{0,20}(data|dataset|measurement|trace|logs|network)/i;

const CASE_STUDY_REGEX =
/nokia.{0,20}case study|case study.{0,20}nokia/i;

const VENDOR_COMPARISON_REGEX =
/nokia (and|vs|versus|or) (ericsson|huawei|samsung)/i;

// Scoring constants
const SCORE = {
  NOKIA_MENTION: 1,
  // strong signals
  ENTITY: 8,
  COLLAB: 8,
  RESOURCE: 7,
  ACKNOWLEDGEMENT: 8,
  EMPLOYMENT: 8,
  CASE_STUDY: 8,

  // weaker signals
  PROXIMITY: 4,

  // negative signals
  TECH_NEGATIVE: -3,
  GEO_NEGATIVE: -5,
  OTHER_COMPANY: -6,
  VENDOR_NEGATIVE: -4
};

// Utility functions

// Normalize text by lowercasing and trimming whitespace
const normalize = (value) => String(value || "").toLowerCase().trim();

const toLabel = (score) => {
  if (score >= 8) return "NOKIA_COLLABORATION"; // 
  if (score >= 3) return "AMBIGUOUS"; 
  return "NO_INDICATION_OF_COLLABORATION"; // No indication that the thesis is connected to Nokia Corporation
};

const countPhraseMatches = (text, phrases) => {
  let matches = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) {
      matches += 1;
    }
  }
  return matches;
};

// Check if a word exists in the text as a whole word (not part of another word). For example, "nokia" should not match "nokian" or "nokiaville".
const hasWord = (text, word) => {
  const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${safeWord}\\b`, "i");
  return regex.test(text);
};

const containsNokia = (text) => hasWord(text, "nokia");

// Pick the most relevant text based on language.
const pickByLanguage = (value, lang) => {
  if (!value) return "";

  if (typeof value === "string") {
    return normalize(value);
  }

  if (Array.isArray(value)) {
    return normalize(value.join(" "));
  }

  if (typeof value === "object") {
    if (value[lang]) {
      return normalize(value[lang]);
    }
    // pick the first available language if the preferred language is not available. 
    const firstKey = Object.keys(value)[0];
    if (firstKey) {
      return normalize(value[firstKey]);
    } 
  }

  return "";
};

// Main scroring function
export const calculateNokiaCollaborationScoreByRules = (thesis, lang = "en") => {

  const title = normalize(thesis.title);
  const abstract = pickByLanguage(thesis.abstractByLanguage, lang);
  const combinedText = [title, abstract].filter(Boolean).join(" ");

  // early Nokia filter
  if (!containsNokia(combinedText)) {
    return {
      ruleScore: 0,
      ruleLabel: "NO_INDICATION_OF_COLLABORATION",
      ruleReasons: ["No Nokia mention"]
    };
  }

  let nokiaScore = 1;
  const reasons = ["Nokia mentioned"];

  // Entity detection
  const entityHits = countPhraseMatches(combinedText, NOKIA_ENTITIES);
  if (entityHits > 0) {
    nokiaScore += entityHits * SCORE.ENTITY;
    reasons.push(`Specific Nokia entity detected (${entityHits})`);
  }

  // Collaboration phrases
  const collaborationHits = countPhraseMatches(combinedText, COLLABORATION_PHRASES);
  if (collaborationHits > 0) {
    nokiaScore += collaborationHits * SCORE.COLLAB;
    reasons.push(`Explicit collaboration phrase (${collaborationHits})`);
  }

  // Resource access
  const resourceHits = countPhraseMatches(combinedText, RESOURCE_PHRASES);
  if (resourceHits > 0) {
    nokiaScore += resourceHits * SCORE.RESOURCE;
    reasons.push(`Nokia resource access (${resourceHits})`);
  }

  if (!resourceHits && RESOURCE_REGEX.test(combinedText)) {
    nokiaScore += SCORE.RESOURCE;
    reasons.push("Nokia resource proximity detected");
  }

  // Acknowledgement detection
  if (ACKNOWLEDGEMENT_REGEX.test(combinedText)) {
    nokiaScore += SCORE.ACKNOWLEDGEMENT;
    reasons.push("Acknowledgement of Nokia support detected");
  }

  // Employment detection
  if (EMPLOYMENT_REGEX.test(combinedText)) {
    nokiaScore += SCORE.EMPLOYMENT;
    reasons.push("Author employment or internship at Nokia detected");
  }

  // Case study detection
  if (CASE_STUDY_REGEX.test(combinedText)) {
    nokiaScore += SCORE.CASE_STUDY;
    reasons.push("Nokia identified as case company");
  }

  // Proximity collaboration
  if (!collaborationHits && !EMPLOYMENT_REGEX.test(combinedText) && PROXIMITY_COLLAB_REGEX.test(combinedText)) {
    nokiaScore += SCORE.PROXIMITY;
    reasons.push("Nokia collaboration proximity detected");
  }

  // Negative signals
  const techHits = countPhraseMatches(combinedText, TECH_ONLY_PHRASES);
  if (techHits > 0) {
    nokiaScore += techHits * SCORE.TECH_NEGATIVE;
    reasons.push("Technology reference without collaboration");
  }

  const geoHits = countPhraseMatches(combinedText, GEOGRAPHY_PHRASES);
  if (geoHits > 0) {
    nokiaScore += geoHits * SCORE.GEO_NEGATIVE;
    reasons.push("Geographic Nokia reference");
  }

  const otherHits = countPhraseMatches(combinedText, OTHER_COMPANY_PHRASES);
  if (otherHits > 0) {
    nokiaScore += otherHits * SCORE.OTHER_COMPANY;
    reasons.push("Different Nokia company (Tyres etc)");
  }

  if (VENDOR_COMPARISON_REGEX.test(combinedText)) {
    nokiaScore += SCORE.VENDOR_NEGATIVE;
    reasons.push("Vendor comparison context");
  }
  return {
    ruleScore: nokiaScore,
    ruleLabel: toLabel(nokiaScore),
    ruleReasons: reasons
  };
};

export { toLabel };
