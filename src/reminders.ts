import { bot } from "./bot-instance";
import { db } from "./db";
import { toIsoDate } from "./dates";

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

export function startReminders() {
  void sendReminders();
  setInterval(sendReminders, 60 * 1000);
}