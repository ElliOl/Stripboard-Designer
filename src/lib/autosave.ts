import { useStripboardStore } from '@/store/stripboard';
import { sanitizeProject } from '@/lib/project-validation';

export const AUTOSAVE_KEY = 'stripboard-designer:autosave';
/** An autosave that was set aside because loading it crashed the app. */
export const BACKUP_KEY = 'stripboard-designer:autosave-backup';
/** Set (per tab session) while a restored autosave has not yet rendered successfully. */
const RESTORING_KEY = 'stripboard-designer:restoring';
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

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable: no crash-loop protection, but nothing else breaks
  }
}

let crashed = false;

/** Record that the UI crashed, so the restore is not treated as successful. */
export function noteCrash(): void {
  crashed = true;
}

/** Call once the restored board has rendered without crashing. */
export function markRestoreOk(): void {
  if (crashed) return;
  sessionSet(RESTORING_KEY, null);
}

/** Whether a set-aside autosave exists. */
export function hasAutosaveBackup(): boolean {
  try {
    return !!localStorage.getItem(BACKUP_KEY);
  } catch {
    return false;
  }
}

/** The set-aside autosave text, if any. */
export function getAutosaveBackup(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Remove the autosave, any set-aside copy and the restore flag. */
export function clearAllAutosaves(): void {
  clearAutosave();
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch (err) {
    console.warn('Could not clear autosave backup', err);
  }
  sessionSet(RESTORING_KEY, null);
}

/**
 * Load the saved project into the store. Returns true if one was restored.
 * Invalid data is sanitised; unusable data is set aside, not imported. If the
 * previous restore never rendered successfully, the autosave is set aside too.
 */
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    if (sessionGet(RESTORING_KEY)) {
      console.warn('Previous restore did not finish; setting the autosave aside');
      localStorage.setItem(BACKUP_KEY, raw);
      localStorage.removeItem(AUTOSAVE_KEY);
      sessionSet(RESTORING_KEY, null);
      return false;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
    const result = sanitizeProject(data);
    if (!result) {
      console.warn('Autosave is not a valid project; setting it aside');
      localStorage.setItem(BACKUP_KEY, raw);
      localStorage.removeItem(AUTOSAVE_KEY);
      return false;
    }
    sessionSet(RESTORING_KEY, '1');
    useStripboardStore.getState().importProject(result.project);
    return true;
  } catch (err) {
    console.warn('Could not restore autosave', err);
    return false;
  }
}

/** Save (debounced) whenever the board content changes. Returns a stop function. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    saveAutosave();
  };
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
      s.referenceImages === prev.referenceImages &&
      s.stripColor === prev.stripColor &&
      s.componentDefinitions === prev.componentDefinitions &&
      s.importReport === prev.importReport
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });
  // Write any pending change right away when the page is hidden or closed
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}
