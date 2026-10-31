import { useEffect } from 'react';
import { markRestoreOk } from '@/lib/autosave';

/** Clears the autosave-restore flag after the first commit, unless the UI crashed. */
export function RestoreGuard() {
  useEffect(() => {
    markRestoreOk();
  }, []);
  return null;
}
