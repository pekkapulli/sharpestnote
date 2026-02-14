<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import melodyIcon from '$lib/assets/melody_icon.png';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);

	let hasKeyAccess = $state(false);
	let stage = $state<'scale-playing' | 'piece-playing' | 'piece-playing-muted'>('scale-playing');
	let currentMelody = $state<MelodyItem[]>([]);
	let melodyIndex = $state(0);
	let hasStarted = $state(false);
	let hasCompletedOnce = $state(false);
	const synthMode = $derived(stage === 'piece-playing-muted' ? 'mute' : 'medium');

	const melodyPool = $derived(piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? []);
	const scaleSequence = $derived(piece.scale?.filter((s) => s.note != null) ?? []);

	const sharePreviewData = $derived({
		title: `Teach me - ${piece.label} - ${unit.title}`,
		description: `Guided practice for ${piece.label}: scale first, then the piece`,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		void initUnitKeyAccess(unit).then((access) => {
			hasKeyAccess = access;
			if (!access) {
				stage = 'scale-playing';
				currentMelody = [];
				hasStarted = false;
				hasCompletedOnce = false;
				return;
			}

			if (!hasStarted) {
				hasStarted = true;
				startScale();
			}
		});
	});

	function startScale() {
		if (scaleSequence.length === 0) {
			startPiece();
			return;
		}

		currentMelody = scaleSequence.map((i) => ({ ...i }));
		stage = 'scale-playing';
	}

	function handleScaleComplete() {
		startPiece();
	}

	function createNextMelody() {
		const phrase = melodyPool[melodyIndex] ?? [];
		melodyIndex = (melodyIndex + 1) % melodyPool.length;
		currentMelody = phrase.map((i) => ({ ...i }));
	}

	function startPiece() {
		if (melodyPool.length === 0) {
			stage = 'piece-playing-muted';
			return;
		}

		melodyIndex = 0;
		createNextMelody();
		stage = hasCompletedOnce ? 'piece-playing-muted' : 'piece-playing';
	}

	function handlePieceComplete() {
		if (melodyPool.length === 0) {
			return;
		}

		if (melodyIndex === 0) {
			if (!hasCompletedOnce) {
				hasCompletedOnce = true;
				stage = 'piece-playing-muted';
				setTimeout(() => {
					if (hasKeyAccess) {
						melodyIndex = 0;
						createNextMelody();
					}
				}, 600);
				return;
			}
		}

		setTimeout(() => createNextMelody(), 400);
	}
</script>

<SharePreview data={sharePreviewData} />

{#if !hasKeyAccess}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-3xl px-4">
			<div class="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
				<h2 class="mb-4 text-2xl font-semibold text-slate-900">Access Required</h2>
				<p class="text-slate-700">
					The Teach me flow is available with full access. Get the sheet music pack to unlock all
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
			<TitleWithIcon title="Teach me this piece" iconUrl={melodyIcon} />

			{#if stage === 'scale-playing'}
				<div class="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
					<h2 class="text-xl font-semibold text-slate-900">Step 1: Play the scale</h2>
					<p class="mt-2 text-sm text-slate-700">
						We’ll start with the scale to set the key and finger patterns.
					</p>
					<p class="mt-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
						Keep playing — we’ll move on automatically.
					</p>
				</div>
			{/if}

			{#if stage === 'piece-playing'}
				<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-center">
					<h2 class="text-xl font-semibold text-slate-900">Step 2: Play the piece</h2>
					<p class="mt-2 text-sm text-slate-700">
						Nice! Now let’s go through the piece phrase by phrase.
					</p>
					<p class="mt-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
						We’ll guide you through each phrase.
					</p>
				</div>
			{/if}

			{#if stage === 'piece-playing-muted'}
				<div class="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
					<h2 class="text-xl font-semibold text-slate-900">Now you lead the melody</h2>
					<p class="mt-2 text-sm text-slate-700">
						We’ve muted the guide so you can play the piece on your own.
					</p>
					<p class="mt-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
						Keep going — we’ll loop the phrases.
					</p>
				</div>
			{/if}

			{#if currentMelody.length > 0}
				<SightGame
					instrument={unit.instrument}
					keyNote={piece.key}
					mode={piece.mode}
					tempoBPM={piece.tracks?.fast?.tempo ?? 80}
					barLength={piece.barLength}
					melody={currentMelody}
					onMelodyComplete={stage === 'scale-playing' ? handleScaleComplete : handlePieceComplete}
					{synthMode}
					showSynthToggle={false}
					practiceTempi={piece.practiceTempi}
				/>
			{/if}
		</div>
	</div>
{/if}
