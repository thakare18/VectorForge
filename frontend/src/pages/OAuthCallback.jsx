import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import Loader from "../components/common/Loader";
import { loginSuccess } from "../store/slices/authSlice";
import api from "../services/api";

export default function OAuthCallback() {
  const navigate = useNavigate(), dispatch = useDispatch();
  const [params] = useSearchParams();
  const handled = useRef(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const code = params.get("code");
    // Remove sensitive short-lived codes from history before any further request.
    window.history.replaceState(null, "", "/oauth/callback");
    (async () => {
      try {
        if (params.get("error")) throw new Error("Google/GitHub sign-in could not be completed. Please try again. If it keeps failing, contact support; a password reset is not always needed.");
        const verifier = sessionStorage.getItem("vf_oauth_verifier");
        sessionStorage.removeItem("vf_oauth_verifier");
        if (!code || !verifier) throw new Error("Your sign-in session is missing or expired. Start again in the same browser tab and allow session storage.");
        const { data } = await api.post("/api/auth/exchange", { code, verifier });
        dispatch(loginSuccess(data));
        navigate("/", { replace: true });
      } catch (error) {
        try { sessionStorage.removeItem("vf_oauth_verifier"); } catch { /* Storage may be disabled. */ }
        const message = error.status === 400 ? "Your sign-in session expired or was already used. Please start again." :
          error.message || "Sign-in could not be completed. Please try again.";
        setFailure(message);
        toast.error(message);
      }
    })();
  }, [dispatch, navigate, params]);
  if (failure) return <div className="flex min-h-screen items-center justify-center p-4"><div className="glass-card max-w-md space-y-4 p-6">
    <h1 className="text-xl font-semibold">Unable to sign in</h1>
    <p role="alert">{failure}</p>
    <button className="text-neon" onClick={() => navigate("/login", { replace: true })}>Back to sign in</button>
  </div></div>;
  return <Loader />;
}
