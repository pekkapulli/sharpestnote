import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { data, instrument } = await request.json();

		if (!data || !instrument) {
			return new Response('Missing data or instrument parameter', { status: 400 });
		}

		// Create filename with timestamp and instrument
		const timestamp = Date.now();
		const filename = `onset-training-${instrument}-${timestamp}.json`;

		// Path to raw training data folder
		const trainingDataPath = join(
			process.cwd(),
			'onset-detection',
			'training',
			'data',
			'raw',
			filename
		);

		// Ensure the directory exists
		const dirPath = join(process.cwd(), 'onset-detection', 'training', 'data', 'raw');
		await mkdir(dirPath, { recursive: true });

		// Write the data to file
		await writeFile(trainingDataPath, JSON.stringify(data, null, 2), 'utf-8');

		return json({
			success: true,
			filename,
			path: trainingDataPath
		});
	} catch (error) {
		console.error('Error saving training data:', error);
		return new Response(`Error saving training data: ${error}`, { status: 500 });
	}
};
