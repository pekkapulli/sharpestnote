<script lang="ts">
	interface Props {
		errors: string[];
		copyStatus: string;
		pieceOutput: string;
		onCopy: () => void;
		onCopyCustomUrl: () => void;
		onDownload: () => void;
	}

	let { errors, copyStatus, pieceOutput, onCopy, onCopyCustomUrl, onDownload }: Props = $props();
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<h2 class="text-xl font-semibold text-slate-900">Piece JSON output</h2>
	<p class="mt-1 text-sm text-slate-600">
		Output follows the Piece interface. Scale is auto-generated from unique melody notes.
	</p>

	{#if errors.length > 0}
		<div class="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
			<p class="font-semibold">Fix these before export:</p>
			<ul class="mt-2 list-disc pl-5">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap gap-2">
		<button
			type="button"
			class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
			onclick={onCopy}
		>
			Copy JSON
		</button>
		<button
			type="button"
			class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
			onclick={onCopyCustomUrl}
		>
			Copy custom URL
		</button>
		<button
			type="button"
			class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
			onclick={onDownload}
		>
			Download JSON
		</button>
	</div>

	{#if copyStatus}
		<p class="mt-2 text-sm font-medium text-brand-green">{copyStatus}</p>
	{/if}

	<textarea
		readonly
		value={pieceOutput}
		class="mt-4 min-h-120 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800"
	></textarea>
</div>
