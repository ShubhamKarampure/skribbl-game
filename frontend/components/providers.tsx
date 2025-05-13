"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/UserContext";
import { SocketProvider } from "@/context/SocketContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <UserProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </UserProvider>
    </ThemeProvider>
  );
}