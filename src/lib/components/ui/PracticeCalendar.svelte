<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';
	import {
		PRACTICE_CALENDAR_UPDATED_EVENT,
		getPracticeCalendarStorage,
		recordPracticeSession,
		type PracticeCalendarByDate,
		type PracticeCalendarEntry
	} from '$lib/util/practiceCalendarStorage.svelte';

	interface Props {
		title?: string;
		unitCode?: string;
		pieceCode?: string;
		gameCode?: string;
		daysToShow?: number;
	}

	let {
		title = 'Practice Calendar',
		unitCode,
		pieceCode,
		gameCode,
		daysToShow = 35
	}: Props = $props();

	const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let storage = $state<PracticeCalendarByDate>({});
	let isDayModalOpen = $state(false);
	let selectedDateKey = $state<string | null>(null);

	function toDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getWeekdayIndex(date: Date): number {
		const day = date.getDay();
		return day === 0 ? 6 : day - 1;
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function matchesFilter(entry: PracticeCalendarEntry): boolean {
		if (unitCode && entry.unitCode !== unitCode) return false;
		if (pieceCode && entry.pieceCode !== pieceCode) return false;
		if (gameCode && entry.gameCode !== gameCode) return false;
		return true;
	}

	function getEntriesForDateKey(dateKey: string): PracticeCalendarEntry[] {
		return (storage[dateKey] ?? []).filter(matchesFilter);
	}

	function getDayCount(date: Date): number {
		const key = toDateKey(date);
		const entries = storage[key] ?? [];

		return entries
			.filter(matchesFilter)
			.reduce((sum, entry) => sum + Math.max(0, Number(entry.practiceCount) || 0), 0);
	}

	function getDayDetails(date: Date): string {
		const key = toDateKey(date);
		const entries = (storage[key] ?? []).filter(matchesFilter);
		if (entries.length === 0) return `${formatDate(date)}: no practice`;

		const lines = entries
			.map(
				(entry) =>
					`${entry.unitName} • ${entry.pieceName} • ${entry.gameName}: ${entry.practiceCount}`
			)
			.join(' | ');

		const total = entries.reduce((sum, entry) => sum + entry.practiceCount, 0);
		return `${formatDate(date)}: ${total} plays (${lines})`;
	}

	type CalendarCell = {
		date: Date;
		count: number;
		label: string;
		isToday: boolean;
	};

	const cells = $derived.by(() => {
		const result: CalendarCell[] = [];
		const today = new SvelteDate();
		today.setHours(0, 0, 0, 0);
		const todayKey = toDateKey(today);

		for (let offset = 0; offset < daysToShow; offset += 1) {
			const date = new SvelteDate(today);
			date.setDate(today.getDate() - offset);
			const dateKey = toDateKey(date);

			result.push({
				date,
				count: getDayCount(date),
				label: getDayDetails(date),
				isToday: dateKey === todayKey
			});
		}

		return result;
	});

	const cellsByDateKey = $derived.by(() => {
		const map = new SvelteMap<string, CalendarCell>();
		for (const cell of cells) {
			map.set(toDateKey(cell.date), cell);
		}
		return map;
	});

	const weeks = $derived.by(() => {
		const today = new SvelteDate();
		today.setHours(0, 0, 0, 0);

		const startDate = new SvelteDate(today);
		startDate.setDate(today.getDate() - (daysToShow - 1));

		const currentWeekStart = new SvelteDate(today);
		currentWeekStart.setDate(today.getDate() - getWeekdayIndex(today));

		const weeksResult: Array<Array<CalendarCell | undefined>> = [];
		let weekStart = new SvelteDate(currentWeekStart);

		while (weekStart >= startDate) {
			const row: Array<CalendarCell | undefined> = [];

			for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
				const date = new SvelteDate(weekStart);
				date.setDate(weekStart.getDate() + dayOffset);

				if (date > today || date < startDate) {
					row.push(undefined);
					continue;
				}

				const cell = cellsByDateKey.get(toDateKey(date));
				row.push(cell);
			}

			weeksResult.push(row);

			weekStart = new SvelteDate(weekStart);
			weekStart.setDate(weekStart.getDate() - 7);
		}

		const chronologicalWeeks = weeksResult.reverse();
		const firstWeekWithData = chronologicalWeeks.findIndex((week) =>
			week.some((cell) => cell != null && cell.count > 0)
		);

		if (firstWeekWithData === -1) {
			return chronologicalWeeks.slice(-1);
		}

		return chronologicalWeeks.slice(firstWeekWithData);
	});

	const totalInView = $derived(cells.reduce((sum, cell) => sum + cell.count, 0));

	function getIntensityClass(count: number): string {
		if (count <= 0) return 'bg-slate-100';
		if (count === 1) return 'bg-brand-green/30';
		if (count <= 3) return 'bg-brand-green/60';
		return 'bg-brand-green';
	}

	function loadStorage() {
		storage = getPracticeCalendarStorage();
	}

	function formatDateKey(dateKey: string): string {
		const [year, month, day] = dateKey.split('-').map(Number);
		const parsed = new Date(year, (month || 1) - 1, day || 1);
		return formatDate(parsed);
	}

	const selectedDayEntries = $derived(
		selectedDateKey ? getEntriesForDateKey(selectedDateKey) : ([] as PracticeCalendarEntry[])
	);

	const selectedDayTotal = $derived(
		selectedDayEntries.reduce((sum, entry) => sum + entry.practiceCount, 0)
	);

	const selectedDayTitle = $derived(
		selectedDateKey ? formatDateKey(selectedDateKey) : 'Practice details'
	);

	const hasOtherPracticeMark = $derived(
		selectedDayEntries.some(
			(entry) => entry.gameCode === 'other-practice' && entry.practiceCount >= 1
		)
	);

	function openDayModal(dateKey: string) {
		selectedDateKey = dateKey;
		isDayModalOpen = true;
	}

	function closeDayModal() {
		isDayModalOpen = false;
	}

	function inferName(
		entries: PracticeCalendarEntry[],
		code: string | undefined,
		kind: 'unit' | 'piece'
	): string {
		if (!code) return kind === 'unit' ? 'General' : 'General practice';

		const match = entries.find((entry) =>
			kind === 'unit' ? entry.unitCode === code : entry.pieceCode === code
		);
		if (match) {
			return kind === 'unit' ? match.unitName : match.pieceName;
		}

		return kind === 'unit' ? code : code;
	}

	function handleManualPracticeMark() {
		if (!selectedDateKey || hasOtherPracticeMark) return;

		const allEntries = Object.values(storage).flat();
		const resolvedUnitCode = unitCode ?? 'general';
		const resolvedPieceCode = pieceCode ?? 'other-practice';

		recordPracticeSession({
			unitCode: resolvedUnitCode,
			unitName: inferName(allEntries, unitCode, 'unit'),
			pieceCode: resolvedPieceCode,
			pieceName: inferName(allEntries, pieceCode, 'piece'),
			gameCode: 'other-practice',
			gameName: 'Other practice',
			dateKey: selectedDateKey
		});

		loadStorage();
	}

	onMount(() => {
		loadStorage();
		const onFocus = () => loadStorage();
		const onStorageUpdate = () => loadStorage();
		window.addEventListener('focus', onFocus);
		window.addEventListener(PRACTICE_CALENDAR_UPDATED_EVENT, onStorageUpdate);
		return () => {
			window.removeEventListener('focus', onFocus);
			window.removeEventListener(PRACTICE_CALENDAR_UPDATED_EVENT, onStorageUpdate);
		};
	});
