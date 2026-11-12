import { test } from "node:test";
import assert from "node:assert/strict";
import { componentHarness } from "./helpers/componentHarness.js";

test("registration clears pending spinner, keeps verification instructions visible and never signs in before email proof", async () => {
  let finish;
  const h = await componentHarness("Register", { register: () => new Promise((resolve) => { finish = resolve; }) });
  h.input(0, "Synthetic User"); h.input(1, "synthetic@example.test"); h.input(2, "SyntheticPass123");
  const request = h.submit();
  assert.equal(h.all((n) => n.type === "Button" && n.props.type === "submit")[0].props.loading, true);
  finish({ success: true, message: "If this address is eligible, check your email." }); await request;
  assert.equal(h.all((n) => n.type === "form").length, 0);
  assert.match(h.text(h.all((n) => n.props?.role === "status")[0]), /Check your email/);
  assert.match(h.text(h.render()), /sign in automatically/);
  assert.match(h.text(h.render()), /synthetic@example.test/);
  assert.deepEqual(h.navigations, []); assert.deepEqual(h.actions, []);
});

test("registration timeout stops spinner, persists the real error and permits retry", async () => {
  let attempts = 0;
  const h = await componentHarness("Register", { register: async () => { attempts++; throw new Error("The server is taking too long to respond."); } });
  h.input(0, "Synthetic User"); h.input(1, "synthetic@example.test"); h.input(2, "SyntheticPass123");
  await h.submit();
  assert.equal(h.all((n) => n.type === "Button" && n.props.type === "submit")[0].props.loading, false);
  assert.match(h.text(h.all((n) => n.props?.role === "alert")[0]), /taking too long/);
  await h.submit(); assert.equal(attempts, 2);
});

test("login failure resets loading and preserves server feedback; valid retry dispatches the session", async () => {
  let fail = true;
  const h = await componentHarness("Login", { login: async () => {
    if (fail) throw new Error("Invalid email or password.");
    return { token: "synthetic", user: { id: "synthetic-user" } };
  } });
  h.input(0, "synthetic@example.test"); h.input(1, "SyntheticPass123");
  await h.submit();
  assert.equal(h.all((n) => n.type === "Button" && n.props.type === "submit")[0].props.loading, false);
  assert.match(h.text(h.all((n) => n.props?.role === "alert")[0]), /Invalid email or password/);
  assert.equal(h.actions.length, 0);
  fail = false; await h.submit();
  assert.equal(h.actions[0].payload.token, "synthetic"); assert.equal(h.navigations[0][0], "/");
});

test("forgot-password acceptance describes conditional email delivery without inventing a reset URL", async () => {
  const h = await componentHarness("ForgotPassword", { forgotPassword: async () => ({ success: true, message: "If this address is eligible, an email with next steps will be sent." }) });
  h.input(0, "synthetic@example.test"); await h.submit();
  assert.match(h.text(h.render()), /If this address is eligible/);
  assert.doesNotMatch(h.text(h.render()), /generated successfully/);
  assert.equal(h.all((n) => n.type === "a").length, 0);
});

test('new registration email verification signs in and navigates directly to the app', async () => {
  const h = await componentHarness('Login', { verifyEmail: async () => ({ token: 'verified-session', user: { id: 'synthetic' } }) }, '?verification=synthetic');
  await h.all((n) => n.type === 'Button' && h.text(n) === 'Verify email address')[0].props.onClick();
  assert.equal(h.actions[0].payload.token, 'verified-session');
  assert.equal(h.navigations[0][0], '/');
});

test('verification of a separately existing account does not invent a session', async () => {
  const h = await componentHarness('Login', { verifyEmail: async () => ({ success: true, message: 'Please sign in.' }) }, '?verification=synthetic');
  await h.all((n) => n.type === 'Button' && h.text(n) === 'Verify email address')[0].props.onClick();
  assert.equal(h.actions.length, 0); assert.equal(h.navigations.length, 0);
});

