// ─── Router result → board ──────────────────────────────────
//
// Converts the layout Vero produced back into this app's project data,
// keeping the original net ids and names, references, values and ids.

import type { Component, ComponentDefinition, Net, ProjectData } from '@/lib/types';
import { convertVeroProject, type VeroProject } from '@/lib/vero-import';
import type { AdaptedCircuit } from './adapter';

export type AutoLayoutBoard = {
  project: ProjectData;
  /** One line per edge pad: what to wire to it off the board */
  wiringNotes: string[];
  warnings: string[];
};

export function layoutToBoard(
  veroProject: VeroProject,
  adapted: AdaptedCircuit,
  nets: Net[],
  library: ComponentDefinition[]
): AutoLayoutBoard {
  const { project } = convertVeroProject(veroProject, library, {
    nets,
    nodeNets: adapted.nodeNets,
    definitionHints: adapted.definitionHints,
  });

  // Put back what the user's board already had
  const components: Component[] = project.components.map((c) => {
    const source = adapted.sources[c.reference];
    if (!source) return c;
    return {
      ...c,
      id: source.id,
      reference: source.reference,
      value: source.value,
      ...(source.footprint ? { footprint: source.footprint } : {}),
      ...(source.ledColor ? { ledColor: source.ledColor } : {}),
      ...(source.color ? { color: source.color } : {}),
    };
  });

  const warnings = [...adapted.warnings];
  for (const part of adapted.offboard) {
    warnings.push(`${part.reference}${part.value ? ` (${part.value})` : ''}: ${part.reason}`);
  }
  const wiringNotes = adapted.padNotes.map((p) => `${p.label}: ${p.connections.join(', ')}`);

  return { project: { ...project, components }, wiringNotes, warnings };
}
