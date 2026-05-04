import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { useShop } from './hooks/useShop';
import { ChoiceScreen } from './components/ChoiceScreen';
import { FeedbackForm } from './components/FeedbackForm';
import { getBotDeepLink } from './lib/api';

// Имя бота — заменишь на своё после @BotFather
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'prodtovary_feedback_bot';

type Screen = 'choice' | 'form';

export function App() {
  const { shop, shopCode, loading } = useShop();
  const [screen, setScreen] = useState<Screen>('choice');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!shopCode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            Магазин не указан
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Пожалуйста, отсканируйте QR-код на плакате в магазине, чтобы оставить отзыв.
          </p>
        </motion.div>
      </main>
    );
  }

  const handleChooseTelegram = () => {
    window.location.href = getBotDeepLink(shopCode, BOT_USERNAME);
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6 sm:py-10">
      <AnimatePresence mode="wait">
        {screen === 'choice' && (
          <motion.div key="choice" exit={{ opacity: 0, y: -20 }}>
            <ChoiceScreen
              shop={shop}
              onChooseForm={() => setScreen('form')}
              onChooseTelegram={handleChooseTelegram}
            />
          </motion.div>
        )}

        {screen === 'form' && (
          <motion.div key="form" exit={{ opacity: 0, y: -20 }}>
            <FeedbackForm shop={shop} shopCode={shopCode} onBack={() => setScreen('choice')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500"
      >
        © {new Date().getFullYear()} ОАО «Продтовары»
      </motion.footer>
    </main>
  );
}
