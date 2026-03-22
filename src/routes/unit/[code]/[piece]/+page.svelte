<script lang="ts">
	import KeyEntry from '$lib/components/ui/KeyEntry.svelte';
	import TeachMeCard from '$lib/components/ui/TeachMeCard.svelte';
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
	import melodyIcon from '$lib/assets/melody_icon.png';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import stepsIcon from '$lib/assets/steps_icon.png';
	import defendIcon from '$lib/assets/defend_icon.png';
	import GameCard from '$lib/components/games/GameCard.svelte';
	import GameCardGrid from '$lib/components/games/GameCardGrid.svelte';
	import PracticeCalendar from '$lib/components/ui/PracticeCalendar.svelte';
	import { getUnitStorage } from '$lib/util/unitStorage.svelte';
	import { recordPracticeSession } from '$lib/util/practiceCalendarStorage.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { resolve } from '$app/paths';
	import type { Speed } from '$lib/config/types';
	import Staff from '$lib/components/music/Staff.svelte';
	import ExpandablePreview from '$lib/components/ui/ExpandablePreview.svelte';
	import { instrumentMap } from '$lib/config/instruments';
	import { getTransposedKeySignature } from '$lib/config/keys';
	import { splitPhrasesToDisplayBars } from '$lib/components/music/vexflowHelper';

	const { data } = $props();
	const {
		piece,
		code,
		pieceCode,
		previousPiece,
		nextPiece,
		unit,
		imageUrl,
		pageUrl,
		teacherNote,
		isCustomPiece
	} = $derived(data);
	const trimmedTeacherNote = $derived((teacherNote ?? '').trim());
	let hasKeyAccess = $state(false);
	const sheetMusicCta = $derived(`/unit/${unit.gumroadUrl}`);
	let badgeTexts = $state<Record<string, string | undefined>>({});
	let showSuccessMessage = $state(false);
	let teachComplete = $state(false);

	// Staff preview setup
	const instrument = $derived(instrumentMap[unit.instrument]);
	const keySignature = $derived(
		getTransposedKeySignature(piece.key, piece.mode, instrument?.transpositionSemitones ?? 0)
	);
	const staffBars = $derived(splitPhrasesToDisplayBars(piece.melody ?? [], piece.barLength));
	const showFullStaff = $derived(hasKeyAccess || isCustomPiece);

	const gameCards = [
		{
			slug: 'melody',
			title: 'Melody',
			description: 'Play through the piece',
			icon: melodyIcon,
			requiresAccess: true
		},
		{
			slug: 'blocks',
			title: 'Blocks',
			description: 'Practice random phrases',
			icon: blocksIcon,
			requiresAccess: true
		},
		{
			slug: 'scales',
			title: 'Scales',
			description: 'Climb up and down the scale',
			icon: scalesIcon,
			requiresAccess: false
		},
		{
			slug: 'steps',
			title: 'Steps',
			description: 'Play note pairs',
			icon: stepsIcon,
			requiresAccess: false
		},
		{
			slug: 'defend',
			title: 'Defend',
			description: "Use the piece's notes to defend against space monsters",
			icon: defendIcon,
			requiresAccess: true
		}
	];

	const visibleGameCards = $derived(
		gameCards
			.filter((game) => {
				// For practice pieces, only show melody and blocks
				if (piece.practice) {
					return game.slug === 'melody' || game.slug === 'blocks';
				}
				return true;
			})
			.map((game) => ({
				...game,
				locked: game.requiresAccess && !hasKeyAccess
			}))
			.sort((a, b) => Number(a.locked) - Number(b.locked))
	);

	const sharePreviewData = $derived({
		title: `${piece.label} - ${unit.title}`,
		description: unit.description,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		// Initialize key access from URL or localStorage
		void initUnitKeyAccess(unit).then((access) => {
			hasKeyAccess = access;
		});
	});

	$effect(() => {
		const storage = getUnitStorage(code) as Record<string, number>;
		const melodyCompletions = storage[`${pieceCode}_melody_completions`] || 0;
		const blocksCompletions = storage[`${pieceCode}_blocks_completions`] || 0;
		const scalesCompletions = storage[`${pieceCode}_scales_completions`] || 0;
		const stepsCompletions = storage[`${pieceCode}_steps_completions`] || 0;
		const highScore = storage[`${pieceCode}_defend_highScore`] || 0;
		const teachMuteCompleteValue = storage[`${pieceCode}_teach_mute_complete`] || 0;

		teachComplete = Boolean(teachMuteCompleteValue);

		badgeTexts = {
			melody: melodyCompletions > 0 ? `${melodyCompletions}×` : undefined,
			blocks: blocksCompletions > 0 ? `${blocksCompletions}×` : undefined,
			scales: scalesCompletions > 0 ? `${scalesCompletions}×` : undefined,
			steps: stepsCompletions > 0 ? `${stepsCompletions}×` : undefined,
			defend: highScore > 0 ? `${highScore} pts` : undefined
		};
	});

	function handleKeySuccess() {
		hasKeyAccess = true;
		showSuccessMessage = true;
	}

	function handleAudioTrackComplete(event: { track: 'full' | 'backing'; speed: Speed }) {
		recordPracticeSession({
			unitCode: code,
			unitName: unit.title,
			pieceCode,
			pieceName: piece.label,
			gameCode: 'audio-practice',
			gameName: `Audio practice (${event.speed})`
		});
	}
