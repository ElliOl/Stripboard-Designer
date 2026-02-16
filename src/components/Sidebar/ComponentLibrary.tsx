import { useEffect, useState, useRef } from 'react';
import { Cpu, Zap, Radio, CircuitBoard, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import type { ComponentDefinition } from '@/lib/types';

const categoryIcons: Record<string, React.ElementType> = {
  IC: Cpu,
  Passive: Zap,
  Interface: Radio,
  Discrete: CircuitBoard,
  Custom: Box,
};

const categoryColors: Record<string, string> = {
  IC: '#c8ff2e',
  Passive: '#c8ff2e',
  Interface: '#c8ff2e',
  Discrete: '#c8ff2e',
  Custom: '#a78bfa',
};

export const ComponentLibrary = () => {
  const { componentDefinitions, loadComponentDefinitions } =
    useStripboardStore();
  
  // Track which categories are expanded (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // Use a ref to prevent double loading in React strict mode
  const libraryLoadedRef = useRef(false);

  useEffect(() => {
    // Only load the library once to avoid overwriting dynamic definitions
    if (libraryLoadedRef.current) return;
    libraryLoadedRef.current = true;
    
    fetch('/components/library.json')
      .then((res) => res.json())
      .then((data: ComponentDefinition[]) => {
        loadComponentDefinitions(data);
        // Categories start collapsed by default
      })
      .catch((err) =>
        console.error('Failed to load component library:', err)
      );
  }, [loadComponentDefinitions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedComponents = componentDefinitions.reduce(
    (acc, comp) => {
      if (!acc[comp.category]) {
        acc[comp.category] = [];
      }
      acc[comp.category].push(comp);
      return acc;
    },
    {} as Record<string, ComponentDefinition[]>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-1">
        {Object.entries(groupedComponents).map(([category, components]) => {
          const Icon = categoryIcons[category] || Cpu;
          const color = categoryColors[category] || '#82829a';
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-[#141418] transition-colors"
                style={{ color }}
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <Icon size={13} />
                <span>{category}</span>
                <span className="text-[#38384a] font-normal ml-auto">
                  {components.length}
                </span>
              </button>

              {isExpanded && (
                <div className="px-1.5 space-y-0.5">
                  {components.map((component) => (
                    <div
                      key={component.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('component', component.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="
                        px-2.5 py-1.5 rounded-lg
                        bg-transparent hover:bg-[#19191d]
                        text-[#a6a6b8] text-xs
                        cursor-grab active:cursor-grabbing
                        transition-colors
                      "
                    >
                      <div className="font-medium">{component.name}</div>
                      {component.metadata?.description && (
                        <div className="text-[10px] text-[#4a4a5a] mt-0.5 leading-tight">
                          {component.metadata.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 text-[10px] text-[#38384a] leading-relaxed shrink-0">
        <p>Drag components onto the board to place them.</p>
        <p>Select + drag to reposition. R to rotate.</p>
      </div>
    </div>
  );
};
