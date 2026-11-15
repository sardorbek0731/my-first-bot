import { Bot, Context, session, type SessionFlavor } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN topilmadi (.env faylni tekshiring)");

export type SessionData = {
  step: "idle" | "waiting_task" | "waiting_due";
  draftText?: string;
};
export type MyContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<MyContext>(token);

bot.use(
  session({
    initial: (): SessionData => ({ step: "idle" }),
  }),
);
