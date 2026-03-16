"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";

interface CompareProps {
  firstContent: React.ReactNode;
  secondContent: React.ReactNode;
  className?: string;
  firstLabel?: string;
  secondLabel?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandle?: boolean;
}

export const Compare = ({
  firstContent,
  secondContent,
  className,
  firstLabel = "Old",
  secondLabel = "New",
  initialSliderPercentage = 50,
  slideMode = "drag",
  showHandle = true,
}: CompareProps) => {
  const [sliderX, setSliderX] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderX(Math.max(0, Math.min(100, x)));
  }, []);

  const onMouseMove = (e: React.MouseEvent) => {
    if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
      handleMove(e.clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (slideMode === "drag" && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseDown={() => slideMode === "drag" && setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* First Content (Old) */}
      <div className="absolute inset-0 w-full h-full">
        {firstContent}
        {firstLabel && (
           <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30 backdrop-blur-sm z-20">
             {firstLabel}
           </div>
        )}
      </div>

      {/* Second Content (New) with Clip Path */}
      <motion.div
        className="absolute inset-0 w-full h-full bg-background z-10"
        style={{
          clipPath: `inset(0 0 0 ${sliderX}%)`,
        }}
      >
        {secondContent}
        {secondLabel && (
           <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded border border-green-500/30 backdrop-blur-sm z-20">
             {secondLabel}
           </div>
        )}
      </motion.div>

      {/* Handle */}
      {showHandle && (
        <div
          className="absolute top-0 bottom-0 z-30 flex items-center justify-center cursor-ew-resize"
          style={{ left: `${sliderX}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-1 h-full bg-white/20 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          <div className="absolute w-8 h-8 rounded-full border-2 border-white/30 bg-black/50 flex items-center justify-center backdrop-blur-md shadow-xl group">
             <div className="flex gap-0.5">
                <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                <div className="w-0.5 h-3 bg-white/50 rounded-full" />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
