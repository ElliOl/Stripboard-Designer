import { useStripboardStore } from '@/store/stripboard';
import { sanitizeProject } from '@/lib/project-validation';

export const AUTOSAVE_KEY = 'stripboard-designer:autosave';
/** The last few autosaves that were set aside (a JSON list, newest first). */
export const BACKUP_KEY = 'stripboard-designer:autosave-backup';
/** A pending "your board was set aside" notice for the next page view. */
export const NOTICE_KEY = 'stripboard-designer:autosave-notice';
const MAX_BACKUPS = 3;
/** Set (per tab session) while a restored autosave has not yet rendered successfully. */
const RESTORING_KEY = 'stripboard-designer:restoring';
const DEBOUNCE_MS = 1000;

/** Set once the UI has crashed in this page; stops autosaving. */
let crashed = false;

function writeProject(withImages: boolean): boolean {
  const project = useStripboardStore.getState().exportProject();
  const data = withImages ? project : { ...project, referenceImages: undefined };
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  return true;
}

/** Save the current project now. Retries without reference images if storage is full. */
export function saveAutosave(): void {
  // After a UI crash the live state is suspect: never write it over the saved project
  if (crashed) return;
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


/**
 * Record that the UI crashed (any crash the ErrorBoundary catches). The stored
 * autosave is set aside under the backup key straight away, in localStorage so
 * it holds across reloads and other tabs, and autosaving stops so the crashed
 * state cannot overwrite it. The next start therefore opens empty.
 */
export function noteCrash(): void {
  crashed = true;
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      setAside(raw, 'crash');
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  } catch (err) {
    console.warn('Could not set the autosave aside after a crash', err);
  }
}

/** Call once the restored board has rendered without crashing. */
export function markRestoreOk(): void {
  if (crashed) return;
  sessionSet(RESTORING_KEY, null);
}

export type BackupReason = 'crash' | 'invalid data' | 'repaired';
export type AutosaveBackup = { t: number; reason: BackupReason; data: string };

/** The set-aside autosaves, newest first. Migrates the old single-value format. */
export function getAutosaveBackups(): AutosaveBackup[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is AutosaveBackup => !!e && typeof e === 'object' && typeof e.data === 'string' && typeof e.t === 'number',
      );
    }
    // Old format: the project text itself
    return [{ t: 0, reason: 'invalid data', data: raw }];
  } catch {
    return [];
  }
}

/** True for a project with nothing on it, which is not worth keeping as a backup. */
function isEmptyBoard(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
    const none = (v: unknown) => v === undefined || (Array.isArray(v) && v.length === 0);
    return none(d.components) && none(d.wires);
  } catch {
    return false;
  }
}

/** Set an autosave aside as the newest backup (keeping the last few) and queue a notice. */
function setAside(raw: string, reason: BackupReason): void {
  if (isEmptyBoard(raw)) return;
  const list = getAutosaveBackups().filter((b) => b.data !== raw);
  list.unshift({ t: Date.now(), reason, data: raw });
  let keep = list.slice(0, MAX_BACKUPS);
  for (;;) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(keep));
      break;
    } catch (err) {
      if (keep.length <= 1) {
        console.warn('Could not keep a backup of the autosave', err);
        return;
      }
      keep = keep.slice(0, -1); // storage full: drop the oldest
    }
  }
  setNotice(reason, true);
}

export type AutosaveNotice = { reason: BackupReason; hasBackup: boolean };

function setNotice(reason: BackupReason, hasBackup: boolean): void {
  try {
    localStorage.setItem(NOTICE_KEY, JSON.stringify({ reason, hasBackup }));
  } catch {
    // no notice if storage is unavailable
  }
}

/** The pending notice, if an autosave was set aside or repaired on this start. */
export function getAutosaveNotice(): AutosaveNotice | null {
  try {
    const n = JSON.parse(localStorage.getItem(NOTICE_KEY) ?? 'null');
    if (n && typeof n.reason === 'string') return { reason: n.reason, hasBackup: !!n.hasBackup };
  } catch {
    // ignore
  }
  return null;
}

export function dismissAutosaveNotice(): void {
  try {
    localStorage.removeItem(NOTICE_KEY);
  } catch {
    // ignore
  }
}

/** Whether a set-aside autosave exists. */
export function hasAutosaveBackup(): boolean {
  return getAutosaveBackups().length > 0;
}

/** The newest set-aside autosave text, if any. */
export function getAutosaveBackup(): string | null {
  return getAutosaveBackups()[0]?.data ?? null;
}

/** Save the newest set-aside autosave as a .json file. */
export function downloadAutosaveBackup(): void {
  const raw = getAutosaveBackup();
  if (!raw) return;
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stripboard-autosave-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** Remove the autosave, any set-aside copy and the restore flag. */
export function clearAllAutosaves(): void {
  clearAutosave();
  try {
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(NOTICE_KEY);
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
      setAside(raw, 'crash');
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
      setAside(raw, 'invalid data');
      localStorage.removeItem(AUTOSAVE_KEY);
      return false;
    }
    sessionSet(RESTORING_KEY, '1');
    useStripboardStore.getState().importProject(result.project);
    if (result.dropped > 0 || result.fixed > 0) {
      // Keep the original if anything was lost, then store the repaired project
      if (result.dropped > 0) setAside(raw, 'repaired');
      else setNotice('repaired', false);
      saveAutosave();
    }
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
