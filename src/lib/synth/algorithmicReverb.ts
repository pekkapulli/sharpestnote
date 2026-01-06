/**
 * Create algorithmic reverb using comb and allpass filters (Freeverb-style)
 *
 * This creates a lush reverb effect using:
 * - 8 parallel comb filters for natural reverb tail
 * - 2 series allpass filters for diffusion
 *
 * @param audioContext The AudioContext to use for creating nodes
 * @param input The input audio node
 * @param output The output audio node to connect the reverb to
 * @param decay The decay/feedback amount (0.1-0.99) - higher = longer reverb tail
 */
export function createAlgorithmicReverb(
	audioContext: AudioContext,
	input: AudioNode,
	output: AudioNode,
	decay: number
): void {
	// Freeverb delay times based on Schroeder's recommendations (in seconds)
	// Using prime-based delays to avoid resonances
	const combDelays = [0.0297, 0.0371, 0.0411, 0.0437, 0.005, 0.0017, 0.0009, 0.0023];

	// Allpass filter delay times (in seconds)
	const allpassDelays = [0.00506, 0.0017];

	// Damping filter to reduce high frequencies in reverb tail
	const dampingFrequency = 5000; // Hz

	// Create parallel comb filters
	const combFilters = combDelays.map((delayTime) => {
		const delay = audioContext.createDelay(0.2);
		const feedback = audioContext.createGain();
		const damping = audioContext.createBiquadFilter();
		const combGain = audioContext.createGain();

		delay.delayTime.value = delayTime;
		feedback.gain.value = decay * 0.84; // Scale feedback to prevent runaway
		damping.type = 'lowpass';
		damping.frequency.value = dampingFrequency;
		damping.Q.value = 0.5;
		combGain.gain.value = 0.15; // Reduced gain for cleaner sound

		// Comb filter with damping: input -> delay -> damping -> feedback -> delay (loop)
		input.connect(delay);
		delay.connect(damping);
		damping.connect(feedback);
		feedback.connect(delay);
		damping.connect(combGain);

		return combGain;
	});

	// Sum all comb filters
	const combSum = audioContext.createGain();
	combFilters.forEach((comb) => comb.connect(combSum));

	// Create series allpass filters for diffusion
	let current = combSum;
	allpassDelays.forEach((delayTime) => {
		const delay = audioContext.createDelay(0.1);
		const feedback = audioContext.createGain();
		const feedforward = audioContext.createGain();
		const allpassSum = audioContext.createGain();

		delay.delayTime.value = delayTime;
		feedback.gain.value = 0.5;
		feedforward.gain.value = 0.5; // Changed from -0.5 to positive for better phase

		// Allpass: input -> delay -> feedback -> delay (loop)
		//              \-> feedforward -> sum
		//         delay -> sum
		current.connect(delay);
		current.connect(feedforward);
		delay.connect(feedback);
		feedback.connect(delay);

		feedforward.connect(allpassSum);
		delay.connect(allpassSum);

		current = allpassSum;
	});

	// Connect final output
	current.connect(output);
}
