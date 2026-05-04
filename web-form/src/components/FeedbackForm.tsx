import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ArrowLeft, MapPin } from 'lucide-react';

import { feedbackSchema, type FeedbackFormData } from '../lib/schemas';
import { submitFeedback } from '../lib/api';
import type { ShopInfo } from '../lib/api';
import { cn } from '../lib/cn';

import { CategorySelector } from './CategorySelector';
import { RatingStars } from './RatingStars';
import { PhotoUploader } from './PhotoUploader';
import { ContactPreferenceSelector } from './ContactPreferenceSelector';
import { ConsentCheckbox } from './ConsentCheckbox';
import { SuccessScreen } from './SuccessScreen';

interface FeedbackFormProps {
  shop: ShopInfo | null;
  shopCode: string;
  onBack: () => void;
}

export function FeedbackForm({ shop, shopCode, onBack }: FeedbackFormProps) {
  const formLoadTime = useMemo(() => Date.now(), []);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    mode: 'onTouched',
    defaultValues: {
      shopCode,
      website: '',
      submissionStartTime: formLoadTime,
      photos: [],
      consent: false as unknown as true,
    },
  });

  // Автоматически подставляем способ связи, если пользователь начал вводить контакт
  const phoneValue = watch('phone');
  const emailValue = watch('email');
  const contactPref = watch('contactPreference');

  useEffect(() => {
    if (!contactPref) {
      if (phoneValue && phoneValue.length > 5) setValue('contactPreference', 'phone');
      else if (emailValue && emailValue.length > 5) setValue('contactPreference', 'email');
    }
  }, [phoneValue, emailValue, contactPref, setValue]);

  const onSubmit = async (data: FeedbackFormData) => {
    setSubmitError(null);
    const res = await submitFeedback(data);
    if (res.ok) {
      setFeedbackId(res.feedbackId || null);
    } else {
      setSubmitError(res.error || 'Не удалось отправить отзыв. Попробуйте ещё раз.');
    }
  };

  if (feedbackId !== null) {
    return <SuccessScreen feedbackId={feedbackId} />;
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card space-y-6"
      noValidate
    >
      {/* Кнопка назад + заголовок */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 -ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Ваш отзыв
        </h1>
        {shop && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            <span>{shop.name}</span>
          </div>
        )}
      </div>

      {/* Honeypot */}
      <div className="honeypot" aria-hidden="true">
        <label>
          Сайт (не заполняйте)
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </label>
      </div>

      {/* Категория */}
      <div>
        <label className="label-base">О чём ваш отзыв?</label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CategorySelector
              value={field.value}
              onChange={field.onChange}
              error={errors.category?.message}
            />
          )}
        />
      </div>

      {/* Оценка */}
      <div>
        <label className="label-base">Оцените магазин (необязательно)</label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <RatingStars value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Имя */}
      <div>
        <label htmlFor="name" className="label-base">
          Как к вам обращаться? <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="given-name"
          placeholder="Анна"
          maxLength={50}
          className={cn('input-base', errors.name && 'input-error')}
          {...register('name')}
        />
        {errors.name && <p className="mt-1.5 text-sm text-rose-500">{errors.name.message}</p>}
      </div>

      {/* Текст отзыва */}
      <div>
        <label htmlFor="message" className="label-base">
          Расскажите подробнее <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          maxLength={2000}
          placeholder="Что вам понравилось или что можно улучшить?"
          className={cn('input-base resize-none', errors.message && 'input-error')}
          {...register('message')}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-sm text-rose-500">{errors.message?.message}</p>
          <p className="text-xs text-slate-400">{watch('message')?.length || 0} / 2000</p>
        </div>
      </div>

      {/* Фото */}
      <div>
        <label className="label-base">Фото (необязательно)</label>
        <Controller
          name="photos"
          control={control}
          render={({ field }) => (
            <PhotoUploader value={field.value || []} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Контакты */}
      <div className="space-y-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Если хотите получить ответ
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label-base text-xs">
              Телефон
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+375 29 123-45-67"
              className={cn('input-base', errors.phone && 'input-error')}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="label-base text-xs">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="anna@example.com"
              className={cn('input-base', errors.email && 'input-error')}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label-base text-xs">Куда отправить ответ?</label>
          <Controller
            name="contactPreference"
            control={control}
            render={({ field }) => (
              <ContactPreferenceSelector
                value={field.value}
                onChange={field.onChange}
                error={errors.contactPreference?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Согласие */}
      <Controller
        name="consent"
        control={control}
        render={({ field }) => (
          <ConsentCheckbox
            checked={!!field.value}
            onChange={(v) => field.onChange(v)}
            error={errors.consent?.message}
          />
        )}
      />

      {/* Ошибка отправки */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                Не удалось отправить
              </p>
              <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{submitError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Отправляем...
          </>
        ) : (
          'Отправить отзыв'
        )}
      </motion.button>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Поля, отмеченные <span className="text-rose-500">*</span>, обязательны
      </p>
    </motion.form>
  );
}
