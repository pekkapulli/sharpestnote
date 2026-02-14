<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import stepsIcon from '$lib/assets/steps_icon.png';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);
	let completionCount = $state(0);
	let currentStep = $state<MelodyItem[]>([]);
	let isInitialized = $state(false);
	let stepVersion = $state(0); // Track step changes

	const sharePreviewData = $derived({
		title: `Steps - ${piece.label} - ${unit.title}`,
		description: `Practice steps for ${piece.label}`,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		// Load completion count from localStorage
		const storage = getUnitStorage(code);
		const gameKey = `${pieceCode}_steps_completions`;
		completionCount = (storage as any)[gameKey] || 0;
	});

	// Extract unique intervals once when the page loads
	const intervals = $derived.by(() => {
		// Flatten all melodies into one continuous array of notes
		const allNotes = (piece.melody ?? [])
			.filter((m) => Array.isArray(m) && m.length > 0)
			.flat()
			.filter((item) => item.note != null);

		if (allNotes.length < 2) return [];

		const intervalSet = new Set<string>();
		// Go through consecutive pairs in the flattened melody
		for (let i = 0; i < allNotes.length - 1; i++) {
			const note1 = allNotes[i]?.note;
			const note2 = allNotes[i + 1]?.note;
			// Skip intervals where both notes are the same
			if (note1 && note2 && note1 !== note2) {
				intervalSet.add(`${note1}|${note2}`);
			}
		}

		return Array.from(intervalSet);
	});

	function createNextStep() {
		if (intervals.length === 0) {
			currentStep = [];
			return;
		}

		console.log('[Steps Page] Creating step');
		// Pick a random interval and create a two-note melody
		const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
		const [note1, note2] = randomInterval.split('|');

		// Deep copy to ensure reactivity
		currentStep = [
			{ note: note1, length: 4 },
			{ note: note2, length: 4 }
		];
		stepVersion += 1; // Increment to force effect to re-run
		console.log(
			'[Steps Page] New step created, length:',
			currentStep.length,
			'version:',
			stepVersion,
			'interval:',
			`${note1} → ${note2}`
		);
	}

	// Initialize first step
	$effect(() => {
		if (!isInitialized && intervals.length > 0) {
			console.log('[Steps Page] Initializing first step');
			isInitialized = true;
			createNextStep();
		}
	});

	function handleStepComplete() {
		console.log('[Steps Page] Step complete');
		// Increment completion count and save to localStorage
		completionCount += 1;
		const gameKey = `${pieceCode}_steps_completions`;
		setUnitStorage(code, { [gameKey]: completionCount } as any);

		// Continue to next step
		setTimeout(() => createNextStep(), 400);
	}
</script>

<SharePreview data={sharePreviewData} />

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-2 sm:px-4">
		<TitleWithIcon title="Steps" iconUrl={stepsIcon} />
		<div class="mb-4 text-center">
			<p class="text-lg text-slate-700">
				<span class="font-bold text-dark-blue">{completionCount} steps played!</span>
			</p>
		</div>
		<SightGame
			instrument={unit.instrument}
			keyNote={piece.key}
			mode={piece.mode}
			tempoBPM={piece.tracks?.fast?.tempo ?? 80}
			barLength={piece.barLength}
			melody={currentStep}
			onMelodyComplete={handleStepComplete}
			practiceTempi={piece.practiceTempi}
		/>
	</div>
</div>
