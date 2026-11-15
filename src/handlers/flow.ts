import { bot } from "../bot-instance";
import { db } from "../db";
import { formatDue, parseDue } from "../dates";
import { MAX_TASK_LENGTH } from "./tasks";

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
