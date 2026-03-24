type NokiaRelevanceLabel = "NOKIA_COLLABORATION" | "AMBIGUOUS" | "NO_INDICATION";

type ThesisAbstractByLanguage = Record<string, string>;

type Thesis = {
  title: string;
  author?: string;
  year?: string;
  publisher?: string;
  universityCode?: string;
  abstractByLanguage?: ThesisAbstractByLanguage;
  handle?: string;
  thesisId?: string;
}

type ScoredThesis = Thesis & {
  _nokiaScore: number;
  _nokiaRelevance: NokiaRelevanceLabel;
  _nokiaReasons: string[];
}

type ThesisSearchResult = {
  handle: string;
  thesisId: string;
  thesis: ScoredThesis;
}

export type {
  NokiaRelevanceLabel,
  ThesisAbstractByLanguage,
  Thesis,
  ScoredThesis,
  ThesisSearchResult
}