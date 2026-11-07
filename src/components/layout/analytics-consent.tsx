"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const preferenceKey = "techidea-analytics-consent";
type Choice = "accepted" | "rejected" | null;
const advertisingDenied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function AnalyticsConsent({ measurementId }: { measurementId: string }) {
  const path = usePathname();
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const started = useRef(false);
  const lastPath = useRef("");
  const liveChoice = useRef<Choice>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const acceptButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function sync() {
      let next: Choice = null;
      try {
        const stored = localStorage.getItem(preferenceKey);
        // Only restore consent if this browser can also persist a withdrawal.
        if (stored === "accepted") localStorage.setItem(preferenceKey, stored);
        if (stored === "accepted" || stored === "rejected") next = stored;
      } catch { /* Unavailable storage defaults to no analytics. */ }
      liveChoice.current = next;
      if (next !== "accepted" && started.current) {
        stopAnalytics(measurementId);
        location.reload();
        return;
      }
      setChoice(next);
      setReady(true);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [measurementId]);

  useEffect(() => {
    if (choice !== "accepted" || liveChoice.current !== choice) return;
    if (!started.current) {
      started.current = true;
      const w = analyticsWindow();
      w.dataLayer ??= [];
      w.gtag = function (..._args: unknown[]) { w.dataLayer!.push(arguments); };
      w.gtag("consent", "default", { analytics_storage: "denied", ...advertisingDenied });
      w.gtag("consent", "update", { analytics_storage: "granted", ...advertisingDenied });
      w.gtag("js", new Date());
      w.gtag("config", measurementId, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: location.origin + path, page_referrer: "",
      });
      const script = document.createElement("script");
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
      document.head.appendChild(script);
    }
    if (lastPath.current !== path) {
      lastPath.current = path;
      analyticsWindow().gtag?.("event", "page_view", {
        send_to: measurementId, page_location: location.origin + path, page_referrer: "", page_title: document.title,
      });
    }
  }, [choice, path, measurementId]);

  useEffect(() => { if (editing) acceptButton.current?.focus(); }, [editing]);

  function choose(next: Exclude<Choice, null>) {
    liveChoice.current = next;
    try { localStorage.setItem(preferenceKey, next); } catch { /* Keep this page's choice in memory. */ }
    if (next === "rejected") {
      stopAnalytics(measurementId);
      if (started.current) { location.reload(); return; }
    } else {
      analyticsWindow()[`ga-disable-${measurementId}`] = false;
    }
    setChoice(next);
    setEditing(false);
    if (editing) changeButton.current?.focus();
  }
  if (!ready) return null;
  return <>
    {path === "/privacy-policy" && <div className="page-width"><button ref={changeButton} className="button button-light" onClick={() => setEditing(true)}>Change analytics preferences</button></div>}
    {(editing || choice === null) && <section aria-labelledby="analytics-choice-title" className="analytics-choice">
      <h2 id="analytics-choice-title">Analytics preferences</h2>
      <p>Allow Google Analytics to measure page visits using analytics cookies? You can use every tool either way and change your choice on the privacy page.</p>
      <div><button ref={acceptButton} className="button button-light" onClick={() => choose("accepted")}>Accept</button>
      <button className="button button-light" onClick={() => choose("rejected")}>Reject</button>
      <a href="/privacy-policy">Privacy policy</a></div>
    </section>}
  </>;
}

function analyticsWindow() {
  return window;
}
function stopAnalytics(id: string) {
  const w = analyticsWindow();
  w[`ga-disable-${id}`] = true;
  // Unload the active tag on withdrawal. Calling it here can itself send a consent ping.
  const parts = location.hostname.split(".");
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0].trim();
    if (!/^_ga(?:$|_)/.test(name)) continue;
    document.cookie = name + "=; Max-Age=0; Path=/";
    for (let i = 0; i < parts.length - 1; i++) {
      document.cookie = name + "=; Max-Age=0; Path=/; Domain=" + parts.slice(i).join(".");
    }
  }
}

