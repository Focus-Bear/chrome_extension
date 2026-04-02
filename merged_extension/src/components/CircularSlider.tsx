import React, { useState, useEffect } from "react";
import { IMaskInput } from "react-imask";
import "./CircularSlider.css";

interface CircularSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  label?: string;
}

const CircularSlider: React.FC<CircularSliderProps> = ({ value, min, max, onChange }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState(formatTime(value));

  useEffect(() => {
    setInputValue(formatTime(value));
  }, [value]);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function parseTime(val: string) {
    const [m, s] = val.split(":").map((x) => parseInt(x) || 0);
    return Math.max(min, Math.min(max, m * 60 + s));
  }

  const angle = ((value - min) / (max - min)) * 360;

  const handlePointerMove = (e: PointerEvent, svg: SVGSVGElement) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let theta = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (theta < 0) theta += 360;
    const newValue = min + (theta / 360) * (max - min);
    onChange(Math.round(newValue));
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    handlePointerMove(e.nativeEvent, e.currentTarget);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseTime(inputValue);
    setInputValue(formatTime(parsed));
    onChange(parsed);
  };

  return (
    <div className="circular-slider-container">
      <svg
        width={320}
        height={320}
        viewBox="0 0 220 220"
        onPointerDown={handleSvgPointerDown}
        onPointerUp={handleSvgPointerUp}
        onPointerMove={handleSvgPointerMove}
        className="circular-slider-svg"
      >
        {/* Background circle */}
        <circle className="slider-bg" cx="110" cy="110" r={radius} />

        {/* Progress circle */}
        <circle
          className="slider-progress"
          cx="110"
          cy="110"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (angle / 360) * circumference}
          transform="rotate(-90 110 110)"
        />

        {/* Knob */}
        <circle
          className="slider-knob"
          cx={110 + radius * Math.cos((angle - 90) * (Math.PI / 180))}
          cy={110 + radius * Math.sin((angle - 90) * (Math.PI / 180))}
          r={12}
        />
      </svg>

      <div className="circular-slider-input-container">
        {/* Masked input for work duration */}
        <IMaskInput
          mask="00:00"
          value={inputValue}
          unmask={false}
          onAccept={(value: string) => setInputValue(value)}
          onBlur={handleInputBlur}
          placeholder="MM:SS"
          className="workDuration-input"
        />
      </div>
    </div>
  );
};

export default CircularSlider;
