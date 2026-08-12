import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";
import Button from "../common/Button";

export default function PlaybackControls({
  step,
  totalSteps,
  onPrev,
  onNext,
  onPlay,
  onReset,
  playing,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={onPrev} disabled={step <= 0}>
        <ChevronLeft size={16} />
        Prev
      </Button>
      <Button variant="primary" onClick={onNext} disabled={step >= totalSteps - 1}>
        Next
        <ChevronRight size={16} />
      </Button>
      <Button variant="secondary" onClick={onPlay}>
        <Play size={16} />
        {playing ? "Pause" : "Play"}
      </Button>
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw size={16} />
        Reset
      </Button>
      <span className="ml-2 font-mono text-xs text-gray-500">
        Step {Math.min(step + 1, totalSteps)} / {totalSteps || 1}
      </span>
    </div>
  );
}
