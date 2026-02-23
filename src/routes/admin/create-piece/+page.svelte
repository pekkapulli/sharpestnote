<script lang="ts">
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { Piece, Speed, InstrumentId } from '$lib/config/types';
	import { parseMusicXmlToMelody } from '$lib/util/musicxmlToPiece';
	import { noteNameToMidi } from '$lib/util/noteNames';
	import { instrumentConfigs } from '$lib/config/instruments';
	import { getFingerMarkings } from '$lib/config/fingerMarkings';

	const noteOptions: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const modeOptions: Mode[] = ['major', 'natural_minor'];

	type FileEntry = {
		fileName: string;
		xmlText: string;
		parseError: string;
		warnings: string[];
		basePiece: {
			melody: Piece['melody'];
			scale: Piece['scale'];
			barLength: number;
			key: NoteName;
			mode: Mode;
			title: string | null;
			composer: string | null;
			arranger: string | null;
			tempo: number | null;
		} | null;
		code: string;
		label: string;
		composer: string;
		arranger: string;
		key: NoteName;
		mode: Mode;
		notationStartPercent: number;
		notationEndPercent: number;
		slowTempo: number | '';
		mediumTempo: number | '';
		fastTempo: number | '';
		scaleFingers: Record<string, number | undefined>;
	};

	let files = $state<FileEntry[]>([]);
	let sortField = $state<'label' | 'code' | 'fileName'>('fileName');
	let sortOrder = $state<'asc' | 'desc'>('asc');
	let jsonOutput = $state('');

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const fileList = input.files;
		if (!fileList || fileList.length === 0) return;

		Array.from(fileList).forEach((file) => {
			if (file.name.toLowerCase().endsWith('.mxl')) {
				console.warn('Skipping .mxl file:', file.name);
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const text = String(reader.result ?? '');
				if (!text.trim()) {
					console.warn('Empty file:', file.name);
					return;
				}

				const entry: FileEntry = {
					fileName: file.name,
					xmlText: text,
					parseError: '',
					warnings: [],
					basePiece: null,
					code: '',
					label: '',
					composer: 'Tarmo Anttila',
					arranger: 'Tarmo Anttila',
					key: 'D',
					mode: 'major',
					notationStartPercent: 0,
					notationEndPercent: 1,
					slowTempo: '',
					mediumTempo: '',
					fastTempo: '',
					scaleFingers: {}
				};

				parseMusicXmlForEntry(entry);
				files = [...files, entry];
			};
			reader.onerror = () => {
				console.error('Failed to read file:', file.name);
			};
			reader.readAsText(file);
		});

		// Reset input
		input.value = '';
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

	function parseMusicXmlForEntry(entry: FileEntry) {
		try {
			const result = parseMusicXmlToMelody(entry.xmlText);
			entry.basePiece = {
				melody: result.melody,
				scale: result.scale,
				barLength: result.barLength,
				key: result.key,
				mode: result.mode,
				title: result.title,
				composer: result.composer,
				arranger: result.arranger,
				tempo: result.tempo
			};
			entry.warnings = result.warnings;
			entry.parseError = '';

			// Try to parse piece name and instrument from file name
			const fileNameInfo = extractPieceInfoFromFileName(entry.fileName);
			if (fileNameInfo) {
				entry.label = fileNameInfo.pieceName;
				entry.code = fileNameInfo.pieceCode;
			} else {
				// Fall back to title from metadata
				entry.label = result.title ?? entry.label;
				if (!entry.code) {
					entry.code = entry.fileName
						.replace(/\.[^/.]+$/, '')
						.trim()
						.toLowerCase()
						.replace(/\s+/g, '-');
				}
			}

			// Extract instrument from filename and populate default finger markings
			const instrumentId = extractInstrumentFromFileName(entry.fileName);
			if (instrumentId) {
				const markings = getFingerMarkings(instrumentId);
				const newScaleFingers: Record<string, number> = {};

				// Populate finger markings for notes that appear in the scale
				markings.forEach((marking) => {
					if (result.scale.some((scaleNote) => scaleNote.note === marking.note)) {
						newScaleFingers[marking.note] = marking.finger;
					}
				});

				entry.scaleFingers = newScaleFingers;
			}

			// Populate practice tempos based on detected song tempo
			if (result.tempo) {
				entry.fastTempo = Math.round(result.tempo / 10) * 10;
				entry.mediumTempo = Math.round((result.tempo * 0.75) / 10) * 10;
				entry.slowTempo = Math.round((result.tempo * 0.5) / 10) * 10;
			}

			entry.key = result.key;
			entry.mode = result.mode;
		} catch (error) {
			entry.parseError = error instanceof Error ? error.message : 'Unable to parse MusicXML.';
			entry.warnings = [];
			entry.basePiece = null;
		}
	}

	function extractInstrumentFromFileName(filePath: string): InstrumentId | null {
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

		return instrumentConfig ? (instrumentConfig.id as InstrumentId) : null;
	}

	function resetState() {
		files = [];
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
	}

	function getSortedFiles() {
		return [...files].sort((a, b) => {
			let aVal = a[sortField] as string;
			let bVal = b[sortField] as string;
			let cmp = aVal.localeCompare(bVal);
			return sortOrder === 'asc' ? cmp : -cmp;
		});
	}

	function buildPieceFromEntry(entry: FileEntry): Piece | null {
		if (!entry.basePiece) return null;

		const practiceTempi = buildPracticeTempi(entry);

		// Sort scale by MIDI note value (low to high)
		const sortedScale = [...entry.basePiece.scale].sort((a, b) => {
			const midiA = a.note ? (noteNameToMidi(a.note) ?? -Infinity) : -Infinity;
			const midiB = b.note ? (noteNameToMidi(b.note) ?? -Infinity) : -Infinity;
			return midiA - midiB;
		});

		// Apply finger markings to scale
		const scaleWithFingers = sortedScale.map((item) => {
			const finger = item.note ? entry.scaleFingers[item.note] : undefined;
			return finger !== undefined ? { ...item, finger } : item;
		});

		// Apply finger markings to melody
		const melodyWithFingers = entry.basePiece.melody.map((bar) =>
			bar.map((item) => {
				const finger = item.note ? entry.scaleFingers[item.note] : undefined;
				return finger !== undefined ? { ...item, finger } : item;
			})
		);

		return {
			code: entry.code.trim(),
			label: entry.label.trim(),
			composer: entry.composer.trim() || 'Unknown',
			arranger: entry.arranger.trim() || 'Unknown',
			practiceTempi,
			key: entry.key,
			mode: entry.mode,
			barLength: entry.basePiece.barLength,
			melody: melodyWithFingers,
			scale: scaleWithFingers,
			notationStartPercent: entry.notationStartPercent,
			notationEndPercent: entry.notationEndPercent
		};
	}

	function buildPracticeTempi(entry: FileEntry): Piece['practiceTempi'] | undefined {
		const tempi: Partial<Record<Speed, number>> = {};
		if (entry.slowTempo !== '') tempi.slow = Number(entry.slowTempo);
		if (entry.mediumTempo !== '') tempi.medium = Number(entry.mediumTempo);
		if (entry.fastTempo !== '') tempi.fast = Number(entry.fastTempo);
		return Object.keys(tempi).length > 0 ? tempi : undefined;
	}

	$effect(() => {
		const sortedFiles = getSortedFiles();
		const pieces = sortedFiles
			.map((entry) => buildPieceFromEntry(entry))
			.filter((piece): piece is Piece => piece !== null);
		jsonOutput = pieces.length > 0 ? JSON.stringify(pieces, null, 2) : '';
	});

	async function copyOutput() {
		if (!jsonOutput) return;
		await navigator.clipboard.writeText(jsonOutput);
	}
