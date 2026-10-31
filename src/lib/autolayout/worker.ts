// Web Worker entry: runs Vero Designer's router off the main thread.
import { runVeroEngine, type AutoLayoutSettings, type RunResult } from './run-engine';
import type { AutoLayoutCircuit } from './adapter';

export type WorkerRequest = { circuit: AutoLayoutCircuit; settings: AutoLayoutSettings };
export type WorkerMessage = { type: 'progress'; text: string } | { type: 'done'; result: RunResult };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { circuit, settings } = event.data;
  const post = (message: WorkerMessage) => (self as unknown as Worker).postMessage(message);
  const result = await runVeroEngine(circuit, settings, (text) => post({ type: 'progress', text }));
  post({ type: 'done', result });
};
