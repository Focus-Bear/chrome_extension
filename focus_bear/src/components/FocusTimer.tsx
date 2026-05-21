import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square } from "lucide-react";
import "./FocusTimer.css";

// ─── Constants ────────────────────────────────────────────────────────
const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const WORK_MIN = 5;
const WORK_MAX = 120;
const BREAK_MIN = 1;
const BREAK_MAX = 30;
const WORK_MARKERS = [15, 25, 45, 60, 90];
const BREAK_MARKERS = [5, 10, 15, 20];

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// ─── Duration Slider ──────────────────────────────────────────────────
interface DurationSliderProps {
  label: string;
  valueMin: number;
  min: number;
  max: number;
  markers: number[];
  onChange: (v: number) => void;
}

const DurationSlider: React.FC<DurationSliderProps> = ({
  label,
  valueMin,
  min,
  max,
  markers,
  onChange,
}) => {
  const pct = ((valueMin - min) / (max - min)) * 100;
  return (
    <section className="ft-card">
      <div className="ft-card-head">
        <span className="ft-card-title">{label}</span>
        <span className="ft-value-pill" aria-live="polite">
          <span className="ft-value-pill-num">{valueMin}</span>
          <span className="ft-value-pill-unit">min</span>
        </span>
      </div>
      <div className="ft-slider-wrap">
        <div className="ft-slider-track-bg" />
        <div className="ft-slider-track-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          className="ft-slider"
          min={min}
          max={max}
          step={1}
          value={valueMin}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMin}
        />
      </div>
      <div className="ft-slider-markers" role="presentation">
        {markers.map((m) => (
          <button
            type="button"
            key={m}
            className={`ft-marker ${valueMin === m ? "ft-marker--active" : ""}`}
            onClick={() => onChange(m)}
            aria-label={`Set ${label.toLowerCase()} to ${m} minutes`}
          >
            {m}
          </button>
        ))}
      </div>
    </section>
  );
};

// ─── Focus Timer ──────────────────────────────────────────────────────
const FocusTimer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState("");
  const [workMin, setWorkMin] = useState(DEFAULT_WORK_MIN);
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK_MIN);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MIN * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [started, setStarted] = useState(false);

  const intervalRef = useRef<number | null>(null);

  // Load persisted state
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getFocusSessionState" }, (response) => {
      const saved = response?.state;
      if (saved) {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = saved;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : (saved.timeLeft ?? workDuration);
        setTask(task ?? "");
        setWorkMin(Math.floor(workDuration / 60));
        setBreakMin(Math.floor(breakDuration / 60));
        setIsRunning(!!isRunning);
        setStarted(!!started);
        setOnBreak(!!onBreak);
        setTimeLeft(remaining);
      }
      setLoading(false);
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
        setWorkMin((wm) => {
          setTimeLeft(wm * 60);
          return wm;
        });
      } else {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = next;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : (next.timeLeft ?? workDuration);
        setTask(task ?? "");
        setWorkMin(Math.floor(workDuration / 60));
        setBreakMin(Math.floor(breakDuration / 60));
        setIsRunning(!!isRunning);
        setStarted(!!started);
        setOnBreak(!!onBreak);
        setTimeLeft(remaining);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // Countdown — background alarm drives phase transitions
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
  }, [isRunning, onBreak, workMin, breakMin]);

  const handlePause = () =>
    chrome.runtime.sendMessage({ action: "pauseFocusSession" }, () => setIsRunning(false));

  const handleResume = () =>
    chrome.runtime.sendMessage({ action: "resumeFocusSession" }, () => setIsRunning(true));

  const handleEnd = () =>
    chrome.runtime.sendMessage({ action: "resetFocusSession" }, () => {
      setIsRunning(false);
      setOnBreak(false);
      setStarted(false);
      setTimeLeft(workMin * 60);
    });

  const handleStart = () => {
    if (!task.trim()) return;
    chrome.runtime.sendMessage(
      {
        action: "startFocusSession",
        workDuration: workMin * 60,
        breakDuration: breakMin * 60,
        task,
        onBreak: false,
      },
      () => {
        setIsRunning(true);
        setStarted(true);
        setOnBreak(false);
        setTimeLeft(workMin * 60);
      },
    );
  };

  const totalDuration = (onBreak ? breakMin : workMin) * 60;
  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="ft-container">
      <div className={`ft-content${loading ? " ft-content--loading" : " ft-content--ready"}`}>
        {!loading && !started ? (
          // ─── SETUP VIEW ─────────────────────────────────────────────
          <div className="ft-setup">
            <header className="ft-screen-head">
              <h2 className="ft-screen-title">Focus Session</h2>
              <p className="ft-screen-sub">Set an intention, then commit to the timer.</p>
            </header>

            <div className="ft-field">
              <label className="ft-label" htmlFor="ft-task">
                What are you working on?
              </label>
              <div className="ft-input-shell">
                <input
                  id="ft-task"
                  type="text"
                  value={task}
                  placeholder="Type your intention here…"
                  onChange={(e) => setTask(e.target.value)}
                  className="ft-input"
                  maxLength={60}
                  aria-describedby="ft-task-help"
                />
              </div>
              <p id="ft-task-help" className="ft-help">
                {task.length}/60 characters
              </p>
            </div>

            <DurationSlider
              label="Work duration"
              valueMin={workMin}
              min={WORK_MIN}
              max={WORK_MAX}
              markers={WORK_MARKERS}
              onChange={(v) => {
                setWorkMin(v);
                setTimeLeft(v * 60);
              }}
            />

            <DurationSlider
              label="Break duration"
              valueMin={breakMin}
              min={BREAK_MIN}
              max={BREAK_MAX}
              markers={BREAK_MARKERS}
              onChange={(v) => setBreakMin(v)}
            />

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
        ) : !loading ? (
          // ─── ACTIVE TIMER VIEW ──────────────────────────────────────
          <div className="ft-active">
            <div className={`ft-phase ${onBreak ? "ft-phase--break" : "ft-phase--work"}`}>
              {/* <span className="ft-phase-dot" /> */}
              <span>{onBreak ? "Break time" : "Your Goal:"}</span>
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
                <>
                  <button onClick={handleResume} className="ft-ctrl ft-ctrl--primary">
                    <Play size={14} fill="currentColor" />
                    <span>Resume</span>
                  </button>
                  <button onClick={handleEnd} className="ft-ctrl ft-ctrl--ghost">
                    <Square size={14} />
                    <span>End Session</span>
                  </button>
                </>
              )}
            </div>

            {!onBreak && isRunning && (
              <p className="ft-active-hint">Break starts automatically after {breakMin} min.</p>
            )}
            {!isRunning && (
              <p className="ft-active-hint">
                Paused. Resume to keep your focus, or end the session.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FocusTimer;
