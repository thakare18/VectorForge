const { Worker } = require("node:worker_threads");
const path = require("node:path");
const { invalid } = require("../validators/vector.contract");
const extractText = (filePath) => new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "pdf.worker.js"), { workerData: filePath, stdout: true, stderr: true,
        resourceLimits: { maxOldGenerationSizeMb: 128 } });
    worker.stdout.resume();
    worker.stderr.resume();
    const timer = setTimeout(() => { worker.terminate(); reject(invalid("PDF parsing timed out.")); }, 10000);
    worker.once("message", (result) => {
        clearTimeout(timer); worker.terminate();
        if (typeof result.text === "string") resolve(result.text);
        else reject(invalid("PDF could not be parsed."));
    });
    worker.once("error", () => { clearTimeout(timer); reject(invalid("PDF could not be parsed within resource limits.")); });
    worker.once("exit", () => { clearTimeout(timer); reject(invalid("PDF parser stopped before completing extraction.")); });
});
function createChunks(text, chunkSize = 500, overlap = 100) {
    if (typeof text !== "string" || !Number.isInteger(chunkSize) || chunkSize < 1 || !Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) throw invalid("Invalid chunk parameters.");
    const chunks = [];
    for (let start = 0; start < text.length; start += chunkSize - overlap) {
        const chunk = text.slice(start, start + chunkSize);
        if (chunk.trim()) chunks.push(chunk);
    }
    return chunks;
}
module.exports = { extractText, createChunks };
