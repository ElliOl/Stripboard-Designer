import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStripboardStore } from '@/store/stripboard';
import { AUTOSAVE_KEY, clearAutosave, restoreAutosave, saveAutosave, startAutosave } from '@/lib/autosave';

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
    useStripboardStore.setState({ wires: [{ id: 'w1', from: { row: 0, col: 0 }, to: { row: 1, col: 1 } } as never] });
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
});
