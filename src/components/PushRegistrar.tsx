"use client";

import { useEffect } from "react";

// When SNAG runs inside the native iOS shell, register for push and hand the
// APNs device token to the backend. Everything is dynamically imported inside
// the effect so nothing Capacitor-related loads during SSR or in a plain
// browser (where isNativePlatform() is false and this is a no-op).
export function PushRegistrar() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      await PushNotifications.addListener("registration", async (t) => {
        try {
          await fetch("/api/register-device", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: t.value, platform: Capacitor.getPlatform() }),
          });
        } catch {
          /* fail open — we'll re-register next launch */
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[snag] push registration error", err);
      });

      const perm = await PushNotifications.checkPermissions();
      let receive = perm.receive;
      if (receive === "prompt" || receive === "prompt-with-rationale") {
        receive = (await PushNotifications.requestPermissions()).receive;
      }
      if (receive === "granted" && !cancelled) {
        await PushNotifications.register();
      }
    })().catch((err) => console.error("[snag] push setup failed", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
