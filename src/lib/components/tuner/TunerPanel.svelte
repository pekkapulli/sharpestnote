<script lang="ts">
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
	}

	let {
		fullPage = true,
		compact = false,
		showHeader = true,
		eyebrow = 'Ear game',
		title = 'Live tuner',
		description = 'Use your microphone to see the incoming pitch and the closest equal-tempered note.',
		note = null,
		frequency = null,
		cents = null
	}: Props = $props();

	const formatHz = (value: number | null) => (value ? value.toFixed(1) : '--');
	const formatCents = (value: number | null) => {
		if (value === null) return '--';
		const sign = value > 0 ? '+' : value < 0 ? '-' : '';
		return `${sign}${Math.abs(value)} cents`;
	};
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

		<div class={`grid gap-4 ${compact ? '' : 'sm:grid-cols-3'}`}>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Note</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{note ?? '--'}</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Frequency</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">
					{formatHz(frequency)}<span class="ml-2 text-base font-normal text-slate-600">Hz</span>
				</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Detune</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{formatCents(cents)}</p>
			</div>
		</div>
	</div>
</div>
