import { useState, useEffect } from 'react';
import { ComponentLibrary } from './ComponentLibrary';
import { InspectorPanel } from './InspectorPanel';
import { LayersPanel } from './LayersPanel';
import { useStripboardStore } from '@/store/stripboard';

type Tab = 'library' | 'inspector' | 'layers';

export const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const selectedItems = useStripboardStore((s) => s.selectedItems);
  const importReport = useStripboardStore((s) => s.importReport);
  const referenceImages = useStripboardStore((s) => s.referenceImages);

  // Auto-switch to inspector when something is selected (but not reference images)
  useEffect(() => {
    if (selectedItems.length > 0) {
      // Check if all selected items are reference images
      const allAreReferenceImages = selectedItems.every((itemId) =>
        referenceImages.some((img) => img.id === itemId)
      );
      
      // Only auto-switch if at least one non-reference-image is selected
      if (!allAreReferenceImages) {
        setActiveTab('inspector');
      }
    }
  }, [selectedItems, referenceImages]);

  // Auto-switch to inspector after a netlist import
  useEffect(() => {
    if (importReport) {
      setActiveTab('inspector');
    }
  }, [importReport]);

  // Calculate badge count excluding reference images
  const nonImageSelectedCount = selectedItems.filter(
    (itemId) => !referenceImages.some((img) => img.id === itemId)
  ).length;

  return (
    <div className="w-72 h-full bg-[#111114] border-l border-[#1c1c22] flex flex-col shrink-0">
      {/* Tab bar */}
      <div className="flex shrink-0">
        <TabBtn
          active={activeTab === 'library'}
          onClick={() => setActiveTab('library')}
        >
          Library
        </TabBtn>
        <TabBtn
          active={activeTab === 'inspector'}
          onClick={() => setActiveTab('inspector')}
          badge={
            importReport && importReport.skippedComponents.length > 0
              ? importReport.skippedComponents.length
              : nonImageSelectedCount > 0
                ? nonImageSelectedCount
                : undefined
          }
          badgeVariant={
            importReport && importReport.skippedComponents.length > 0
              ? 'warning'
              : 'default'
          }
        >
          Inspector
        </TabBtn>
        <TabBtn
          active={activeTab === 'layers'}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </TabBtn>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' && <ComponentLibrary />}
        {activeTab === 'inspector' && <InspectorPanel />}
        {activeTab === 'layers' && <LayersPanel />}
      </div>
    </div>
  );
};

function TabBtn({
  active,
  onClick,
  badge,
  badgeVariant = 'default',
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  badgeVariant?: 'default' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-3 py-2.5 text-xs font-semibold tracking-wide
        transition-colors relative
        ${
          active
            ? 'text-[#ededf0] border-b-2 border-[#c8ff2e]'
            : 'text-[#52525b] hover:text-[#82829a] border-b-2 border-transparent'
        }
      `}
    >
      {children}
      {badge != null && (
        <span
          className={`ml-1.5 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold ${
            badgeVariant === 'warning' ? 'bg-amber-500' : 'bg-[#ff6352]'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
