import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import "./FocusTimer.css";

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

const WORK_PRESETS = [
  { label: "15 min", value: 15 * 60 },
  { label: "25 min", value: 25 * 60 },
  { label: "45 min", value: 45 * 60 },
  { label: "60 min", value: 60 * 60 },
];

const BREAK_PRESETS = [
  { label: "5 min", value: 5 * 60 },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
];

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const clampWorkMinutes = (n: number) => Math.min(999, Math.max(1, n));

const FocusTimer: React.FC = () => {
  const [task, setTask] = useState("");
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [customWorkMins, setCustomWorkMins] = useState(String(DEFAULT_WORK / 60));
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [started, setStarted] = useState(false);

  const intervalRef = useRef<number | null>(null);

  // Load persisted Focus Session state
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getFocusSessionState" }, (response) => {
      const saved = response?.state;
      if (saved) {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = saved;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : (saved.timeLeft ?? workDuration);
        setTask(task);
        setWorkDuration(workDuration);
        setCustomWorkMins(String(Math.floor(workDuration / 60)));
        setBreakDuration(breakDuration);
        setIsRunning(isRunning);
        setStarted(started);
        setOnBreak(onBreak);
        setTimeLeft(remaining);
      }
    });
  }, []);

  // Sync with external changes
  useEffect(() => {
    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== "local" || !changes.focusSessionState) return;
      const next = changes.focusSessionState.newValue;
      if (!next) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
        setStarted(false);
        setOnBreak(false);
        setWorkDuration((wd) => {
          setTimeLeft(wd);
          setCustomWorkMins(String(Math.floor(wd / 60)));
          return wd;
        });
      } else {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = next;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : (next.timeLeft ?? workDuration);
        setTask(task);
        setWorkDuration(workDuration);
        setCustomWorkMins(String(Math.floor(workDuration / 60)));
        setBreakDuration(breakDuration);
        setIsRunning(isRunning);
        setStarted(started);
        setOnBreak(onBreak);
        setTimeLeft(remaining);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // Countdown — background alarm drives phase transitions; this just ticks the visible counter.
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) return prev - 1;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, onBreak, workDuration, breakDuration]);

  const handlePause = () => {
    chrome.runtime.sendMessage({ action: "pauseFocusSession" }, () => setIsRunning(false));
  };

  const handleResume = () => {
    chrome.runtime.sendMessage({ action: "resumeFocusSession" }, () => setIsRunning(true));
  };

  const handleReset = () => {
    chrome.runtime.sendMessage({ action: "resetFocusSession" }, () => {
      setIsRunning(false);
      setOnBreak(false);
      setStarted(false);
      setTimeLeft(workDuration);
    });
  };

  const handleStart = () => {
    if (!task.trim()) return;
    chrome.runtime.sendMessage(
      {
        action: "startFocusSession",
        workDuration,
        breakDuration,
        task,
        onBreak: false,
      },
      () => {
        setIsRunning(true);
        setStarted(true);
        setOnBreak(false);
        setTimeLeft(workDuration);
      },
    );
  };

  const totalDuration = onBreak ? breakDuration : workDuration;
  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="ft-container">
      <div className="ft-content">
        {!started ? (
          // ─── SETUP VIEW ───────────────────────────────────────────────
          <div className="ft-setup">
            <header className="ft-screen-head">
              <h2 className="ft-screen-title">Focus Session</h2>
              <p className="ft-screen-sub">Set an intention, then commit to the timer.</p>
            </header>

            {/* Task input */}
            <div className="ft-field">
              <label className="ft-label" htmlFor="ft-task">
                What are you working on?
              </label>
              <input
                id="ft-task"
                type="text"
                value={task}
                placeholder="e.g. Write project report"
                onChange={(e) => setTask(e.target.value)}
                className="ft-input"
                maxLength={60}
              />
            </div>

            {/* Work duration card */}
            <section className="ft-card">
              <div className="ft-card-head">
                <span className="ft-card-title">Work duration</span>
                <span className="ft-card-meta">{Math.floor(workDuration / 60)} min</span>
              </div>
              <div className="ft-preset-grid ft-preset-grid--4">
                {WORK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    className={`ft-chip ${workDuration === p.value ? "ft-chip--active" : ""}`}
                    onClick={() => {
                      setWorkDuration(p.value);
                      setCustomWorkMins(String(p.value / 60));
                      setTimeLeft(p.value);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ft-custom-row">
                <span className="ft-custom-label">Custom</span>
                <div className="ft-custom-input-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={3}
                    value={customWorkMins}
                    className="ft-custom-input"
                    placeholder="30"
                    onFocus={() => setCustomWorkMins("")}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 3);
                      setCustomWorkMins(next);
                      const n = parseInt(next, 10);
                      if (next !== "" && !Number.isNaN(n)) {
                        const mins = clampWorkMinutes(n);
                        const sec = mins * 60;
                        setWorkDuration(sec);
                        setTimeLeft(sec);
                      }
                    }}
                    onBlur={() => {
                      const n = parseInt(customWorkMins, 10);
                      const mins = clampWorkMinutes(
                        Number.isNaN(n) ? Math.floor(workDuration / 60) : n,
                      );
                      setCustomWorkMins(String(mins));
                      const sec = mins * 60;
                      setWorkDuration(sec);
                      setTimeLeft(sec);
                    }}
                  />
                  <span className="ft-custom-unit">min</span>
                </div>
              </div>
            </section>

            {/* Break duration card */}
            <section className="ft-card">
              <div className="ft-card-head">
                <span className="ft-card-title">Break duration</span>
                <span className="ft-card-meta">{Math.floor(breakDuration / 60)} min</span>
              </div>
              <div className="ft-preset-grid ft-preset-grid--3">
                {BREAK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    className={`ft-chip ${breakDuration === p.value ? "ft-chip--active" : ""}`}
                    onClick={() => setBreakDuration(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Start button */}
            <button
              onClick={handleStart}
              className={`ft-start ${!task.trim() ? "ft-start--disabled" : ""}`}
              disabled={!task.trim()}
            >
              <Play size={14} fill="currentColor" />
              <span>Start Focus Session</span>
            </button>
            {!task.trim() && <p className="ft-helper">Enter a task above to begin.</p>}
          </div>
        ) : (
          // ─── ACTIVE TIMER VIEW ────────────────────────────────────────
          <div className="ft-active">
            <div className={`ft-phase ${onBreak ? "ft-phase--break" : "ft-phase--work"}`}>
              <span className="ft-phase-dot" />
              <span>{onBreak ? "Break time" : "Focus mode"}</span>
            </div>

            <p className="ft-active-task" title={task}>
              {task}
            </p>

            <div className="ft-ring-wrap">
              <svg className="ft-ring" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="var(--ring-track)"
                  strokeWidth="9"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={onBreak ? "var(--ft-accent-break)" : "var(--ft-accent)"}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 100 100)"
                  style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
                />
              </svg>
              <div className="ft-ring-inner">
                <div className="ft-ring-time">{formatTime(timeLeft)}</div>
                <div className="ft-ring-sub">{onBreak ? "until break ends" : "remaining"}</div>
              </div>
            </div>

            <div className="ft-controls">
              {isRunning ? (
                <button onClick={handlePause} className="ft-ctrl ft-ctrl--secondary">
                  <Pause size={14} />
                  <span>Pause</span>
                </button>
              ) : (
                <button onClick={handleResume} className="ft-ctrl ft-ctrl--primary">
                  <Play size={14} fill="currentColor" />
                  <span>Resume</span>
                </button>
              )}
              <button onClick={handleReset} className="ft-ctrl ft-ctrl--ghost">
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>

            {!onBreak && (
              <p className="ft-active-hint">
                Break starts automatically after {Math.floor(breakDuration / 60)} min.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusTimer;
