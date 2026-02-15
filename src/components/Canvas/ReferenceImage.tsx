import { useEffect, useRef, useState, useCallback } from 'react';
import { Image as KonvaImage, Group, Transformer, Rect } from 'react-konva';
import Konva from 'konva';

/** Stable ID used in the selection system (like component IDs). */
export const REF_IMAGE_ID = 'ref-image';
/** Prefix used by getItemIdFromTarget to identify reference image nodes. */
export const REF_IMAGE_NAME = `refimage:${REF_IMAGE_ID}`;

type ReferenceImageProps = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  inverted: boolean;
  opacity: number;
  isSelected: boolean;
  zoom: number;
  onTransformEnd: (x: number, y: number, scale: number) => void;
};

export const ReferenceImage = ({
  src,
  x,
  y,
  width,
  height,
  inverted,
  opacity,
  isSelected,
  zoom,
  onTransformEnd,
}: ReferenceImageProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Load image from data URL
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  // Apply / remove invert filter (requires caching)
  useEffect(() => {
    const node = imageRef.current;
    if (!node || !image) return;

    if (inverted) {
      node.cache();
      node.filters([Konva.Filters.Invert]);
    } else {
      node.filters([]);
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [inverted, image, width, height]);

  // Attach / detach transformer when selection changes
  useEffect(() => {
    const tr = trRef.current;
    const group = groupRef.current;
    if (!tr || !group) return;

    if (isSelected) {
      tr.nodes([group]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [isSelected]);

  // Commit transform (resize) back to the store
  const handleTransformEnd = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    // Konva Transformer applies scaleX/scaleY to the node.
    // We need to convert that back into our own scale factor and reset
    // the node's scale to 1.
    const scaleX = group.scaleX();
    const newWidth = width * scaleX;
    // Derive the new reference-image scale from the new width
    // newWidth = naturalWidth * refScale  →  refScale = newWidth / naturalWidth
    // But we receive `width = naturalWidth * currentRefScale`, so
    // newRefScale = currentRefScale * scaleX
    const newX = group.x();
    const newY = group.y();

    // Reset node transforms so future renders use our own width/height
    group.scaleX(1);
    group.scaleY(1);

    onTransformEnd(newX, newY, scaleX);
  }, [width, onTransformEnd]);

  if (!image) return null;

  return (
    <>
      <Group
        ref={groupRef}
        name={REF_IMAGE_NAME}
        x={x}
        y={y}
      >
        {/* Invisible hit-area rect so clicks anywhere in the bounding box
            register as hitting the reference image (images with transparency
            can have "holes" in their hit region). */}
        <Rect
          width={width}
          height={height}
          fill="transparent"
          listening={true}
        />
        <KonvaImage
          ref={imageRef}
          image={image}
          width={width}
          height={height}
          opacity={opacity}
          listening={false}
        />
      </Group>

      {/* Transformer (resize handles) — visible only when selected */}
      <Transformer
        ref={trRef}
        // Keep aspect ratio
        keepRatio={true}
        enabledAnchors={[
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ]}
        // Style the handles
        anchorSize={8 / zoom}
        anchorStroke="#c8ff2e"
        anchorFill="#0e0e12"
        anchorCornerRadius={2 / zoom}
        borderStroke="#c8ff2e"
        borderStrokeWidth={1.5 / zoom}
        borderDash={[6 / zoom, 4 / zoom]}
        rotateEnabled={false}
        boundBoxFunc={(oldBox, newBox) => {
          // Prevent flipping / zero-size
          if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
            return oldBox;
          }
          return newBox;
        }}
        onTransformEnd={handleTransformEnd}
      />
    </>
  );
};
