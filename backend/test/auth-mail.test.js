const { test } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { createAuthMailer, mailFailureCode } = require("../src/services/auth-mail.service");
const config = { NODE_ENV: "test", SMTP_HOST: "127.0.0.1", SMTP_PORT: "2525", SMTP_USER: "sender@example.test", SMTP_PASSWORD: "synthetic" };
const apiConfig = { NODE_ENV: "production", MAIL_PROVIDER: "brevo", BREVO_API_KEY: "synthetic-api-key", MAIL_FROM: "sender@example.test" };

test("HTTPS mail uses verified sender, one recipient and escaped content without opening SMTP", async () => {
    let calls = 0;
    const send = createAuthMailer(apiConfig, {
        createTransport: () => { throw new Error("SMTP must not be opened"); },
        fetchImpl: async (url, options) => {
            calls++;
            assert.equal(url, "https://api.brevo.com/v3/smtp/email");
            assert.equal(options.method, "POST"); assert.equal(options.redirect, "error");
            assert.equal(options.headers["api-key"], apiConfig.BREVO_API_KEY);
            assert.ok(options.signal instanceof AbortSignal);
            const body = JSON.parse(options.body);
            assert.deepEqual(body.sender, { name: "VectorForge", email: apiConfig.MAIL_FROM });
            assert.deepEqual(body.to, [{ email: "owner@example.test" }]);
            assert.match(body.textContent, /https:\/\/frontend.test\/reset-password\?token=synthetic/);
            assert.match(body.htmlContent, /Reset &lt;VectorForge&gt;/);
            assert.match(body.htmlContent, /&amp;x=&quot;test&quot;/);
            assert.doesNotMatch(options.body, /synthetic-api-key/);
            return { ok: true, json: async () => ({ messageId: "synthetic-id" }) };
        }
    });
    assert.deepEqual(await send("owner@example.test", "Reset <VectorForge>", 'https://frontend.test/reset-password?token=synthetic&x="test"'), { accepted: true });
    assert.equal(calls, 1);
});

test("HTTPS failures and malformed acknowledgments are sanitized with no retry or SMTP fallback", async () => {
    for (const [status, code] of [[401, "EMAIL_API_AUTH"], [403, "EMAIL_API_AUTH"], [429, "EMAIL_API_RATE"], [400, "EMAIL_API_REJECTED"], [500, "EMAIL_API_REJECTED"], [302, "EMAIL_API_REJECTED"]]) {
        let calls = 0, cancelled = false;
        const send = createAuthMailer(apiConfig, { fetchImpl: async () => {
            calls++;
            return { ok: false, status, body: { cancel: async () => { cancelled = true; } }, json: () => { throw new Error("Private body must not be read"); } };
        } });
        await assert.rejects(send("owner@example.test", "Reset", "https://frontend.test"), { code });
        assert.equal(calls, 1); assert.equal(cancelled, true);
        assert.match(mailFailureCode({ code }), /^email_api_/);
    }
    for (const value of [null, {}, { messageId: "" }, { messageId: 42 }, { messageId: " " }]) {
        const send = createAuthMailer(apiConfig, { fetchImpl: async () => ({ ok: true, json: async () => value }) });
        await assert.rejects(send("owner@example.test", "Reset", "https://frontend.test"), { code: "EMAIL_API_UNCONFIRMED" });
    }
    for (const fetchImpl of [async () => { throw new Error("private-token-and-key"); }, async () => ({ ok: true, json: async () => { throw new Error("private-token-and-key"); } })]) {
        const send = createAuthMailer(apiConfig, { fetchImpl });
        await assert.rejects(send("owner@example.test", "Reset", "https://frontend.test"), (error) => {
            assert.equal(error.code, "EMAIL_API_UNCONFIRMED"); assert.doesNotMatch(error.stack, /private-token-and-key/); return true;
        });
    }
});

test("HTTPS deadlines cover both connection and response body and abort outstanding work", async () => {
    for (const hangBody of [false, true]) {
        let signal;
        const send = createAuthMailer(apiConfig, { timeoutMs: 20, fetchImpl: async (_, options) => {
            signal = options.signal;
            if (hangBody) return { ok: true, json: () => new Promise(() => {}) };
            return new Promise(() => {});
        } });
        await assert.rejects(send("owner@example.test", "Reset", "https://frontend.test"), { code: "EMAIL_API_TIMEOUT" });
        assert.equal(signal.aborted, true);
        assert.equal(mailFailureCode({ code: "EMAIL_API_TIMEOUT" }), "email_api_timeout");
    }
});

