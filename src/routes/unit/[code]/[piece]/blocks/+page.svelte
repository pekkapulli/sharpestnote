<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);
	let completionCount = $state(0);
	let currentBlock = $state<MelodyItem[]>([]);
	let isInitialized = $state(false);
	let blockVersion = $state(0); // Track block changes

	const sharePreviewData = $derived({
		title: `Blocks - ${piece.label} - ${unit.title}`,
		description: `Practice blocks game for ${piece.label}`,
		image: imageUrl,
		url: pageUrl
	});

	// Get the melody pool
	const melodyPool = $derived(piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? []);

	$effect(() => {
		// Load completion count from localStorage
		const storage = getUnitStorage(code);
		const gameKey = `${pieceCode}_blocks_completions`;
		completionCount = (storage as any)[gameKey] || 0;
	});

	function createNextBlock() {
		if (melodyPool.length === 0) {
			currentBlock = [];
			return;
		}

		console.log('[Blocks Page] Creating block');
		// Pick a random phrase from the pool
		const index = Math.floor(Math.random() * melodyPool.length);
		const phrase = melodyPool[index] ?? [];

		// Deep copy to ensure reactivity
		currentBlock = phrase.map((i) => ({ ...i }));
		blockVersion += 1; // Increment to force effect to re-run
		console.log(
			'[Blocks Page] New block created, length:',
			currentBlock.length,
			'version:',
			blockVersion,
			'pool index:',
			index
		);
	}

	// Initialize first block
	$effect(() => {
		if (!isInitialized && melodyPool.length > 0) {
			console.log('[Blocks Page] Initializing first block');
			isInitialized = true;
			createNextBlock();
		}
	});

	function handleBlockComplete() {
		console.log('[Blocks Page] Block complete');
		// Increment completion count and save to localStorage
		completionCount += 1;
		const gameKey = `${pieceCode}_blocks_completions`;
		setUnitStorage(code, { [gameKey]: completionCount } as any);

		// Continue to next block
		setTimeout(() => createNextBlock(), 400);
	}
</script>

<SharePreview data={sharePreviewData} />

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-2 sm:px-4">
		<TitleWithIcon title="Blocks" iconUrl={blocksIcon} />
		<div class="mb-4 text-center">
			<p class="text-lg text-slate-700">
				<span class="font-bold text-dark-blue">{completionCount} blocks played!</span>
			</p>
		</div>
		<SightGame
			instrument={unit.instrument}
			keyNote={piece.key}
			mode={piece.mode}
			tempoBPM={piece.tracks?.medium?.tempo ?? 80}
			barLength={piece.barLength}
			melody={currentBlock}
			onMelodyComplete={handleBlockComplete}
			practiceTempi={piece.practiceTempi}
		/>
	</div>
</div>
