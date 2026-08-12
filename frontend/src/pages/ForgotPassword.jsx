import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import { isValidEmail } from "../utils/validators";

// UPDATED
import { forgotPassword } from "../services/auth.service";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    // UPDATED
    const [resetUrl, setResetUrl] = useState("");

    // UPDATED
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValidEmail(email)) {
            toast.error("Enter a valid email");
            return;
        }

        try {
            setLoading(true);

            // UPDATED
            const response = await forgotPassword(email);

            // UPDATED
            if (response.resetUrl) {
                setResetUrl(response.resetUrl);
            }

            setSent(true);

            toast.success(
                "Password reset link generated."
            );
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Unable to generate reset link.";

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
                    Forgot Password
                </h1>

                <p className="mt-2 text-sm text-gray-400">
                    Enter your email to receive a reset link.
                </p>

                {sent ? (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-neon">
                            Reset link generated successfully.
                        </p>

                        {resetUrl && (
                            <a
                                href={resetUrl}
                                className="mt-4 block break-all text-sm text-gray-400 hover:text-neon"
                            >
                                Open Reset Password →
                            </a>
                        )}

                        <Link
                            to="/login"
                            className="mt-4 inline-block text-sm text-gray-400 hover:text-neon"
                        >
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="mt-6 space-y-4"
                    >
                        <label className="block">
                            <span className="font-mono text-xs uppercase text-gray-500">
                                Email
                            </span>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
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
                            Send Reset Link
                        </Button>
                    </form>
                )}

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