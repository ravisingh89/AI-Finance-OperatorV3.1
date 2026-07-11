"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

export interface NotificationState {
  permission:        NotificationPermission | "unsupported";
  supported:         boolean;
  requestPermission: () => Promise<void>;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const NOTIFIED_KEY  = "financeai_notified_ids";

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveNotifiedId(id: string) {
  try {
    const ids = getNotifiedIds();
    ids.add(id);
    // Keep only last 50
    const arr = Array.from(ids).slice(-50);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
  } catch {}
}

function sendNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon:  "/favicon.svg",
      badge: "/favicon.svg",
      tag,    // Prevents duplicate notifications with same tag
    });
    saveNotifiedId(tag);
  } catch {}
}

export function useNotifications(): NotificationState {
  const { getToken, isSignedIn } = useAuth();
  const supported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported"
  );

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!isSignedIn || Notification.permission !== "granted") return;
    try {
      const token  = await getToken();
      if (!token) return;
      const result = await api.checkAlerts(token);
      if (result.new_critical > 0) {
        const notified = getNotifiedIds();
        result.messages.forEach((msg, idx) => {
          const tag = `financeai_alert_${msg.slice(0, 30).replace(/\s/g, "_")}`;
          if (!notified.has(tag)) {
            sendNotification("⚠️ FinanceAI Alert", msg, tag);
          }
        });
      }
    } catch {}
  }, [getToken, isSignedIn]);

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      // Send a welcome notification
      sendNotification(
        "FinanceAI Alerts Active 🔔",
        "You'll receive alerts for critical financial events.",
        "financeai_welcome"
      );
      // Start polling immediately
      poll();
    }
  }, [supported, poll]);

  // Auto-poll when permission is granted
  useEffect(() => {
    if (!isSignedIn || !supported || permission !== "granted") return;

    // Poll once on mount
    poll();

    // Then every 5 minutes
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSignedIn, supported, permission, poll]);

  // Sync permission state if user changes it externally
  useEffect(() => {
    if (!supported) return;
    const id = setInterval(() => {
      if (Notification.permission !== permission) {
        setPermission(Notification.permission);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [supported, permission]);

  return { permission, supported, requestPermission };
}
