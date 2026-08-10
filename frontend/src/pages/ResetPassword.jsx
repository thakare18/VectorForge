import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import { validatePassword } from "../utils/validators";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validatePassword(password);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Password reset (mock)");
      navigate("/login");
      setLoading(false);
    }, 800);
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-4">
      <div className="grain-overlay" />
      <div className="glass-card relative z-10 w-full max-w-md p-8 fade-in">
        <h1 className="gradient-heading text-2xl font-bold">Reset Password</h1>
        <p className="mt-2 text-sm text-gray-400">Set a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase text-gray-500">New Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm" required />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase text-gray-500">Confirm Password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm" required />
          </label>
          <Button type="submit" className="w-full" loading={loading}>Reset Password</Button>
        </form>

        <Link to="/login" className="mt-6 block text-center text-sm text-gray-400 hover:text-neon">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
