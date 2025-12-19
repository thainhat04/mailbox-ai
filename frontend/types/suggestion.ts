export enum SuggestionType {
  SENDER = "sender",
  SUBJECT_KEYWORD = "subject_keyword",
}

export interface SuggestionItem {
  type: SuggestionType;
  value: string;
  label: string;
}

export interface SuggestionResponse {
  suggestions: SuggestionItem[];
  query: string;
}
