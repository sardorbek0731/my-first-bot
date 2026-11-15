import { bot } from "./bot-instance";
import "./handlers/basic";
import "./handlers/tasks";
import "./handlers/flow";
import { startReminders } from "./reminders";

bot.catch((err) => {
  console.error("Xatolik yuz berdi:", err.error);
});

async function main() {
  await bot.api.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "help", description: "Yordam" },
    { command: "new", description: "Yangi vazifa (nom va muddat)" },
    { command: "add", description: "Tezkor qo'shish: /add matn" },
    { command: "list", description: "Vazifalar ro'yxati" },
    { command: "cancel", description: "Amalni bekor qilish" },
  ]);

  console.log("Bot ishga tushdi ✅");
  startReminders();
  await bot.start();
}

main();
