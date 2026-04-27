import { useEffect, useRef, useState } from "react";

interface UnfocusSession {
  unfocusStart: number;
  unfocusDuration: number; // in minutes
  unfocusIntention: string;
}

export const useUnfocusTimer = () => {
  const [intention, setIntention] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restoreFromStorage = () => {
    chrome.storage.local.get(
      ["unfocusStart", "unfocusDuration", "unfocusIntention"],
      (result: UnfocusSession) => {
        const { unfocusStart, unfocusDuration, unfocusIntention } = result;

        if (!unfocusStart || !unfocusDuration) return;

        const elapsed = Math.floor((Date.now() - unfocusStart) / 1000);
        const totalSeconds = unfocusDuration * 60;
        const remaining = totalSeconds - elapsed;

        if (remaining > 0) {
          setIntention(unfocusIntention || "");
          setTimeLeft(remaining);
          setTimerActive(true);

          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(intervalRef.current!);
                setTimerActive(false);
                chrome.storage.local.remove([
                  "unfocusStart",
                  "unfocusDuration",
                  "unfocusIntention",
                ]);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      },
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
