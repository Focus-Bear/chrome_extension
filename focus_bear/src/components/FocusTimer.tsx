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

const FocusTimer: React.FC = () => {
  const [task, setTask] = useState("");
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
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
          return wd;
        });
      } else {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = next;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : (next.timeLeft ?? workDuration);
        setTask(task);
        setWorkDuration(workDuration);
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
                      setTimeLeft(p.value);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Custom work input */}
              <div className="custom-input-row">
                <label className="input-label-sm">Custom (MM:SS)</label>
                <input
                  type="text"
                  defaultValue={formatTime(workDuration)}
                  className="custom-time-input"
                  placeholder="MM:SS"
                  onBlur={(e) => {
                    const [m, s] = e.target.value.split(":").map(Number);
                    const total = (m || 0) * 60 + (s || 0);
                    if (total >= 60 && total <= 3600) {
                      setWorkDuration(total);
                      setTimeLeft(total);
                    } else {
                      e.target.value = formatTime(workDuration);
                    }
                  }}
                />
              </div>
            </div>

            {/* Break duration presets */}
            <div className="duration-section">
              <label className="input-label">
                <Coffee size={16} style={{ display: "inline", marginRight: 6 }} />
                Break Duration
              </label>
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
                <>
                  <span style={{ marginRight: 6 }}>🎯</span> Focus Mode
                </>
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

            {/* Progress bar */}
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(1 - progress) * 100}%`,
                  backgroundColor: onBreak ? "#4CAF50" : "#e9902c",
                  transition: "width 0.8s ease, background-color 0.5s ease",
                }}
              />
            </div>
            <div className="progress-labels">
              <span>0:00</span>
              <span>{formatTime(totalDuration)}</span>
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
