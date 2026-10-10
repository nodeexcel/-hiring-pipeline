"use client";
import { useState } from "react";

// Fixed format: toLocaleTimeString() differs between server and browser and breaks hydration.
const utcTime = (iso: string) => `${iso.slice(11, 19)} UTC`;

export function Replay({ snapshots }: { snapshots: { at: string; language: string | null; code: string }[] }) {
  const [i, setI] = useState(Math.max(0, snapshots.length - 1));
  if (snapshots.length === 0) return <p className="text-sm text-muted-foreground">No snapshots recorded.</p>;
  const s = snapshots[i];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <label htmlFor="replay-range">Code replay</label>
        <span>
          Snapshot {i + 1}/{snapshots.length} · {utcTime(new Date(s.at).toISOString())} · {s.language}
        </span>
      </div>
      <input
        id="replay-range"
        type="range"
        min={0}
        max={snapshots.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        className="w-full accent-neutral-400"
      />
      <pre className="max-h-80 overflow-auto rounded-xl border border-card-edge bg-black/30 p-4 font-mono text-xs leading-relaxed">{s.code}</pre>
    </div>
  );
}
