// Worker lifecycle: runtime failures and stalled operations must always reach the UI.
export class WorkbookClient {
  constructor(onMessage, onFailure, { timeout = 60000, createWorker = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }) } = {}) {
    this.onMessage = onMessage; this.onFailure = onFailure; this.timeout = timeout; this.createWorker = createWorker;
  }
  send(message, transfer = []) {
    clearTimeout(this.timer);
    try {
      if (!this.worker) {
        const worker = this.createWorker(); this.worker = worker;
        worker.onmessage = event => {
          if (this.worker !== worker) return;
          if (event.data.type !== 'progress') clearTimeout(this.timer);
          this.onMessage(event);
        };
        worker.onerror = event => { event.preventDefault(); if (this.worker === worker) this.fail('Workbook processing could not start. Refresh the page and try again. If this continues, the website may need its built version republished.'); };
        worker.onmessageerror = () => { if (this.worker === worker) this.fail('The workbook response could not be read. Please try again.'); };
      }
      this.timer = setTimeout(() => this.fail('Processing took too long. Try again or choose a smaller workbook.'), message.type === 'generate' ? this.timeout * 2 : this.timeout);
      this.worker.postMessage(message, transfer);
    } catch { this.fail('Workbook processing could not start. Please refresh and try again.'); }
  }
  fail(message) { this.cancel(); this.onFailure(message); }
  cancel() { clearTimeout(this.timer); this.worker?.terminate(); this.worker = null; }
}