</script>

<SharePreview data={sharePreviewData} />

<div class="min-h-screen bg-off-white px-4 py-8">
	<div class="mx-auto w-full max-w-3xl">
		<article class="rounded-2xl bg-white p-8 shadow-md">
			<div class="mb-8 flex flex-col gap-4 xs:flex-row xs:gap-6">
				<img
					src={imageUrl}
					alt={`${unit.title} cover art`}
					class="h-full w-full shrink-0 rounded-lg object-cover xs:mt-2 xs:h-16 xs:w-16"
				/>
				<div>
					<h1 class="text-2xl font-semibold text-slate-900 md:text-3xl">{piece.label}</h1>
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
						From {unit.title}
					</p>
				</div>
			</div>

			{#if showSuccessMessage}
				<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
					<p class="text-sm font-semibold text-emerald-800">✓ Access unlocked!</p>
					<p class="mt-1 text-sm text-emerald-700">
						You can now access all the content for this unit.
					</p>
				</div>
			{/if}

			{#if !hasKeyAccess}
				<div class="mt-6">
					<KeyEntry unitCode={unit.code} onSuccess={handleKeySuccess} purchaseUrl={sheetMusicCta} />
				</div>
			{/if}

			{#if staffBars.length > 0 && showFullStaff}
				<section class="mt-6">
					<ExpandablePreview expandLabel="Show full piece" collapseLabel="Hide piece">
						<Staff
							bars={staffBars}
							clef={instrument?.clef ?? 'treble'}
							{keySignature}
							barLength={piece.barLength}
							showAllBlack
							singleRow={false}
						/>
					</ExpandablePreview>
				</section>
			{/if}

			{#if !piece.practice}
				<TeachMeCard
					pieceLabel={piece.label}
					unitCode={code}
					{pieceCode}
					{hasKeyAccess}
					{sheetMusicCta}
					{teachComplete}
				/>
			{/if}

			{#if trimmedTeacherNote}
				<section class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Teacher note</p>
					<p class="mt-2 text-sm text-slate-700">{trimmedTeacherNote}</p>
				</section>
			{/if}

			{#if piece.tracks && Object.values(piece.tracks).length > 0}
				<AudioPlayer
					{unit}
					{piece}
					{hasKeyAccess}
					{teachComplete}
					onTrackComplete={handleAudioTrackComplete}
				/>
			{/if}

			<section class="mt-8">
				<PracticeCalendar title="Recent practice" unitCode={code} {pieceCode} />
			</section>

			<nav aria-label="Piece navigation" class="mt-8 flex justify-between">
				{#if previousPiece}
					<a
						href={resolve(`/unit/${code}/${previousPiece.code}`)}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						← {previousPiece.label}
					</a>
				{:else}
					<div></div>
				{/if}

				{#if nextPiece}
					<a
						href={resolve(`/unit/${code}/${nextPiece.code}`)}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						{nextPiece.label} →
					</a>
				{/if}
			</nav>

			<section class="mt-8">
				<h3 class="text-sm font-semibold text-slate-800">Learn through games</h3>
				<GameCardGrid>
					{#each visibleGameCards as game (game.slug)}
						<GameCard
							to={`/unit/${code}/${pieceCode}/${game.slug}`}
							icon={game.icon}
							title={game.title}
							description={game.description}
							badgeText={badgeTexts[game.slug]}
							disabled={game.locked}
						/>
					{/each}
				</GameCardGrid>
			</section>
		</article>
	</div>
</div>
