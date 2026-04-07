export type QuizMode = 'noun-de-to-ko' | 'noun-ko-to-de' | 'verb-to-form' | 'form-to-pronoun';

export interface NounEntry {
	word: string;
	meanings: string[];
	examples: string[];
}

export interface VerbEntry {
	infinitive: string;
	meanings: string[];
	examples: string[];
	present: Record<string, string>;
	presentKey: string;
}

export interface LexiconData {
	nouns: NounEntry[];
	verbs: VerbEntry[];
	sourcePath: string;
}