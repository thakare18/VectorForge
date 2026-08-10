import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import { isValidEmail } from "../utils/validators";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
      toast.success("Reset link sent (mock)");
    }, 800);
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-4">
      <div className="grain-overlay" />
      <div className="glass-card relative z-10 w-full max-w-md p-8 fade-in">
        <h1 className="gradient-heading text-2xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Enter your email to receive a reset link. Backend auth is not yet connected.
        </p>

        {sent ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-neon">Check your inbox for a reset link.</p>
            <Link to="/reset-password" className="mt-4 inline-block text-sm text-gray-400 hover:text-neon">
              Go to reset page →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm" required />
            </label>
            <Button type="submit" className="w-full" loading={loading}>Send Reset Link</Button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm text-gray-400 hover:text-neon">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
