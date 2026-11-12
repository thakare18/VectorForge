import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess, logout } from "../../store/slices/authSlice";
import { revalidateSession, watchSession } from "../../services/session.service";
import Loader from "../common/Loader";

export default function SessionGuard({ children }) {
  const dispatch = useDispatch();
  const { token, checking } = useSelector((state) => state.auth);
  const [retry, setRetry] = useState(0), [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!token || !checking) return;
    let active = true;
    setUnavailable(false);
    revalidateSession(token).then((session) => {
      if (active) dispatch(loginSuccess(session));
    }).catch((error) => {
      if (!active) return;
      if (error.status === 401) dispatch(logout());
      else setUnavailable(true);
    });
    return () => { active = false; };
  }, [token, checking, dispatch, retry]);
  useEffect(() => {
    return watchSession(() => dispatch(logout()));
  }, [dispatch]);
  if (checking) return unavailable
    ? <div role="alert" className="p-8">Unable to verify your session. <button onClick={() => setRetry((n) => n + 1)}>Retry</button> <button onClick={() => dispatch(logout())}>Sign out</button></div>
    : <Loader />;
  return children;
}
