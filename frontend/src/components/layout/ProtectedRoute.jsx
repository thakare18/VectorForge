import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authEnabled } = useSelector((s) => s.auth);

  if (authEnabled && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
