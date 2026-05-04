#!/usr/bin/env node
// Скрипт для установки Telegram webhook на твой Cloudflare Worker
// Запуск: BOT_TOKEN=xxx WORKER_URL=xxx WEBHOOK_SECRET=xxx node scripts/set-webhook.mjs

const BOT_TOKEN = process.env.BOT_TOKEN;
const WORKER_URL = process.env.WORKER_URL; // https://prodtovary-feedback.workers.dev
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!BOT_TOKEN || !WORKER_URL || !WEBHOOK_SECRET) {
  console.error('❌ Нужны env: BOT_TOKEN, WORKER_URL, WEBHOOK_SECRET');
  process.exit(1);
}

const url = `${WORKER_URL.replace(/\/$/, '')}/webhook/telegram`;

const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  }),
});

const json = await res.json();

if (json.ok) {
  console.log('✅ Webhook установлен:', url);

  // Получим инфо о боте
  const me = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`).then((r) => r.json());
  console.log(`🤖 Бот: @${me.result.username}`);
} else {
  console.error('❌ Ошибка:', json);
  process.exit(1);
}
