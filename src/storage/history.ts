import { unlink } from "node:fs/promises";
import type { Message } from "../types";

const HISTORY_PATH = "history.json";

export async function loadHistory(): Promise<{ history: Message[]; welcomeBack: boolean }> {
  const file = Bun.file(HISTORY_PATH);
  const exists = await file.exists();
  if (!exists) {
    return { history: [], welcomeBack: false };
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed)) {
      return { history: [], welcomeBack: true };
    }
    return { history: parsed, welcomeBack: true };
  } catch {
    return { history: [], welcomeBack: true };
  }
}

export async function saveHistory(history: Message[]): Promise<void> {
  await Bun.write(HISTORY_PATH, JSON.stringify(history, null, 2));
}

export async function resetHistory(): Promise<void> {
  const file = Bun.file(HISTORY_PATH);
  if (await file.exists()) {
    await unlink(HISTORY_PATH);
  }
}
