import { useEffect, useRef, useState } from "react";

interface FocusSession {
  focusStart: number;
  focusDuration: number; // in minutes
  focusIntention: string;
}

export const useFocusTimer = () => {
  const [intention, setIntention] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef =  useRef<ReturnType<typeof setInterval> | null>(null);

  const restoreFromStorage = () => {
    chrome.storage.local.get(
      ["focusStart", "focusDuration", "focusIntention"],
      (result: FocusSession) => {
        const { focusStart, focusDuration, focusIntention } = result;

        if (!focusStart || !focusDuration) return;

        const elapsed = Math.floor((Date.now() - focusStart) / 1000);
        const totalSeconds = focusDuration * 60;
        const remaining = totalSeconds - elapsed;

        if (remaining > 0) {
          setIntention(focusIntention || "");
          setTimeLeft(remaining);
          setTimerActive(true);

          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(intervalRef.current!);
                setTimerActive(false);
                chrome.storage.local.remove([
                  "focusStart",
                  "focusDuration",
                  "focusIntention",
                ]);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    );
  };

  useEffect(() => {
    restoreFromStorage();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { timeLeft, intention, timerActive, restoreFromStorage };
};
