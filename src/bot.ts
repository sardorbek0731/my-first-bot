import {
  Bot,
  Context,
  InlineKeyboard,
  session,
  type SessionFlavor,
} from "grammy";
import { db, getTasks, type Task } from "./db";
import { formatDue, isOverdue, parseDue, toIsoDate } from "./dates";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN topilmadi (.env faylni tekshiring)");

type SessionData = {
  step: "idle" | "waiting_task" | "waiting_due";
  draftText?: string;
};
type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(token);

bot.use(
  session({
    initial: (): SessionData => ({ step: "idle" }),
  }),
);

const MAX_TASK_LENGTH = 100;
const LIST_TITLE = "Vazifalar (nomini bossangiz: bajarildi, 🗑: o'chirish):";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const PAGE_SIZE = 5;

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * PAGE_SIZE;

  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: current,
    totalPages,
  };
}

function buildTaskKeyboard(list: Task[], page = 1): InlineKeyboard {
  const view = paginate(list, page);
  const keyboard = new InlineKeyboard();

  view.items.forEach((task) => {
    const overdue = task.due && !task.done && isOverdue(task.due);
    const mark = task.done ? "✅" : overdue ? "⚠️" : "⬜";
    const dueText = task.due ? ` (${formatDue(task.due)})` : "";

    keyboard
      .text(`${mark} ${task.text}${dueText}`, `toggle-${task.id}-${view.page}`)
      .text("🗑", `del-${task.id}-${view.page}`)
      .row();
  });

  if (view.totalPages > 1) {
    keyboard
      .text("◀️", `page-${view.page - 1}`)
      .text(`${view.page}/${view.totalPages}`, "noop")
      .text("▶️", `page-${view.page + 1}`)
      .row();
  }

  return keyboard.text("🗑 Hammasini o'chirish", "clear-all");
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

  if (text.length > MAX_TASK_LENGTH) {
    return ctx.reply(`Juda uzun. Eng ko'pi ${MAX_TASK_LENGTH} belgi.`);
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

bot.command("new", (ctx) => {
  ctx.session.step = "waiting_task";
  return ctx.reply("Vazifa nomini yozing:");
});

bot.command("cancel", (ctx) => {
  ctx.session.step = "idle";
  ctx.session.draftText = undefined;
  return ctx.reply("Bekor qilindi ❌");
});

bot.command("list", (ctx) => {
  ctx.session.step = "idle";
  const userId = ctx.from?.id;
  if (!userId) return;

  const list = getTasks(userId);

  if (list.length === 0) {
    return ctx.reply("Vazifalar yo'q. Qo'shish uchun: /add Non olish");
  }

  return ctx.reply(LIST_TITLE, {
    reply_markup: buildTaskKeyboard(list),
  });
});

bot.on("message:text", (ctx) => {
  const input = ctx.message.text.trim();

  if (ctx.session.step === "waiting_task") {
    if (input.length > MAX_TASK_LENGTH) {
      return ctx.reply(
        `Juda uzun. Eng ko'pi ${MAX_TASK_LENGTH} belgi (hozir ${input.length}). Qisqaroq yozing:`,
      );
    }

    ctx.session.draftText = input;
    ctx.session.step = "waiting_due";
    return ctx.reply("Muddatini yozing (muddat yo'q bo'lsa: -):");
  }

  if (ctx.session.step === "waiting_due") {
    const text = ctx.session.draftText;
    if (!text) {
      ctx.session.step = "idle";
      return ctx.reply("Xatolik yuz berdi, /new dan qayta boshlang.");
    }

    let due: string | null = null;

    if (input !== "-") {
      const parsed = parseDue(input);
      if (!parsed) {
        return ctx.reply(
          "Sana tushunarsiz. Masalan: 15.11.2026, bugun yoki ertaga (muddatsiz: -):",
        );
      }
      due = parsed;
    }

    db.prepare("INSERT INTO tasks (user_id, text, due) VALUES (?, ?, ?)").run(
      ctx.from.id,
      text,
      due,
    );

    ctx.session.step = "idle";
    ctx.session.draftText = undefined;

    return ctx.reply(
      `Qo'shildi ✅ ${text}${due ? ` (${formatDue(due)})` : ""}`,
    );
  }

  return ctx.reply("Komanda tanlang: /help");
});

bot.callbackQuery(/^meva-(.+)$/, async (ctx) => {
  const mevaRaw = ctx.match[1]; // Masalan: "olma"

  // Birinchi harfni katta, qolganini kichik qilish
  const meva = mevaRaw.charAt(0).toUpperCase() + mevaRaw.slice(1).toLowerCase(); // Masalan: "Olma"

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Siz tanladingiz: ${meva} ✅`);
});

bot.callbackQuery(/^del-(\d+)-(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const taskId = Number(ctx.match[1]);
  const page = Number(ctx.match[2]);

  db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(
    taskId,
    userId,
  );

  await ctx.answerCallbackQuery({ text: "O'chirildi 🗑" });

  const list = getTasks(userId);

  if (list.length === 0) {
    await ctx.editMessageText("Hamma vazifalar bajarildi! 🎉");
    return;
  }

  await ctx.editMessageText(LIST_TITLE, {
    reply_markup: buildTaskKeyboard(list, page),
  });
});

bot.callbackQuery(/^toggle-(\d+)-(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const taskId = Number(ctx.match[1]);
  const page = Number(ctx.match[2]);

  db.prepare(
    "UPDATE tasks SET done = 1 - done WHERE id = ? AND user_id = ?",
  ).run(taskId, userId);

  await ctx.answerCallbackQuery();

  const list = getTasks(userId);

  await ctx.editMessageText(LIST_TITLE, {
    reply_markup: buildTaskKeyboard(list, page),
  });
});

bot.callbackQuery(/^page-(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const page = Number(ctx.match[1]);

  const list = getTasks(userId);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(LIST_TITLE, {
    reply_markup: buildTaskKeyboard(list, page),
  });
});

bot.callbackQuery("noop", (ctx) => ctx.answerCallbackQuery());

bot.callbackQuery("clear-all", async (ctx) => {
  db.prepare("DELETE FROM tasks WHERE user_id = ?").run(ctx.from.id);

  await ctx.answerCallbackQuery({ text: "Tozalandi 🧹" });
  await ctx.editMessageText("Ro'yxat tozalandi 🧹");
});

bot.catch((err) => {
  console.error("Xatolik yuz berdi:", err.error);
});

type DueTask = { id: number; user_id: number; text: string };

async function sendReminders() {
  const today = toIsoDate(new Date());

  const tasks = db
    .prepare(
      `SELECT id, user_id, text FROM tasks
       WHERE due <= ? AND done = 0 AND notified = 0`,
    )
    .all(today) as DueTask[];

  for (const task of tasks) {
    try {
      await bot.api.sendMessage(task.user_id, `⏰ Eslatma: ${task.text}`);
      db.prepare("UPDATE tasks SET notified = 1 WHERE id = ?").run(task.id);
    } catch (error) {
      console.error("Eslatma yuborilmadi:", task.id, error);
    }
  }
}

async function main() {
  await bot.api.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "help", description: "Yordam" },
    { command: "add", description: "Vazifa qo'shish: /add matn" },
    { command: "list", description: "Vazifalar ro'yxati" },
    { command: "new", description: "Vazifa qo'shish (bosqichma-bosqich)" },
    { command: "cancel", description: "Amalni bekor qilish" },
  ]);

  console.log("Bot ishga tushdi ✅");
  void sendReminders();
  setInterval(sendReminders, 60 * 1000);
  await bot.start();
}

main();
