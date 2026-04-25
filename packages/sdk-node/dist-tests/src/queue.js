import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
async function ensureDir(filePath) {
    await mkdir(dirname(filePath), { recursive: true });
}
async function readQueue(filePath) {
    try {
        const data = await readFile(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed;
    }
    catch {
        return [];
    }
}
async function writeQueue(filePath, queue) {
    await ensureDir(filePath);
    await writeFile(filePath, JSON.stringify(queue, null, 2), "utf-8");
}
export class FileBackedQueue {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async enqueue(event) {
        const queue = await readQueue(this.filePath);
        queue.push(event);
        await writeQueue(this.filePath, queue);
    }
    async flush(send) {
        const queue = await readQueue(this.filePath);
        if (queue.length === 0) {
            return;
        }
        const remaining = [];
        for (const event of queue) {
            try {
                await send(event);
            }
            catch {
                remaining.push(event);
            }
        }
        await writeQueue(this.filePath, remaining);
    }
}
//# sourceMappingURL=queue.js.map