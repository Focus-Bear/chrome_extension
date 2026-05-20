import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
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

  // Countdown
  // When the local counter reaches 0, stop ticking;
  // the background alarm updates focusSessionState in storage, and the
  // onChanged listener above syncs all UI state automatically.
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) return prev - 1;
        // transition the phase and update storage.
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
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * progress;

  return (
    <div className="focus-timer-container">
      <div className="focus-timer-content">
        {!started ? (
          // ─── SETUP VIEW ───────────────────────────────────────────────────
          <div className="setup-view">
            <h2 className="setup-title">Focus Session</h2>

            {/* Task input */}
            <div className="task-input-container">
              <label className="input-label">What are you working on?</label>
              <input
                type="text"
                value={task}
                placeholder="e.g. Write project report"
                onChange={(e) => setTask(e.target.value)}
                className="task-input"
                maxLength={60}
              />
            </div>

            {/* Work duration presets */}
            <div className="duration-section">
              <label className="input-label">Work Duration</label>
              <div className="preset-grid">
                {WORK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    className={`preset-btn ${workDuration === p.value ? "preset-btn--active" : ""}`}
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
              {/* Custom work: minutes only, max 3 digits, 1–999 min */}
              <div className="custom-input-row">
                <label className="input-label-sm">Custom (min)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  value={customWorkMins}
                  className="custom-time-input"
                  placeholder="e.g. 30"
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
              </div>
            </div>

            {/* Break duration presets */}
            <div className="duration-section">
              <label className="input-label">Break Duration</label>
              <div className="preset-grid">
                {BREAK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    className={`preset-btn ${breakDuration === p.value ? "preset-btn--active" : ""}`}
                    onClick={() => setBreakDuration(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              className={`start-btn ${!task.trim() ? "start-btn--disabled" : ""}`}
              disabled={!task.trim()}
            >
              <Play size={20} fill="currentColor" style={{ marginRight: 8 }} />
              Start Focus Session
            </button>
            {!task.trim() && <p className="task-warning">Please enter a task to get started</p>}
          </div>
        ) : (
          // ─── ACTIVE TIMER VIEW ────────────────────────────────────────────
          <div className="timer-view">
            {/* Phase badge */}
            <div className={`phase-badge ${onBreak ? "phase-badge--break" : "phase-badge--work"}`}>
              {onBreak ? (
                <>
                  <Coffee size={16} style={{ marginRight: 6 }} /> Break Time
                </>
              ) : (
                <>Focus Mode</>
              )}
            </div>

            {/* Task label */}
            <p className="active-task">{task}</p>

            {/* Circular progress ring */}
            <div className="ring-container">
              <svg className="timer-svg" viewBox="0 0 200 200">
                {/* Background track */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#ffe4c6"
                  strokeWidth="12"
                />
                {/* Progress arc */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={onBreak ? "#4CAF50" : "#e9902c"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 100 100)"
                  style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
                />
                {/* Time text */}
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="timer-text"
                >
                  {formatTime(timeLeft)}
                </text>
                {/* Phase text below time */}
                <text
                  x="100"
                  y="120"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="timer-subtext"
                >
                  {onBreak ? "until break ends" : "remaining"}
                </text>
              </svg>
            </div>

            {/* Controls */}
            <div className="timer-controls">
              {isRunning ? (
                <button onClick={handlePause} className="control-btn control-btn--secondary">
                  <Pause size={24} />
                  Pause
                </button>
              ) : (
                <button onClick={handleResume} className="control-btn control-btn--primary">
                  <Play size={24} fill="currentColor" />
                  Resume
                </button>
              )}
              <button onClick={handleReset} className="control-btn control-btn--danger">
                <RotateCcw size={24} />
                Reset
              </button>
            </div>

            {/* Break hint */}
            {!onBreak && (
              <p className="break-hint">
                Break starts automatically after {formatTime(breakDuration)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusTimer;
