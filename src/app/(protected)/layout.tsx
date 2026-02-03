"use client"

import dynamic from "next/dynamic";
import React from "react";
import { SidebarProvider } from "~/components/ui/sidebar";
import AppSidebar from "./app-sidebar";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false },
);

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSidebar /> 
      <main className="m-2 w-full">
        <div className="border-sidebar-border bg-sidebar flex items-center gap-2 rounded-md border p-2 px-4 shadow">
          {/* <SearchBar />  */}
          <div className="ml-auto"></div>
          <UserButton />
        </div>
        <div className="h-4"></div>
        {/* main content  */}
        <div className="border-sidebar-border bg-sidebar p-3 h-[calc(100vh-6rem)] overflow-y-scroll rounded-md border shadow">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
