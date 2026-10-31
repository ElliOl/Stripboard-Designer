import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStripboardStore } from '@/store/stripboard';
import { AUTOSAVE_KEY, BACKUP_KEY, clearAutosave, noteCrash, restoreAutosave, saveAutosave, startAutosave } from '@/lib/autosave';

function installStorage(opts: { maxLength?: number } = {}) {
  const map = new Map<string, string>();
  const stub = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.maxLength !== undefined && v.length > opts.maxLength) throw new Error('QuotaExceeded');
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
  };
  vi.stubGlobal('localStorage', stub);
  return map;
}

describe('autosave', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useStripboardStore.getState().reset();
  });

  it('saves and restores the project', () => {
    const map = installStorage();
    useStripboardStore.setState({ wires: [{ id: 'w1', netId: 'n', points: [{ row: 0, col: 0 }, { row: 1, col: 1 }] }] });
    saveAutosave();
    expect(map.has(AUTOSAVE_KEY)).toBe(true);
    useStripboardStore.getState().reset();
    expect(useStripboardStore.getState().wires).toHaveLength(0);
    expect(restoreAutosave()).toBe(true);
    expect(useStripboardStore.getState().wires).toHaveLength(1);
  });

  it('returns false when nothing or garbage is stored', () => {
    const map = installStorage();
    expect(restoreAutosave()).toBe(false);
    map.set(AUTOSAVE_KEY, '{not json');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(restoreAutosave()).toBe(false);
  });

  it('retries without reference images when storage is full', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = installStorage({ maxLength: 20000 });
    useStripboardStore.setState({
      referenceImages: [{ id: 'img', dataUrl: 'x'.repeat(30000) } as never],
    });
    saveAutosave();
    const saved = JSON.parse(map.get(AUTOSAVE_KEY)!);
    expect(saved.referenceImages ?? []).toHaveLength(0);
    expect(saved.board).toBeDefined();
  });

  it('gives up silently when storage always throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installStorage({ maxLength: 0 });
    expect(() => saveAutosave()).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('debounces saves after store changes and can be cleared', () => {
    vi.useFakeTimers();
    const map = installStorage();
    const stop = startAutosave();
    useStripboardStore.setState({ wires: [{ id: 'a' } as never] });
    useStripboardStore.setState({ wires: [{ id: 'b' } as never] });
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(JSON.parse(map.get(AUTOSAVE_KEY)!).wires[0].id).toBe('b');
    clearAutosave();
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    stop();
  });

  it('does not crash on a malformed autosave and sets it aside', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = installStorage();
    map.set(AUTOSAVE_KEY, '{"components":"abc"}');
    expect(restoreAutosave()).toBe(false);
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    expect(map.get('stripboard-designer:autosave-backup')).toBe('{"components":"abc"}');
  });

  it('flushes a pending save when the page is hidden', () => {
    vi.useFakeTimers();
    const map = installStorage();
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
    const stop = startAutosave();
    useStripboardStore.setState({ stripColor: '#123456' });
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    target.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(map.get(AUTOSAVE_KEY)!).stripColor).toBe('#123456');
    stop();
    vi.unstubAllGlobals();
  });

  it('rewrites a repaired autosave and keeps the original when items were dropped', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = installStorage();
    const raw = JSON.stringify({
      board: { rows: 8, cols: 12 },
      components: [
        { id: 'c1', reference: 'R1', definitionId: 'resistor', position: { row: 2, col: 2 }, rotation: 0,
          pins: [{ number: '1', position: { row: 1, col: 1 }, netId: { a: 1 } }] },
        { id: 'bad' },
      ],
    });
    map.set(AUTOSAVE_KEY, raw);
    expect(restoreAutosave()).toBe(true);
    const saved = JSON.parse(map.get(AUTOSAVE_KEY)!);
    expect(saved.components).toHaveLength(1);
    expect(saved.components[0].pins[0].extended).toBe(0);
    expect(saved.components[0].pins[0].netId).toBeUndefined();
    expect(map.get(BACKUP_KEY)).toBe(raw);
  });

  it('sets the autosave aside after a crash and starts empty next time', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = installStorage();
    useStripboardStore.setState({ wires: [{ id: 'w1', netId: 'n', points: [{ row: 0, col: 0 }] }] });
    saveAutosave();
    const saved = map.get(AUTOSAVE_KEY)!;
    noteCrash();
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    expect(map.get(BACKUP_KEY)).toBe(saved);
    // the crashed state must not be saved over it
    useStripboardStore.setState({ wires: [] });
    saveAutosave();
    expect(map.has(AUTOSAVE_KEY)).toBe(false);
    expect(map.get(BACKUP_KEY)).toBe(saved);
    useStripboardStore.getState().reset();
    expect(restoreAutosave()).toBe(false);
    expect(useStripboardStore.getState().wires).toHaveLength(0);
  });
});
