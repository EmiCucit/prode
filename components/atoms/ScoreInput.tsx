"use client";

interface Props {
  id: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export default function ScoreInput({ id, value, onChange, disabled }: Props) {
  function adjust(delta: number) {
    onChange(Math.max(0, Math.min(99, value + delta)));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={disabled || value <= 0}
        className="h-8 w-8 rounded-md border border-border bg-secondary text-foreground text-base font-bold disabled:opacity-30 hover:bg-accent transition-colors"
        aria-label="Restar"
      >
        −
      </button>
      <input
        id={id}
        type="number"
        min={0}
        max={99}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(0, Math.min(99, v)));
        }}
        className="w-12 rounded-md border border-border bg-input text-center text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => adjust(1)}
        disabled={disabled || value >= 99}
        className="h-8 w-8 rounded-md border border-border bg-secondary text-foreground text-base font-bold disabled:opacity-30 hover:bg-accent transition-colors"
        aria-label="Sumar"
      >
        +
      </button>
    </div>
  );
}