</script>

<div class="min-h-screen bg-off-white py-10">
	<div class="mx-auto w-full max-w-6xl px-4">
		<header class="mb-8">
			<h1 class="text-3xl font-semibold text-slate-900">Batch create pieces from MusicXML</h1>
			<p class="mt-2 text-sm text-slate-600">
				Drop multiple .musicxml files and configure them all at once.
			</p>
		</header>

		<section class="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<label class="mb-2 block text-sm font-semibold text-slate-700" for="musicxml-files">
				MusicXML files (multiple)
			</label>
			<input
				id="musicxml-files"
				type="file"
				accept=".xml,.musicxml"
				onchange={handleFileChange}
				multiple
				class="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
			/>
			<p class="mt-2 text-xs text-slate-500">
				{files.length} file{files.length !== 1 ? 's' : ''} loaded
			</p>
			{#if files.length > 0}
				<div class="mt-4 flex items-center justify-between">
					<div class="flex gap-2">
						<label class="text-xs font-semibold text-slate-600">
							Sort by:
							<select
								bind:value={sortField}
								class="ml-1 rounded border border-slate-200 px-2 py-1 text-xs"
							>
								<option value="fileName">Filename</option>
								<option value="label">Label</option>
								<option value="code">Code</option>
							</select>
						</label>
						<button
							onclick={() => (sortOrder = sortOrder === 'asc' ? 'desc' : 'asc')}
							class="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold hover:bg-slate-200"
						>
							{sortOrder === 'asc' ? '↑' : '↓'}
						</button>
					</div>
					<button
						onclick={resetState}
						class="rounded bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
					>
						Clear all
					</button>
				</div>
			{/if}
		</section>

		{#if files.length > 0}
			<div class="space-y-6">
				{#each getSortedFiles() as entry, idx}
					<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
						<div class="mb-4 flex items-start justify-between">
							<div>
								<h2 class="text-lg font-semibold text-slate-900">{entry.fileName}</h2>
								{#if entry.parseError}
									<p class="mt-1 text-sm text-rose-700">{entry.parseError}</p>
								{/if}
								{#if entry.warnings.length}
									<ul class="mt-1 text-xs text-amber-700">
										{#each entry.warnings as warning}
											<li>{warning}</li>
										{/each}
									</ul>
								{/if}
							</div>
							<button
								onclick={() => removeFile(files.indexOf(entry))}
								class="rounded bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
							>
								Remove
							</button>
						</div>

						{#if entry.basePiece}
							<div class="grid gap-6 md:grid-cols-2">
								<div>
									<h3 class="mb-4 text-sm font-semibold text-slate-700">Piece details</h3>
									<div class="space-y-3">
										<label class="text-sm">
											<span class="block text-xs font-semibold text-slate-600">Code</span>
											<input
												type="text"
												bind:value={entry.code}
												class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
											/>
										</label>
										<label class="text-sm">
											<span class="block text-xs font-semibold text-slate-600">Label</span>
											<input
												type="text"
												bind:value={entry.label}
												class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
											/>
										</label>
										<label class="text-sm">
											<span class="block text-xs font-semibold text-slate-600">Composer</span>
											<input
												type="text"
												bind:value={entry.composer}
												class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
											/>
										</label>
										<label class="text-sm">
											<span class="block text-xs font-semibold text-slate-600">Arranger</span>
											<input
												type="text"
												bind:value={entry.arranger}
												class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
											/>
										</label>
										<label class="text-sm">
											<span class="block text-xs font-semibold text-slate-600">Key</span>
											<select
												bind:value={entry.key}
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
												bind:value={entry.mode}
												class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
											>
												{#each modeOptions as option}
													<option value={option}>{option}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>

								<div>
									<h3 class="mb-4 text-sm font-semibold text-slate-700">Notation & Tempo</h3>
									<div class="space-y-3">
										<div class="grid grid-cols-2 gap-3">
											<label class="text-sm">
												<span class="block text-xs font-semibold text-slate-600"
													>Notation start</span
												>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={entry.notationStartPercent}
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
													bind:value={entry.notationEndPercent}
													class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
												/>
											</label>
										</div>
										<div class="grid grid-cols-3 gap-3">
											<label class="text-sm">
												<span class="block text-xs font-semibold text-slate-600">Slow tempo</span>
												<input
													type="number"
													min="1"
													bind:value={entry.slowTempo}
													class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
												/>
											</label>
											<label class="text-sm">
												<span class="block text-xs font-semibold text-slate-600">Medium tempo</span>
												<input
													type="number"
													min="1"
													bind:value={entry.mediumTempo}
													class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
												/>
											</label>
											<label class="text-sm">
												<span class="block text-xs font-semibold text-slate-600">Fast tempo</span>
												<input
													type="number"
													min="1"
													bind:value={entry.fastTempo}
													class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
												/>
											</label>
										</div>
										<div
											class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
										>
											Bar length: {entry.basePiece.barLength} sixteenths. Parsed {entry.basePiece
												.melody.length} bars.
										</div>
									</div>
								</div>
							</div>

							<!-- Scale finger assignments -->
							<div class="mt-4 border-t border-slate-200 pt-4">
								<h3 class="mb-3 text-sm font-semibold text-slate-700">Scale finger markings</h3>
								<div class="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
									{#each [...entry.basePiece.scale].sort((a, b) => {
										const midiA = a.note ? (noteNameToMidi(a.note) ?? -Infinity) : -Infinity;
										const midiB = b.note ? (noteNameToMidi(b.note) ?? -Infinity) : -Infinity;
										return midiA - midiB;
									}) as scaleNote}
										{#if scaleNote.note}
											<div class="flex items-center gap-2">
												<span class="w-12 font-mono text-xs text-slate-600">{scaleNote.note}</span>
												<input
													type="number"
													min="0"
													max="4"
													placeholder="–"
													value={entry.scaleFingers[scaleNote.note] ?? ''}
													oninput={(e) => {
														const val = e.currentTarget.value.trim();
														if (val === '') {
															const { [scaleNote.note!]: _, ...rest } = entry.scaleFingers;
															entry.scaleFingers = rest;
														} else {
															entry.scaleFingers = {
																...entry.scaleFingers,
																[scaleNote.note!]: Number(val)
															};
														}
													}}
													class="w-12 rounded border border-slate-200 px-2 py-1 text-center text-sm"
												/>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</section>
				{/each}
			</div>

			<!-- Result JSON -->
			<section
				class="sticky bottom-0 mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
			>
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900">Result JSON Array</h2>
					<button
						onclick={copyOutput}
						disabled={!jsonOutput}
						class="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
					>
						Copy
					</button>
				</div>
				<textarea
					class="mt-4 h-32 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
					readonly
					value={jsonOutput}
				></textarea>
			</section>
		{/if}
	</div>
</div>
