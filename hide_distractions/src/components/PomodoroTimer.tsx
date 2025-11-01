import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import CircularSlider from "./CircularSlider";
import InputMask from "react-input-mask";
import "./PomodoroTimer.css";

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

const PomodoroTimer: React.FC = () => {
  const [task, setTask] = useState("");
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [started, setStarted] = useState(false);
  const [breakInput, setBreakInput] = useState("05:00");
  const [manualBreakEdit, setManualBreakEdit] = useState(false);

  const intervalRef = useRef<number | null>(null);

  // Load persisted state
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getPomodoroState" }, (response) => {
      const saved = response?.state;
      if (saved) {
        const { task, workDuration, breakDuration, endTime, isRunning, onBreak, started } = saved;
        const remaining = isRunning
          ? Math.max(Math.floor((endTime - Date.now()) / 1000), 0)
          : saved.timeLeft ?? workDuration;
        setTask(task);
        setWorkDuration(workDuration);
        setBreakDuration(breakDuration);
        setBreakInput(formatTime(breakDuration));
        setIsRunning(isRunning);
        setStarted(started);
        setOnBreak(onBreak);
        setTimeLeft(remaining);
      }
    });
  }, []);

  // Auto update break duration based on workDuration if user hasn't edited manually
  useEffect(() => {
    if (!manualBreakEdit) {
      const auto = Math.floor(workDuration / 5);
      setBreakDuration(auto);
      setBreakInput(formatTime(auto));
    }
  }, [workDuration]);

  // Countdown
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) return prev - 1;
        if (!onBreak) {
          setOnBreak(true);
          return breakDuration;
        } else {
          handleReset();
          return workDuration;
        }
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, onBreak, workDuration, breakDuration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const parseTime = (val: string): number | null => {
    const parts = val.split(":").map((p) => Number(p));
    if (parts.length !== 2) return null;
    const [m, s] = parts;
    if (isNaN(m) || isNaN(s) || m < 0 || s < 0 || s > 59) return null;
    const total = m * 60 + s;
    if (total < 10 || total > 30 * 60) return null;
    return total;
  };

  const commitBreakInput = () => {
    const parsed = parseTime(breakInput);
    if (parsed !== null) {
      setBreakDuration(parsed);
      setBreakInput(formatTime(parsed));
      setManualBreakEdit(true);
      return parsed;
    } else {
      setBreakInput(formatTime(breakDuration)); // revert invalid input
      return breakDuration;
    }
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({ action: "pausePomodoro" }, () => setIsRunning(false));
  };

  const handleResume = () => {
    chrome.runtime.sendMessage({ action: "resumePomodoro" }, () => setIsRunning(true));
  };

  const handleReset = () => {
    chrome.runtime.sendMessage({ action: "resetPomodoro" }, () => {
      setIsRunning(false);
      setOnBreak(false);
      setStarted(false);
      setTimeLeft(workDuration);
      setManualBreakEdit(false);
      const autoBreak = Math.floor(workDuration / 5);
      setBreakDuration(autoBreak);
      setBreakInput(formatTime(autoBreak));
    });
  };

  const handleStart = () => {
    const finalBreak = commitBreakInput();
    chrome.runtime.sendMessage(
      { action: "startPomodoro", workDuration, breakDuration: finalBreak, task, onBreak: false },
      () => {
        setIsRunning(true);
        setStarted(true);
        setOnBreak(false);
        setTimeLeft(workDuration);
        setManualBreakEdit(true);
      }
    );
  };

  const progress = onBreak
    ? 1 - timeLeft / breakDuration
    : 1 - timeLeft / workDuration;

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-content">
        <div className="task-input-container">
          <input
            type="text"
            value={task}
            placeholder="Task to be completed"
            onChange={(e) => setTask(e.target.value)}
            className="task-input"
            maxLength={30}
          />
        </div>

        {!started ? (
          <div className="sliders-section">
            <CircularSlider
              value={workDuration}
              min={60}
              max={60 * 60}
              onChange={(val) => {
                setWorkDuration(val);
                setManualBreakEdit(false);
              }}
              label="Work Duration"
            />

            {/* Break Duration with react-input-mask */}
            <div className="breakduration-input">
              <label className="break-title">Break Duration:</label>
              <input
                value={breakInput}
                onChange={(e) => setBreakInput(e.target.value)}
                onBlur={commitBreakInput}
                placeholder="MM:SS"
                className="break-input"
              />
            </div>

            <div
              className="home-controls"
              style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
            >
              <button onClick={handleStart} className="control-button">
                <Play size={32} fill="#fffcf6" stroke="#fffcf6" />
              </button>
            </div>
          </div>
        ) : (
          <div className="timer-section">
            <div className="timer-message">{onBreak ? "Make sure to take a break!" : "Keep focused!"}</div>

            <svg className="timer-svg">
              <circle cx="96" cy="96" r="90" stroke="#ffe4c6" strokeWidth="15" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="90"
                stroke="#e9902c"
                strokeWidth="15"
                fill="none"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={(1 - progress) * 2 * Math.PI * 90}
                strokeLinecap="round"
              />
              <text
                x="96"
                y="96"
                textAnchor="middle"
                dominantBaseline="middle"
                className="timer-text"
                transform="rotate(90, 96, 96)"
                fontWeight="bold"
                fontSize="large"
              >
                {formatTime(timeLeft)}
              </text>
            </svg>

            <div
              className="timer-controls"
              style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", width: "100%" }}
            >
              {isRunning ? (
                <button onClick={handlePause} className="control-button">
                  <Pause size={32} stroke="white" strokeWidth={1} fill="white" />
                </button>
              ) : (
                <button onClick={handleResume} className="control-button">
                  <Play size={32} stroke="white" strokeWidth={1} fill="white" />
                </button>
              )}

              <button onClick={handleReset} className="control-button">
                <RotateCcw size={32} stroke="white" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;