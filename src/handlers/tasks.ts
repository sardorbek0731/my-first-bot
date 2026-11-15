import { InlineKeyboard } from "grammy";
import { bot } from "../bot-instance";
import { db, getTasks, type Task } from "../db";
import { formatDue, isOverdue } from "../dates";

export const MAX_TASK_LENGTH = 100;
export const LIST_TITLE = "Vazifalar (nomini bossangiz: bajarildi, 🗑: o'chirish):";

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

export function buildTaskKeyboard(list: Task[], page = 1): InlineKeyboard {
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
