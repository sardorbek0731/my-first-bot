import { InlineKeyboard } from "grammy";
import { bot } from "../bot-instance";
import { db, getTasks, type Task } from "../db";
import { formatDue, isOverdue } from "../dates";

export const MAX_TASK_LENGTH = 100;
const LIST_TITLE = "Vazifalar (nomini bossangiz: bajarildi, 🗑: o'chirish):";

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

bot.command("add", (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.match.trim();
  if (!text) {
    return ctx.reply("Vazifa matnini yozing. Masalan: /add Dars qilish");
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

bot.command("list", (ctx) => {
  ctx.session.step = "idle";
  const userId = ctx.from?.id;
  if (!userId) return;

  const list = getTasks(userId);

  if (list.length === 0) {
    return ctx.reply("Vazifalar yo'q. Qo'shish uchun: /new");
  }

  return ctx.reply(LIST_TITLE, {
    reply_markup: buildTaskKeyboard(list),
  });
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

bot.callbackQuery("menu-list", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";

  const list = getTasks(ctx.from.id);
  if (list.length === 0) {
    await ctx.reply("Vazifalar yo'q. Qo'shish uchun: /new");
    return;
  }

  await ctx.reply(LIST_TITLE, { reply_markup: buildTaskKeyboard(list) });
});
