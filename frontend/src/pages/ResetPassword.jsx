import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../store/slices/authSlice";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import { validatePassword } from "../utils/validators";

// UPDATED
import { resetPassword } from "../services/auth.service";

export default function ResetPassword() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const [settingPassword] = useState(() => Boolean(location.state?.setupToken));

    // UPDATED
    const [searchParams] = useSearchParams();

    // UPDATED
    const [token] = useState(() => location.state?.setupToken || searchParams.get("token"));
    useEffect(() => { window.history.replaceState(null, "", "/reset-password"); }, []);

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    // UPDATED
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Invalid or missing reset token");
            return;
        }

        const errors = validatePassword(password);

        if (errors.length) {
            toast.error(errors[0]);
            return;
        }

        if (password !== confirm) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            setLoading(true);

            // UPDATED
            await resetPassword(
                token,
                password
            );
            dispatch(logout());

            toast.success(
                "Password reset successfully"
            );

            navigate("/login");
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.message ||
                "Password reset failed.";

            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid-bg flex min-h-screen items-center justify-center p-4">
            <div className="grain-overlay" />

            <div className="glass-card relative z-10 w-full max-w-md p-8 fade-in">
                <h1 className="gradient-heading text-2xl font-bold">
                    {settingPassword ? "Set Sign-in Password" : "Reset Password"}
                </h1>

                <p className="mt-2 text-sm text-gray-400">
                    Set a new password for your account.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-4"
                >
                    <label className="block">
                        <span className="font-mono text-xs uppercase text-gray-500">
                            New Password
                        </span>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
                            required
                        />
                    </label>

                    <label className="block">
                        <span className="font-mono text-xs uppercase text-gray-500">
                            Confirm Password
                        </span>

                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) =>
                                setConfirm(e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
                            required
                        />
                    </label>

                    <Button
                        type="submit"
                        className="w-full"
                        loading={loading}
                    >
                        {settingPassword ? "Set Password" : "Reset Password"}
                    </Button>
                </form>

                <Link
                    to="/login"
                    className="mt-6 block text-center text-sm text-gray-400 hover:text-neon"
                >
                    ← Back to login
                </Link>
            </div>
        </div>
    );
}
