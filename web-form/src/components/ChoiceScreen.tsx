import { motion } from 'framer-motion';
import { MessageSquare, Send, MapPin } from 'lucide-react';
import type { ShopInfo } from '../lib/api';

interface ChoiceScreenProps {
  shop: ShopInfo | null;
  onChooseForm: () => void;
  onChooseTelegram: () => void;
}

export function ChoiceScreen({ shop, onChooseForm, onChooseTelegram }: ChoiceScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-center"
      >
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Поделитесь впечатлениями
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Ваш отзыв поможет нам стать лучше
        </p>
      </motion.div>

      {shop && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/10"
        >
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <p className="text-sm font-medium text-brand-900 dark:text-brand-100">{shop.name}</p>
            {shop.address && (
              <p className="mt-0.5 text-xs text-brand-700 dark:text-brand-300">{shop.address}</p>
            )}
          </div>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400"
      >
        Как удобнее оставить отзыв?
      </motion.p>

      <div className="space-y-3">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChooseForm}
          className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/20 dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Заполнить форму
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Быстро и анонимно</p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChooseTelegram}
          className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-sky-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-500"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-500/20 dark:text-sky-400 dark:group-hover:bg-sky-500 dark:group-hover:text-white">
            <Send className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Написать в Telegram
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Можно добавлять фото и общаться
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
