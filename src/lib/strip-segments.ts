import type { Cut, Strip } from './types';

/**
 * All cuts on a strip: the `cuts` list merged with the legacy `breaks` list
 * (treated as drill cuts), one per column.
 */
export function getStripCuts(strip: Strip): Cut[] {
  const cutsByCol = new Map<number, Cut>();
  (strip.cuts || []).forEach((cut) => {
    cutsByCol.set(cut.col, cut);
  });
  (strip.breaks || []).forEach((col) => {
    if (!cutsByCol.has(col)) {
      cutsByCol.set(col, { col, type: 'drill' });
    }
  });
  return Array.from(cutsByCol.values());
}

/**
 * Split a strip into its continuous copper segments, honouring drill and
 * slice cuts as well as the legacy `breaks` list.
 */
export function getStripSegments(strip: Strip): Array<{ startCol: number; endCol: number }> {
  const allCuts = getStripCuts(strip);
  
  if (allCuts.length === 0) {
    return [{ startCol: strip.startCol, endCol: strip.endCol }];
  }

  const segments: Array<{ startCol: number; endCol: number }> = [];
  
  // Separate drill and slice cuts - they break strips differently
  // Drill cuts: break at integer column (hole is destroyed, breaks before and after)
  // Slice cuts: break at half-integer column (between two holes, both holes remain)
  const drillCols = allCuts.filter(c => c.type === 'drill').map(c => c.col);
  const sliceCols = allCuts.filter(c => c.type === 'slice').map(c => c.col);
  
  // For drill cuts at column N: segment ends at N-1, next starts at N+1 (skip N)
  // For slice cuts at column N.5: segment ends at N, next starts at N+1
  const allBreaks: Array<{ breakBefore: number; isDrill: boolean }> = [
    ...drillCols.map(col => ({ breakBefore: col, isDrill: true })),
    ...sliceCols.map(col => ({ breakBefore: Math.ceil(col), isDrill: false }))
  ].sort((a, b) => a.breakBefore - b.breakBefore);
  
  let start = strip.startCol;
  for (const { breakBefore, isDrill } of allBreaks) {
    if (breakBefore > start) {
      segments.push({ startCol: start, endCol: breakBefore - 1 });
    }
    // For drill cuts, skip the drilled column; for slice cuts, continue from the break
    start = isDrill ? breakBefore + 1 : breakBefore;
  }

  if (start <= strip.endCol) {
    segments.push({ startCol: start, endCol: strip.endCol });
  }

  return segments;
}
