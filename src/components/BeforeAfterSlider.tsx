import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

/** Draggable/tap-to-move before/after image reveal. */
const BeforeAfterSlider = ({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
}: BeforeAfterSliderProps) => {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square overflow-hidden rounded-2xl select-none touch-none ${className}`}
      onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img src={beforeUrl} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider bg-primary/80 text-primary-foreground px-2 py-1 rounded-full backdrop-blur-sm">
        {afterLabel}
      </span>
      <motion.div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.6)] pointer-events-none"
        style={{ left: `${pos}%` }}
        initial={false}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <span className="w-1 h-3 bg-primary rounded-full" />
            <span className="w-1 h-3 bg-primary rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BeforeAfterSlider;
