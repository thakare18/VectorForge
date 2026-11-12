const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const uploadDirectory = path.join(os.tmpdir(), "vectorforge-uploads-v2");
const fileName = () => "vf2-" + crypto.randomUUID() + ".pdf";
async function cleanupOrphans({ directory = uploadDirectory, olderThanMs = 24 * 60 * 60 * 1000, apply = false, now = Date.now() } = {}) {
    if (!Number.isFinite(olderThanMs) || olderThanMs < 60 * 60 * 1000) throw new Error("Retention must be at least one hour.");
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const candidates = [];
    for (const entry of entries) {
        if (!entry.isFile() || !/^vf2-[a-f0-9-]{36}\.pdf$/.test(entry.name)) continue;
        const target = path.join(path.resolve(directory), entry.name), stat = await fs.lstat(target);
        if (!stat.isFile() || stat.isSymbolicLink() || now - stat.mtimeMs < olderThanMs) continue;
        candidates.push(entry.name);
        if (apply) await fs.unlink(target);
    }
    return candidates;
}
module.exports = { uploadDirectory, fileName, cleanupOrphans };
