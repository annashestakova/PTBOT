import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { motion } from 'framer-motion';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function ConsentCheckbox({ checked, onChange, error }: ConsentCheckboxProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 select-none">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
            checked
              ? 'border-brand-600 bg-brand-600'
              : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800',
            error && !checked && 'border-rose-400'
          )}
        >
          <motion.span
            initial={false}
            animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </motion.span>
        </button>
        <span
          className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
          onClick={() => onChange(!checked)}
        >
          Я согласен(на) на обработку моих персональных данных в соответствии с{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={(e) => e.stopPropagation()}
          >
            политикой конфиденциальности
          </a>
        </span>
      </label>
      {error && <p className="ml-9 mt-1.5 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
