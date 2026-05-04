# Система сбора отзывов ОАО «Продтовары»

QR-плакат → веб-форма (или Telegram-бот) → отзыв в приватный канал → админ отвечает через бота → клиент получает ответ.

**Стек:** React + Vite (форма) · Cloudflare Workers + Hono (бот и API) · Telegram Channel (хранилище)
**Стоимость:** 0 ₽/месяц на бесплатных тарифах

---

## Структура проекта

```
feedback-system/
├── web-form/        ← React-форма (собирается в один HTML для Битрикс)
├── worker/          ← Cloudflare Worker: бот + API формы
├── qr-generator/    ← Python-скрипт генерации PDF-плакатов
├── legal/           ← Политика обработки ПД (RU)
├── deploy/          ← Доп. инструкции для Битрикс и DNS
└── PROJECT_OVERVIEW.md  ← Архитектура и схемы
```

---

## Пошаговый запуск (полный путь — ~2 часа)

### Шаг 1. Создай Telegram-бот (5 мин)

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → имя `Prodtovary Feedback` → username, например `prodtovary_feedback_bot`
3. Сохрани токен (длинная строка вида `123456:ABC-DEF...`)
4. Команды для бота через `/setcommands`:
   ```
   start - Начать новый отзыв
   cancel - Отменить текущий диалог
   help - Помощь
   delete_my_data - Удалить мои данные
   ```

### Шаг 2. Создай приватный канал для отзывов (3 мин)

