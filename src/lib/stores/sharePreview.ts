import { writable } from 'svelte/store';
import type { SharePreviewData } from '$lib/util/sharePreview';

export const sharePreviewStore = writable<SharePreviewData>({
	title: 'The Sharpest Note',
	description: 'Musical practice activities for beginner instrument students',
	image: '/og-logo.png'
});
