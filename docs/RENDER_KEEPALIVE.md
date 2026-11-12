# Render Free keep-alive

This optional GitHub Actions workflow requests the public `/health` endpoint every ten minutes. It runs outside Render and works while the developer's computer is off. The existing health handler does not access MongoDB, Gemini, authentication or email. Application code is unchanged.

## Enable

1. Commit/push `.github/workflows/render-keepalive.yml`, `scripts/render-keepalive.cjs`, `backend/test/render-keepalive.test.js` and this guide to the repository's default branch (`main`). Do not add `.env` files or credentials.
2. In the **GitHub repository**, open **Settings → Secrets and variables → Actions → Variables → New repository variable**.
3. Name: `RENDER_BACKEND_URL`. Value: your public Render origin, for example `https://vectorforge-edle.onrender.com`. Do not add `/health`, a query, username, password or token. This is a public URL, not a secret. This variable belongs in GitHub, not Render or Vercel.
4. Open **Actions → Render keep-alive → Run workflow**, choose the default branch, and run once. If Actions is disabled, the repository owner must enable it first. Look for `VectorForge /health responded successfully.`
5. Check later scheduled runs. The cron runs at minutes 03, 13, 23, 33, 43 and 53 of each hour (UTC). Failed runs are visible in Actions; notification delivery depends on your GitHub preferences.

The script has a two-minute request deadline for an already-sleeping service. The entire job is capped at four minutes. It makes one GET per run; there is no continuous loop, dependency installation, upload/cache storage, login, email or AI request. Redirects and Render's HTML loading screen do not count as healthy. A successful `/health` verifies the application process, not database/AI readiness.

## Cost and reliability limits

- Standard GitHub-hosted runners in public repositories are currently free. This workflow uses `ubuntu-24.04`, stores no artifacts/caches, and skips private repositories and forks at the job level. It does not start paid runners or change billing settings. Do not remove this guard or switch runner types without reviewing costs: https://docs.github.com/en/billing/concepts/product-billing/github-actions.
- Render Free sleeps after 15 minutes without inbound traffic. Ten-minute pings reduce inactivity sleeps; they do not eliminate cold starts during delayed/skipped runs, outages, restarts or redeployments. Render can restart Free services at any time: https://render.com/docs/free.
- GitHub schedules are best-effort: they can be delayed or dropped. Public scheduled workflows are disabled after 60 days without repository activity. Re-enable through Actions when needed; no fake commits are generated to defeat this limit: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule.
- Render grants **750 instance hours per workspace per calendar month**, shared by all free web services. One continuously running instance uses 720 hours in a 30-day month or 744 in a 31-day month. Other free services and prior usage also count. Exhaustion suspends services; this script cannot bypass quotas.
- No paid Render plan is enabled. Other workspace usage, bandwidth/build overages and existing billing settings remain separate. With a payment method, eligible overages can incur charges; without one, Render documents suspension for exhausted bandwidth. This implementation cannot promise a zero total hosting bill or verify your account budgets. Review usage and spend settings; do not add paid upgrades for this workflow.
- Before an important demo, open `/health` yourself and then check `/ready`/the app. Free infrastructure is not a guarantee of zero waiting. This workflow does not repair database credentials, stalled startup or failed deployments.

## Disable

GitHub **Actions → Render keep-alive → workflow menu → Disable workflow**. Removing the URL variable causes checks to fail without sending traffic; disabling the workflow stops runs entirely.

## Local verification

From the repository root:

```powershell
node --test backend/test/render-keepalive.test.js
```

Tests use synthetic responses only: URL restrictions, credential-free GET, actual application response validation, HTTP/network/HTML failures, no retries, and abort deadlines. No provider API key or `.env` is loaded. GitHub scheduling and long-term prevention of sleep require observing hosted workflow runs after activation.

Verification executed on 13 November 2026: **4 tests passed, 0 failed/skipped**; both JavaScript files passed `node --check`. The YAML was parsed with the already-installed parser and its schedule, manual trigger, public/fork guards, standard runner, permissions and script command were checked. The pinned checkout commit was verified against the official `v4.2.2` tag. One real GET to the configured VectorForge Render `/health` returned the expected application JSON and the script exited 0. This verifies a single response, not future uptime or the hosted schedule. No dependency install, backend/frontend source edit, commit, push or hosting/billing setting change was performed.
