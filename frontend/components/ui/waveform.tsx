import { cn } from "@/lib/utils";

type WaveformProps = {
  className?: string;
  active?: boolean;
  bars?: number;
  tone?: "muted" | "ink" | "on-dark";
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { height: 16, barWidth: 2, gap: 2 },
  md: { height: 24, barWidth: 3, gap: 2 },
  lg: { height: 40, barWidth: 3, gap: 3 }
} as const;

const toneMap = {
  muted: "bg-muted",
  ink: "bg-ink",
  "on-dark": "bg-on-dark"
} as const;

export function Waveform({
  className,
  active = false,
  bars = 8,
  tone = "muted",
  size = "md"
}: WaveformProps) {
  const spec = sizeMap[size];

  return (
    <div
      aria-hidden="true"
      className={cn("flex items-end", className)}
      style={{
        gap: `${spec.gap}px`,
        height: `${spec.height}px`
      }}
    >
      {Array.from({ length: bars }).map((_, index) => {
        const baseDelay = active ? 60 : 100;
        const phase = 0.55 + ((index % 4) * 0.12);

        return (
          <span
            key={index}
            className={cn(
              "block origin-bottom rounded-full",
              toneMap[tone],
              active ? "animate-[waveform-active_600ms_ease-in-out_infinite_alternate]" : "animate-[waveform-idle_1200ms_ease-in-out_infinite_alternate]"
            )}
            style={{
              width: `${spec.barWidth}px`,
              height: "100%",
              animationDelay: `${index * baseDelay}ms`,
              transform: `scaleY(${phase})`
            }}
          />
        );
      })}
    </div>
  );
}
