import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync("bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text    TEXT    NOT NULL
  )
`);

const columns = db.prepare("PRAGMA table_info(tasks)").all() as {
  name: string;
}[];
if (!columns.some((c) => c.name === "due")) {
  db.exec("ALTER TABLE tasks ADD COLUMN due TEXT");
}
