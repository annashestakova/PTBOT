export interface Env {
  // KV namespace
  KV: KVNamespace;

  // Variables
  ENVIRONMENT: string;
  TELEGRAM_CHANNEL_ID: string;
  ADMIN_CHAT_IDS: string;

  // Secrets
  TELEGRAM_BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}

export interface FeedbackRecord {
  id: string;
  shopCode: string;
  shopName?: string;
  name: string;
  message: string;
  category: 'praise' | 'complaint' | 'suggestion' | 'question';
  rating?: number;
  phone?: string;
  email?: string;
  contactPreference: 'phone' | 'email' | 'none';
  source: 'web_form' | 'telegram_bot';
  channelMessageId?: number;
  telegramUserId?: number;
  createdAt: string;
  consentIp?: string;
}

export interface ShopRecord {
  code: string;
  name: string;
  address: string;
  city?: string;
}
