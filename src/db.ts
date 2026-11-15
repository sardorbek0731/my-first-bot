import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(process.env.DB_PATH ?? "bot.db");

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

if (!columns.some((c) => c.name === "done")) {
  db.exec("ALTER TABLE tasks ADD COLUMN done INTEGER NOT NULL DEFAULT 0");
}

if (!columns.some((c) => c.name === "notified")) {
  db.exec("ALTER TABLE tasks ADD COLUMN notified INTEGER NOT NULL DEFAULT 0");
}

export type Task = {
  id: number;
  text: string;
  due: string | null;
  done: number;
};

export function getTasks(userId: number): Task[] {
  return db
    .prepare(
      `SELECT id, text, due, done FROM tasks
       WHERE user_id = ?
       ORDER BY done, due IS NULL, due, id`,
    )
    .all(userId) as Task[];
}
