import type { FeedbackRecord } from './types';
import { escapeHtml } from './telegram';

const CATEGORY_LABELS: Record<string, string> = {
  praise: '👍 Благодарность',
  complaint: '⚠️ Жалоба',
  suggestion: '💡 Предложение',
  question: '❓ Вопрос',
};

const CATEGORY_TAGS: Record<string, string> = {
  praise: '#благодарность',
  complaint: '#жалоба',
  suggestion: '#предложение',
  question: '#вопрос',
};

const SOURCE_LABELS: Record<string, string> = {
  web_form: '🌐 Веб-форма',
  telegram_bot: '💬 Telegram',
};

const PRIORITY_KEYWORDS = [
  'грубость',
  'хамство',
  'обвес',
  'просрочка',
  'просрочен',
  'испорченн',
  'тухл',
  'грязн',
  'таракан',
  'мыш',
  'отравлен',
];

/** Форматирует отзыв в HTML-сообщение для Telegram-канала админов */
export function formatFeedbackForChannel(fb: FeedbackRecord): string {
  const stars = fb.rating ? '⭐'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '';
  const cat = CATEGORY_LABELS[fb.category] || fb.category;
  const tag = CATEGORY_TAGS[fb.category] || '';
  const src = SOURCE_LABELS[fb.source] || fb.source;

  // Проверка на приоритетные ключевые слова
  const lowerMsg = fb.message.toLowerCase();
  const isPriority = PRIORITY_KEYWORDS.some((kw) => lowerMsg.includes(kw));
  const priorityMark = isPriority ? '🔴 <b>ТРЕБУЕТ ВНИМАНИЯ</b>\n' : '';

  // Контактная информация
  let contact = '';
  if (fb.contactPreference === 'phone' && fb.phone) {
    contact = `📞 <a href="tel:${fb.phone}">${escapeHtml(fb.phone)}</a>`;
  } else if (fb.contactPreference === 'email' && fb.email) {
    contact = `✉️ <a href="mailto:${fb.email}">${escapeHtml(fb.email)}</a>`;
  } else if (fb.contactPreference === 'none') {
    contact = '🚫 Ответ не требуется';
  } else if (fb.telegramUserId) {
    contact = `💬 Telegram ID: <code>${fb.telegramUserId}</code>`;
  }

  // Доп. контакты, если указаны но не основной
  const extraContacts: string[] = [];
  if (fb.contactPreference !== 'phone' && fb.phone) {
    extraContacts.push(`📞 ${escapeHtml(fb.phone)}`);
  }
  if (fb.contactPreference !== 'email' && fb.email) {
    extraContacts.push(`✉️ ${escapeHtml(fb.email)}`);
  }

  const parts = [
    `${priorityMark}<b>Отзыв №${fb.id}</b>`,
    '',
    `📍 <b>${escapeHtml(fb.shopName || fb.shopCode)}</b>`,
    `🏷 ${cat}${stars ? '  ' + stars : ''}`,
    '',
    `👤 <b>${escapeHtml(fb.name)}</b>`,
    contact,
  ];

  if (extraContacts.length > 0) {
    parts.push('<i>' + extraContacts.join(' · ') + '</i>');
  }

  parts.push('');
  parts.push(`<blockquote>${escapeHtml(fb.message)}</blockquote>`);
  parts.push('');
  parts.push(`<i>${src} · ${formatDate(fb.createdAt)}</i>`);
  parts.push(`${tag} #${fb.shopCode.replace(/[^a-z0-9_]/gi, '_')}`);

  return parts.filter(Boolean).join('\n');
}

/** Inline-клавиатура под постом отзыва */
export function buildFeedbackKeyboard(feedbackId: string, canReply: boolean) {
  const buttons: any[][] = [];

  if (canReply) {
    buttons.push([{ text: '✏️ Ответить', callback_data: `reply:${feedbackId}` }]);
  }

  buttons.push([
    { text: '✅ В работу', callback_data: `take:${feedbackId}` },
    { text: '🔒 Закрыть', callback_data: `close:${feedbackId}` },
  ]);

  return { inline_keyboard: buttons };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Minsk',
  });
}
