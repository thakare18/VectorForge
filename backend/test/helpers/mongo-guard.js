function testUri() {
    const raw = process.env.TEST_MONGODB_URI;
    if (!raw || process.env.VF_DISPOSABLE_MONGO !== "1") throw new Error("Explicit disposable MongoDB test opt-in is required");
    const url = new URL(raw);
    if (url.protocol !== "mongodb:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password || url.search || url.hash ||
        !/^\/vf_phase3_[a-f0-9]+$/.test(url.pathname)) throw new Error("Test URI must identify a unique loopback disposable database");
    return raw;
}
const embedding = () => [1, ...new Array(3071).fill(0)];
module.exports = { testUri, embedding };
