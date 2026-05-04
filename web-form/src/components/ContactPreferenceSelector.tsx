import { motion } from 'framer-motion';
import { Mail, Phone, BellOff } from 'lucide-react';
import { cn } from '../lib/cn';

type ContactPreference = 'phone' | 'email' | 'none';

interface ContactPreferenceSelectorProps {
  value: ContactPreference | undefined;
  onChange: (value: ContactPreference) => void;
  error?: string;
}

const OPTIONS = [
  { value: 'phone' as const, label: 'Позвоните', icon: Phone },
  { value: 'email' as const, label: 'На почту', icon: Mail },
  { value: 'none' as const, label: 'Не нужно', icon: BellOff },
];

export function ContactPreferenceSelector({
  value,
  onChange,
  error,
}: ContactPreferenceSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all',
                active
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium sm:text-sm',
                  active
                    ? 'text-brand-700 dark:text-brand-100'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