test('OAuth callback exchanges once and opens app, including repeated effect invocation', async () => {
  let calls = 0;
  const h = await componentHarness('OAuthCallback', { exchange: async (path, body) => {
    calls++; assert.equal(path, '/api/auth/exchange'); assert.equal(body.code, 'synthetic-code'); assert.equal(body.verifier, 'synthetic-verifier');
    return { data: { token: 'session', user: { id: 'synthetic' } } };
  } }, '?code=synthetic-code', { storage: { vf_oauth_verifier: 'synthetic-verifier' } });
  h.render(); await h.flushEffects(); h.render(); await h.flushEffects();
  assert.equal(calls, 1); assert.equal(h.actions[0].payload.token, 'session'); assert.equal(h.navigations[0][0], '/');
});

test('OAuth provider failure, missing storage and exchange outage show persistent recovery instead of password-reset diagnosis or endless spinner', async () => {
  for (const scenario of [
    { search: '?error=authentication_failed', storage: {}, pattern: /could not be completed/ },
    { search: '?code=synthetic', storage: {}, pattern: /same browser tab/ },
    { search: '?code=synthetic', storage: { vf_oauth_verifier: 'synthetic' }, pattern: /server is unavailable/ }
  ]) {
    const h = await componentHarness('OAuthCallback', { exchange: async () => { throw new Error('The server is unavailable.'); } }, scenario.search, scenario);
    h.render(); await h.flushEffects();
    assert.equal(h.actions.length, 0); assert.equal(h.all((n) => n.type === 'Loader').length, 0);
    const alert = h.all((n) => n.props?.role === 'alert')[0]; assert.match(h.text(alert), scenario.pattern);
    assert.doesNotMatch(h.text(alert), /use password reset if this email was previously registered/);
    await h.all((n) => n.type === 'button')[0].props.onClick(); assert.equal(h.navigations[0][0], '/login');
  }
});

test('manual verification of an OAuth account opens password setup without placing the token in the URL', async () => {
  const h = await componentHarness('Login', { verifyEmail: async () => ({ success: true, passwordSetupToken: 'synthetic-setup' }) }, '?verification=synthetic');
  await h.all((n) => n.type === 'Button' && h.text(n) === 'Verify email address')[0].props.onClick();
  assert.equal(h.navigations[0][0], '/reset-password');
  assert.equal(h.navigations[0][1].state.setupToken, 'synthetic-setup'); assert.equal(h.actions.length, 0);
});

test('password setup submits the owners newly chosen password and returns to manual login', async () => {
  let submitted;
  const h = await componentHarness('ResetPassword', { resetPassword: async (token, password) => { submitted = [token, password]; } }, '', { locationState: { setupToken: 'synthetic-setup' } });
  assert.match(h.text(h.render()), /Set Sign-in Password/);
  h.input(0, 'ChosenPassword123'); h.input(1, 'ChosenPassword123'); await h.submit();
  assert.deepEqual(submitted, ['synthetic-setup', 'ChosenPassword123']);
  assert.equal(h.navigations[0][0], '/login'); assert.equal(h.actions[0].type, 'auth/logout');
});

test('manual login and registration trim accidental whitespace from email without trimming passwords', async () => {
  for (const page of ['Login', 'Register']) {
    let submitted;
    const action = async (body) => { submitted = body; return { message: 'Accepted', token: 'synthetic', user: { id: 'synthetic' } }; };
    const h = await componentHarness(page, { login: action, register: action });
    if (page === 'Register') h.input(0, 'Synthetic');
    h.input(page === 'Register' ? 1 : 0, '  owner@example.test  ');
    h.input(page === 'Register' ? 2 : 1, ' SecretPassword123 ');
    await h.submit(); assert.equal(submitted.email, 'owner@example.test'); assert.equal(submitted.password, ' SecretPassword123 ');
  }
});
