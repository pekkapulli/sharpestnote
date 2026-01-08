/**
 * Utility to generate share preview metadata
 * Used with the SharePreview component to set Open Graph and Twitter Card meta tags
 */

export interface SharePreviewData {
	title: string;
	description: string;
	image?: string;
	url?: string;
	type?: 'website' | 'article' | 'music.song';
}
