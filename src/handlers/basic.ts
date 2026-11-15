import { InlineKeyboard } from "grammy";
import { bot } from "../bot-instance";

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

bot.command("cancel", (ctx) => {
  ctx.session.step = "idle";
  ctx.session.draftText = undefined;
  return ctx.reply("Bekor qilindi ❌");
});
