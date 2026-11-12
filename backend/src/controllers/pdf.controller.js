const { extractText } = require("../services/pdf.service");
const { ingestDocument } = require("../services/document.ingestion.service");
const fs = require("fs/promises");
const uploadPDF = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "PDF file is required." });
        const signal = AbortSignal.timeout(45000);
        const handle = await fs.open(req.file.path, "r"), signature = Buffer.alloc(5);
        try { await handle.read(signature, 0, 5, 0); } finally { await handle.close(); }
        if (signature.toString() !== "%PDF-") return res.status(400).json({ success: false, message: "Invalid PDF file." });
        const text = await extractText(req.file.path);
        const { document, duplicate } = await ingestDocument({ userId: req.user._id, text, fileName: req.file.originalname, signal });
        res.json({ success: true, message: duplicate ? "Document already stored." : "Document embedded successfully.",
            documentId: document.documentId, duplicate, totalChunks: document.chunks.length, storedVectors: document.chunks.length });
    } catch (error) {
        const status = [400, 413].includes(error.status) ? error.status : 503;
        res.status(status).json({ success: false, message: status === 503 ? "Document processing failed. No partial document was published; retry safely." : error.message });
    } finally {
        if (req.file?.path) {
            try { await fs.unlink(req.file.path); } catch { console.warn("PDF temporary-file cleanup failed."); }
        }
    }
};
module.exports = { uploadPDF };
