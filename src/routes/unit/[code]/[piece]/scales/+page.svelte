<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);
	let completionCount = $state(0);
	let currentScale = $state<MelodyItem[]>([]);
	let isInitialized = $state(false);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let scaleVersion = $state(0); // Track scale changes

	const sharePreviewData = $derived({
		title: `Scales - ${piece.label} - ${unit.title}`,
		description: `Practice scales for ${piece.label}`,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		// Load completion count from localStorage
		const storage = getUnitStorage(code);
		const gameKey = `${pieceCode}_scales_completions`;
		completionCount = Number(storage[gameKey]) || 0;
	});

	function createNextScale() {
		const scale = piece.scale?.filter((s) => s.note != null) ?? [];
		if (scale.length === 0) {
			currentScale = [];
			return;
		}

		// Alternate between ascending and descending for variety
		const isAscending = Math.random() > 0.5;
		const sequence = isAscending ? scale : [...scale].reverse();

		// Deep copy to ensure reactivity
		currentScale = sequence.map((i) => ({ ...i }));
		scaleVersion += 1; // Increment to force effect to re-run
	}

	// Initialize first scale
	$effect(() => {
		if (!isInitialized && piece.scale && piece.scale.length > 0) {
			isInitialized = true;
			createNextScale();
		}
	});

	function handleScaleComplete() {
		// Increment completion count and save to localStorage
		completionCount += 1;
		const gameKey = `${pieceCode}_scales_completions`;
		setUnitStorage(code, { [gameKey]: completionCount });

		// Continue to next scale
		setTimeout(() => createNextScale(), 400);
	}
</script>

<SharePreview data={sharePreviewData} />

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-2 sm:px-4">
		<TitleWithIcon title="Scales" iconUrl={scalesIcon} />
		<div class="mb-4 text-center">
			<p class="text-lg text-slate-700">
				<span class="font-bold text-dark-blue">{completionCount} scales played!</span>
			</p>
		</div>
		<SightGame
			instrument={unit.instrument}
			keyNote={piece.key}
			mode={piece.mode}
			tempoBPM={piece.tracks?.fast?.tempo ?? 80}
			barLength={piece.barLength}
			melody={currentScale}
			onMelodyComplete={handleScaleComplete}
			practiceTempi={piece.practiceTempi}
		/>
	</div>
</div>
