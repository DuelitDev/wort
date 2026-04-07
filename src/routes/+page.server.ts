import { getLexicon } from '$lib/server/lexicon';
import type { LexiconData } from '$lib/lexicon-types';

function emptyLexicon(): LexiconData {
	return {
		nouns: [],
		verbs: [],
		sourcePath: 'data/words.toml'
	};
}

export const load = async () => {
	try {
		return {
			lexicon: await getLexicon(),
			loadError: null
		};
	} catch (error) {
		return {
			lexicon: emptyLexicon(),
			loadError:
				error instanceof Error
					? `TOML 로딩 실패: ${error.message}`
					: 'TOML 로딩 실패: 알 수 없는 오류'
		};
	}
};