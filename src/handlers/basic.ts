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

bot.callbackQuery(/^meva-(.+)$/, async (ctx) => {
  const mevaRaw = ctx.match[1]; // Masalan: "olma"

  // Birinchi harfni katta, qolganini kichik qilish
  const meva = mevaRaw.charAt(0).toUpperCase() + mevaRaw.slice(1).toLowerCase(); // Masalan: "Olma"

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Siz tanladingiz: ${meva} ✅`);
});
