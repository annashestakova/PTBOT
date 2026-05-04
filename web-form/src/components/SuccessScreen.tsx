import { motion } from 'framer-motion';
import { CheckCircle2, Heart } from 'lucide-react';

interface SuccessScreenProps {
  feedbackId?: string;
}

export function SuccessScreen({ feedbackId }: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="card flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20"
      >
        <CheckCircle2 className="h-12 w-12 text-brand-600 dark:text-brand-400" strokeWidth={1.5} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-2 text-2xl font-bold text-slate-900 dark:text-white"
      >
        Спасибо за отзыв!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-1 max-w-sm text-base text-slate-600 dark:text-slate-300"
      >
        Мы получили ваше сообщение и обязательно его рассмотрим
      </motion.p>

      {feedbackId && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-sm text-slate-400 dark:text-slate-500"
        >
          Номер обращения: <span className="font-mono">#{feedbackId}</span>
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
      >
        <Heart className="h-4 w-4 text-rose-400" fill="currentColor" />
        <span>Ваше мнение делает нас лучше</span>
      </motion.div>
    </motion.div>
  );
}
