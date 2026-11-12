const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { createAuthMailer, mailFailureCode } = require("../services/auth-mail.service");
const env = require("../config/env");
const User = require("../models/User");
const Grant = require("../models/AuthGrant");
const { hash, randomToken, validToken, validEmail, validPassword, publicUser, signToken } = require("../security/auth");

const googleClient = new OAuth2Client({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_CALLBACK_URL, transporterOptions: { timeout: 15000 } });
const sendLink = createAuthMailer(env);
const genericMail = { success: true, message: "If this address is eligible, an email with next steps will be sent." };
const badInput = (res) => res.status(400).json({ success: false, message: "Invalid request." });
const unavailable = (res) => res.status(503).json({ success: false, message: "Service temporarily unavailable." });
const authResponse = (res, user) => res.json({ success: true, token: signToken(user), user: publicUser(user) });
const frontend = (path) => new URL(path, env.FRONTEND_URL).toString();

// Only verified registrations create Users. Pending registrations cannot reserve an email.
const register = async (req, res) => {
    const { name, email: suppliedEmail, password } = req.body || {};
    const email = typeof suppliedEmail === "string" ? suppliedEmail.trim() : suppliedEmail;
    if (typeof name !== "string" || !name.trim() || name.length > 100 || !validEmail(email) || !validPassword(password)) return badInput(res);
    let stage = "password_preparation";
    try {
        const normalized = email.toLowerCase().trim();
        const passwordHash = await bcrypt.hash(password, 12);
        // Same persistence/mail path for every valid address, including existing users.
        // Acceptance means SMTP accepted the message, not merely that a background task started.
        const token = randomToken();
        stage = "registration_persistence";
        await Grant.create({ _id: hash(token), kind: "registration",
            registration: { name: name.trim(), email: normalized, password: passwordHash },
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
        stage = "email";
        await sendLink(normalized, "Verify your VectorForge email", frontend(`/login?verification=${token}`));
        return res.status(202).json({ success: true, message: "A verification email was accepted for delivery. Open it to finish registration. If you already have an account, use your existing sign-in method." });
    } catch (error) { console.warn("Registration processing failed: " + (stage === "email" ? mailFailureCode(error) : stage) + "."); }
    if (!res.headersSent) return unavailable(res);
};

const verifyEmail = async (req, res) => {
    if (!validToken(req.body?.token)) return badInput(res);
    try {
        const predicate = { _id: hash(req.body.token), kind: "registration", expiresAt: { $gt: new Date() } };
        const grant = await Grant.findOne(predicate);
        if (!grant) return badInput(res);
        let user, passwordSetupUser;
        try {
            user = await User.create({ ...(grant.registration.toObject?.() || grant.registration),
                provider: "local", emailVerified: true, registrationGrantId: grant._id });
        } catch (error) {
            if (error.code !== 11000) throw error;
            // A retry after an uncertain write may resume only the account this grant created.
            // Another registration or OAuth account must never acquire the submitted password.
            user = await User.findOne({ email: grant.registration.email, registrationGrantId: grant._id });
            if (!user) {
                const existing = await User.findOne({ email: grant.registration.email });
                if (existing && !existing.password) passwordSetupUser = existing;
            }
        }
        if (!await Grant.findOneAndDelete(predicate)) return badInput(res);
        if (user) return authResponse(res, user);
        if (passwordSetupUser) {
            // The email owner chooses a NEW password after proof. Never install the
            // password from a registration initiated by someone else.
            const setupToken = randomToken();
            const updated = await User.findOneAndUpdate({ _id: passwordSetupUser._id, password: null },
                { $set: { resetPasswordTokenHash: hash(setupToken), resetPasswordToken: null,
                    resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000) } }, { returnDocument: "after" });
            if (updated) return res.json({ success: true, passwordSetupToken: setupToken,
                message: "Email verified. Choose a password to enable email/password sign-in." });
        }
        return res.json({ success: true, message: "Email verified. You can sign in or reset your password." });
    } catch { return unavailable(res); }
};

const login = async (req, res) => {
    const { email: suppliedEmail, password } = req.body || {};
    const email = typeof suppliedEmail === "string" ? suppliedEmail.trim() : suppliedEmail;
    if (!validEmail(email) || !validPassword(password, true)) return badInput(res);
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // A real bcrypt comparison also runs for unknown/OAuth-only accounts.
        const dummy = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7VBpN6AGyGBJ0wI1K.PPjZfaYlEoX7K";
        const matched = await bcrypt.compare(password, user?.password || dummy);
        if (!user?.password || !matched) return res.status(401).json({ success: false,
            message: "Invalid email or password. New registrations need email verification; Google/GitHub users can set a password by email." });
        return authResponse(res, user);
    } catch { return unavailable(res); }
};
const getMe = (req, res) => res.json({ success: true, user: publicUser(req.user) });

