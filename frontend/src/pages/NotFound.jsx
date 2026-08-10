import { Link } from "react-router-dom";
import Button from "../components/common/Button";

export default function NotFound() {
  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="grain-overlay" />
      <p className="relative z-10 font-mono text-6xl text-neon">404</p>
      <h1 className="relative z-10 mt-4 text-2xl font-bold">Page not found</h1>
      <p className="relative z-10 mt-2 text-gray-400">The page you are looking for does not exist.</p>
      <Link to="/" className="relative z-10 mt-8">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
