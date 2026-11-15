import { bot } from "./bot-instance";
import { db } from "./db";
import { formatDue, parseDue, toIsoDate } from "./dates";
import "./handlers/basic";
import { MAX_TASK_LENGTH } from "./handlers/tasks";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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
