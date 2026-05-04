import type { Env, FeedbackRecord } from './types';
import { TelegramClient, type TgUpdate, escapeHtml } from './telegram';
import {
  getShop,
  saveFeedback,
  nextFeedbackId,
  getBotState,
  setBotState,
  clearBotState,
  getFeedback,
} from './storage';
import { formatFeedbackForChannel, buildFeedbackKeyboard } from './format';

// === Клавиатуры ===

const CATEGORY_KB = {
  inline_keyboard: [
    [{ text: '👍 Благодарность', callback_data: 'cat:praise' }],
    [{ text: '⚠️ Жалоба', callback_data: 'cat:complaint' }],
    [{ text: '💡 Предложение', callback_data: 'cat:suggestion' }],
    [{ text: '❓ Вопрос', callback_data: 'cat:question' }],
  ],
};

const RATING_KB = {
  inline_keyboard: [
    [
      { text: '⭐', callback_data: 'rate:1' },
      { text: '⭐⭐', callback_data: 'rate:2' },
      { text: '⭐⭐⭐', callback_data: 'rate:3' },
    ],
    [
      { text: '⭐⭐⭐⭐', callback_data: 'rate:4' },
      { text: '⭐⭐⭐⭐⭐', callback_data: 'rate:5' },
    ],
    [{ text: '➡️ Без оценки', callback_data: 'rate:0' }],
  ],
};

const CONTACT_PREF_KB = {
  inline_keyboard: [
    [{ text: '💬 Сюда, в Telegram', callback_data: 'pref:telegram' }],
    [{ text: '🔕 Не нужен ответ', callback_data: 'pref:none' }],
  ],
};

const CONSENT_KB = {
  inline_keyboard: [
    [{ text: '✅ Согласен(на) и отправить', callback_data: 'consent:yes' }],
    [{ text: '❌ Отменить', callback_data: 'consent:no' }],
  ],
};

const PRIVACY_TEXT = `📋 <b>Согласие на обработку персональных данных</b>

Отправляя отзыв, вы соглашаетесь с тем, что ОАО «Продтовары» обработает ваши персональные данные (имя, контакты, текст обращения) с целью рассмотрения вашего обращения.

Срок хранения: 3 года. Вы можете в любой момент запросить удаление данных командой /delete_my_data.

Полный текст политики: https://prodtovary.by/privacy`;

// === Главный обработчик ===

export async function handleUpdate(env: Env, update: TgUpdate): Promise<void> {
  const tg = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
  const adminIds = env.ADMIN_CHAT_IDS.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);

  if (update.message) {
    await handleMessage(env, tg, update.message, adminIds);
  } else if (update.callback_query) {
    await handleCallback(env, tg, update.callback_query, adminIds);
  }
}

// === Обработка сообщений ===

