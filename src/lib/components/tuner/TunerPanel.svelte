<script lang="ts">
	import type { InstrumentId } from '$lib/config/types';
	import { instrumentMap } from '$lib/config/instruments';
	import { noteNameToMidi } from '$lib/synth/noteUtils';
	import { vexFlowToDisplay } from '$lib/util/noteConverter';
	import { centsOff, frequencyFromNoteNumber } from '$lib/tuner/tune';

	interface Props {
		fullPage?: boolean;
		compact?: boolean;
		showHeader?: boolean;
		eyebrow?: string | null;
		title?: string;
		description?: string | null;
		note?: string | null;
		frequency?: number | null;
		cents?: number | null;
		instrument?: InstrumentId | null;
	}

	let {
		fullPage = true,
		compact = false,
		showHeader = true,
		eyebrow,
		title,
		description,
		note = null,
		frequency = null,
		cents = null,
		instrument = null
	}: Props = $props();

	// Interpolated cents value for smooth needle movement
	let interpolatedCents = $state<number>(0);

	// Arc window configuration
	const arcOuterRadius = 60;
	const arcInnerRadius = 30;
	const markerStartRadius = 50;
	const markerEndRadius = 57;
	const labelRadius = 42;
	const needlePadding = 5;
	const pivotY = 10;

	$effect(() => {
		const targetCents = cents ?? 0;
		let animationFrameId: number;

		const animate = () => {
			const smoothing = 0.2;
			const diff = targetCents - interpolatedCents;

			if (Math.abs(diff) > 0.01) {
				interpolatedCents += diff * smoothing;
				animationFrameId = requestAnimationFrame(animate);
			} else {
				interpolatedCents = targetCents;
			}
		};

		animationFrameId = requestAnimationFrame(animate);

		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	// const formatHz = (value: number | null) => (value ? value.toFixed(1) : '--');
	// const formatCents = (value: number | null) => {
	// 	if (value === null) return '--';
	// 	const sign = value > 0 ? '+' : value < 0 ? '-' : '';
	// 	return `${sign}${Math.abs(value)} cents`;
	// };

	/**
	 * Calculate X and Y coordinates based on angle and distance
	 * @param angle - Angle in degrees (-30 to 30), where 0 is pointing up
	 * @param distance - Distance from origin
	 * @returns Object with x and y coordinates
	 */
	function polarToCartesian(angle: number, distance: number): { x: number; y: number } {
		// Convert angle to radians and adjust so 0° points up (subtract 90°)
		const radians = ((angle - 90) * Math.PI) / 180;
		return {
			x: distance * Math.cos(radians),
			y: distance * Math.sin(radians)
		};
	}

	/**
	 * Get the needle angle based on cents value
	 * Maps -infinity to +infinity cents to -35° to +35° angle
	 * Clamps at ±35° for extreme deviations
	 */
	function getNeedleAngle(cents: number | null): number {
		if (cents === null) return 0;
		// Clamp cents to -50 to +50 range for display
		const clampedCents = Math.max(-50, Math.min(50, cents));
		// Map -50..50 to -35..35
		return (clampedCents / 50) * 35;
	}

	/**
	 * Create an arc path between two angles
	 */
	function createArcPath(radius: number, startAngle: number, endAngle: number): string {
		const start = polarToCartesian(startAngle, radius);
		const end = polarToCartesian(endAngle, radius);
		const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
		return `M ${start.x} ${start.y + pivotY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y + pivotY}`;
	}

	/**
	 * Find the closest string to the detected note
	 */
	function getClosestString(noteName: string | null, strings: string[]): string | null {
		if (!noteName) return null;
		const noteMidi = noteNameToMidi(noteName);
		if (noteMidi === null) return null;

		let closestString: string | null = null;
		let minDistance = Infinity;

		for (const stringNote of strings) {
			const stringMidi = noteNameToMidi(stringNote);
			if (stringMidi === null) continue;

			const distance = Math.abs(noteMidi - stringMidi);
			if (distance < minDistance) {
				minDistance = distance;
				closestString = stringNote;
			}
		}

		return closestString;
	}
</script>

<div class={fullPage ? 'min-h-screen bg-off-white py-12' : 'bg-transparent'}>
	<div
		class={fullPage
			? 'mx-auto flex w-full max-w-3xl flex-col gap-8 px-4'
			: 'flex w-full flex-col gap-6'}
	>
		{#if showHeader}
			<header class={`${compact ? 'mb-3' : 'mb-4'}`}>
				<div>
					{#if eyebrow}
						<p
							class={`${compact ? 'text-xs' : 'text-sm'} tracking-[0.08em] text-slate-500 uppercase`}
						>
							{eyebrow}
						</p>
					{/if}
					<h1 class={compact ? 'mt-1 text-xl font-semibold' : 'mt-1'}>{title}</h1>
					{#if description}
						<p class={`max-w-xl text-sm text-slate-700 ${compact ? 'mt-1' : ''}`}>
							{description}
						</p>
					{/if}
				</div>
			</header>
		{/if}

		<div class="rounded-2xl bg-white p-6 shadow-sm">
			<svg viewBox="-80 -80 160 100" class="mx-auto w-full max-w-sm">
				<!-- Outer arc window -->
				<path
					d={createArcPath(arcOuterRadius, -35, 35)}
					fill="none"
					stroke="#e2e8f0"
					stroke-width="3"
				/>

				<!-- Inner arc window -->
				<!-- <path
					d={createArcPath(arcInnerRadius, -35, 35)}
					fill="none"
					stroke="#e2e8f0"
					stroke-width="2"
				/> -->

				<!-- Range markers -->
				{#each [-30, -15, 0, 15, 30] as markerAngle}
					{@const markerStart = polarToCartesian(markerAngle, markerStartRadius)}
					{@const markerEnd = polarToCartesian(markerAngle, markerEndRadius)}
					<line
						x1={markerStart.x}
						y1={markerStart.y + pivotY}
						x2={markerEnd.x}
						y2={markerEnd.y + pivotY}
						stroke="#64748b"
						stroke-width="2"
					/>
				{/each}

				<!-- Center labels -->
				{#each [-30, 0, 30] as labelAngle}
					{@const labelPos = polarToCartesian(labelAngle, labelRadius)}
					<text
						x={labelPos.x}
						y={labelPos.y + pivotY}
						text-anchor="middle"
						dominant-baseline="middle"
						font-size="8"
						fill="#64748b"
						font-weight="600"
					>
						{labelAngle === -30 ? '♭' : labelAngle === 30 ? '♯' : '0'}
					</text>
				{/each}

				<!-- Needle line -->
				{#if true}
					{@const angle = getNeedleAngle(interpolatedCents)}
					{@const needleEnd = polarToCartesian(angle, markerEndRadius)}
					{@const needleStart = polarToCartesian(angle, arcInnerRadius + needlePadding)}
					<line
						x1={needleStart.x}
						y1={needleStart.y}
						x2={needleEnd.x}
						y2={needleEnd.y}
						stroke={cents === null || Math.abs(cents) < 5
							? '#10b981'
							: Math.abs(cents) < 20
								? '#f59e0b'
								: '#ef4444'}
						stroke-width="2"
						stroke-linecap="round"
						opacity={note ? 1 : 0}
						style="transition: opacity 0.3s ease-out, stroke 0.15s ease-out"
					/>
				{/if}

				<!-- Note display at bottom -->
				<text
					x="0"
					y="0"
					text-anchor="middle"
					dominant-baseline="middle"
					font-size="18"
					fill="#1e293b"
					font-weight="700"
				>
					{vexFlowToDisplay(note) ?? '--'}
				</text>
			</svg>
			{#if instrument && instrumentMap[instrument]?.strings}
				{@const strings = instrumentMap[instrument].strings}
				{@const closestString = getClosestString(note, strings || [])}
				<div class="mt-8 flex justify-center gap-3">
					{#each strings || [] as stringNote}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-lg border-2 transition-all"
							class:border-green-500={stringNote === closestString && note}
							class:bg-green-50={stringNote === closestString && note}
							class:border-slate-200={stringNote !== closestString || !note}
						>
							<span
								class="text-xl font-semibold transition-colors"
								class:text-green-700={stringNote === closestString && note}
								class:text-slate-600={stringNote !== closestString || !note}
							>
								{vexFlowToDisplay(stringNote)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