1. В Telegram создай новый канал (Channel) — приватный
2. Добавь туда твоего бота как администратора с правами «Публикация постов»
3. Также добавь в канал всех админов (тех, кто будет отвечать на отзывы)
4. Узнай ID канала: перешли любое сообщение из канала боту [@userinfobot](https://t.me/userinfobot) → получишь ID вида `-1001234567890`

### Шаг 3. Получи Telegram chat ID каждого админа (2 мин)

Каждый администратор пишет [@userinfobot](https://t.me/userinfobot) → получает свой ID.
Сохрани все ID через запятую: `123456789,987654321`.

### Шаг 4. Деплой Cloudflare Worker (15 мин)

```bash
# 1. Регистрация на cloudflare.com (бесплатно, без карты)

# 2. Установка wrangler CLI
npm install -g wrangler
wrangler login

# 3. В папке worker/
cd worker
npm install

# 4. Создаём KV namespace для хранилища
wrangler kv:namespace create KV
# Скопируй id из вывода и впиши в wrangler.toml в kv_namespaces.id

# 5. Редактируй wrangler.toml:
#    TELEGRAM_CHANNEL_ID = "-1001234567890"   ← твой канал
#    ADMIN_CHAT_IDS = "123456789,987654321"   ← TG ID админов

# 6. Устанавливаем секреты
wrangler secret put TELEGRAM_BOT_TOKEN
# вставь токен от BotFather

wrangler secret put WEBHOOK_SECRET
# сгенерируй случайную строку 32 символа: openssl rand -hex 16

# 7. Деплой
wrangler deploy

# Получишь URL вида: https://prodtovary-feedback.<твоё>.workers.dev
```

### Шаг 5. Установи Telegram webhook (1 мин)

```bash
BOT_TOKEN="123456:ABC..." \
WORKER_URL="https://prodtovary-feedback.<твоё>.workers.dev" \
WEBHOOK_SECRET="твой_секрет_из_шага_4" \
node scripts/set-webhook.mjs
```

Должно вывести: `✅ Webhook установлен`

### Шаг 6. Добавь магазины в KV (5 мин)

Через CURL — для каждого магазина выполни:

```bash
curl -X POST https://prodtovary-feedback.<твоё>.workers.dev/api/admin/shops \
  -H "Authorization: Bearer твой_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "minsk-pobediteley-5",
    "name": "Продтовары на Победителях, 5",
    "address": "пр. Победителей 5, Минск",
    "city": "Минск"
  }'
```

Или через Cloudflare Dashboard → Workers KV → твой namespace → Add entry:
- Key: `shop:minsk-pobediteley-5`
- Value: `{"code":"minsk-pobediteley-5","name":"...","address":"..."}`

### Шаг 7. Сборка и деплой формы на Битрикс (10 мин)

```bash
cd web-form
cp .env.example .env
# Редактируй .env:
#   VITE_WORKER_URL=https://prodtovary-feedback.<твоё>.workers.dev
#   VITE_BOT_USERNAME=prodtovary_feedback_bot

npm install
npm run build
```

После сборки в `web-form/dist/` будет **один файл `index.html`** со всем содержимым.

**Заливка на Битрикс:**
1. Зайди в Битрикс → Контент → Структура сайта → Файлы и папки
2. Создай папку, например `/otzyv/`
3. Загрузи `index.html` как `index.html` в эту папку
4. Загрузи `legal/privacy.html` как `/otzyv/privacy.html`
5. Проверь: `https://prodtovary.by/otzyv/?shop=minsk-pobediteley-5`

### Шаг 8. Сгенерируй QR-плакаты (5 мин)

```bash
cd qr-generator
pip install -r requirements.txt

# Заполни shops.csv своими магазинами

FEEDBACK_URL="https://prodtovary.by/otzyv" python generate.py
```

Готовые PDF в папке `posters/` отправляй в типографию для печати на A4.

### Шаг 9. Тест! (5 мин)

1. Открой `https://prodtovary.by/otzyv/?shop=minsk-pobediteley-5` на телефоне
2. Заполни форму, отправь
3. Проверь, что отзыв появился в приватном канале
4. Нажми «Ответить» под постом → отправь текст → проверь, что клиент получил ответ

---

## Что админ видит в канале

Каждый отзыв = отдельный пост:

```
🔴 ТРЕБУЕТ ВНИМАНИЯ           ← если в тексте есть "хамство", "просрочка" и т.п.
Отзыв №42

📍 Продтовары на Победителях, 5
🏷 ⚠️ Жалоба  ⭐⭐☆☆☆

👤 Анна
📞 +375 29 123-45-67

> Очередь на кассе была 20 минут, кассир не извинился...

🌐 Веб-форма · 04.05.2026 14:23
#жалоба #minsk_pobediteley_5

[✏️ Ответить] [✅ В работу] [🔒 Закрыть]
```

Админ нажимает «Ответить» → бот в личке спрашивает текст → клиент получает ответ:
- В Telegram (если оставлял отзыв через бот)
- На телефон (показывает админу номер для звонка)
- На email (показывает email — админ пишет вручную с корпоративной почты)

---

## Команды бота

**Для клиента:**
- `/start <код_магазина>` — начать новый отзыв (обычно из QR-кода автоматически)
- `/cancel` — отменить текущий диалог
- `/delete_my_data` — запрос на удаление данных
- `/help` — помощь

**Для админа:**
- `/stats` — общая статистика
- `/pending` — где смотреть неотвеченные

---

## Безопасность

- ✅ Все запросы по HTTPS (Cloudflare даёт SSL автоматически)
- ✅ Webhook бота защищён `secret_token` (только Telegram может его дёрнуть)
- ✅ IP-адреса хранятся только в виде SHA-256 хеша
- ✅ Rate limit: 5 отзывов с одного IP за 10 минут
- ✅ Honeypot + time-trap против ботов
- ✅ CSP-заголовки на форме (защита от XSS)
- ✅ Zod-валидация всех входов
- ✅ Bot token в Cloudflare Secrets (никогда не в коде)
- ✅ Admin endpoints защищены Bearer-токеном
- ✅ Согласие на ПД с фиксацией IP-хеша и времени (для юридической защиты)

---

## Лимиты бесплатных тарифов

| Сервис | Лимит | Хватит на |
|---|---|---|
| Cloudflare Workers | 100 000 запросов/день | ~10 000 отзывов/день |
| Cloudflare KV | 100 000 reads/день, 1000 writes/день | ~500 отзывов/день |
| Telegram Bot API | без лимитов | ∞ |
| Telegram канал | 200 000 постов | ~5+ лет работы |

---

## FAQ

**Как добавить нового магазина?**
POST на `/api/admin/shops` с Bearer-токеном, либо через Cloudflare KV UI.

**Как изменить дизайн формы?**
Редактируй файлы в `web-form/src/components/` и пересобирай (`npm run build`).

**Бот не отвечает после деплоя?**
1. `wrangler tail` — смотри логи в реальном времени
2. Проверь, что `setWebhook` прошёл успешно
3. Проверь `wrangler secret list` — должны быть TELEGRAM_BOT_TOKEN и WEBHOOK_SECRET

**Можно ли потом перейти на свою БД (например, Supabase)?**
Да, легко. Все обращения к KV изолированы в `worker/src/storage.ts` — поменяешь только этот файл.

**Хочу аналитику с графиками — что делать?**
Раз в день экспортируй из канала через Telegram Desktop (JSON), или добавь Supabase позже как зеркало.

---

## Поддержка

Документ архитектуры: `PROJECT_OVERVIEW.md`
Логи воркера: `wrangler tail` в папке `worker/`
Webhook info: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
