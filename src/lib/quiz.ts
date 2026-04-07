import type { LexiconData, QuizMode, VerbEntry } from '$lib/lexicon-types';

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

export function buildQuizCollections(lexicon: LexiconData): Record<QuizMode, QuizQuestion[]> {
	const allMeanings = uniqueStrings(lexicon.nouns.flatMap((noun) => noun.meanings));
	const allNouns = uniqueStrings(lexicon.nouns.map((noun) => noun.word));

	return {
		'noun-de-to-ko': lexicon.nouns.flatMap((noun) =>
			noun.meanings.map((meaning, index) => ({
				id: `noun-de-${noun.word}-${index}`,
				mode: 'noun-de-to-ko',
				kicker: '독일어 명사',
				prompt: noun.word,
				secondaryPrompt: '가장 가까운 한국어 뜻을 고르세요.',
				answer: meaning,
				options: buildOptions(meaning, allMeanings),
					details: buildExampleDetails(noun.examples)
			}))
		),
		'noun-ko-to-de': lexicon.nouns.flatMap((noun) =>
			noun.meanings.map((meaning, index) => ({
				id: `noun-ko-${noun.word}-${index}`,
				mode: 'noun-ko-to-de',
				kicker: '한국어 뜻',
				prompt: meaning,
				secondaryPrompt: '대응하는 독일어 명사를 고르세요.',
				answer: noun.word,
				options: buildOptions(noun.word, allNouns),
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