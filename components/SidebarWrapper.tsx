"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { socket } from "@/utils/socket";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.userId) {
          if (!socket.connected) {
            socket.connect();
          }
          
          socket.emit("register_user", user.userId);
          
          return () => {
            // We might not want to disconnect on every pathname change if we want to keep the connection alive
            // But since it was doing it before, I'll keep it or move it to a more global level.
            // Actually, if we use a shared socket, we only disconnect on logout.
          };
        }
      } catch (error) {
        console.error("Error parsing user data for socket registration:", error);
      }
    }
  }, [pathname]);


  // Hide sidebar on login, signup and root (home) page
  const hideSidebar = pathname === "/" || pathname === "/login" || pathname === "/signup";

  if (hideSidebar) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-[#F0F2F5] overflow-hidden">
        {children}
      </main>
    </div>
  );
}
