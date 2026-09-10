import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  badge?: string;
  buttonLabel?: string;
}

const AnimatedCounter = ({
  end,
  duration = 2,
  suffix = "",
  label,
  icon,
  to,
  badge,
  buttonLabel,
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  const cardContent = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={`glass-card rounded-2xl p-6 text-center nature-glow relative overflow-hidden transition-all h-full flex flex-col justify-between ${
        to ? "hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 cursor-pointer group" : ""
      }`}
    >
      {badge && (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}

      <div>
        <div className="text-primary mb-3 flex justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-4xl font-heading font-bold text-primary">
          {count.toLocaleString()}{suffix}
        </div>
        <div className="text-sm font-medium text-foreground mt-1.5">{label}</div>
      </div>

      {to && (
        <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] font-semibold text-primary flex items-center justify-center gap-1 group-hover:underline">
          <span>{buttonLabel || "Inspect Live Telemetry"}</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </motion.div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export default AnimatedCounter;

