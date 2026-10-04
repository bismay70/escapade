"use client";

import { MotionConfig } from "motion/react";
import { createContext, ReactNode, useContext, useSyncExternalStore } from "react";
import { Waves, Pause } from "lucide-react";

type MotionLevel = "full" | "reduced";
const storageKey = "vacanes-home-motion";
const changedEvent = "vacanes-motion-changed";
let temporaryPreference: MotionLevel = "full";
const MotionContext = createContext(false);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changedEvent, callback);
  };
}

function snapshot(): MotionLevel {
  try {
    const preference = window.localStorage.getItem(storageKey);
    return preference === "reduced" ? "reduced" : preference === "full" ? "full" : temporaryPreference;
  } catch { return temporaryPreference; }
}

export const usePageMotion = () => useContext(MotionContext);

export default function HomeMotion({ children }: { children: ReactNode }) {
  // This page defaults to the visible motion requested for the site. Its own
  // persistent Reduced motion control does not change operating-system settings.
  const preference = useSyncExternalStore(subscribe, snapshot, () => "full" as MotionLevel);
  const enabled = preference === "full";
  function toggle() {
    temporaryPreference = enabled ? "reduced" : "full";
    try { window.localStorage.setItem(storageKey, temporaryPreference); } catch { /* The toggle still works for this visit. */ }
    window.dispatchEvent(new Event(changedEvent));
  }
  return <MotionContext.Provider value={enabled}>
    <MotionConfig reducedMotion={enabled ? "never" : "always"}>
      <div data-home-motion={preference} className="home-motion-surface">
        {children}
        <button type="button" className="home-motion-toggle" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "Use reduced motion on this page" : "Enable full motion on this page"} title="Choose how much this page moves">
          {enabled ? <Waves size={16} /> : <Pause size={15} />}
          <span>{enabled ? "Full motion" : "Reduced motion"}</span>
        </button>
      </div>
    </MotionConfig>
  </MotionContext.Provider>;
}
