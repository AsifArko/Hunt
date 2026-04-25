import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

interface QueuedEvent {
  payload: unknown;
  headers: Record<string, string>;
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readQueue(filePath: string): Promise<QueuedEvent[]> {
  try {
    const data = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as QueuedEvent[];
  } catch {
    return [];
  }
}

async function writeQueue(filePath: string, queue: QueuedEvent[]): Promise<void> {
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(queue, null, 2), "utf-8");
}

export class FileBackedQueue {
  public constructor(private readonly filePath: string) {}

  public async enqueue(event: QueuedEvent): Promise<void> {
    const queue = await readQueue(this.filePath);
    queue.push(event);
    await writeQueue(this.filePath, queue);
  }

  public async flush(
    send: (event: QueuedEvent) => Promise<void>,
  ): Promise<void> {
    const queue = await readQueue(this.filePath);
    if (queue.length === 0) {
      return;
    }

    const remaining: QueuedEvent[] = [];
    for (const event of queue) {
      try {
        await send(event);
      } catch {
        remaining.push(event);
      }
    }
    await writeQueue(this.filePath, remaining);
  }
}
