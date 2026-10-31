import { useStripboardStore } from '@/store/stripboard';

export const AUTOSAVE_KEY = 'stripboard-designer:autosave';
const DEBOUNCE_MS = 1000;

function writeProject(withImages: boolean): boolean {
  const project = useStripboardStore.getState().exportProject();
  const data = withImages ? project : { ...project, referenceImages: undefined };
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  return true;
}

/** Save the current project now. Retries without reference images if storage is full. */
export function saveAutosave(): void {
  try {
    writeProject(true);
    return;
  } catch (err) {
    console.warn('Autosave failed, retrying without reference images', err);
  }
  try {
    writeProject(false);
  } catch (err) {
    console.warn('Autosave failed', err);
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (err) {
    console.warn('Could not clear autosave', err);
  }
}

/** Load the saved project into the store. Returns true if one was restored. */
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;
    useStripboardStore.getState().importProject(data);
    return true;
  } catch (err) {
    console.warn('Could not restore autosave', err);
    return false;
  }
}

/** Save (debounced) whenever the board content changes. Returns a stop function. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useStripboardStore.subscribe((s, prev) => {
    if (
      s.components === prev.components &&
      s.strips === prev.strips &&
      s.wires === prev.wires &&
      s.nets === prev.nets &&
      s.pcbs === prev.pcbs &&
      s.rows === prev.rows &&
      s.cols === prev.cols &&
      s.netGroups === prev.netGroups &&
      s.referenceImages === prev.referenceImages
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(saveAutosave, DEBOUNCE_MS);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
