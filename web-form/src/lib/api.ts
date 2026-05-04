import { normalizePhone, type FeedbackFormData } from './schemas';

// URL Cloudflare Worker — заменишь на реальный после деплоя
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://prodtovary-feedback.workers.dev';

export interface SubmitResponse {
  ok: boolean;
  feedbackId?: string;
  error?: string;
}

export async function submitFeedback(data: FeedbackFormData): Promise<SubmitResponse> {
  const formData = new FormData();

  formData.append('shop_code', data.shopCode);
  formData.append('name', data.name.trim());
  formData.append('message', data.message.trim());
  formData.append('category', data.category);

  if (data.rating) formData.append('rating', String(data.rating));
  if (data.phone) formData.append('phone', normalizePhone(data.phone));
  if (data.email) formData.append('email', data.email.trim().toLowerCase());
  formData.append('contact_preference', data.contactPreference);

  formData.append('consent', '1');
  formData.append('client_time', String(Date.now()));
  formData.append('form_load_time', String(data.submissionStartTime));

  // Фото
  data.photos?.forEach((file, idx) => {
    formData.append(`photo_${idx}`, file);
  });

  try {
    const res = await fetch(`${WORKER_URL}/api/feedback`, {
      method: 'POST',
      body: formData,
    });

    const json = (await res.json()) as SubmitResponse;
    if (!res.ok) {
      return { ok: false, error: json.error || `Ошибка ${res.status}` };
    }
    return json;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Сетевая ошибка',
    };
  }
}

// Получение информации о магазине по коду из URL
export interface ShopInfo {
  code: string;
  name: string;
  address: string;
}

export async function getShopInfo(code: string): Promise<ShopInfo | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/shop/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    return (await res.json()) as ShopInfo;
  } catch {
    return null;
  }
}

// Deep-link в Telegram-бот с передачей кода магазина
export function getBotDeepLink(shopCode: string, botUsername: string): string {
  // Telegram start parameters: a-z, A-Z, 0-9, _, - (до 64 символов)
  const param = shopCode.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return `https://t.me/${botUsername}?start=${param}`;
}
