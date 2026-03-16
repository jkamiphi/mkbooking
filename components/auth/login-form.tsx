"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { AuthBrand, AuthHomeLink } from "@/components/auth/auth-brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

      <Card className="overflow-hidden rounded-xs border border-neutral-200/80 bg-white/95 shadow-[0_28px_88px_-52px_rgba(3,89,168,0.45)]">
        <CardHeader className="space-y-3 border-b border-neutral-200/80 bg-[linear-gradient(180deg,rgba(3,89,168,0.05),rgba(255,255,255,0.9)_75%)] pb-4">
          <CardTitle className="text-3xl text-neutral-950">
            Iniciar sesión
          </CardTitle>
          <CardDescription>
            Accede a tu cuenta para gestionar campañas, reservas y solicitudes
            desde tus marcas o accesos compartidos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
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
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xs bg-mkmedia-blue text-white shadow-[0_12px_30px_-16px_rgba(3,89,168,0.75)] hover:bg-mkmedia-blue/90"
              disabled={loading}
            >
              {loading ? "Iniciando sesion..." : "Iniciar sesion"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-mkmedia-blue hover:underline"
            >
              Crea tu cuenta
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