const forgotPassword = async (req, res) => {
    const { email } = req.body || {};
    if (!validEmail(email)) return badInput(res);
    // Identical response and timing for local, OAuth-only and absent accounts.
    res.json(genericMail);
    let stage = "reset_persistence";
    try {
        const token = randomToken();
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { $set: { resetPasswordTokenHash: hash(token), resetPasswordToken: null, resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000) } },
            { returnDocument: "after" });
        if (user) {
            stage = "email";
            await sendLink(user.email, "VectorForge password reset", frontend(`/reset-password?token=${token}`));
        }
    } catch (error) {
        // Log only a fixed diagnostic category, never addresses, tokens or provider payloads.
        console.warn("Password-reset processing failed: " + (stage === "email" ? mailFailureCode(error) : stage) + ".");
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body || {};
    if (!validToken(token) || !validPassword(password)) return badInput(res);
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        // Match + consume + password change + revocation are one atomic Mongo operation.
        const user = await User.findOneAndUpdate(
            { resetPasswordTokenHash: hash(token), resetPasswordExpires: { $gt: new Date() } },
            { $set: { password: passwordHash, resetPasswordTokenHash: null, resetPasswordToken: null,
                resetPasswordExpires: null, emailVerified: true }, $inc: { tokenVersion: 1 } },
            { returnDocument: "after" });
        if (!user) return badInput(res);
        return res.json({ success: true, message: "Password reset successful. Please sign in again." });
    } catch { return unavailable(res); }
};

