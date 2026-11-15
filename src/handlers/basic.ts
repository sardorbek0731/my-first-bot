import { InlineKeyboard } from "grammy";
import { bot } from "../bot-instance";

const HELP_TEXT = [
  "<b>Men nima qila olaman?</b>",
  "",
  "/new — vazifa qo'shish (nom, keyin muddat)",
  "/add <i>matn</i> — tezkor qo'shish (muddatsiz)",
  "/list — vazifalar ro'yxati",
  "/cancel — amalni bekor qilish",
  "",
  "Muddat: <code>15.11.2026</code>, <code>bugun</code> yoki <code>ertaga</code>.",
  "Muddati kelganda o'zim eslataman ⏰",
].join("\n");

bot.command("start", (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("➕ Yangi vazifa", "menu-new")
    .text("📋 Vazifalarim", "menu-list")
    .row()
    .text("ℹ️ Yordam", "menu-help");

  return ctx.reply(
    `Salom, ${ctx.from?.first_name}! 👋\n\n` +
      "Men vazifalar va eslatmalar botiman.\n" +
      "Vazifa qo'shing, muddat belgilang, vaqti kelganda o'zim eslataman.",
    { reply_markup: keyboard },
  );
});

bot.command("help", (ctx) => ctx.reply(HELP_TEXT, { parse_mode: "HTML" }));

bot.command("cancel", (ctx) => {
  ctx.session.step = "idle";
  ctx.session.draftText = undefined;
  return ctx.reply("Bekor qilindi ❌");
});

bot.callbackQuery("menu-help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
});

bot.callbackQuery("menu-new", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "waiting_task";
  await ctx.reply("Vazifa nomini yozing:");
});
