const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os");
const { extractText } = require("../src/services/pdf.service");
const { cleanupOrphans, fileName } = require("../src/services/upload-files.service");
async function temp(operation) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vf-core-test-"));
    try { await operation(directory); }
    finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith("vf-core-test-"));
        await fs.rm(directory, { recursive: true, force: true });
    }
}
const { makePDF } = require("./helpers/pdf-fixture");

test("real PDF parser extracts a synthetic fixture in a worker and rejects corrupt PDF bytes", async () => {
    await temp(async (directory) => {
        const valid = path.join(directory, "fixture.pdf"), invalid = path.join(directory, "corrupt.pdf");
        await fs.writeFile(valid, makePDF("Synthetic evidence only")); await fs.writeFile(invalid, "%PDF-broken");
        assert.match(await extractText(valid), /Synthetic evidence only/);
        await assert.rejects(extractText(invalid));
    });
});
test("orphan cleanup is dry-run by default and respects namespace, retention and unrelated files", async () => {
    await temp(async (directory) => {
        const old = fileName(), recent = fileName(), unrelated = "retained-user-document.pdf";
        for (const name of [old, recent, unrelated]) await fs.writeFile(path.join(directory, name), "synthetic");
        const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
        await fs.utimes(path.join(directory, old), yesterday, yesterday); await fs.utimes(path.join(directory, unrelated), yesterday, yesterday);
        assert.deepEqual(await cleanupOrphans({ directory }), [old]);
        assert.ok((await fs.readdir(directory)).includes(old));
        assert.deepEqual(await cleanupOrphans({ directory, apply: true }), [old]);
        assert.deepEqual((await fs.readdir(directory)).sort(), [recent, unrelated].sort());
        await assert.rejects(cleanupOrphans({ directory, olderThanMs: 0 }));
    });
});

test("partial page failures swallowed by pdf-parse cannot become successful extraction", async () => {
    const { parseComplete } = require("../src/services/pdf-parser");
    const good = { getTextContent: async () => ({ items: [{ str: "Evidence", transform: [1, 0, 0, 1, 0, 10] }] }) };
    const bad = { getTextContent: async () => { throw new Error("Synthetic page failure"); } };
    const complete = await parseComplete(new Uint8Array(), async (_, options) => ({ numpages: 1, text: await options.pagerender(good) }));
    assert.equal(complete, "Evidence");
    await assert.rejects(parseComplete(new Uint8Array(), async (_, options) => {
        const text = await options.pagerender(good);
        await options.pagerender(bad).catch(() => "");
        return { numpages: 2, text };
    }), /Incomplete/);
    await assert.rejects(parseComplete(new Uint8Array(), async () => ({ numpages: 501, text: "partial" })), /Incomplete/);
});
