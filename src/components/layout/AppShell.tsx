"use client";

import { useSession } from "next-auth/react";
import { Navbar } from "./Navbar";
import { AppSidebar } from "./AppSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col">
          {children}
        </main>
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
