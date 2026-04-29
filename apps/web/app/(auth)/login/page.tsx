"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { LoginSchema } from "@/lib/validators";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((er) => (errs[er.path[0] as string] = er.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      toast.error("Invalid credentials");
      return;
    }
    toast.success("Welcome back");
    router.push("/dashboard");
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your ResumeTailor account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-2.5 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-500">{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled>
            Continue with Google
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          New here? <Link href="/register" className="text-primary underline-offset-4 hover:underline">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