async function handleMessage(
  env: Env,
  tg: TelegramClient,
  msg: NonNullable<TgUpdate['message']>,
  adminIds: number[]
): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || '';
  const isAdmin = adminIds.includes(chatId);

  // === Команды ===
  if (text.startsWith('/start')) {
    return handleStart(env, tg, msg);
  }

  if (text === '/help') {
    return handleHelp(tg, chatId, isAdmin);
  }

  if (text === '/cancel') {
    await clearBotState(env, chatId);
    await tg.sendMessage(chatId, 'Отменено. Отправьте /start, чтобы начать заново.');
    return;
  }

  if (text === '/delete_my_data') {
    await tg.sendMessage(
      chatId,
      'Запрос на удаление данных принят. Мы свяжемся с вами в течение 30 дней.\n\nДля ускорения процесса напишите на: privacy@prodtovary.by'
    );
    // Уведомление админам
    for (const aid of adminIds) {
      await tg.sendMessage(
        aid,
        `🔐 Запрос на удаление ПД от пользователя ID <code>${chatId}</code>`
      );
    }
    return;
  }

  // === Админские команды ===
  if (isAdmin) {
    if (text === '/stats') {
      return handleStats(env, tg, chatId);
    }
    if (text === '/pending') {
      return handlePending(env, tg, chatId);
    }
  }

  // === FSM-диалог ===
  const state = await getBotState(env, chatId);

  if (state) {
    // Админ отвечает на отзыв
    if (state.step === 'awaiting_admin_reply' && state.replyToFeedbackId && isAdmin) {
      return handleAdminReply(env, tg, chatId, msg, state.replyToFeedbackId);
    }

    // Клиент пишет текст отзыва
    if (state.step === 'awaiting_message') {
      if (text.length < 10) {
        await tg.sendMessage(chatId, 'Слишком коротко. Опишите подробнее (минимум 10 символов).');
        return;
      }
      if (text.length > 2000) {
        await tg.sendMessage(chatId, 'Слишком длинно. Сократите до 2000 символов.');
        return;
      }
      state.message = text;
      state.step = 'awaiting_contact_pref';
      await setBotState(env, chatId, state);
      await tg.sendMessage(chatId, '📬 Хотите получить ответ?', {
        reply_markup: CONTACT_PREF_KB,
      });
      return;
    }
  }

  // По умолчанию
  await tg.sendMessage(
    chatId,
    'Чтобы оставить отзыв, отсканируйте QR-код в магазине или используйте /start'
  );
}

// === /start ===

async function handleStart(
  env: Env,
  tg: TelegramClient,
  msg: NonNullable<TgUpdate['message']>
): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || '';

  // /start <shop_code>
  const param = text.replace(/^\/start\s*/, '').trim();

  if (!param) {
    await tg.sendMessage(
      chatId,
      `👋 Здравствуйте!

Чтобы оставить отзыв о магазине Продтовары, отсканируйте QR-код на плакате в магазине.

Если у вас уже есть код магазина, отправьте: /start <code>код_магазина</code>`
    );
    return;
  }

  const shop = await getShop(env, param);

  if (!shop) {
    await tg.sendMessage(
      chatId,
      `❌ Магазин с кодом "${escapeHtml(param)}" не найден. Проверьте QR-код или обратитесь к администратору.`
    );
    return;
  }

  await setBotState(env, chatId, {
    step: 'awaiting_category',
    shopCode: shop.code,
  });

  await tg.sendMessage(
    chatId,
    `👋 Здравствуйте, ${escapeHtml(msg.from?.first_name || 'друг')}!

Вы оставляете отзыв о магазине:
📍 <b>${escapeHtml(shop.name)}</b>
${shop.address ? escapeHtml(shop.address) : ''}

Что вас привело к нам?`,
    { reply_markup: CATEGORY_KB }
  );
}

async function handleHelp(tg: TelegramClient, chatId: number, isAdmin: boolean): Promise<void> {
  let txt = `<b>Команды:</b>
/start — начать новый отзыв
/cancel — отменить текущий диалог
/delete_my_data — удалить мои данные
/help — это сообщение`;

  if (isAdmin) {
    txt += `\n\n<b>Админ-команды:</b>
/stats — статистика
/pending — неотвеченные отзывы`;
  }

  await tg.sendMessage(chatId, txt);
}

// === Callback queries ===

