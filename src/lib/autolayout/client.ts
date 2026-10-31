// Starts the auto layout worker and exposes progress, result and cancel.
import AutoLayoutWorker from './worker?worker&inline';
import type { WorkerMessage } from './worker';
import type { AutoLayoutCircuit } from './adapter';
import type { AutoLayoutSettings, RunResult } from './run-engine';

export type AutoLayoutJob = {
  result: Promise<RunResult>;
  /** Stops the worker; `result` never settles after this */
  cancel: () => void;
};

export function startAutoLayout(
  circuit: AutoLayoutCircuit,
  settings: AutoLayoutSettings,
  onProgress: (text: string) => void
): AutoLayoutJob {
  const worker = new AutoLayoutWorker();
  const result = new Promise<RunResult>((resolve) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'progress') onProgress(event.data.text);
      else {
        worker.terminate();
        resolve(event.data.result);
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      resolve({ ok: false, error: event.message || 'The layout worker failed.' });
    };
  });
  worker.postMessage({ circuit, settings });
  return { result, cancel: () => worker.terminate() };
}
