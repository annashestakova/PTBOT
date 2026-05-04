import { z } from 'zod';

// Регулярка для белорусского мобильного номера
// Принимает: +375291234567, +375 (29) 123-45-67, 80291234567 (внутренний формат)
const BY_PHONE_REGEX = /^(\+375|375|80)(?:\s?\(?\s?)(?:25|29|33|44)(?:\s?\)?\s?)\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

export const FEEDBACK_CATEGORIES = [
  { value: 'praise', label: 'Благодарность', emoji: '👍' },
  { value: 'complaint', label: 'Жалоба', emoji: '⚠️' },
  { value: 'suggestion', label: 'Предложение', emoji: '💡' },
  { value: 'question', label: 'Вопрос', emoji: '❓' },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['value'];

export const feedbackSchema = z
  .object({
    // Скрытые поля для защиты от ботов
    website: z.string().max(0, 'Бот заполнил honeypot'), // honeypot
    submissionStartTime: z.number(), // время начала заполнения

    // Контекст
    shopCode: z.string().min(1, 'Не определён магазин'),

    // Имя — обязательно
    name: z
      .string()
      .trim()
      .min(2, 'Минимум 2 символа')
      .max(50, 'Максимум 50 символов')
      .regex(/^[А-Яа-яЁёA-Za-z\s\-]+$/, 'Только буквы, пробелы и дефисы'),

    // Текст отзыва — обязательно
    message: z
      .string()
      .trim()
      .min(10, 'Минимум 10 символов')
      .max(2000, 'Максимум 2000 символов'),

    // Категория — обязательно
    category: z.enum(['praise', 'complaint', 'suggestion', 'question'], {
      errorMap: () => ({ message: 'Выберите категорию' }),
    }),

    // Оценка — опционально
    rating: z.number().int().min(1).max(5).optional(),

    // Контакты — нужно ХОТЯ БЫ одно из двух
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || BY_PHONE_REGEX.test(val.replace(/\s/g, '')),
        'Неверный формат. Пример: +375 29 123-45-67'
      ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || z.string().email().safeParse(val).success, 'Неверный email'),

    // Куда отправлять ответ
    contactPreference: z.enum(['phone', 'email', 'none'], {
      errorMap: () => ({ message: 'Выберите способ связи' }),
    }),

    // Фото — опционально, до 3 шт.
    photos: z
      .array(z.instanceof(File))
      .max(3, 'Максимум 3 фотографии')
      .optional()
      .default([]),

    // Согласие на ПД — обязательно
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо согласие на обработку данных' }),
    }),
  })
  .refine(
    // Проверка: если хочет ответ — должен быть указан соответствующий контакт
    (data) => {
      if (data.contactPreference === 'phone') return !!data.phone;
      if (data.contactPreference === 'email') return !!data.email;
      return true;
    },
    {
      message: 'Укажите контакт для выбранного способа связи',
      path: ['contactPreference'],
    }
  )
  .refine(
    // Защита от ботов: форма должна заполняться минимум 3 секунды
    (data) => Date.now() - data.submissionStartTime > 3000,
    {
      message: 'Слишком быстро',
      path: ['website'],
    }
  );

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

// Нормализация телефона перед отправкой
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('80')) return '+375' + digits.slice(2);
  if (digits.startsWith('375')) return '+' + digits;
  if (digits.startsWith('+375')) return digits;
  return phone;
}