async function handleCallback(
  env: Env,
  tg: TelegramClient,
  cb: NonNullable<TgUpdate['callback_query']>,
  adminIds: number[]
): Promise<void> {
  const chatId = cb.from.id;
  const data = cb.data || '';
  const isAdmin = adminIds.includes(chatId);

  await tg.answerCallbackQuery(cb.id);

  // === Админские callback'и (ответ на отзыв) ===
  if (data.startsWith('reply:') && isAdmin) {
    const fbId = data.slice(6);
    const fb = await getFeedback(env, fbId);
    if (!fb) {
      await tg.sendMessage(chatId, '❌ Отзыв не найден или устарел.');
      return;
    }

    // Если клиент не хочет ответа
    if (fb.contactPreference === 'none') {
      await tg.sendMessage(chatId, 'ℹ️ Клиент указал, что ответ не требуется.');
      return;
    }

    await setBotState(env, chatId, {
      step: 'awaiting_admin_reply',
      replyToFeedbackId: fbId,
    });

    const contactInfo =
      fb.source === 'telegram_bot'
        ? `прямо в Telegram`
        : fb.contactPreference === 'phone'
        ? `по телефону ${fb.phone}`
        : fb.contactPreference === 'email'
        ? `на email ${fb.email}`
        : 'клиенту';

    await tg.sendMessage(
      chatId,
      `✏️ Напишите ответ на отзыв №${fbId}.

Ответ будет отправлен ${contactInfo}.

Для отмены — /cancel`
    );
    return;
  }

  if (data.startsWith('take:') && isAdmin) {
    const fbId = data.slice(5);
    await tg.sendMessage(
      chatId,
      `✅ Отзыв №${fbId} взят в работу пользователем ${escapeHtml(cb.from.first_name)}`
    );
    return;
  }

  if (data.startsWith('close:') && isAdmin) {
    const fbId = data.slice(6);
    await tg.sendMessage(chatId, `🔒 Отзыв №${fbId} закрыт`);
    return;
  }

  // === Клиентский FSM ===
  const state = await getBotState(env, chatId);
  if (!state) {
    await tg.sendMessage(chatId, 'Сессия истекла. Начните заново — /start');
    return;
  }

  if (data.startsWith('cat:') && state.step === 'awaiting_category') {
    state.category = data.slice(4);
    state.step = 'awaiting_rating';
    await setBotState(env, chatId, state);
    await tg.sendMessage(chatId, '⭐ Оцените магазин:', { reply_markup: RATING_KB });
    return;
  }

  if (data.startsWith('rate:') && state.step === 'awaiting_rating') {
    const r = parseInt(data.slice(5), 10);
    if (r > 0) state.rating = r;
    state.step = 'awaiting_message';
    await setBotState(env, chatId, state);
    await tg.sendMessage(chatId, '✍️ Опишите подробнее (минимум 10 символов):');
    return;
  }

  if (data.startsWith('pref:') && state.step === 'awaiting_contact_pref') {
    state.contactPreference = data.slice(5);
    state.step = 'awaiting_consent';
    await setBotState(env, chatId, state);
    await tg.sendMessage(chatId, PRIVACY_TEXT, { reply_markup: CONSENT_KB });
    return;
  }

  if (data === 'consent:no' && state.step === 'awaiting_consent') {
    await clearBotState(env, chatId);
    await tg.sendMessage(chatId, '❌ Отзыв не отправлен. Без согласия мы не можем обработать данные.');
    return;
  }

  if (data === 'consent:yes' && state.step === 'awaiting_consent') {
    return finalizeBotFeedback(env, tg, cb.from, state);
  }
}

// === Сохранение отзыва из бота ===

async function finalizeBotFeedback(
  env: Env,
  tg: TelegramClient,
  from: { id: number; first_name: string; username?: string },
  state: NonNullable<Awaited<ReturnType<typeof getBotState>>>
): Promise<void> {
  const chatId = from.id;

  if (!state.shopCode || !state.category || !state.message) {
    await tg.sendMessage(chatId, '❌ Что-то пошло не так. Начните заново — /start');
    await clearBotState(env, chatId);
    return;
  }

  const shop = await getShop(env, state.shopCode);

  const id = String(await nextFeedbackId(env));
  const fb: FeedbackRecord = {
    id,
    shopCode: state.shopCode,
    shopName: shop?.name,
    name: from.first_name + (from.username ? ` (@${from.username})` : ''),
    message: state.message,
    category: state.category as FeedbackRecord['category'],
    rating: state.rating,
    contactPreference: state.contactPreference === 'telegram' ? 'phone' : 'none', // TG = "phone" в смысле "ответим в телегу"
    source: 'telegram_bot',
    telegramUserId: chatId,
    createdAt: new Date().toISOString(),
  };

  // Постим в канал
  const channelMsg = await tg.sendMessage(env.TELEGRAM_CHANNEL_ID, formatFeedbackForChannel(fb), {
    reply_markup: buildFeedbackKeyboard(fb.id, state.contactPreference !== 'none'),
  });
  fb.channelMessageId = channelMsg.message_id;

  await saveFeedback(env, fb);
  await clearBotState(env, chatId);

  await tg.sendMessage(
    chatId,
    `✅ <b>Спасибо за отзыв!</b>

Номер обращения: <code>#${id}</code>

${state.contactPreference === 'telegram' ? 'Мы напишем вам в этот чат, как только рассмотрим обращение.' : 'Мы обязательно учтём ваш отзыв.'}`
  );
}

