const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs/promises");
const { parseComplete } = require("./pdf-parser");
(async () => {
    try {
        const stat = await fs.stat(workerData);
        if (stat.size > 10 * 1024 * 1024) throw new Error("Too large");
        // The bundled pdf.js expects Uint8Array slice semantics, not Buffer views.
        const text = await parseComplete(new Uint8Array(await fs.readFile(workerData)));
        parentPort.postMessage({ text });
    } catch { parentPort.postMessage({ failed: true }); }
})();
