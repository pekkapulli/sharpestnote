<script lang="ts">
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { onMount } from 'svelte';
	import { instrumentMap } from '$lib/config/instruments';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';
	import { getKeySignature } from '$lib/config/keys.js';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import defendIcon from '$lib/assets/defend_icon.png';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess.js';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import StringRacerGame from '$lib/games/stringRacer/StringRacerGame.svelte';

	const { data } = $props();
	const { unit, piece, code, pieceCode, imageUrl, pageUrl } = $derived(data);

	let hasKeyAccess = $state(false);

	$effect(() => {
		// Initialize key access from URL or localStorage
		void initUnitKeyAccess(unit).then((access) => {
			hasKeyAccess = access;
		});
	});

	const tuner = createTuner({
		// svelte-ignore state_referenced_locally
		instrument: unit.instrument
	});

	async function startListening() {
		try {
			if (tuner.state.needsUserGesture) {
				await tuner.resumeAfterGesture();
			} else {
				await tuner.start();
			}
		} catch (err) {
			console.error('[Defend] Failed to start listening:', err);
		}
	}
	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
	}

	const sharePreviewData = $derived({
		title: `Rails - ${piece.label} - ${unit.title}`,
		description: `Practice open strings on Rails`,
		image: imageUrl,
		url: pageUrl
	});
</script>

<SharePreview data={sharePreviewData} />

{#if !hasKeyAccess}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-3xl px-4">
			<div class="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
				<h2 class="mb-4 text-2xl font-semibold text-slate-900">Access Required</h2>
				<p class="text-slate-700">
					The Rails game is only available with full access. Get the sheet music pack to unlock all
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
			<div class="flex flex-col items-center">
				<StringRacerGame instrument={unit.instrument} />
			</div>
		</div>
	</div>
{/if}
