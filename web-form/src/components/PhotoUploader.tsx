import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X } from 'lucide-react';

interface PhotoUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export function PhotoUploader({
  value,
  onChange,
  maxFiles = 3,
  maxSizeMb = 5,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Генерим превью для всех файлов
  useEffect(() => {
    const urls = value.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [value]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);

    // Валидация
    const valid: File[] = [];
    for (const f of files) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`Файл ${f.name}: формат не поддерживается`);
        continue;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`Файл ${f.name}: больше ${maxSizeMb} МБ`);
        continue;
      }
      valid.push(f);
    }

    const combined = [...value, ...valid].slice(0, maxFiles);
    onChange(combined);

    // Очистим input, чтобы можно было загрузить тот же файл повторно
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleSelect}
        className="sr-only"
        aria-label="Загрузить фотографии"
      />

      <div className="flex flex-wrap gap-2.5">
        <AnimatePresence>
          {previews.map((url, idx) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <img src={url} alt={`Фото ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-active:opacity-100"
                aria-label="Удалить фото"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {value.length < maxFiles && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs font-medium">Фото</span>
          </motion.button>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        До {maxFiles} фото, до {maxSizeMb} МБ каждое
      </p>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
