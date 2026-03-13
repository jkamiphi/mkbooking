"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { AuthBrand, AuthHomeLink } from "@/components/auth/auth-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Correo o contraseña inválidos");
        return;
      }

      const redirectResponse = await fetch("/api/auth/post-login-path", {
        method: "GET",
      });
      const redirectData = (await redirectResponse.json()) as { path?: string };
      const nextPath = redirectData.path || "/profile";

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthBrand className="mb-5" />

      <Card className="overflow-hidden rounded-[2rem] border-mkmedia-blue/15 bg-white/92 shadow-[0_32px_120px_-54px_rgba(3,89,168,0.3)] backdrop-blur">
        <CardHeader className="space-y-3 border-b border-mkmedia-blue/10 bg-[linear-gradient(180deg,rgba(3,89,168,0.08),rgba(255,255,255,0))]">
          <div className="inline-flex w-fit items-center rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
            MK MEDIA access
          </div>
          <CardTitle className="text-3xl text-neutral-950">Iniciar sesion</CardTitle>
          <CardDescription>
            Accede a tu cuenta para gestionar campanas, reservas y solicitudes desde tus marcas o accesos compartidos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="correo@ejemplo.com"
                className="h-11 rounded-2xl border-mkmedia-blue/15"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-mkmedia-blue hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
                className="h-11 rounded-2xl border-mkmedia-blue/15"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-mkmedia-blue text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
              disabled={loading}
            >
              {loading ? "Iniciando sesion..." : "Iniciar sesion"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-mkmedia-blue hover:underline">
              Crea tu cuenta
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
