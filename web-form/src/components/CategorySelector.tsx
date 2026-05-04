import { motion } from 'framer-motion';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '../lib/schemas';
import { cn } from '../lib/cn';

interface CategorySelectorProps {
  value: FeedbackCategory | undefined;
  onChange: (value: FeedbackCategory) => void;
  error?: string;
}

export function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {FEEDBACK_CATEGORIES.map((cat, idx) => (
          <motion.button
            key={cat.value}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(cat.value)}
            className={cn(
              'flex items-center justify-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200',
              value === cat.value
                ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10 dark:border-brand-500 dark:bg-brand-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
            )}
          >
            <span className="text-2xl" aria-hidden="true">
              {cat.emoji}
            </span>
            <span
              className={cn(
                'text-sm font-medium sm:text-base',
                value === cat.value
                  ? 'text-brand-700 dark:text-brand-100'
                  : 'text-slate-700 dark:text-slate-200'
              )}
            >
              {cat.label}
            </span>
          </motion.button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
