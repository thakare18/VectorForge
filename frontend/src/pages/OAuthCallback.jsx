import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import axios from "axios";
import Loader from "../components/common/Loader";
import { loginSuccess } from "../store/slices/authSlice";
import { DEFAULT_BACKEND_URL } from "../utils/constants";

export default function OAuthCallback() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();

    // UPDATED
    const callbackHandled = useRef(false);

    useEffect(() => {
        // UPDATED
        if (callbackHandled.current) return;

        // UPDATED
        callbackHandled.current = true;

        const handleCallback = async () => {
            // UPDATED
            const token = searchParams.get("token");

            // UPDATED
            const provider = searchParams.get("provider");

            const providerName =
                provider === "github" ? "GitHub" : "Google";

            if (!token) {
                toast.error(
                    `${providerName} authentication failed.`
                );
                navigate("/login", { replace: true });
                return;
            }

            try {
                // UPDATED
               const response = await axios.get(
    `${DEFAULT_BACKEND_URL}/api/auth/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const user = response.data.user;

                // UPDATED
                dispatch(
                    loginSuccess({
                        user,
                        token
                    })
                );

                // UPDATED
                toast.success(
                    `Signed in with ${providerName}`
                );

                // UPDATED
                navigate("/", { replace: true });

            } catch (error) {
                console.error(
                    "OAuth callback error:",
                    error
                );

                // UPDATED
                toast.error(
                    `${providerName} authentication failed.`
                );

                navigate("/login", {
                    replace: true
                });
            }
        };

        handleCallback();
    }, [dispatch, navigate, searchParams]);

    return <Loader />;
}