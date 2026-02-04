import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { data, instrument } = await request.json();

		if (!data || !instrument) {
			return json({ error: 'Missing data or instrument parameter' }, { status: 400 });
		}

		const timestamp = Date.now();
		const filename = `onset-training-${instrument}-${timestamp}.json`;

		return json({
			success: true,
			filename,
			data
		});
	} catch (error) {
		console.error('Error processing training data:', error);
		return json({ error: `Error processing training data: ${error}` }, { status: 500 });
	}
};
