# Telegram Bot

Support bot for real users and recipient of landing-page clinic contact notifications.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `TELEGRAM_BOT_TOKEN` – from [@BotFather](https://t.me/BotFather)
   - `TELEGRAM_GROUP_CHAT_ID` – group where clinic contacts and support messages are sent (e.g. `-1001234567890`)
   - `MONGODB_URI` / `MONGODB_DB_NAME` – same as api-main (uses collection `telegram_users`)
   - `GEMINI_API_KEY` – for "Shaxsiy doktor" AI feature. See [GEMINI_API_KEY_GUIDE.md](./GEMINI_API_KEY_GUIDE.md) for a free key.

2. Add the bot to your Telegram group and make it a member (so it can send messages).

3. Get group chat ID: add [@userinfobot](https://t.me/userinfobot) to the group and note the group id, or use Telegram API `getUpdates` after sending a message in the group.

## Run

```bash
pnpm dev
# or
pnpm start
```

## Flows

- **Landing clinic contact**: When your backend calls the Telegram API (or you use api-main `POST /v1/landing/contact`), the message is sent to this bot’s group (api-main sends via the same bot token). So the same `TELEGRAM_GROUP_CHAT_ID` is used by both api-main and this bot.

- **User support**: User sends /start → bot says “Hi {name}” and asks for phone (share contact) → after phone is saved, bot shows “Support” button → user taps Support and sends a message → message is saved to MongoDB `telegram_users` (field `messages` array) and forwarded to the group.

## MongoDB collection: telegram_users

- `_id`, `name`, `tgChatId`, `phoneNumber`, `messages`, `updatedAt`, `referredBy`, `aiBonusBank`, `aiUsedToday`, `aiUsedTodayDate`.