test("mail requires the intended recipient's acceptance and escapes its HTML link", async () => {
    let message;
    const send = createAuthMailer(config, { createTransport: () => ({ sendMail: async (mail) => {
        message = mail; return { accepted: ["OWNER@EXAMPLE.TEST"], rejected: [] };
    } }) });
    await send("owner@example.test", "Verify <VectorForge>", 'http://frontend.test/login?verification=synthetic&x="test"');
    assert.equal(message.from.address, config.SMTP_USER); assert.equal(message.from.name, "VectorForge");
    assert.match(message.text, /verification=synthetic/);
    assert.match(message.html, /Verify &lt;VectorForge&gt;/); assert.match(message.html, /&amp;x=&quot;test&quot;/);
    for (const result of [undefined, {}, { accepted: [] }, { accepted: ["other@example.test"] },
        { accepted: ["owner@example.test"], rejected: ["owner@example.test"] },
        { accepted: ["owner@example.test"], pending: ["owner@example.test"] }]) {
        const rejected = createAuthMailer(config, { createTransport: () => ({ sendMail: async () => result }) });
        await assert.rejects(rejected("owner@example.test", "Verify", "http://frontend.test"), { code: "ERECIPIENT" });
    }
});

test("mail deadlines and diagnostic categories do not leak provider responses", async () => {
    const send = createAuthMailer(config, { timeoutMs: 20, createTransport: () => ({ sendMail: () => new Promise(() => {}) }) });
    await assert.rejects(send("owner@example.test", "Verify", "http://frontend.test"), { code: "ETIMEDOUT" });
    assert.equal(mailFailureCode({ code: "EAUTH", response: "private upstream data" }), "smtp_authentication");
    assert.equal(mailFailureCode({ code: "EENVELOPE" }), "recipient_rejected");
    assert.equal(mailFailureCode({ code: "ETIMEDOUT" }), "smtp_timeout");
    assert.equal(mailFailureCode({ message: "private upstream data" }), "smtp_delivery_unconfirmed");
});

test("real Nodemailer sends the verification message over synthetic loopback SMTP and rejects refused recipients", async () => {
    const sockets = new Set(), messages = []; let rejectRecipient = false;
    const server = net.createServer((socket) => {
        sockets.add(socket); socket.on("close", () => sockets.delete(socket));
        socket.setEncoding("utf8"); socket.write("220 synthetic.test ESMTP\r\n");
        let buffer = "", data = false, body = [];
        socket.on("data", (chunk) => {
            buffer += chunk;
            let boundary;
            while ((boundary = buffer.indexOf("\r\n")) !== -1) {
                const line = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
                if (data) {
                    if (line === ".") { messages.push(body.join("\r\n")); body = []; data = false; socket.write("250 2.0.0 queued\r\n"); }
                    else body.push(line);
                } else if (/^(EHLO|HELO)/.test(line)) socket.write("250-synthetic.test\r\n250 AUTH PLAIN\r\n");
                else if (/^AUTH/.test(line)) socket.write("235 2.7.0 authenticated\r\n");
                else if (/^RCPT/.test(line) && rejectRecipient) socket.write("550 5.1.1 recipient rejected\r\n");
                else if (/^DATA/.test(line)) { data = true; socket.write("354 End with dot\r\n"); }
                else if (/^QUIT/.test(line)) socket.end("221 goodbye\r\n");
                else socket.write("250 OK\r\n");
            }
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const send = createAuthMailer({ ...config, SMTP_PORT: String(server.address().port) });
        await send("owner@example.test", "Verify your VectorForge email", "http://frontend.test/login?verification=synthetic");
        assert.equal(messages.length, 1);
        assert.match(messages[0], /Subject: Verify your VectorForge email/);
        assert.match(messages[0], /To: owner@example.test/);
        assert.match(messages[0], /Content-Type: multipart\/alternative/);
        assert.match(messages[0], /http:\/\/frontend.test\/login/);
        rejectRecipient = true;
        await assert.rejects(send("owner@example.test", "Verify", "http://frontend.test"), { code: "EENVELOPE" });
        assert.equal(messages.length, 1);
    } finally {
        for (const socket of sockets) socket.destroy();
        await new Promise((resolve) => server.close(resolve));
    }
});
