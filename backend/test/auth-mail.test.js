const { test } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { createAuthMailer, mailFailureCode } = require("../src/services/auth-mail.service");
const config = { NODE_ENV: "test", SMTP_HOST: "127.0.0.1", SMTP_PORT: "2525", SMTP_USER: "sender@example.test", SMTP_PASSWORD: "synthetic" };

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
