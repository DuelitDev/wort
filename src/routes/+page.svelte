<script lang="ts">
	import { buildQuizCollections, quizModeMeta, quizModes, type QuizQuestion } from '$lib/quiz';
	import type { LexiconData, QuizMode } from '$lib/lexicon-types';

	interface Props {
		data: {
			lexicon: LexiconData;
			loadError: string | null;
		};
	}

	let { data }: Props = $props();

	const lexicon = $derived(data.lexicon);
	const loadError = $derived(data.loadError);
	const collections = $derived(buildQuizCollections(lexicon));
	const totalQuestionCount = $derived(
		quizModes.reduce((sum, mode) => sum + collections[mode].length, 0)
	);
	const firstAvailableMode = $derived(
		quizModes.find((mode) => collections[mode].length > 0) ?? quizModes[0]
	);
	const githubUrl = 'https://github.com/DuelitDev/wort';

	let activeMode = $state<QuizMode>(quizModes[0]);
	let currentQuestion = $state<QuizQuestion | null>(null);
	let selectedOption = $state<string | null>(null);

	const activeQuestions = $derived(collections[activeMode]);
	const isAnswered = $derived(selectedOption !== null);
	const isCorrect = $derived(
		selectedOption !== null && currentQuestion !== null && selectedOption === currentQuestion.answer
	);

	$effect(() => {
		if (!collections[activeMode].length) {
			activeMode = firstAvailableMode;
		}

		const currentQuestionId = currentQuestion?.id;
		const hasCurrentQuestion =
			currentQuestionId !== undefined &&
			collections[activeMode].some((question) => question.id === currentQuestionId);

		if (!hasCurrentQuestion) {
			currentQuestion = pickQuestion(activeMode);
			selectedOption = null;
		}
	});

	function pickQuestion(mode: QuizMode, previousId?: string): QuizQuestion | null {
		const questions = collections[mode];

		if (!questions.length) {
			return null;
		}

		const candidates =
			previousId && questions.length > 1
				? questions.filter((question) => question.id !== previousId)
				: questions;

		return candidates[Math.floor(Math.random() * candidates.length)] ?? questions[0];
	}

	function switchMode(mode: QuizMode): void {
		if (!collections[mode].length) {
			return;
		}

		activeMode = mode;
		currentQuestion = pickQuestion(mode);
		selectedOption = null;
	}

	function revealAnswer(option: string): void {
		if (selectedOption || !currentQuestion) {
			return;
		}

		selectedOption = option;
	}

	function nextQuestion(): void {
		currentQuestion = pickQuestion(activeMode, currentQuestion?.id);
		selectedOption = null;
	}

	function modeButtonClass(mode: QuizMode): string {
		const base = 'mode-pill btn border normal-case';

		if (activeMode === mode) {
			return `${base} btn-neutral border-neutral text-neutral-content`;
		}

		return `${base} btn-ghost border-base-300 bg-base-100/80 text-base-content hover:bg-base-100`;
	}

	function optionButtonClass(option: string): string {
		const base = 'option-button btn border normal-case';

		if (!currentQuestion) {
			return `${base} btn-disabled`;
		}

		if (!selectedOption) {
			return `${base} btn-outline border-base-300 bg-base-100/80 text-base-content hover:bg-base-100`;
		}

		if (option === currentQuestion.answer) {
			return `${base} btn-success border-success text-success-content`;
		}

		if (option === selectedOption) {
			return `${base} btn-error border-error text-error-content`;
		}

		return `${base} btn-disabled border-base-300 bg-base-200 text-base-content/60 opacity-70`;
	}
</script>

<svelte:head>
	<title>Wort | 독일어 단어 암기</title>
	<meta name="description" content="독일어 명사와 현재형 동사를 반복 학습하는 단어 암기 위젯" />
</svelte:head>

<div class="page-shell">
	<section class="hero-panel">
		<div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="eyebrow">Wort | DuelitDev</p>
				<h1 class="hero-title">독일어 단어 암기</h1>
			</div>
			<a class="btn btn-neutral rounded-2xl px-6 normal-case" href={githubUrl} target="_blank" rel="noreferrer">
				GitHub
			</a>
		</div>

		{#if loadError}
			<div class="alert alert-error mt-5 rounded-3xl">
				<span>{loadError}</span>
			</div>
		{/if}
	</section>

	<section class="surface-panel">
		<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div>
				<p class="eyebrow">Modes</p>
				<h2 class="text-3xl font-bold tracking-[-0.04em] text-base-content md:text-4xl">암기 위젯</h2>
			</div>
			<p class="muted-note max-w-xl">{totalQuestionCount}문항</p>
		</div>

		<div class="mode-grid">
			{#each quizModes as mode}
				<button
					type="button"
					class={modeButtonClass(mode)}
					onclick={() => switchMode(mode)}
					disabled={!collections[mode].length}
				>
					<span class="mode-label">{quizModeMeta[mode].label}</span>
					<span class="mode-copy">{collections[mode].length}문항</span>
				</button>
			{/each}
		</div>
	</section>

	{#if totalQuestionCount === 0}
		<section class="surface-panel">
			<div class="empty-state flex flex-col gap-4 text-base-content">
				<p class="eyebrow">No Questions</p>
				<h2 class="text-3xl font-bold tracking-[-0.04em]">표시할 문제 데이터가 없습니다</h2>
			</div>
		</section>
	{:else if currentQuestion}
		<section class="surface-panel">
			<div class="question-stack">
				<div class="question-main flex flex-col gap-6">
					<div>
						<p class="question-kicker">{currentQuestion.kicker}</p>
						<h2 class="question-title">{currentQuestion.prompt}</h2>
						<p class="question-copy">{currentQuestion.secondaryPrompt}</p>
					</div>

					<div class="option-grid">
						{#each currentQuestion.options as option}
							<button
								type="button"
								class={optionButtonClass(option)}
								onclick={() => revealAnswer(option)}
							>
								{option}
							</button>
						{/each}
					</div>

					<div class="flex flex-col gap-3 border-t border-base-300/80 pt-5 md:flex-row md:items-center md:justify-between">
						<p class="muted-note m-0">현재 모드 문항 수: {activeQuestions.length}</p>
						<button type="button" class="btn btn-secondary rounded-2xl px-6 normal-case" onclick={nextQuestion}>
							다음 문제
						</button>
					</div>
				</div>

				<div class="question-side flex flex-col gap-4">
					<div class={`feedback-panel ${isAnswered ? (isCorrect ? 'feedback-correct' : 'feedback-wrong') : ''}`}>
						{#if isAnswered}
							<strong>{isCorrect ? '정답입니다.' : `정답은 ${currentQuestion.answer} 입니다.`}</strong>
						{:else}
							<strong>아직 선택하지 않았습니다.</strong>
						{/if}

						{#if currentQuestion.details.length > 0}
							<ul>
								{#each currentQuestion.details as detail}
									<li>{detail}</li>
								{/each}
							</ul>
						{/if}
                        </div>
				</div>
			</div>
		</section>
	{/if}
</div>
