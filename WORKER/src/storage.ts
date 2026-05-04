import type { Env, ShopRecord, FeedbackRecord } from './types';

const SHOP_PREFIX = 'shop:';
const RATE_PREFIX = 'rate:';
const FEEDBACK_PREFIX = 'fb:';
const STATE_PREFIX = 'state:';
const COUNTER_KEY = 'counter:feedback';

// === Магазины ===

export async function getShop(env: Env, code: string): Promise<ShopRecord | null> {
  const data = await env.KV.get(SHOP_PREFIX + code, 'json');
  return (data as ShopRecord | null) ?? null;
}

export async function setShop(env: Env, shop: ShopRecord): Promise<void> {
  await env.KV.put(SHOP_PREFIX + shop.code, JSON.stringify(shop));
}

export async function listShops(env: Env): Promise<ShopRecord[]> {
  const list = await env.KV.list({ prefix: SHOP_PREFIX });
  const shops: ShopRecord[] = [];
  for (const key of list.keys) {
    const shop = await env.KV.get(key.name, 'json');
    if (shop) shops.push(shop as ShopRecord);
  }
  return shops;
}

// === Rate limiting ===
// Хешируем IP, храним только хеш + счётчик
// Окно: 10 минут, лимит: 5 отзывов

export async function checkRateLimit(
  env: Env,
  ipHash: string,
  windowSeconds = 600,
  maxRequests = 5
): Promise<{ allowed: boolean; remaining: number }> {
  const key = RATE_PREFIX + ipHash;
  const current = await env.KV.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await env.KV.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: maxRequests - count - 1 };
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(ip + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// === Feedback storage ===
// Храним последние N отзывов в KV (для админских команд /pending, /stats)
// Основное хранилище — Telegram-канал
// KV — оперативный кэш

export async function nextFeedbackId(env: Env): Promise<number> {
  const cur = await env.KV.get(COUNTER_KEY);
  const next = (cur ? parseInt(cur, 10) : 0) + 1;
  await env.KV.put(COUNTER_KEY, String(next));
  return next;
}

export async function saveFeedback(env: Env, fb: FeedbackRecord): Promise<void> {
  // TTL 90 дней — после этого пропадает из KV, но остаётся в TG-канале
  await env.KV.put(FEEDBACK_PREFIX + fb.id, JSON.stringify(fb), { expirationTtl: 90 * 86400 });
}

export async function getFeedback(env: Env, id: string): Promise<FeedbackRecord | null> {
  const data = await env.KV.get(FEEDBACK_PREFIX + id, 'json');
  return (data as FeedbackRecord | null) ?? null;
}

// === FSM state для бота (диалог клиента) ===
// state хранится 30 минут — после этого диалог "забывается"

export interface BotState {
  step: 'awaiting_category' | 'awaiting_rating' | 'awaiting_message' | 'awaiting_contact_pref' | 'awaiting_consent' | 'awaiting_admin_reply';
  shopCode?: string;
  category?: string;
  rating?: number;
  message?: string;
  contactPreference?: string;
  // для админа
  replyToFeedbackId?: string;
}

export async function getBotState(env: Env, chatId: number): Promise<BotState | null> {
  return (await env.KV.get(STATE_PREFIX + chatId, 'json')) as BotState | null;
}

export async function setBotState(env: Env, chatId: number, state: BotState): Promise<void> {
  await env.KV.put(STATE_PREFIX + chatId, JSON.stringify(state), { expirationTtl: 1800 });
}

export async function clearBotState(env: Env, chatId: number): Promise<void> {
  await env.KV.delete(STATE_PREFIX + chatId);
}
