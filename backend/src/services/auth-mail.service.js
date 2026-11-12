const nodemailer = require("nodemailer");

const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function mailFailureCode(error) {
    if (error?.code === "EAUTH") return "smtp_authentication";
    if (error?.code === "ERECIPIENT" || error?.code === "EENVELOPE") return "recipient_rejected";
    if (error?.code === "ETIMEDOUT") return "smtp_timeout";
    return "smtp_delivery_unconfirmed";
}

function createAuthMailer(config, { createTransport = nodemailer.createTransport, timeoutMs = 10000 } = {}) {
    const transporter = createTransport({
        host: config.SMTP_HOST, port: Number(config.SMTP_PORT), secure: Number(config.SMTP_PORT) === 465,
        requireTLS: config.NODE_ENV === "production" && Number(config.SMTP_PORT) !== 465,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
        logger: false, debug: false
    });
    return async function sendLink(email, subject, url) {
        let timer;
        try {
            const result = await Promise.race([
                transporter.sendMail({
                    from: { name: "VectorForge", address: config.SMTP_USER }, to: email, subject,
                    text: `Open this link to continue: ${url}\nIf you did not request this, ignore this email.`,
                    html: `<h1>${escapeHtml(subject)}</h1><p>Continue your VectorForge request:</p><p><a href="${escapeHtml(url)}">Continue to VectorForge</a></p><p>If you did not request this, ignore this email.</p>`
                }),
                new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("Mail deadline"), { code: "ETIMEDOUT" })), timeoutMs); })
            ]);
            // A fulfilled transport promise is not necessarily recipient acceptance.
            const accepted = result?.accepted?.some((address) => typeof address === "string" && address.toLowerCase() === email.toLowerCase());
            if (!accepted || result?.rejected?.length || result?.pending?.length) {
                throw Object.assign(new Error("Recipient delivery not accepted"), { code: "ERECIPIENT" });
            }
            return { accepted: true };
        } finally { clearTimeout(timer); }
    };
}

module.exports = { createAuthMailer, mailFailureCode };
