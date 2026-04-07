import type { LexiconData, NounEntry, QuizMode, VerbEntry } from '$lib/lexicon-types';

export interface QuizQuestion {
	id: string;
	mode: QuizMode;
	kicker: string;
	prompt: string;
	secondaryPrompt: string;
	answer: string;
	options: string[];
	details: string[];
}

export const quizModes: QuizMode[] = [
	'noun-de-to-ko',
	'noun-ko-to-de',
	'verb-to-form',
	'form-to-pronoun'
];

export const quizModeMeta: Record<
	QuizMode,
	{
		label: string;
	}
> = {
	'noun-de-to-ko': {
		label: '독일어 명사 -> 한국어 뜻'
	},
	'noun-ko-to-de': {
		label: '한국어 뜻 -> 독일어 명사'
	},
	'verb-to-form': {
		label: '동사 원형 -> 현재형 활용'
	},
	'form-to-pronoun': {
		label: '현재형 활용 -> 대명사'
	}
};

type NounCategory = 'general' | 'greeting' | 'adverb' | 'pronoun';

const GREETING_WORDS = new Set([
	'Guten Tag',
	'Auf Wiedersehen',
	'Hallo',
	'Tschüs',
	'Guten Abend',
	'vielen Dank',
	'auf Wiederhören',
	'willkommen',
	'Guten Morgen',
	'danke',
	'Gute Nacht',
	'Wie bitte',
	'Aha'
]);

const ADVERB_WORDS = new Set(['noch einmal', 'nicht', 'wie', 'woher', 'nur', 'ein bisschen']);

const PRONOUN_WORDS = new Set(['Sie', 'Wer', 'du', 'Was', 'ich']);

export function buildQuizCollections(lexicon: LexiconData): Record<QuizMode, QuizQuestion[]> {
	const nounEntries = lexicon.nouns.filter((noun) => noun.meanings.length > 0);

	return {
		'noun-de-to-ko': nounEntries.flatMap((noun) =>
			noun.meanings.map((meaning, index) => ({
				id: `noun-de-${noun.word}-${index}`,
				mode: 'noun-de-to-ko',
				kicker: '독일어 명사',
				prompt: noun.word,
				secondaryPrompt: '가장 가까운 한국어 뜻을 고르세요.',
				answer: meaning,
				options: buildMeaningOptions(noun, meaning, nounEntries),
				details: buildExampleDetails(noun.examples)
			}))
		),
		'noun-ko-to-de': nounEntries.flatMap((noun) =>
			noun.meanings.map((meaning, index) => ({
				id: `noun-ko-${noun.word}-${index}`,
				mode: 'noun-ko-to-de',
				kicker: '한국어 뜻',
				prompt: meaning,
				secondaryPrompt: '대응하는 독일어 명사를 고르세요.',
				answer: noun.word,
				options: buildWordOptions(noun, nounEntries),
				details: buildExampleDetails(noun.examples)
			}))
		),
		'verb-to-form': lexicon.verbs.flatMap((verb) =>
			Object.entries(verb.present).map(([pronoun, form]) => ({
				id: `verb-form-${verb.infinitive}-${pronoun}`,
				mode: 'verb-to-form',
				kicker: '현재 시제 활용',
				prompt: verb.infinitive,
				secondaryPrompt: `${pronoun}에 맞는 현재형을 고르세요.`,
				answer: form,
				options: buildOptions(form, uniqueStrings(Object.values(verb.present))),
					details: buildExampleDetails(verb.examples)
			}))
		),
		'form-to-pronoun': lexicon.verbs.flatMap((verb) => buildFormToPronounQuestions(verb))
	};
}

function buildFormToPronounQuestions(verb: VerbEntry): QuizQuestion[] {
	const pronouns = Object.keys(verb.present);
	const occurrenceByForm = new Map<string, number>();

	for (const form of Object.values(verb.present)) {
		occurrenceByForm.set(form, (occurrenceByForm.get(form) ?? 0) + 1);
	}

	return Object.entries(verb.present)
		.filter(([, form]) => occurrenceByForm.get(form) === 1)
		.map(([pronoun, form]) => ({
			id: `pronoun-${verb.infinitive}-${pronoun}`,
			mode: 'form-to-pronoun',
			kicker: '대명사 추론',
			prompt: form,
			secondaryPrompt: `${verb.infinitive}의 현재형에서 맞는 대명사를 고르세요.`,
			answer: pronoun,
			options: shuffle([...pronouns]),
			details: buildExampleDetails(verb.examples)
		}));
}

