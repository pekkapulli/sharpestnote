<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';
	import type { MelodyItem } from '$lib/config/melody';
	import melodyIcon from '$lib/assets/melody_icon.png';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);
	let hasKeyAccess = $state(false);
	let melodyIndex = $state(0);
	let completionCount = $state(0);
	let showCompletionModal = $state(false);
	let currentMelody = $state<MelodyItem[]>([]);
	let isInitialized = $state(false);
	let melodyVersion = $state(0); // Track melody changes

	// Get the total number of melodies in the piece
	const melodyPool = $derived(piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? []);
	const totalMelodies = $derived(melodyPool.length);

	const sharePreviewData = $derived({
		title: `Melody - ${piece.label} - ${unit.title}`,
		description: `Practice melody for ${piece.label}`,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		// Initialize key access from URL or localStorage
		void initUnitKeyAccess(unit).then((access) => {
			console.log('[Melody Page] Key access:', access);
			hasKeyAccess = access;
		});
	});

	$effect(() => {
		// Load completion count from localStorage
		const storage = getUnitStorage(code);
		const gameKey = `${pieceCode}_melody_completions`;
		completionCount = (storage as any)[gameKey] || 0;
	});

	function hasOnlyNullNotes(phrase: MelodyItem[]): boolean {
		return phrase.every((item) => item.note === null);
	}

	function createNextMelody() {
		const pool = piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? [];
		if (pool.length === 0) {
			currentMelody = [];
			return;
		}

		console.log('[Melody Page] Creating melody at index:', melodyIndex);

		// Find the next phrase with at least one non-null note
		let phrase = pool[melodyIndex] ?? [];
		let startIndex = melodyIndex;

		while (hasOnlyNullNotes(phrase)) {
			melodyIndex = (melodyIndex + 1) % pool.length;
			phrase = pool[melodyIndex] ?? [];

			// Prevent infinite loop if all phrases have only null notes
			if (melodyIndex === startIndex) {
				currentMelody = [];
				return;
			}
		}

		melodyIndex = (melodyIndex + 1) % pool.length;

		// Deep copy to ensure reactivity when the same phrase repeats
		currentMelody = phrase.map((i) => ({ ...i }));
		melodyVersion += 1; // Increment to force effect to re-run
		console.log(
			'[Melody Page] New melody created, length:',
			currentMelody.length,
			'version:',
			melodyVersion,
			'next index will be:',
			melodyIndex
		);
	}

	// Initialize first melody
	$effect(() => {
		if (hasKeyAccess && !isInitialized && melodyPool.length > 0) {
			console.log('[Melody Page] Initializing first melody');
			isInitialized = true;
			createNextMelody();
		}
	});

	function handleMelodyComplete() {
		console.log(
			'[Melody Page] Melody complete. Current melodyIndex:',
			melodyIndex,
			'totalMelodies:',
			totalMelodies
		);
		// Check if all melodies in the piece have been completed
		// melodyIndex wraps to 0 when all melodies are done
		if (melodyIndex === 0 && totalMelodies > 0) {
			// All melodies completed! Increment completion count and save to localStorage
			console.log('[Melody Page] All melodies completed!');
			completionCount += 1;
			const gameKey = `${pieceCode}_melody_completions`;
			setUnitStorage(code, { [gameKey]: completionCount } as any);

			// TODO: Show completion modal (temporarily disabled to allow continuous practice)
			// showCompletionModal = true;

			// Continue to next melody instead
			console.log('[Melody Page] Continuing to next melody in 400ms');
			setTimeout(() => createNextMelody(), 400);
		} else {
			// Continue to next melody
			console.log('[Melody Page] Continuing to next melody in 400ms');
			setTimeout(() => createNextMelody(), 400);
		}
	}

	function handleModalClose() {
		showCompletionModal = false;
		// Create next melody after modal closes
		setTimeout(() => createNextMelody(), 100);
	}
</script>

<SharePreview data={sharePreviewData} />

{#if !hasKeyAccess}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-3xl px-4">
			<div class="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
				<h2 class="mb-4 text-2xl font-semibold text-slate-900">Access Required</h2>
				<p class="text-slate-700">
					The Melody game is only available with full access. Get the sheet music pack to unlock all
					features.
				</p>
				<div class="mt-4">
					<LinkButton href={`/unit/${code}`}>Get the sheet music or enter your code.</LinkButton>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-5xl px-2 sm:px-4">
			<TitleWithIcon title="Melody" iconUrl={melodyIcon} />
			<div class="mb-4 text-center">
				<p class="text-lg text-slate-700">
					<span class="font-bold text-dark-blue">You've played {completionCount} times!</span>
				</p>
			</div>
			<SightGame
				instrument={unit.instrument}
				keyNote={piece.key}
				mode={piece.mode}
				tempoBPM={piece.tracks?.fast?.tempo ?? 80}
				barLength={piece.barLength}
				melody={currentMelody}
				onMelodyComplete={handleMelodyComplete}
				practiceTempi={piece.practiceTempi}
			/>
		</div>

		<!-- Completion Modal -->
		<Modal
			isOpen={showCompletionModal}
			onClose={handleModalClose}
			title="Well Done!"
			icon={melodyIcon}
			maxWidth="md"
		>
			{#snippet children()}
				<div class="text-center">
					<p class="mb-4 text-lg text-slate-700">You completed the melody from start to finish!</p>
					<div class="mb-4 rounded-lg bg-white p-6 shadow-sm">
						<p class="mb-0 text-4xl font-bold text-dark-blue">{completionCount}</p>
						<p class="mt-0 text-sm text-slate-600">Times completed</p>
					</div>
					<p class="mt-4 text-sm text-slate-600">Keep practicing to master the tune!</p>
				</div>
			{/snippet}

			{#snippet actions()}
				<button
					onclick={handleModalClose}
					class="rounded-lg bg-dark-blue px-6 py-3 font-semibold text-white transition hover:-translate-y-px hover:shadow-lg"
				>
					Continue
				</button>
			{/snippet}
		</Modal>
	</div>
{/if}
