import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { parse } from 'smol-toml';

import type { LexiconData, NounEntry, VerbEntry } from '$lib/lexicon-types';

const SOURCE_PATH = resolve(process.cwd(), 'data/words.toml');
const METADATA_KEYS = new Set(['example', 'examples', 'means', 'meanings', 'word', 'value', 'text']);
const PRESENT_ALIASES = new Set(['present', 'prasens', 'präsens', 'current', 'now']);

let cachedLexicon: Promise<LexiconData> | null = null;

type UnknownRecord = Record<string, unknown>;

export function getLexicon(): Promise<LexiconData> {
	if (!cachedLexicon) {
		cachedLexicon = loadLexicon();
	}

	return cachedLexicon;
}

async function loadLexicon(): Promise<LexiconData> {
	const rawText = await readFile(SOURCE_PATH, 'utf8');
	const parsed = parse(rawText);
	const root = isRecord(parsed) ? parsed : {};
	const nouns = normalizeNouns(root.noun);
	const verbs = normalizeVerbs(root.verb);

	return {
		nouns,
		verbs,
		sourcePath: relative(process.cwd(), SOURCE_PATH) || 'data/words.toml'
	};
}

function normalizeNouns(raw: unknown): NounEntry[] {
	if (!isRecord(raw)) {
		return [];
	}

	return Object.entries(raw)
		.flatMap(([fallbackWord, value]) => {
			if (typeof value === 'string') {
				return [
					{
						word: value,
						meanings: [],
						examples: []
					}
				];
			}

			if (!isRecord(value)) {
				return [];
			}

			return [
				{
					word: readStringField(value, ['word', 'value', 'text']) ?? fallbackWord,
					meanings: readStringArrayField(value, ['means', 'meanings']),
					examples: readStringArrayField(value, ['example', 'examples'])
				}
			];
		})
		.sort((left, right) => left.word.localeCompare(right.word, 'de'));
}

function normalizeVerbs(raw: unknown): VerbEntry[] {
	if (!isRecord(raw)) {
		return [];
	}

	return Object.entries(raw)
		.flatMap(([fallbackInfinitive, value]) => {
			if (!isRecord(value)) {
				return [];
			}

			const presentInfo = resolvePresent(value);

			if (!presentInfo) {
				return [];
			}

			return [
				{
					infinitive: readStringField(value, ['word', 'value', 'text']) ?? fallbackInfinitive,
					meanings: readStringArrayField(value, ['means', 'meanings']),
					examples: readStringArrayField(value, ['example', 'examples']),
					present: presentInfo.forms,
					presentKey: presentInfo.key
				}
			];
		})
		.sort((left, right) => left.infinitive.localeCompare(right.infinitive, 'de'));
}

function resolvePresent(entry: UnknownRecord): { key: string; forms: Record<string, string> } | null {
	const tenseEntries = Object.entries(entry).flatMap(([key, value]) => {
		if (METADATA_KEYS.has(key) || !isRecord(value)) {
			return [];
		}

		return [{ key, value }];
	});

	if (!tenseEntries.length) {
		return null;
	}

	const preferredEntry =
		tenseEntries.find(({ key }) => PRESENT_ALIASES.has(normalizeKey(key))) ??
		(tenseEntries.length === 1 ? tenseEntries[0] : null);

	if (!preferredEntry) {
		return null;
	}

	const { key, value } = preferredEntry;
	const forms = Object.fromEntries(
		Object.entries(value).filter(([, form]) => typeof form === 'string')
	) as Record<string, string>;

	return Object.keys(forms).length ? { key, forms } : null;
}

function readStringField(record: UnknownRecord, keys: string[]): string | null {
	for (const key of keys) {
		const value = record[key];

		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}

	return null;
}

function readStringArrayField(record: UnknownRecord, keys: string[]): string[] {
	for (const key of keys) {
		const value = record[key];

		if (Array.isArray(value)) {
			return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
		}
	}

	return [];
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeKey(value: string): string {
	return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}