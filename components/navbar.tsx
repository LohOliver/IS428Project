// components/dashboard-navbar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashboardNavbar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Overview", href: "/" },
    { name: "Stringency Dashboard", href: "/dashboard2" },
    { name: "Infrastructure & Covid Outcomes", href: "/dashboard3" },
    { name: "Policy Timeline", href: "/dashboard4" },
  ];

  return (
    <div className="flex w-full items-center justify-between bg-white dark:bg-gray-950 px-4 py-3 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        COVID-19 Dashboard
      </h1>
      <nav className="flex space-x-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}