import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync("bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text    TEXT    NOT NULL
  )
`);
