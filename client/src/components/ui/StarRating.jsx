import { useState } from 'react';
import { Star } from 'lucide-react';
import { classNames } from '../../lib/classNames';

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function StarRating({
  value = 0,
  onChange,
  max = 5,
  size = 'md',
  showLabel = false,
  disabled = false,
  className = '',
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const isInteractive = Boolean(onChange) && !disabled;
  const sizeClass = SIZES[size] || SIZES.md;

  const currentValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={classNames('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= currentValue;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={!isInteractive}
              onClick={() => isInteractive && onChange?.(starNumber)}
              onMouseEnter={() => isInteractive && setHoverValue(starNumber)}
              onMouseLeave={() => isInteractive && setHoverValue(null)}
              className={classNames(
                'transition-transform focus-visible:outline-none',
                isInteractive
                  ? 'cursor-pointer hover:scale-115 active:scale-95'
                  : 'cursor-default pointer-events-none'
              )}
              aria-label={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
            >
              <Star
                className={classNames(
                  sizeClass,
                  'transition-colors',
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'fill-slate-100 text-slate-300'
                )}
              />
            </button>
          );
        })}
      </div>

      {showLabel && (
        <span className="ml-1 text-xs font-semibold text-slate-700">
          {Number(value).toFixed(1)} / {max}
        </span>
      )}
    </div>
  );
}

export default StarRating;
