import NetInfo from "@react-native-community/netinfo";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { signAnswers } from "@app/shared";
import { api, ApiError } from "./api";
import { elapsedMs as clockElapsed, isExpired, resumedBaseMs, startClock, type Clock } from "./clock";
import { copy, userMessage } from "./copy";
import { makeEvent } from "./events";
import { kiosk } from "./kiosk";
import { useProctor } from "./proctor";
import { initialState, reduce } from "./state";
import { storage, type Session } from "./storage";
import type { EncryptedBlob } from "@app/shared";

/**
 * The controller: wires the pure state machine to the network, storage, the clock and the
 * device. Screens only read `state` and call the handlers.
 */
export function useRound1() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const [online, setOnline] = useState<boolean | null>(null);
  const [tick, setTick] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const keyRef = useRef("");
  const blobRef = useRef<EncryptedBlob | null>(null);
  const rulesVersion = useRef("");
  const clockRef = useRef<Clock | null>(null);
  const frozenElapsed = useRef<number | null>(null);
  const uploading = useRef(false);

  const used = () =>
    frozenElapsed.current ?? (clockRef.current ? clockElapsed(clockRef.current, performance.now(), Date.now()) : 0);
  const limitMs = (state.paper?.durationMinutes ?? 0) * 60_000;
  const remainingMs = Math.max(0, limitMs - used());
  void tick; // re-renders the countdown every half second

  const flag = useCallback((type: string, detail?: unknown) => {
    const s = stateRef.current;
    if (s.phase !== "test" && s.phase !== "review") return;
    dispatch({ type: "EVENT", event: makeEvent(type, detail) });
  }, []);
  useProctor(state.phase === "test" || state.phase === "review", flag);

  // ---- persistence: every meaningful change is saved, so a crash loses nothing
  const persist = useCallback(async () => {
    const s = stateRef.current;
    if (!s.paper || !keyRef.current) return;
    const session: Session = {
      code: s.code,
      rulesVersion: rulesVersion.current,
      paper: blobRef.current ?? ({ iv: "", data: "" } as Session["paper"]),
      answers: storage.sealAnswers(keyRef.current, s.answers),
      flagged: s.flagged,
      index: s.index,
      elapsedMs: Math.round(used()),
      savedAtWall: Date.now(),
      started: clockRef.current !== null,
      finished: s.finished,
      events: s.events,
    };
    await storage.save(session);
  }, []);
  useEffect(() => {
    if (state.paper && (state.phase === "test" || state.phase === "review" || state.phase === "submitting")) void persist();
  }, [state.answers, state.flagged, state.index, state.events, state.finished, state.phase, state.paper, persist]);

  // ---- a sleeping screen would background the app and be flagged, so keep it on during the test
  useEffect(() => {
    const live = state.phase === "test" || state.phase === "review";
    if (live) void activateKeepAwakeAsync("round1").catch(() => undefined);
    return () => {
      if (live) void deactivateKeepAwake("round1").catch(() => undefined);
    };
  }, [state.phase]);

  // ---- connectivity (for the ready screen and the upload step)
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected === true)), []);

  // ---- restore an interrupted session
  useEffect(() => {
    (async () => {
      const saved = await storage.load();
      if (!saved) return dispatch({ type: "BOOTED" });
      try {
        const paper = storage.openPaper(saved.key, saved.session.paper);
        const answers = saved.session.answers ? storage.openAnswers(saved.key, saved.session.answers) : {};
        keyRef.current = saved.key;
        blobRef.current = saved.session.paper;
        rulesVersion.current = saved.session.rulesVersion;
        const base = {
          code: saved.session.code,
          paper,
          answers,
          flagged: saved.session.flagged,
          index: saved.session.index,
          finished: saved.session.finished,
          rulesAccepted: true,
          events: saved.session.events,
        };
        if (saved.session.finished) {
          frozenElapsed.current = saved.session.elapsedMs;
          dispatch({ type: "RESTORED", state: { ...base, phase: "submitting" } });
        } else if (saved.session.started) {
          // the time the app spent closed counts: closing it does not stop the timer
          const usedMs = resumedBaseMs(saved.session.elapsedMs, saved.session.savedAtWall ?? Date.now(), Date.now());
          clockRef.current = startClock(usedMs, performance.now(), Date.now());
          kiosk.start();
          // and make the restart visible to the reviewer
          dispatch({ type: "RESTORED", state: { ...base, phase: "test", events: [...base.events, makeEvent("app_restart")] } });
        } else {
          dispatch({ type: "RESTORED", state: { ...base, phase: "ready" } });
        }
      } catch {
        await storage.clear();
        dispatch({ type: "BOOTED" });
      }
    })();
  }, []);

  // ---- upload (shared by submit, time-up and retry)
  const upload = useCallback(async () => {
    if (uploading.current) return;
    const s = stateRef.current;
    if (!s.paper) return;
    uploading.current = true;
    try {
      const net = await NetInfo.fetch();
      if (net.isConnected !== true) {
        dispatch({ type: "SUBMIT_FAILED", message: copy.uploadHint });
        return;
      }
      const elapsed = Math.round(frozenElapsed.current ?? used());
      await api.submit({
        code: s.code,
        answers: s.answers,
        elapsedMs: elapsed,
        signature: signAnswers(s.paper.signingSecret, s.answers, elapsed),
        events: s.events,
      });
      await storage.clear();
      keyRef.current = "";
      dispatch({ type: "SUBMITTED" });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      // 409 means the server already has a submission for this code: nothing is left to upload
      if (status === 409) {
        await storage.clear();
        dispatch({ type: "SUBMITTED" });
      } else {
        dispatch({ type: "SUBMIT_FAILED", message: userMessage(status, e instanceof ApiError ? e.message : "") });
      }
    } finally {
      uploading.current = false;
    }
  }, []);

  const submit = useCallback(() => {
    if (stateRef.current.finished) return;
    frozenElapsed.current = Math.round(used());
    kiosk.stop();
    dispatch({ type: "SUBMIT_STARTED" });
  }, []);

  // starting the upload happens after the phase change has been committed
  useEffect(() => {
    if (state.phase === "submitting" && state.finished && !state.error) void upload();
  }, [state.phase, state.finished, state.error, upload]);

  // ---- internet came back while an upload was waiting: try again without a tap
  const wasOnline = useRef<boolean | null>(null);
  useEffect(() => {
    const cameBack = online === true && wasOnline.current !== true;
    wasOnline.current = online;
    const s = stateRef.current;
    if (cameBack && s.phase === "submitting" && s.finished && s.error) {
      dispatch({ type: "ERROR_CLEARED" });
      void upload();
    }
  }, [online, upload]);

  // ---- the countdown, and auto-submit at zero
  useEffect(() => {
    if (state.phase !== "test" && state.phase !== "review") return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const s = stateRef.current;
      if (clockRef.current && s.paper && isExpired(s.paper.durationMinutes * 60_000, clockRef.current, performance.now(), Date.now())) submit();
    }, 500);
    return () => clearInterval(id);
  }, [state.phase, submit]);

  // ---- no accidental exit during the test
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const p = stateRef.current.phase;
      if (p === "test") return true;
      if (p === "review") {
        dispatch({ type: "REVIEW_CLOSED" });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // ---- handlers the screens call
  const loadRules = useCallback(async (code: string) => {
    dispatch({ type: "ERROR_CLEARED" });
    try {
      const info = await api.rules(code);
      rulesVersion.current = info.version;
      dispatch({ type: "RULES_LOADED", code, info });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      dispatch({ type: "ERROR", message: userMessage(status, e instanceof ApiError ? e.message : "") });
    }
  }, []);

  const acceptRules = useCallback(async () => {
    const code = stateRef.current.code;
    dispatch({ type: "RULES_ACCEPTED" });
    void api.event(code, [makeEvent("rules_accepted", { version: rulesVersion.current })]);
    try {
      const res = await api.paper(code);
      keyRef.current = res.key;
      const blob = { iv: res.iv, data: res.data };
      blobRef.current = blob;
      const paper = storage.openPaper(res.key, blob);
      await storage.save(
        {
          code,
          rulesVersion: rulesVersion.current,
          paper: blob,
          flagged: [],
          index: 0,
          elapsedMs: 0,
          savedAtWall: Date.now(),
          started: false,
          finished: false,
          events: [],
        },
        res.key,
      );
      dispatch({ type: "PAPER_READY", paper });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      dispatch({ type: "RESTORED", state: { phase: "rules", error: userMessage(status, e instanceof ApiError ? e.message : "") } });
    }
  }, []);

  const start = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected === true) {
      dispatch({ type: "ERROR", message: copy.offlineNeeded });
      return;
    }
    clockRef.current = startClock(0, performance.now(), Date.now());
    kiosk.start();
    dispatch({ type: "STARTED" });
  }, []);

  return {
    state,
    online,
    remainingMs,
    dispatch,
    loadRules,
    acceptRules,
    start,
    submit,
    retryUpload: () => {
      dispatch({ type: "ERROR_CLEARED" });
      void upload();
    },
    startOver: async () => {
      await storage.clear();
      frozenElapsed.current = null;
      clockRef.current = null;
      dispatch({ type: "RESET" });
    },
  };
}
