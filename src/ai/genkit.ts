import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import '../lib/telemetry-config'; // Configure telemetry before initializing Genkit

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash' // Keep the advanced model for better AI performance
});