// === Админ отвечает клиенту ===

async function handleAdminReply(
  env: Env,
  tg: TelegramClient,
  adminChatId: number,
  msg: NonNullable<TgUpdate['message']>,
  feedbackId: string
): Promise<void> {
  const replyText = msg.text?.trim() || '';
  if (!replyText) return;

  const fb = await getFeedback(env, feedbackId);
  if (!fb) {
    await tg.sendMessage(adminChatId, '❌ Отзыв не найден.');
    await clearBotState(env, adminChatId);
    return;
  }

  const message = `💬 <b>Ответ на ваш отзыв №${feedbackId}</b>

${escapeHtml(replyText)}

<i>С уважением, команда Продтовары</i>`;

  let delivered = false;
  let deliveryDetails = '';

  // Доставка ответа
  if (fb.source === 'telegram_bot' && fb.telegramUserId) {
    try {
      await tg.sendMessage(fb.telegramUserId, message);
      delivered = true;
      deliveryDetails = `✅ Доставлен в Telegram пользователю ${fb.name}`;
    } catch (e) {
      deliveryDetails = `❌ Не удалось доставить в Telegram: ${e instanceof Error ? e.message : ''}`;
    }
  } else if (fb.contactPreference === 'phone' && fb.phone) {
    deliveryDetails = `📞 Свяжитесь с клиентом по телефону: ${fb.phone}\n\nВаш текст ответа сохранён.`;
  } else if (fb.contactPreference === 'email' && fb.email) {
    deliveryDetails = `✉️ Свяжитесь с клиентом по email: ${fb.email}\n\nВаш текст ответа сохранён.`;
  } else {
    deliveryDetails = '🚫 Клиент не указал способ связи.';
  }

  await tg.sendMessage(
    adminChatId,
    `${delivered ? '✅' : 'ℹ️'} <b>Ответ обработан</b>

${deliveryDetails}

<blockquote>${escapeHtml(replyText)}</blockquote>`
  );

  // Постим ответ в канал как комментарий к посту отзыва
  if (fb.channelMessageId) {
    try {
      await tg.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        `💬 <b>Ответ от ${escapeHtml(msg.from?.first_name || 'админа')}:</b>\n\n${escapeHtml(replyText)}`,
        { reply_to_message_id: fb.channelMessageId }
      );
    } catch {
      // канал может не разрешать reply — игнорим
    }
  }

  await clearBotState(env, adminChatId);
}

// === Админ-команды ===

async function handleStats(env: Env, tg: TelegramClient, chatId: number): Promise<void> {
  const counter = await env.KV.get('counter:feedback');
  await tg.sendMessage(
    chatId,
    `📊 <b>Статистика</b>

Всего отзывов: ${counter || '0'}

Полную аналитику смотрите в канале отзывов через поиск по тегам:
#жалоба #благодарность #предложение #вопрос`
  );
}

async function handlePending(env: Env, tg: TelegramClient, chatId: number): Promise<void> {
  await tg.sendMessage(
    chatId,
    `📋 Неотвеченные отзывы — смотрите в канале по фильтру по статусу. Каждый пост с кнопкой "Ответить" — необработан.`
  );
}
