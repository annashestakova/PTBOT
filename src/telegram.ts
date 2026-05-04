// Минимальный Telegram Bot API клиент для Cloudflare Workers

const TG_API = 'https://api.telegram.org/bot';

export interface TgMessage {
  message_id: number;
  from?: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  reply_to_message?: TgMessage;
  photo?: Array<{ file_id: string; file_size: number; width: number; height: number }>;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message?: TgMessage;
    data?: string;
  };
}

export class TelegramClient {
  constructor(private token: string) {}

  private async call(method: string, payload: unknown): Promise<any> {
    const res = await fetch(`${TG_API}${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok: boolean; result?: any; description?: string };
    if (!json.ok) {
      throw new Error(`TG API error (${method}): ${json.description}`);
    }
    return json.result;
  }

  /** Отправить сообщение */
  sendMessage(
    chatId: number | string,
    text: string,
    options: {
      parse_mode?: 'HTML' | 'MarkdownV2';
      reply_markup?: unknown;
      reply_to_message_id?: number;
      disable_web_page_preview?: boolean;
    } = {}
  ): Promise<TgMessage> {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    });
  }

  /** Отправить фото с подписью */
  sendPhoto(
    chatId: number | string,
    photo: string,
    options: { caption?: string; reply_markup?: unknown; parse_mode?: string } = {}
  ): Promise<TgMessage> {
    return this.call('sendPhoto', {
      chat_id: chatId,
      photo,
      parse_mode: 'HTML',
      ...options,
    });
  }

  /** Отправить медиа-группу (несколько фото) */
  sendMediaGroup(
    chatId: number | string,
    media: Array<{ type: 'photo'; media: string; caption?: string; parse_mode?: string }>
  ): Promise<TgMessage[]> {
    return this.call('sendMediaGroup', { chat_id: chatId, media });
  }

  /** Загрузить фото в Telegram через multipart (для приёма с веб-формы) */
  async uploadPhotoFromBuffer(
    chatId: number | string,
    buffer: ArrayBuffer,
    filename: string,
    caption?: string,
    replyMarkup?: unknown
  ): Promise<TgMessage> {
    const fd = new FormData();
    fd.append('chat_id', String(chatId));
    fd.append('photo', new Blob([buffer]), filename);
    if (caption) {
      fd.append('caption', caption);
      fd.append('parse_mode', 'HTML');
    }
    if (replyMarkup) {
      fd.append('reply_markup', JSON.stringify(replyMarkup));
    }

    const res = await fetch(`${TG_API}${this.token}/sendPhoto`, {
      method: 'POST',
      body: fd,
    });
    const json = (await res.json()) as { ok: boolean; result?: TgMessage; description?: string };
    if (!json.ok) throw new Error(`TG upload error: ${json.description}`);
    return json.result!;
  }

  /** Ответить на callback (убрать "часики" с кнопки) */
  answerCallbackQuery(
    callbackQueryId: string,
    options: { text?: string; show_alert?: boolean } = {}
  ): Promise<true> {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    });
  }

  /** Редактировать сообщение */
  editMessageReplyMarkup(
    chatId: number | string,
    messageId: number,
    replyMarkup: unknown
  ): Promise<TgMessage> {
    return this.call('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  /** Установить webhook */
  setWebhook(url: string, secretToken: string): Promise<true> {
    return this.call('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    });
  }

  /** Удалить webhook */
  deleteWebhook(): Promise<true> {
    return this.call('deleteWebhook', { drop_pending_updates: true });
  }

  /** Получить информацию о боте */
  getMe(): Promise<{ id: number; username: string; first_name: string }> {
    return this.call('getMe', {});
  }
}

// Helpers для безопасного экранирования HTML в подписях TG
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
