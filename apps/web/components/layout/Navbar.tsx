"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, User2, Github } from "lucide-react";

const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";
const REPO_URL = "https://github.com/Naresh1401/resumecraft";

export function Navbar({ landing = false }: { landing?: boolean }) {
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>ResumeCraft</span>
        </Link>
        {landing && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#testimonials" className="hover:text-foreground">Testimonials</a>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {SHOWCASE_MODE ? (
            <Button asChild size="sm" variant="outline">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <Github className="h-4 w-4 mr-1" /> View on GitHub
              </a>
            </Button>
          ) : session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard"><User2 className="h-4 w-4 mr-1" /> Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
              <Button asChild size="sm"><Link href="/register">Get Started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
