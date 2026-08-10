import {
  LayoutDashboard,
  Search,
  GitBranch,
  Upload,
  MessageSquare,
  Database,
  BarChart3,
  FileCode,
  Settings,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { NAV_LINKS, APP_TITLE } from "../../utils/constants";
import { logout } from "../../store/slices/authSlice";

const ICONS = {
  LayoutDashboard,
  Search,
  GitBranch,
  Upload,
  MessageSquare,
  Database,
  BarChart3,
  FileCode,
  Settings,
  User,
};

function NavItem({ to, label, icon, onClick }) {
  const Icon = ICONS[icon];
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
          isActive
            ? "bg-neon/10 text-neon"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ mobile = false, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    onClose?.();
  };

  return (
    <aside
      className={`flex h-full flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl ${
        mobile ? "w-72 p-4" : "hidden w-64 shrink-0 p-4 lg:flex"
      }`}
    >
      <div className="mb-8 flex items-center justify-between px-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
            v2.0
          </p>
          <h2 className="text-xl font-bold tracking-tight">{APP_TITLE}</h2>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.to} {...link} onClick={onClose} />
        ))}
      </nav>

      <div className="mt-auto border-t border-white/5 pt-4">
        {isAuthenticated ? (
          <div className="space-y-2">
            <p className="px-3 text-xs text-gray-500">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="block rounded-xl bg-neon/10 px-3 py-2 text-center text-sm text-neon hover:bg-neon/20"
          >
            Sign In
          </NavLink>
        )}
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full">
        <Sidebar mobile onClose={onClose} />
      </div>
    </div>
  );
}

export function TopBar({ onMenuClick }) {
  const { backendUrl } = useSelector((s) => s.settings);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <p className="hidden font-mono text-xs text-gray-500 lg:block">
          Visual Vector Database and RAG Search Engine
        </p>
        <a
          href={`${backendUrl}/api-docs`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-gray-400 transition-colors hover:text-neon"
        >
          API Docs
        </a>
      </div>
    </header>
  );
}
