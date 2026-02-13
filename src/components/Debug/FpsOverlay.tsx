import { useEffect, useRef, useState } from 'react';

export function FpsOverlay() {
  const [fps, setFps] = useState(60);
  const [avgFps, setAvgFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Calculate instantaneous FPS
      const instantFps = Math.round(1000 / delta);
      setFps(instantFps);

      // Track for rolling average (last 60 frames)
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average FPS
      const avgDelta =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;
      setAvgFps(Math.round(1000 / avgDelta));

      rafIdRef.current = requestAnimationFrame(measureFps);
    };

    rafIdRef.current = requestAnimationFrame(measureFps);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Color code based on FPS
  const getFpsColor = (value: number) => {
    if (value >= 55) return '#4ade80'; // green
    if (value >= 30) return '#facc15'; // yellow
    if (value >= 20) return '#fb923c'; // orange
    return '#ef4444'; // red
  };

  return (
    <div
      className="fixed top-2 right-2 z-[9999] font-mono text-xs pointer-events-none"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '8px 12px',
        borderRadius: '6px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ color: getFpsColor(fps), fontWeight: 'bold' }}>
        FPS: {fps}
      </div>
      <div style={{ color: getFpsColor(avgFps), fontSize: '10px', marginTop: '2px' }}>
        Avg: {avgFps}
      </div>
    </div>
  );
}
