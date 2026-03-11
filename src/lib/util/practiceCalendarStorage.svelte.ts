import { browser } from '$app/environment';

const PRACTICE_CALENDAR_KEY = 'practice_calendar_v1';
export const PRACTICE_CALENDAR_UPDATED_EVENT = 'practice-calendar-updated';

export interface PracticeCalendarEntry {
	unitCode: string;
	unitName: string;
	pieceCode: string;
	pieceName: string;
	gameCode: string;
	gameName: string;
	practiceCount: number;
}

export type PracticeCalendarByDate = Record<string, PracticeCalendarEntry[]>;

interface RecordPracticeInput {
	unitCode: string;
	unitName: string;
	pieceCode: string;
	pieceName: string;
	gameCode: string;
	gameName: string;
	dateKey?: string;
}

function getLocalDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function getPracticeCalendarStorage(): PracticeCalendarByDate {
	if (!browser) return {};

	const stored = localStorage.getItem(PRACTICE_CALENDAR_KEY);
	if (!stored) return {};

	try {
		const parsed = JSON.parse(stored) as PracticeCalendarByDate;
		if (parsed && typeof parsed === 'object') {
			return parsed;
		}
		return {};
	} catch {
		return {};
	}
}

function setPracticeCalendarStorage(data: PracticeCalendarByDate): void {
	if (!browser) return;
	localStorage.setItem(PRACTICE_CALENDAR_KEY, JSON.stringify(data));
	window.dispatchEvent(new CustomEvent(PRACTICE_CALENDAR_UPDATED_EVENT));
}

export function recordPracticeSession(input: RecordPracticeInput): void {
	if (!browser) return;

	const dateKey = input.dateKey ?? getLocalDateKey();
	const storage = getPracticeCalendarStorage();
	const dayEntries = storage[dateKey] ?? [];

	const existingEntry = dayEntries.find(
		(entry) =>
			entry.unitCode === input.unitCode &&
			entry.pieceCode === input.pieceCode &&
			entry.gameCode === input.gameCode
	);
	const isOtherPractice = input.gameCode === 'other-practice';

	if (existingEntry) {
		existingEntry.practiceCount = isOtherPractice ? 1 : existingEntry.practiceCount + 1;
	} else {
		dayEntries.push({
			unitCode: input.unitCode,
			unitName: input.unitName,
			pieceCode: input.pieceCode,
			pieceName: input.pieceName,
			gameCode: input.gameCode,
			gameName: input.gameName,
			practiceCount: 1
		});
	}

	storage[dateKey] = dayEntries;
	setPracticeCalendarStorage(storage);
}
