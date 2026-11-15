# Task Reminder Bot

Telegram bot built with grammY, TypeScript and SQLite.

## Features
- Add tasks (`/add`, `/new`), list with pagination, mark done, delete
- Due dates with validation and overdue marks
- Automatic due-date reminders

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and set `BOT_TOKEN`
3. `npm run dev`

## Deploy
Railway: set `BOT_TOKEN`, `DB_PATH=/data/bot.db`, `TZ=Asia/Tashkent`, and mount a volume at `/data`.