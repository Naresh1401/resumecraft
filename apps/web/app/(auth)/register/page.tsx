"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { RegisterSchema } from "@/lib/validators";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = RegisterSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((er) => (errs[er.path[0] as string] = er.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data?.error || "Registration failed");
      return;
    }
    setApiKey(data.apiKey);
    toast.success("Account created. Save your API key.");
  }

  if (apiKey) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>Save your API key</CardTitle>
          <CardDescription>This is shown once. Store it safely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted p-3 font-mono text-xs break-all">{apiKey}</div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(apiKey);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy key"}
          </Button>
          <Button className="w-full" onClick={() => router.push("/login")}>Continue to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start tailoring resumes in seconds.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
          </div>
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
                placeholder="At least 8 chars, 1 upper, 1 number"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-2.5 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-500">{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Already have an account? <Link href="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
