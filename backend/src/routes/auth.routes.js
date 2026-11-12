const router = require("express").Router();
const auth = require("../controllers/auth.controller");
const requireAuth = require("../middleware/auth.middleware");
const { limit } = require("../middleware/rateLimiter");
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/register", limit("register", 5), auth.register);
router.post("/verify-email", limit("verify-email", 10), auth.verifyEmail);
router.post("/login", limit("login", 15), auth.login);
router.post("/forgot-password", limit("forgot-password", 5), auth.forgotPassword);
router.post("/reset-password", limit("reset-password", 10), auth.resetPassword);
for (const provider of ["google", "github"]) {
    router.get("/" + provider, limit("oauth-start", 20), auth[provider + "Login"]);
    router.get("/" + provider + "/callback", limit("oauth-callback", 30), auth[provider + "Callback"]);
}
router.post("/exchange", limit("oauth-exchange", 20), auth.exchangeOAuth);
router.get("/me", requireAuth, auth.getMe);
module.exports = router;
