import type { TimeControl } from "@shared";
import {
  BOARD_SIZE_OPTIONS,
  SCORE_TO_WIN_OPTIONS,
  TIME_CONTROL_PRESETS,
} from "@shared";
import type { AIDifficulty } from "@/lib/computer-ai";
import { AI_DIFFICULTY_LABELS } from "@/lib/engine/tiao-engine";
import type { PlayerColor } from "@shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GameConfigMode = "computer" | "local" | "multiplayer" | "matchmaking" | "tournament";

type GameConfigPanelProps = {
  mode: GameConfigMode;
  boardSize: number;
  onBoardSizeChange: (size: number) => void;
  scoreToWin: number;
  onScoreToWinChange: (score: number) => void;
  timeControl: TimeControl;
  onTimeControlChange: (tc: TimeControl) => void;
  // AI-specific
  difficulty?: AIDifficulty;
  onDifficultyChange?: (d: AIDifficulty) => void;
  selectedColor?: PlayerColor | "random";
  onColorChange?: (c: PlayerColor | "random") => void;
  // Action
  submitLabel: string;
  onSubmit: () => void;
  busy?: boolean;
};

const DIFFICULTIES: AIDifficulty[] = [1, 2, 3];

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7760]">
        {label}
      </p>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn(
        "border-[#dcc7a2]",
        active
          ? "pointer-events-none !border-[#6b5030] !bg-[#6b5030] !text-white"
          : "hover:bg-[#ede3d2]",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function GameConfigPanel({
  mode,
  boardSize,
  onBoardSizeChange,
  scoreToWin,
  onScoreToWinChange,
  timeControl,
  onTimeControlChange,
  difficulty,
  onDifficultyChange,
  selectedColor,
  onColorChange,
  submitLabel,
  onSubmit,
  busy,
}: GameConfigPanelProps) {
  const showTimeControl = mode !== "computer";
  const showAI = mode === "computer";
  const tcMatch = (tc: TimeControl, preset: { initialMs: number; incrementMs: number }) =>
    tc !== null && tc.initialMs === preset.initialMs && tc.incrementMs === preset.incrementMs;

  return (
    <div className="space-y-5">
      {showAI && onDifficultyChange && (
        <OptionGroup label="Difficulty">
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((level) => (
              <ToggleButton
                key={level}
                active={difficulty === level}
                onClick={() => onDifficultyChange(level)}
              >
                {AI_DIFFICULTY_LABELS[level]}
              </ToggleButton>
            ))}
          </div>
        </OptionGroup>
      )}

      {showAI && onColorChange && (
        <OptionGroup label="Play as">
          <div className="grid grid-cols-3 gap-2">
            <ToggleButton
              active={selectedColor === "random"}
              onClick={() => onColorChange("random")}
              className="flex items-center gap-2"
            >
              <span
                className="h-4 w-4 rounded-full border border-[#999]"
                style={{
                  background: "linear-gradient(135deg, #f4eee3 50%, #2d2622 50%)",
                }}
              />
              Random
            </ToggleButton>
            <ToggleButton
              active={selectedColor === "white"}
              onClick={() => onColorChange("white")}
              className="flex items-center gap-2"
            >
              <span className="h-4 w-4 rounded-full border border-[#ddd2bf] bg-[radial-gradient(circle_at_30%_28%,#fffdfa,#f4eee3_58%,#d9ccb8)]" />
              White
            </ToggleButton>
            <ToggleButton
              active={selectedColor === "black"}
              onClick={() => onColorChange("black")}
              className="flex items-center gap-2"
            >
              <span className="h-4 w-4 rounded-full border border-[#191410] bg-[radial-gradient(circle_at_30%_28%,#5d554f,#2d2622_58%,#0f0c0b)]" />
              Black
            </ToggleButton>
          </div>
        </OptionGroup>
      )}

      <OptionGroup label="Board Size">
        <div className="grid grid-cols-3 gap-2">
          {BOARD_SIZE_OPTIONS.map((size) => (
            <ToggleButton
              key={size}
              active={boardSize === size}
              onClick={() => onBoardSizeChange(size)}
            >
              {size}x{size}
            </ToggleButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Score to Win">
        <div className="grid grid-cols-4 gap-2">
          {SCORE_TO_WIN_OPTIONS.map((score) => (
            <ToggleButton
              key={score}
              active={scoreToWin === score}
              onClick={() => onScoreToWinChange(score)}
            >
              {score}
            </ToggleButton>
          ))}
        </div>
      </OptionGroup>

      {showTimeControl && (
        <OptionGroup label="Time Control">
          <div className="grid grid-cols-3 gap-2">
            <ToggleButton
              active={timeControl === null}
              onClick={() => onTimeControlChange(null)}
            >
              No limit
            </ToggleButton>
            {TIME_CONTROL_PRESETS.map((preset) => (
              <ToggleButton
                key={preset.label}
                active={tcMatch(timeControl, preset)}
                onClick={() =>
                  onTimeControlChange({
                    initialMs: preset.initialMs,
                    incrementMs: preset.incrementMs,
                  })
                }
              >
                <span className="flex flex-col items-center leading-tight">
                  <span className="font-bold">{preset.label}</span>
                  <span className="text-[0.6rem] uppercase opacity-60">{preset.category}</span>
                </span>
              </ToggleButton>
            ))}
          </div>
        </OptionGroup>
      )}

      <div className="border-t border-[#dbc6a2] pt-4">
        <Button className="w-full" onClick={onSubmit} disabled={busy}>
          {busy ? "Creating..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
