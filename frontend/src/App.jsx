import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Loader from "./components/common/Loader";
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Search = lazy(() => import("./pages/Search"));
const Visualizer = lazy(() => import("./pages/Visualizer"));
const Upload = lazy(() => import("./pages/Upload"));
const Chat = lazy(() => import("./pages/Chat"));
const Benchmark = lazy(() => import("./pages/Benchmark"));
const Vectors = lazy(() => import("./pages/Vectors"));
const Settings = lazy(() => import("./pages/Settings"));
const Swagger = lazy(() => import("./pages/Swagger"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return <Loader />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            color: "#e5e5e5",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="search" element={<Search />} />
            <Route path="visualizer" element={<Visualizer />} />
            <Route path="upload" element={<Upload />} />
            <Route path="chat" element={<Chat />} />
            <Route path="benchmark" element={<Benchmark />} />
            <Route path="vectors" element={<Vectors />} />
            <Route path="settings" element={<Settings />} />
            <Route path="swagger" element={<Swagger />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
