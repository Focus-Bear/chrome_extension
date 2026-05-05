import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";

interface IntentionContextProps {
  intention: string;
  setIntention: (value: string) => void;
  isIntentionSet: boolean;
  timer: number;
  setTimer: (minutes: number) => void;
  timeLeft: number;
  setTimeLeft: (seconds: number) => void;
  timerActive: boolean;
  setTimerActive: (active: boolean) => void;
  startUnfocusTimer: (minutes: number) => void;
  stopUnfocusTimer: () => void;
}

const IntentionContext = createContext<IntentionContextProps>({
  intention: "",
  setIntention: () => {},
  isIntentionSet: false,
  timer: 0,
  setTimer: () => {},
  timeLeft: 0,
  setTimeLeft: () => {},
  timerActive: false,
  setTimerActive: () => {},
  startUnfocusTimer: () => {},
  stopUnfocusTimer: () => {},
});

export const IntentionProvider = ({ children }: { children: ReactNode }) => {
  const [intention, setIntention] = useState("");
  const [isIntentionSet, setIsIntentionSet] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("intention");
    if (saved) {
      setIntention(saved);
      setIsIntentionSet(saved.trim().length > 0);
    }

    const handleIntentionEvent = (e: Event) => {
      const { detail } = e as CustomEvent;
      sessionStorage.setItem("intention", detail);
      setIntention(detail);
      setIsIntentionSet(detail.trim().length > 0);
    };

    window.addEventListener("intention-saved", handleIntentionEvent);
    return () => {
      window.removeEventListener("intention-saved", handleIntentionEvent);
    };
  }, []);

  const startUnfocusTimer = (minutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const totalSeconds = minutes * 60;
    setTimer(minutes);
    setTimeLeft(totalSeconds);
    setTimerActive(true);

    chrome.storage.local.set({
      unfocusStart: Date.now(),
      unfocusDuration: minutes,
      unfocusIntention: intention,
    });

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimerActive(false);
          chrome.storage.local.remove(["unfocusStart", "unfocusDuration", "unfocusIntention"]);
          window.dispatchEvent(new CustomEvent("show-popup-again"));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopUnfocusTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerActive(false);
    setTimeLeft(0);
  };

  return (
    <IntentionContext.Provider
      value={{
        intention,
        setIntention: (val: string) => {
          setIntention(val);
          setIsIntentionSet(val.trim().length > 0);
        },
        isIntentionSet,
        timer,
        setTimer,
        timeLeft,
        setTimeLeft,
        timerActive,
        setTimerActive,
        startUnfocusTimer,
        stopUnfocusTimer,
      }}
    >
      {children}
    </IntentionContext.Provider>
  );
};

export const useIntention = () => useContext(IntentionContext);
