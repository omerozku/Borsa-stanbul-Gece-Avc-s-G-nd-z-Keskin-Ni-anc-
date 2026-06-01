import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot: TelegramBot | null = null;

if (token) {
  bot = new TelegramBot(token, { polling: false });
}

export async function sendTelegramMessage(message: string) {
  if (bot && chatId) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[Telegram] Error sending message:', error);
    }
  } else {
    console.log('[Telegram] Bot not configured. Message:', message);
  }
}