const challengeFor = (verifier) => crypto.createHash("sha256").update(verifier).digest("base64url");
const cookieName = (provider) => `${process.env.NODE_ENV === "production" ? "__Host-" : ""}vf_oauth_${provider}`;
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
const cookieValue = (req, name) => {
    const part = (req.headers.cookie || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(name + "="));
    return part?.slice(name.length + 1);
};
const oauthFailure = (res) => res.redirect(frontend("/oauth/callback?error=authentication_failed"));
const beginOAuth = (provider) => async (req, res) => {
    try {
        const challenge = req.query.challenge;
        if (typeof challenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return oauthFailure(res);
        const prefix = provider.toUpperCase();
        if (!env[prefix + "_CLIENT_ID"] || !env[prefix + "_CLIENT_SECRET"] || !env[prefix + "_CALLBACK_URL"]) return oauthFailure(res);
        const state = randomToken(), binding = randomToken(), verifier = randomToken();
        await Grant.create({ _id: hash(state), kind: "oauth-state", provider, binding: hash(binding), challenge, verifier,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
        res.cookie(cookieName(provider), binding, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });
        const params = { state, code_challenge: challengeFor(verifier), code_challenge_method: "S256" };
        if (provider === "google") {
            return res.redirect(googleClient.generateAuthUrl({ ...params, scope: ["openid", "email", "profile"], prompt: "select_account" }));
        }
        const url = new URL("https://github.com/login/oauth/authorize");
        url.search = new URLSearchParams({ ...params, client_id: env.GITHUB_CLIENT_ID, redirect_uri: env.GITHUB_CALLBACK_URL, scope: "user:email" });
        return res.redirect(url.toString());
    } catch { return oauthFailure(res); }
};
const consumeState = async (req, res, provider) => {
    const state = req.query.state, binding = cookieValue(req, cookieName(provider));
    res.clearCookie(cookieName(provider), cookieOptions());
    if (!validToken(state) || !validToken(binding)) throw new Error("Invalid state");
    const grant = await Grant.findOneAndDelete({ _id: hash(state), kind: "oauth-state", provider, binding: hash(binding), expiresAt: { $gt: new Date() } });
    if (!grant || typeof req.query.code !== "string" || !req.query.code || req.query.code.length > 4096 || req.query.error) throw new Error("Invalid callback");
    return grant;
};
const identityUser = async (provider, id, email, name, avatar, authoritativeEmail = false, attempt = 0) => {
    const key = `oauthIdentities.${provider}`;
    let user = await User.findOne({ $or: [{ provider, providerId: id }, { [key]: id }] });
    if (user) return user;
    user = await User.findOne({ email });
    if (user) {
        if (user.oauthIdentities?.[provider] || user.provider === provider) throw new Error("Identity conflict");
        let change = { $set: { [key]: id } };
        const predicate = { _id: user._id, email, emailVerified: user.emailVerified === true, [key]: { $exists: false } };
        if (!user.emailVerified) {
            // Google is authoritative for Gmail/Workspace addresses. This is email-owner
            // recovery, not merging an unverified password into a trusted OAuth identity.
            if (user.provider !== "local" || !authoritativeEmail) throw new Error("Account requires recovery");
            const otherKey = provider === "google" ? "github" : "google";
            if (user.oauthIdentities?.[otherKey]) throw new Error("Account requires recovery");
            predicate.provider = "local";
            predicate[`oauthIdentities.${otherKey}`] = { $exists: false };
            predicate.$or = [{ emailVerified: false }, { emailVerified: { $exists: false } }];
            delete predicate.emailVerified;
            predicate.password = user.password;
            change = { $set: { [key]: id, emailVerified: true, password: null,
                resetPasswordToken: null, resetPasswordTokenHash: null, resetPasswordExpires: null }, $inc: { tokenVersion: 1 } };
        }
        const linked = await User.findOneAndUpdate(predicate, change, { returnDocument: "after" });
        if (linked) return linked;
        // Another verified callback may have won the atomic link. Resolve its identity.
        if (attempt < 1) return identityUser(provider, id, email, name, avatar, authoritativeEmail, attempt + 1);
        throw new Error("Identity conflict");
    }
    try { return await User.create({ name, email, password: null, provider, providerId: id, avatar, emailVerified: true }); }
    catch (error) {
        if (error.code === 11000 && attempt < 1) return identityUser(provider, id, email, name, avatar, authoritativeEmail, attempt + 1);
        throw error;
    }
};
const finishOAuth = async (res, user, state) => {
    const code = randomToken();
    await Grant.create({ _id: hash(code), kind: "oauth-exchange", userId: user._id, tokenVersion: user.tokenVersion || 0,
        challenge: state.challenge, expiresAt: new Date(Date.now() + 60 * 1000) });
    return res.redirect(frontend(`/oauth/callback?code=${code}`));
};
const googleCallback = async (req, res) => {
    let stage = "state";
    try {
        const state = await consumeState(req, res, "google");
        stage = "provider_token";
        const { tokens } = await googleClient.getToken({ code: req.query.code, codeVerifier: state.verifier });
        stage = "verified_identity";
        const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
        const data = ticket.getPayload();
        if (!data || typeof data.sub !== "string" || !data.sub || data.sub.length > 255 ||
            data.email_verified !== true || !validEmail(data.email)) throw new Error("Unverified identity");
        stage = "account_resolution";
        const email = data.email.toLowerCase().trim();
        const authoritative = email.endsWith("@gmail.com") || (typeof data.hd === "string" && data.hd.trim().length > 0);
        const user = await identityUser("google", data.sub, email,
            typeof data.name === "string" ? data.name.slice(0, 100) : "Google User", typeof data.picture === "string" ? data.picture : null, authoritative);
        stage = "exchange_creation";
        return await finishOAuth(res, user, state);
    } catch { console.warn(`OAuth google failed at ${stage}.`); return oauthFailure(res); }
};
const fetchJson = async (url, options) => {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Provider unavailable");
    return response.json();
};
const githubCallback = async (req, res) => {
    let stage = "state";
    try {
        const state = await consumeState(req, res, "github");
        stage = "provider_token";
        const token = await fetchJson("https://github.com/login/oauth/access_token", {
            method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
                code: req.query.code, code_verifier: state.verifier, redirect_uri: env.GITHUB_CALLBACK_URL })
        });
        if (typeof token?.access_token !== "string" || !token.access_token) throw new Error("Invalid provider token");
        stage = "verified_identity";
        const options = { headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "VectorForge" } };
        const data = await fetchJson("https://api.github.com/user", options);
        if (!Number.isSafeInteger(data?.id) || data.id <= 0 || typeof data.login !== "string" || !data.login) throw new Error("Invalid identity");
        const emails = await fetchJson("https://api.github.com/user/emails", options);
        if (!Array.isArray(emails)) throw new Error("Invalid emails");
        const verified = emails.filter((item) => item?.verified === true && validEmail(item.email));
        const email = (verified.find((item) => item.primary === true) || verified[0])?.email;
        if (!email) throw new Error("Unverified identity");
        stage = "account_resolution";
        const user = await identityUser("github", String(data.id), email.toLowerCase().trim(),
            typeof data.name === "string" ? data.name.slice(0, 100) : data.login.slice(0, 100),
            typeof data.avatar_url === "string" ? data.avatar_url : null);
        stage = "exchange_creation";
        return await finishOAuth(res, user, state);
    } catch { console.warn(`OAuth github failed at ${stage}.`); return oauthFailure(res); }
};
const exchangeOAuth = async (req, res) => {
    const { code, verifier } = req.body || {};
    if (!validToken(code) || !validToken(verifier)) return badInput(res);
    try {
        const grant = await Grant.findOneAndDelete({ _id: hash(code), kind: "oauth-exchange",
            challenge: challengeFor(verifier), expiresAt: { $gt: new Date() } });
        if (!grant) return badInput(res);
        const user = await User.findById(grant.userId);
        if (!user || (user.tokenVersion || 0) !== grant.tokenVersion) return badInput(res);
        return authResponse(res, user);
    } catch { return unavailable(res); }
};

module.exports = { register, verifyEmail, login, getMe, forgotPassword, resetPassword,
    googleLogin: beginOAuth("google"), googleCallback, githubLogin: beginOAuth("github"), githubCallback, exchangeOAuth };
