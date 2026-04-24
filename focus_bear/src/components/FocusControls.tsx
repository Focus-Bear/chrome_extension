import React from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface FocusControlsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onBreak: boolean;
}

const FocusControls: React.FC<FocusControlsProps> = ({
  isRunning,
  onPlayPause,
  onReset,
  onBreak,
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      {!onBreak ? (
        <button
          onClick={onPlayPause}
          className="rounded-full bg-neutral-800 p-6 hover:bg-neutral-700"
        >
          {isRunning ? <Pause size={32} /> : <Play size={32} />}
        </button>
      ) : (
        <button onClick={onReset} className="rounded-full bg-neutral-800 p-6 hover:bg-neutral-700">
          <RotateCcw size={32} />
        </button>
      )}
    </div>
  );
};

export default FocusControls;