</script>

<section class="rounded-xl">
	<div class="mb-2 flex items-baseline justify-between gap-2">
		<h3 class="text-xs font-semibold tracking-wide text-slate-800">{title}</h3>
	</div>

	{#if totalInView === 0}
		<p class="mb-2 text-[11px] text-slate-500">
			Ready to start? Play one game or piece today to light up your first square 🎵
		</p>
	{/if}

	<p class="mb-2 text-[11px] text-slate-500">Tap a day to view details and log other practice.</p>

	<div class="grid gap-1.5" style="grid-template-columns: repeat(7, minmax(0, 1fr));">
		{#each weekdayLabels as day (day)}
			<div class="text-center text-[10px] font-semibold text-slate-500 uppercase">{day}</div>
		{/each}

		{#each weeks as week, weekIndex (`week-${weekIndex}`)}
			{#each week as cell, dayIndex (`${weekIndex}-${dayIndex}`)}
				{#if cell}
					<div class="group relative">
						<button
							type="button"
							onclick={() => openDayModal(toDateKey(cell.date))}
							aria-label={cell.label}
							title={cell.label}
							class="block w-full"
						>
							<div
								class={`relative flex h-6 w-full items-center justify-center rounded-[3px] ${getIntensityClass(cell.count)} ${cell.isToday ? 'ring-2 ring-dark-blue/30 ring-offset-1 ring-offset-white' : ''}`}
								title={cell.label}
								aria-label={cell.label}
							>
								<span class="text-[9px] font-semibold text-slate-700">{cell.date.getDate()}</span>
							</div>
						</button>
					</div>
				{:else}
					<div class="h-6 w-full rounded-[3px] bg-transparent"></div>
				{/if}
			{/each}
		{/each}
	</div>
</section>

<Modal isOpen={isDayModalOpen} onClose={closeDayModal} title={selectedDayTitle} maxWidth="md">
	<div class="space-y-3">
		<p class="text-sm text-slate-600">{selectedDayTotal} total practices logged for this day.</p>

		{#if selectedDayEntries.length > 0}
			<ul class="space-y-2">
				{#each selectedDayEntries as entry (`${entry.unitCode}-${entry.pieceCode}-${entry.gameCode}`)}
					<li class="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">
						<div class="font-semibold text-slate-800">{entry.gameName}</div>
						<div>{entry.pieceName}</div>
						<div class="text-xs text-slate-500">Count: {entry.practiceCount}</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-slate-500">No logged activity yet for this day.</p>
		{/if}
	</div>

	{#snippet actions()}
		<button
			type="button"
			onclick={handleManualPracticeMark}
			disabled={hasOtherPracticeMark}
			class="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{hasOtherPracticeMark ? 'Other practice logged' : 'Log other practice'}
		</button>
		<button
			type="button"
			onclick={closeDayModal}
			class="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
		>
			Close
		</button>
	{/snippet}
</Modal>
