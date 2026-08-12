import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar, { MobileSidebar, TopBar } from "./Sidebar";

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="grid-bg relative flex min-h-screen">
      <div className="grain-overlay" aria-hidden="true" />
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
