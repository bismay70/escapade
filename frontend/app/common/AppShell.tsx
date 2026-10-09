"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";
import AgentWidget from "./AgentWidget";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isPlannerPage = pathname === "/planner" || pathname === "/bookings" || pathname === "/dashboard" || pathname === "/workflows" || pathname === "/studio";

  return (
    <>
      {!isLoginPage && !isPlannerPage && <Navbar />}
      {children}
      {!isLoginPage && !isPlannerPage && <Footer />}
      {!isLoginPage && !isPlannerPage && <AgentWidget />}
    </>
  );
}
