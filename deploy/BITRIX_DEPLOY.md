[BITRIX_DEPLOY.md](https://github.com/user-attachments/files/27371517/BITRIX_DEPLOY.md)
# Деплой формы на Битрикс через файловую систему

## Сборка single-file HTML

```bash
cd web-form

# 1. Один раз — установить зависимости
npm install

# 2. Создать .env
cp .env.example .env
# отредактируй:
#   VITE_WORKER_URL=https://prodtovary-feedback.<твоё>.workers.dev
#   VITE_BOT_USERNAME=prodtovary_feedback_bot

# 3. Сборка
npm run build
```

После успешной сборки в `web-form/dist/` появится **один файл `index.html`** размером ~250 КБ — весь JS, CSS, иконки и шрифты внутри одного файла.

## Заливка в Битрикс

### Через админку Битрикс

1. Войди в админ-панель: `https://prodtovary.by/bitrix/admin/`
2. **Контент → Структура сайта → Файлы и папки**
3. В корне сайта (или где хочешь) создай папку `otzyv`
4. Открой папку `otzyv`
5. Кнопка **Загрузить файлы** → выбери `web-form/dist/index.html`
6. Также загрузи: `legal/privacy.html`

### Через FTP / SSH (если есть доступ)

```bash
# Если SSH:
scp web-form/dist/index.html user@prodtovary.by:/var/www/prodtovary.by/otzyv/
scp legal/privacy.html user@prodtovary.by:/var/www/prodtovary.by/otzyv/

# Если FTP — используй FileZilla или любой FTP-клиент
```

## Проверка

Открой:
```
https://prodtovary.by/otzyv/?shop=minsk-pobediteley-5
```

Если форма открылась — всё ок. Если 404 — проверь права доступа к папке.

## Совместимость с Битрикс

Файл — обычный статический HTML, Битрикс отдаёт его напрямую без обработки. Конфликтов не будет, ничего ломаться не должно.

**Важно:** если у Битрикса включён mod_rewrite со своими правилами, проверь что путь `/otzyv/` не перехватывается. Если перехватывается — добавь в `.htaccess` корня:

```apache
RewriteEngine On
RewriteRule ^otzyv/?$ /otzyv/index.html [L]
RewriteRule ^otzyv/privacy /otzyv/privacy.html [L]
```

## Обновление формы

При любых изменениях дизайна:
1. `npm run build` снова
2. Перезалей `dist/index.html` поверх старого
3. Очисти кеш браузера (Ctrl+Shift+R) — браузер мог закешировать старую версию

Чтобы избежать кеширования при обновлениях, в Битриксе можно настроить заголовок `Cache-Control: no-cache, must-revalidate` для `/otzyv/index.html`.
