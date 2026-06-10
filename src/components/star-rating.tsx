import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: number; // 0-5 (can be float for display)
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
};

export function StarRating({ value, onChange, size = 18, readOnly, className }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} role="group" aria-label="rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = display >= n;
        const half = !filled && display >= n - 0.5;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={(e) => { e.stopPropagation(); onChange?.(n); }}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default",
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(
                filled ? "fill-yellow-400 text-yellow-400" : half ? "fill-yellow-400/50 text-yellow-400" : "fill-transparent text-current opacity-50",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}