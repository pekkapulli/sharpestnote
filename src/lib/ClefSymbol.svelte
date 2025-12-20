<script lang="ts">
	import type { Clef } from '$lib/config/types';

	interface Props {
		clef?: Clef;
		size?: string;
	}

	const { clef = 'treble', size = '3rem' }: Props = $props();

	// Unicode characters for music clef symbols in Noto Music font
	const clefSymbols: Record<Clef, string> = {
		treble: '𝄞', // U+1D11E MUSICAL SYMBOL G CLEF
		alto: '𝄡', // U+1D121 MUSICAL SYMBOL C CLEF
		bass: '𝄢' // U+1D122 MUSICAL SYMBOL F CLEF
	};
</script>

<span
	class="note"
	style="font-size: {size}; display: inline-block; {clef === 'bass' ? 'margin-top: -0.2em;' : ''}"
>
	{clefSymbols[clef]}
</span>
