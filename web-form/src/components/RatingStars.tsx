import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '../lib/cn';

interface RatingStarsProps {
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
}

export function RatingStars({ value, onChange, error }: RatingStarsProps) {
  return (
    <div>
      <div className="flex gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <motion.button
            key={rating}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={() => onChange(rating)}
            aria-label={`Оценка ${rating} из 5`}
            className={cn(
              'rounded-lg p-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
              value && rating <= value
                ? 'text-amber-400'
                : 'text-slate-300 hover:text-amber-300 dark:text-slate-600'
            )}
          >
            <Star
              className="h-9 w-9 sm:h-10 sm:w-10"
              fill={value && rating <= value ? 'currentColor' : 'none'}
              strokeWidth={1.5}
            />
          </motion.button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
