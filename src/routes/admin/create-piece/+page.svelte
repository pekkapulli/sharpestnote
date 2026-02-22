<script lang="ts">
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { Piece, Speed } from '$lib/config/types';
	import { parseMusicXmlToMelody } from '$lib/util/musicxmlToPiece';
	import { noteNameToMidi } from '$lib/util/noteNames';
	import { instrumentConfigs } from '$lib/config/instruments';

	const noteOptions: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const modeOptions: Mode[] = ['major', 'natural_minor'];

	let xmlText = $state('');
	let fileName = $state('');
	let parseError = $state('');
	let warnings = $state<string[]>([]);

	let basePiece = $state<{
		melody: Piece['melody'];
		scale: Piece['scale'];
		barLength: number;
		key: NoteName;
		mode: Mode;
		title: string | null;
		composer: string | null;
		arranger: string | null;
	} | null>(null);

	let code = $state('');
	let label = $state('');
	let composer = $state('Tarmo Anttila');
	let arranger = $state('Tarmo Anttila');
	let key = $state<NoteName>('D');
	let mode = $state<Mode>('major');
	let notationStartPercent = $state(0);
	let notationEndPercent = $state(1);
	let slowTempo = $state<number | ''>('');
	let mediumTempo = $state<number | ''>('');
	let fastTempo = $state<number | ''>('');

	// Scale finger assignments (note -> finger number map)
	let scaleFingers = $state<Record<string, number | undefined>>({});

	let jsonOutput = $state('');

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		resetState();
		if (!file) return;

		fileName = file.name;
		if (file.name.toLowerCase().endsWith('.mxl')) {
			parseError = 'Compressed .mxl files are not supported yet. Export plain .musicxml or .xml.';
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const text = String(reader.result ?? '');
			if (!text.trim()) {
				parseError = 'The selected file is empty.';
				return;
			}
			xmlText = text;
			parseMusicXml();
		};
		reader.onerror = () => {
			parseError = 'Failed to read the file.';
		};
		reader.readAsText(file);
	}

	function extractPieceInfoFromFileName(
		filePath: string
	): { pieceName: string; pieceCode: string } | null {
		// Remove extension
		const nameWithoutExt = filePath.replace(/\.[^/.]+$/, '');
		const parts = nameWithoutExt.split('-');

		// Format: U#-#-Name-Instrument or similar
		if (parts.length < 4) return null;

		// Last part is the instrument name
		const instrumentLabel = parts[parts.length - 1];
		const instrumentConfig = instrumentConfigs.find(
			(ic) => ic.label.toLowerCase() === instrumentLabel.toLowerCase()
		);

		if (!instrumentConfig) return null;

		// Middle parts (from index 2 to -1) are the piece name
		const pieceNameParts = parts.slice(2, -1);
		if (pieceNameParts.length === 0) return null;

		const pieceName = pieceNameParts.join(' ');
		const pieceCode = pieceName.toLowerCase().replace(/\s+/g, '-');

		return { pieceName, pieceCode };
	}

	function parseMusicXml() {
		try {
			const result = parseMusicXmlToMelody(xmlText);
			basePiece = {
				melody: result.melody,
				scale: result.scale,
				barLength: result.barLength,
				key: result.key,
				mode: result.mode,
				title: result.title,
				composer: result.composer,
				arranger: result.arranger
			};
			warnings = result.warnings;
			parseError = '';

			// Try to parse piece name from file name first
			const fileNameInfo = extractPieceInfoFromFileName(fileName);
			if (fileNameInfo) {
				label = fileNameInfo.pieceName;
				code = fileNameInfo.pieceCode;
			} else {
				// Fall back to title from metadata
				label = result.title ?? label;
				if (!code) {
					code = fileName
						.replace(/\.[^/.]+$/, '')
						.trim()
						.toLowerCase()
						.replace(/\s+/g, '-');
				}
			}

			key = result.key;
			mode = result.mode;
		} catch (error) {
			parseError = error instanceof Error ? error.message : 'Unable to parse MusicXML.';
			warnings = [];
			basePiece = null;
		}
	}

	function resetState() {
		parseError = '';
		warnings = [];
		basePiece = null;
		xmlText = '';
		fileName = '';
		scaleFingers = {};
	}

	const piece = $derived.by<Piece | null>(() => {
		if (!basePiece) return null;

		const practiceTempi = buildPracticeTempi();

		// Sort scale by MIDI note value (low to high)
		const sortedScale = [...basePiece.scale].sort((a, b) => {
			const midiA = a.note ? (noteNameToMidi(a.note) ?? -Infinity) : -Infinity;
			const midiB = b.note ? (noteNameToMidi(b.note) ?? -Infinity) : -Infinity;
			return midiA - midiB;
		});

		// Apply finger markings to scale
		const scaleWithFingers = sortedScale.map((item) => {
			const finger = item.note ? scaleFingers[item.note] : undefined;
			return finger !== undefined ? { ...item, finger } : item;
		});

		// Apply finger markings to melody
		const melodyWithFingers = basePiece.melody.map((bar) =>
			bar.map((item) => {
				const finger = item.note ? scaleFingers[item.note] : undefined;
				return finger !== undefined ? { ...item, finger } : item;
			})
		);

		return {
			code: code.trim(),
			label: label.trim(),
			composer: composer.trim() || 'Unknown',
			arranger: arranger.trim() || 'Unknown',
			practiceTempi,
			key,
			mode,
			barLength: basePiece.barLength,
			melody: melodyWithFingers,
			scale: scaleWithFingers,
			notationStartPercent,
			notationEndPercent
		};
	});

	$effect(() => {
		jsonOutput = piece ? JSON.stringify(piece, null, 2) : '';
	});

	function buildPracticeTempi(): Piece['practiceTempi'] | undefined {
		const tempi: Partial<Record<Speed, number>> = {};
		if (slowTempo !== '') tempi.slow = Number(slowTempo);
		if (mediumTempo !== '') tempi.medium = Number(mediumTempo);
		if (fastTempo !== '') tempi.fast = Number(fastTempo);
		return Object.keys(tempi).length > 0 ? tempi : undefined;
	}

	async function copyOutput() {
		if (!jsonOutput) return;
		await navigator.clipboard.writeText(jsonOutput);
	}
