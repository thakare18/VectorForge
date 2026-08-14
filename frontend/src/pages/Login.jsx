import { DEFAULT_BACKEND_URL } from "../utils/constants";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import Button from "../components/common/Button";



// UPDATED
import { loginSuccess } from "../store/slices/authSlice";

import { isValidEmail } from "../utils/validators";
import { APP_TITLE, DEFAULT_BACKEND_URL } from "../utils/constants";

// UPDATED
import { login } from "../services/auth.service";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      {" "}
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.15c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.17 1.18A10.9 10.9 0 0 1 12 6.03c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.67.42.36.78 1.07.78 2.16v3.14c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />{" "}
    </svg>
  );
}

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // UPDATED
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error("Enter a valid email");
      return;
    }

    if (!password) {
      toast.error("Enter your password");
      return;
    }

    try {
      setLoading(true);

      // UPDATED
      const response = await login({
        email,
        password,
      });

      // UPDATED
      dispatch(
        loginSuccess({
          user: response.user,
          token: response.token,
        }),
      );

      toast.success("Signed in successfully");

      navigate("/");
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED
// UPDATED
const oauth = (provider) => {
    if (provider === "google") {
        window.location.href = `${DEFAULT_BACKEND_URL}/api/auth/google`;
        return;
    }

    if (provider === "github") {
        window.location.href = `${DEFAULT_BACKEND_URL}/api/auth/github`;
        return;
    }

    toast.error(`${provider} login is not connected yet.`);
};

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-4">
      <div className="grain-overlay" />

      <div className="glass-card relative z-10 w-full max-w-md p-8 fade-in">
        <p className="font-mono text-xs text-neon">v2.0</p>

        <h1 className="gradient-heading text-3xl font-bold">{APP_TITLE}</h1>

        <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>

        <div className="mt-6 space-y-3">
          <Button
    variant="secondary"
    className="w-full"
    onClick={() => oauth("google")}
>
    <GoogleIcon />
    Continue with Google
</Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => oauth("github")}
          >
            <GitHubIcon />
            Continue with GitHub
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />

          <span className="font-mono text-xs text-gray-500">or</span>

          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase text-gray-500">
              Email
            </span>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs uppercase text-gray-500">
              Password
            </span>

            <div className="relative mt-1">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
                required
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-400">
              <input type="checkbox" className="accent-[#ccff00]" />
              Remember me
            </label>

            <Link to="/forgot-password" className="text-neon hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          No account?{" "}
          <Link to="/register" className="text-neon hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
