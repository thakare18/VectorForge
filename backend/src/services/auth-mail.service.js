const nodemailer = require("nodemailer");

const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function mailFailureCode(error) {
    const apiCodes = { EMAIL_API_AUTH: "email_api_authentication", EMAIL_API_RATE: "email_api_rate_limited",
        EMAIL_API_REJECTED: "email_api_rejected", EMAIL_API_TIMEOUT: "email_api_timeout",
        EMAIL_API_UNCONFIRMED: "email_api_delivery_unconfirmed" };
    if (Object.hasOwn(apiCodes, error?.code)) return apiCodes[error.code];
    if (error?.code === "EAUTH") return "smtp_authentication";
    if (error?.code === "ERECIPIENT" || error?.code === "EENVELOPE") return "recipient_rejected";
    if (error?.code === "ETIMEDOUT") return "smtp_timeout";
    return "smtp_delivery_unconfirmed";
}

const content = (subject, url) => ({
    text: `Open this link to continue: ${url}\nIf you did not request this, ignore this email.`,
    html: `<h1>${escapeHtml(subject)}</h1><p>Continue your VectorForge request:</p><p><a href="${escapeHtml(url)}">Continue to VectorForge</a></p><p>If you did not request this, ignore this email.</p>`
});
const apiError = (code) => Object.assign(new Error("Email delivery could not be confirmed."), { code });

function createAuthMailer(config, { createTransport = nodemailer.createTransport, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    // HTTPS on 443 works on hosts that block outbound SMTP. Never silently fall
    // back between providers: a lost acknowledgment could otherwise send twice.
    if (config.MAIL_PROVIDER === "brevo") return async function sendLink(email, subject, url) {
        const controller = new AbortController();
        let timer;
        try {
            await Promise.race([
                (async () => {
                    const message = content(subject, url);
                    const response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
                        method: "POST", redirect: "error", signal: controller.signal,
                        headers: { "api-key": config.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({ sender: { name: "VectorForge", email: config.MAIL_FROM },
                            to: [{ email }], subject, textContent: message.text, htmlContent: message.html })
                    });
                    if (!response.ok) {
                        // Do not read/log error bodies: they can contain recipients or credentials.
                        await response.body?.cancel();
                        throw apiError([401, 403].includes(response.status) ? "EMAIL_API_AUTH"
                            : response.status === 429 ? "EMAIL_API_RATE" : "EMAIL_API_REJECTED");
                    }
                    const result = await response.json();
                    if (typeof result?.messageId !== "string" || !result.messageId.trim()) throw apiError("EMAIL_API_UNCONFIRMED");
                })(),
                new Promise((_, reject) => { timer = setTimeout(() => {
                    reject(apiError("EMAIL_API_TIMEOUT")); controller.abort();
                }, timeoutMs); })
            ]);
            // Provider acceptance is not a guarantee of inbox delivery.
            return { accepted: true };
        } catch (error) {
            throw apiError(controller.signal.aborted ? "EMAIL_API_TIMEOUT"
                : ["EMAIL_API_AUTH", "EMAIL_API_RATE", "EMAIL_API_REJECTED", "EMAIL_API_UNCONFIRMED"].includes(error?.code)
                    ? error.code : "EMAIL_API_UNCONFIRMED");
        } finally { clearTimeout(timer); }
    };
    if (config.MAIL_PROVIDER && config.MAIL_PROVIDER !== "smtp") throw new Error("Unsupported MAIL_PROVIDER");
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
                    ...content(subject, url)
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