function buildOptions(answer: string, pool: string[], maxCount = 4): string[] {
	const distractors = shuffle(pool.filter((item) => item !== answer));
	return shuffle(uniqueStrings([answer, ...distractors]).slice(0, maxCount));
}

function buildMeaningOptions(source: NounEntry, answer: string, nouns: NounEntry[]): string[] {
	const strictCandidates = collectMeaningCandidates(source, nouns, true).filter(
		(candidate) => !isMeaningSimilar(answer, candidate)
	);
	const relaxedCandidates = collectMeaningCandidates(source, nouns, false).filter(
		(candidate) => !isMeaningSimilar(answer, candidate)
	);
	const fallbackCandidates = nouns
		.filter((noun) => noun.word !== source.word)
		.flatMap((noun) => noun.meanings)
		.filter((candidate) => candidate !== answer);

	return buildOptions(answer, [...strictCandidates, ...relaxedCandidates, ...fallbackCandidates]);
}

function buildWordOptions(source: NounEntry, nouns: NounEntry[]): string[] {
	const strictCandidates = nouns
		.filter((noun) => isDistinctNoun(source, noun, true))
		.map((noun) => noun.word);
	const relaxedCandidates = nouns
		.filter((noun) => isDistinctNoun(source, noun, false))
		.map((noun) => noun.word);
	const fallbackCandidates = nouns
		.filter((noun) => noun.word !== source.word)
		.map((noun) => noun.word);

	return buildOptions(source.word, [...strictCandidates, ...relaxedCandidates, ...fallbackCandidates]);
}

function collectMeaningCandidates(source: NounEntry, nouns: NounEntry[], strictCategory: boolean): string[] {
	return nouns
		.filter((noun) => isDistinctNoun(source, noun, strictCategory))
		.flatMap((noun) => noun.meanings)
		.filter((meaning) => !source.meanings.some((sourceMeaning) => isMeaningSimilar(sourceMeaning, meaning)));
}

function isDistinctNoun(source: NounEntry, candidate: NounEntry, strictCategory: boolean): boolean {
	if (candidate.word === source.word) {
		return false;
	}

	if (source.meanings.some((meaning) => candidate.meanings.some((candidateMeaning) => isMeaningSimilar(meaning, candidateMeaning)))) {
		return false;
	}

	if (!strictCategory) {
		return true;
	}

	const sourceCategory = categorizeNoun(source);
	const candidateCategory = categorizeNoun(candidate);

	if (sourceCategory === 'general') {
		return candidateCategory === 'general';
	}

	return candidateCategory !== sourceCategory;
}

function categorizeNoun(noun: NounEntry): NounCategory {
	if (GREETING_WORDS.has(noun.word)) {
		return 'greeting';
	}

	if (ADVERB_WORDS.has(noun.word)) {
		return 'adverb';
	}

	if (PRONOUN_WORDS.has(noun.word)) {
		return 'pronoun';
	}

	return 'general';
}

function isMeaningSimilar(left: string, right: string): boolean {
	const normalizedLeft = normalizeMeaning(left);
	const normalizedRight = normalizeMeaning(right);

	if (!normalizedLeft || !normalizedRight) {
		return false;
	}

	if (normalizedLeft === normalizedRight) {
		return true;
	}

	if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
		return true;
	}

	const leftTokens = new Set(extractMeaningTokens(normalizedLeft));
	const rightTokens = extractMeaningTokens(normalizedRight);

	return rightTokens.some((token) => leftTokens.has(token));
}

function normalizeMeaning(value: string): string {
	return value.replace(/[\s.,!?~()\[\]"'/:;-]+/g, '').toLowerCase();
}

function extractMeaningTokens(value: string): string[] {
	const tokens = new Set<string>();
	const chunks = value.match(/[가-힣]{2,}|[a-z]{2,}/g) ?? [];

	for (const chunk of chunks) {
		tokens.add(chunk);

		for (let index = 0; index < chunk.length - 1; index += 1) {
			tokens.add(chunk.slice(index, index + 2));
		}
	}

	return [...tokens];
}

function buildExampleDetails(examples: string[]): string[] {
	if (!examples[0]) {
		return [];
	}

	return [`예문: ${examples[0]}`];
}

function uniqueStrings(items: string[]): string[] {
	return [...new Set(items.filter((item) => item.trim().length > 0))];
}

function shuffle<T>(items: T[]): T[] {
	const cloned = [...items];

	for (let index = cloned.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const current = cloned[index];

		cloned[index] = cloned[swapIndex];
		cloned[swapIndex] = current;
	}

	return cloned;
}