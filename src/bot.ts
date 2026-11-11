import { Bot, InlineKeyboard } from "grammy";
import { db } from "./db";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN topilmadi (.env faylni tekshiring)");

const bot = new Bot(token);

type Task = { id: number; text: string };

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

bot.command("start", (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🍎 Olma", "meva-olma")
    .text("🍓 Qulupnay", "meva-qulupnay")
    .row()
    .text("🍇 Uzum", "meva-uzum");

  return ctx.reply(
    `Salom, ${ctx.from?.first_name}! Sevimli mevangizni tanlang:`,
    { reply_markup: keyboard },
  );
});

bot.command("help", (ctx) =>
  ctx.reply(
    [
      "<b>Men nima qila olaman?</b>",
      "",
      "/add <i>matn</i> — vazifa qo'shish",
      "/list — vazifalar ro'yxati",
      "/start — botni boshlash",
    ].join("\n"),
    { parse_mode: "HTML" },
  ),
);

bot.command("add", (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.match.trim();
  if (!text) {
    return ctx.reply("Vazifa matnini yozing. Masalan: /add Non olish");
  }

  db.prepare("INSERT INTO tasks (user_id, text) VALUES (?, ?)").run(
    userId,
    text,
  );

  const row = db
    .prepare("SELECT COUNT(*) AS count FROM tasks WHERE user_id = ?")
    .get(userId) as { count: number };

  return ctx.reply(`Qo'shildi ✅ Jami vazifalar: ${row.count}`);
});

bot.command("list", (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const list = db
    .prepare("SELECT id, text FROM tasks WHERE user_id = ? ORDER BY id")
    .all(userId) as Task[];

  if (list.length === 0) {
    return ctx.reply("Vazifalar yo'q. Qo'shish uchun: /add Non olish");
  }

  const keyboard = new InlineKeyboard();
  list.forEach((task) => {
    keyboard.text(`❌ ${task.text}`, `del-${task.id}`).row();
  });
  keyboard.text("🗑 Hammasini o'chirish", "clear-all");
  return ctx.reply("Sizning vazifalaringiz (o'chirish uchun bosing):", {
    reply_markup: keyboard,
  });
});

bot.on("message:text", (ctx) =>
  ctx.reply(`Siz yozdingiz: ${ctx.message.text}`),
);

bot.callbackQuery(/^meva-(.+)$/, async (ctx) => {
  const mevaRaw = ctx.match[1]; // Masalan: "olma"

  // Birinchi harfni katta, qolganini kichik qilish
  const meva = mevaRaw.charAt(0).toUpperCase() + mevaRaw.slice(1).toLowerCase(); // Masalan: "Olma"

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Siz tanladingiz: ${meva} ✅`);
});

bot.callbackQuery(/^del-(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const taskId = Number(ctx.match[1]);

  db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(
    taskId,
    userId,
  );

  await ctx.answerCallbackQuery({ text: "O'chirildi 🗑" });

  const list = db
    .prepare("SELECT id, text FROM tasks WHERE user_id = ? ORDER BY id")
    .all(userId) as Task[];

  if (list.length === 0) {
    await ctx.editMessageText("Hamma vazifalar bajarildi! 🎉");
    return;
  }

  const keyboard = new InlineKeyboard();
  list.forEach((task) => {
    keyboard.text(`❌ ${task.text}`, `del-${task.id}`).row();
  });
  await ctx.editMessageText(
    "Sizning vazifalaringiz (o'chirish uchun bosing):",
    { reply_markup: keyboard },
  );
});

bot.callbackQuery("clear-all", async (ctx) => {
  db.prepare("DELETE FROM tasks WHERE user_id = ?").run(ctx.from.id);

  await ctx.answerCallbackQuery({ text: "Tozalandi 🧹" });
  await ctx.editMessageText("Ro'yxat tozalandi 🧹");
});

bot.catch((err) => {
  console.error("Xatolik yuz berdi:", err.error);
});

async function main() {
  await bot.api.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "help", description: "Yordam" },
    { command: "add", description: "Vazifa qo'shish: /add matn" },
    { command: "list", description: "Vazifalar ro'yxati" },
  ]);

  console.log("Bot ishga tushdi ✅");
  await bot.start();
}

main();
