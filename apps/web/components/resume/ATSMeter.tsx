"use client";

import { motion } from "framer-motion";
import { scoreColor, scoreLabel } from "@/lib/utils";

export function ATSMeter({ score, size = 160 }: { score: number; size?: number }) {
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const stroke = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="-mt-[55%] flex flex-col items-center">
        <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
        <div className="text-xs text-muted-foreground">ATS / 100</div>
        <div className={`text-xs font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</div>
      </div>
    </div>
  );
}
