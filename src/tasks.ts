let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
export function cancelTasks(reason = "Processing canceled.") {
  worker?.terminate();
  worker = null;
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(Error(reason));
  }
  pending.clear();
}
export function task<T>(data: object): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL("./file-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data: m }) => {
      const p = pending.get(m.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(m.id);
      m.error ? p.reject(Error(m.error)) : p.resolve(m.result);
    };
    worker.onerror = () =>
      cancelTasks(
        "The processing worker stopped. Choose the file again to retry.",
      );
    worker.onmessageerror = () =>
      cancelTasks(
        "The processing result could not be read. Choose the file again.",
      );
  }
  return new Promise((resolve, reject) => {
    const id = ++sequence,
      timer = setTimeout(() => {
        cancelTasks("Processing timed out. Try a smaller workbook.");
      }, 120000);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ ...data, id });
  });
}
