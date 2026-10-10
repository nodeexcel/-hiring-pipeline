"use client";
import { useCallback, useEffect, useRef } from "react";

type Ev = { type: string; detail?: unknown; at: string };

/** Collects tab/window/paste signals and flushes them in batches to /api/events. */
export function useProctor(code: string | null, round: 1 | 2 | 3, active: boolean) {
  const queue = useRef<Ev[]>([]);

  const track = useCallback((type: string, detail?: unknown) => {
    queue.current.push({ type, detail, at: new Date().toISOString() });
  }, []);

  const flush = useCallback(async () => {
    if (!code || queue.current.length === 0) return;
    const events = queue.current.splice(0);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, round, events }),
        keepalive: true,
      });
    } catch {
      queue.current.unshift(...events);
    }
  }, [code, round]);

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => document.hidden && track("tab_switch");
    const onBlur = () => track("window_blur");
    const onPaste = (e: ClipboardEvent) =>
      track("paste", { size: e.clipboardData?.getData("text")?.length ?? 0 });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("paste", onPaste, true);
    const timer = setInterval(flush, 10_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("paste", onPaste, true);
      clearInterval(timer);
      void flush();
    };
  }, [active, flush, track]);

  return { track, flush, drain: () => queue.current.splice(0) };
}