</script>

<div class="min-h-screen bg-off-white py-10">
	<div class="mx-auto w-full max-w-4xl px-4">
		<header class="mb-8">
			<h1 class="text-3xl font-semibold text-slate-900">Create melody from MusicXML</h1>
			<p class="mt-2 text-sm text-slate-600">
				Drop a .musicxml file here and get a ready-to-paste piece definition.
			</p>
		</header>

		<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<label class="mb-2 block text-sm font-semibold text-slate-700" for="musicxml-file">
				MusicXML file
			</label>
			<input
				id="musicxml-file"
				type="file"
				accept=".xml,.musicxml"
				onchange={handleFileChange}
				class="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
			/>
			{#if fileName}
				<p class="mt-2 text-xs text-slate-500">Loaded: {fileName}</p>
			{/if}
			{#if parseError}
				<p
					class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
				>
					{parseError}
				</p>
			{/if}
			{#if warnings.length}
				<ul
					class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
				>
					{#each warnings as warning}
						<li>{warning}</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if basePiece}
			<section class="mt-8 grid gap-6 md:grid-cols-2">
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-lg font-semibold text-slate-900">Piece details</h2>
					<div class="mt-4 grid gap-4">
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Code</span>
							<input
								type="text"
								bind:value={code}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
						</label>
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Label</span>
							<input
								type="text"
								bind:value={label}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
						</label>
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Composer</span>
							<input
								type="text"
								bind:value={composer}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
						</label>
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Arranger</span>
							<input
								type="text"
								bind:value={arranger}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
						</label>
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Key</span>
							<select
								bind:value={key}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							>
								{#each noteOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</label>
						<label class="text-sm">
							<span class="block text-xs font-semibold text-slate-600">Mode</span>
							<select
								bind:value={mode}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
							>
								{#each modeOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</label>
						<div class="grid gap-4 md:grid-cols-2">
							<label class="text-sm">
								<span class="block text-xs font-semibold text-slate-600">Notation start</span>
								<input
									type="number"
									step="0.01"
									min="0"
									max="1"
									bind:value={notationStartPercent}
									class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
							<label class="text-sm">
								<span class="block text-xs font-semibold text-slate-600">Notation end</span>
								<input
									type="number"
									step="0.01"
									min="0"
									max="1"
									bind:value={notationEndPercent}
									class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div class="grid gap-4 md:grid-cols-3">
							<label class="text-sm">
								<span class="block text-xs font-semibold text-slate-600">Slow tempo</span>
								<input
									type="number"
									min="1"
									bind:value={slowTempo}
									class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
							<label class="text-sm">
								<span class="block text-xs font-semibold text-slate-600">Medium tempo</span>
								<input
									type="number"
									min="1"
									bind:value={mediumTempo}
									class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
							<label class="text-sm">
								<span class="block text-xs font-semibold text-slate-600">Fast tempo</span>
								<input
									type="number"
									min="1"
									bind:value={fastTempo}
									class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div
							class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
						>
							Bar length: {basePiece.barLength} sixteenths. Parsed {basePiece.melody.length} bars.
						</div>

						<!-- Scale finger assignments -->
						<div class="mt-4">
							<h3 class="mb-3 text-sm font-semibold text-slate-700">Scale finger markings</h3>
							<div class="grid gap-2">
								{#each [...basePiece.scale].sort((a, b) => {
									const midiA = a.note ? (noteNameToMidi(a.note) ?? -Infinity) : -Infinity;
									const midiB = b.note ? (noteNameToMidi(b.note) ?? -Infinity) : -Infinity;
									return midiA - midiB;
								}) as scaleNote, idx}
									{#if scaleNote.note}
										<div class="flex items-center gap-3">
											<span class="w-16 font-mono text-xs text-slate-600">{scaleNote.note}</span>
											<input
												type="number"
												min="0"
												max="4"
												placeholder="–"
												value={scaleFingers[scaleNote.note] ?? ''}
												oninput={(e) => {
													const val = e.currentTarget.value.trim();
													if (val === '') {
														const { [scaleNote.note!]: _, ...rest } = scaleFingers;
														scaleFingers = rest;
													} else {
														scaleFingers = { ...scaleFingers, [scaleNote.note!]: Number(val) };
													}
												}}
												class="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm"
											/>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-slate-900">Piece JSON</h2>
						<button
							onclick={copyOutput}
							disabled={!jsonOutput}
							class="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
						>
							Copy
						</button>
					</div>
					<textarea
						class="mt-4 h-120 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
						readonly
						value={jsonOutput}
					></textarea>
				</div>
			</section>
		{/if}
	</div>
</div>
