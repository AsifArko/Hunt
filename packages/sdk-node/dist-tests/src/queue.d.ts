interface QueuedEvent {
    payload: unknown;
    headers: Record<string, string>;
}
export declare class FileBackedQueue {
    private readonly filePath;
    constructor(filePath: string);
    enqueue(event: QueuedEvent): Promise<void>;
    flush(send: (event: QueuedEvent) => Promise<void>): Promise<void>;
}
export {};
//# sourceMappingURL=queue.d.ts.map