import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <ShortcutsHelp />
    </div>
  );
}
