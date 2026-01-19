"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <>
            <Sidebar />
            <main className="ml-64 min-h-screen p-6">
                {children}
            </main>
        </>
    );
}
