let currentAudio: HTMLAudioElement | null = null;

/**
 * Ensure only one lightweight preview audio element plays at a time.
 */
export function requestPlay(audio: HTMLAudioElement) {
	if (currentAudio && currentAudio !== audio) {
		currentAudio.pause();
	}
	currentAudio = audio;
}

/**
 * Clear the active audio reference when an element ends or is torn down.
 */
export function clearCurrent(audio: HTMLAudioElement) {
	if (currentAudio === audio) {
		currentAudio = null;
	}
}
