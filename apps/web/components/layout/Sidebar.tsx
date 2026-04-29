"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Wand2, User2, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tailor", label: "New Tailor", icon: Wand2 },
  { href: "/profile", label: "Profile", icon: User2 },
];
const adminLinks = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const links = [...baseLinks, ...(session?.user?.role === "ADMIN" ? adminLinks : [])];
  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card/40">
      <div className="p-4 flex items-center gap-2 font-semibold">
        <FileText className="h-5 w-5 text-primary" /> ResumeTailor
      </div>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {links.map((l) => {
          const Active = pathname === l.href || pathname.startsWith(l.href + "/");
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                Active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-xs text-muted-foreground">v1.0</div>
    </aside>
  );
}
