import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

import type { Env, FeedbackRecord } from './types';
import { TelegramClient } from './telegram';
import {
  getShop,
  saveFeedback,
  nextFeedbackId,
  checkRateLimit,
  hashIp,
  setShop,
  listShops,
} from './storage';
import { formatFeedbackForChannel, buildFeedbackKeyboard } from './format';
import { handleUpdate } from './bot';

const app = new Hono<{ Bindings: Env }>();

// === CORS ===
app.use(
  '/api/*',
  cors({
    origin: ['https://prodtovary.by', 'http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);

// === Health check ===
app.get('/', (c) => c.json({ ok: true, service: 'prodtovary-feedback' }));

// === Информация о магазине ===
app.get('/api/shop/:code', async (c) => {
  const code = c.req.param('code');
  const shop = await getShop(c.env, code);
  if (!shop) return c.json({ error: 'Shop not found' }, 404);
  return c.json(shop);
});

// === Приём отзыва с веб-формы ===

const feedbackFormSchema = z.object({
  shop_code: z.string().min(1).max(50),
  name: z.string().trim().min(2).max(50),
  message: z.string().trim().min(10).max(2000),
  category: z.enum(['praise', 'complaint', 'suggestion', 'question']),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contact_preference: z.enum(['phone', 'email', 'none']),
  consent: z.literal('1'),
  client_time: z.coerce.number(),
  form_load_time: z.coerce.number(),
});

app.post('/api/feedback', async (c) => {
  // === IP + rate limit ===
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '0.0.0.0';
  const ipHash = await hashIp(ip, c.env.WEBHOOK_SECRET);
  const rate = await checkRateLimit(c.env, ipHash);
  if (!rate.allowed) {
    return c.json({ ok: false, error: 'Слишком много запросов. Попробуйте через несколько минут.' }, 429);
  }

  // === Парсинг multipart ===
  const form = await c.req.formData();
  const fields: Record<string, string> = {};
  const photos: Array<{ buffer: ArrayBuffer; filename: string }> = [];

  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      // Валидация фото
      if (!key.startsWith('photo_')) continue;
      if (value.size > 5 * 1024 * 1024) {
        return c.json({ ok: false, error: 'Фото больше 5 МБ' }, 400);
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type)) {
        return c.json({ ok: false, error: 'Неподдерживаемый формат фото' }, 400);
      }
      photos.push({ buffer: await value.arrayBuffer(), filename: value.name });
    } else {
      fields[key] = String(value);
    }
  }

  if (photos.length > 3) {
    return c.json({ ok: false, error: 'Максимум 3 фото' }, 400);
  }

  // === Защита от ботов ===
  // honeypot — не передаётся явно, но если есть — отбрасываем
  if (fields['website'] && fields['website'].length > 0) {
    return c.json({ ok: true, feedbackId: 'honeypot-blocked' }); // молча "успех" для бота
  }

  const formLoadTime = parseInt(fields['form_load_time'] || '0', 10);
  if (formLoadTime > 0 && Date.now() - formLoadTime < 3000) {
    return c.json({ ok: true, feedbackId: 'too-fast-blocked' });
  }

  // === Валидация ===
  const parsed = feedbackFormSchema.safeParse(fields);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Ошибка валидации: ' + parsed.error.errors[0].message },
      400
    );
  }

  const data = parsed.data;

  // Проверка условной обязательности контакта
  if (data.contact_preference === 'phone' && !data.phone) {
    return c.json({ ok: false, error: 'Укажите телефон' }, 400);
  }
  if (data.contact_preference === 'email' && !data.email) {
    return c.json({ ok: false, error: 'Укажите email' }, 400);
  }

  // === Получаем магазин ===
  const shop = await getShop(c.env, data.shop_code);

  // === Создаём запись ===
  const id = String(await nextFeedbackId(c.env));
  const fb: FeedbackRecord = {
    id,
    shopCode: data.shop_code,
    shopName: shop?.name,
    name: data.name,
    message: data.message,
    category: data.category,
    rating: data.rating,
    phone: data.phone || undefined,
    email: data.email || undefined,
    contactPreference: data.contact_preference,
    source: 'web_form',
    createdAt: new Date().toISOString(),
    consentIp: ipHash.slice(0, 16), // первые 16 символов хеша — для аудита
  };

  // === Постим в канал ===
  const tg = new TelegramClient(c.env.TELEGRAM_BOT_TOKEN);
  const caption = formatFeedbackForChannel(fb);
  const keyboard = buildFeedbackKeyboard(fb.id, fb.contactPreference !== 'none');

  try {
    let channelMsg;
    if (photos.length === 0) {
      channelMsg = await tg.sendMessage(c.env.TELEGRAM_CHANNEL_ID, caption, {
        reply_markup: keyboard,
      });
    } else {
      // Первое фото с подписью + кнопками
      channelMsg = await tg.uploadPhotoFromBuffer(
        c.env.TELEGRAM_CHANNEL_ID,
        photos[0].buffer,
        photos[0].filename,
        caption,
        keyboard
      );
      // Остальные фото — отдельно как ответ
      for (let i = 1; i < photos.length; i++) {
        await tg.uploadPhotoFromBuffer(
          c.env.TELEGRAM_CHANNEL_ID,
          photos[i].buffer,
          photos[i].filename,
          `Доп. фото ${i + 1} к отзыву №${fb.id}`
        );
      }
    }
    fb.channelMessageId = channelMsg.message_id;
  } catch (e) {
    console.error('TG post failed:', e);
    return c.json({ ok: false, error: 'Не удалось сохранить отзыв. Попробуйте позже.' }, 500);
  }

  await saveFeedback(c.env, fb);

  return c.json({ ok: true, feedbackId: id });
});

// === Telegram webhook ===

app.post('/webhook/telegram', async (c) => {
  // Проверка secret token (защита от подделки)
  const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== c.env.WEBHOOK_SECRET) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const update = await c.req.json();

  // Обрабатываем асинхронно через ctx.waitUntil, чтобы не задерживать ответ
  c.executionCtx.waitUntil(
    handleUpdate(c.env, update).catch((e) => console.error('Update handler error:', e))
  );

  return c.json({ ok: true });
});

// === Админ: добавление магазина (защищено секретом) ===

const shopSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2).max(200),
  address: z.string().max(500),
  city: z.string().max(100).optional(),
});

app.post('/api/admin/shops', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.WEBHOOK_SECRET}`) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json();
  const parsed = shopSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors }, 400);

  await setShop(c.env, parsed.data);
  return c.json({ ok: true, shop: parsed.data });
});

app.get('/api/admin/shops', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.WEBHOOK_SECRET}`) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const shops = await listShops(c.env);
  return c.json({ shops });
});

// === Errors ===

app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
