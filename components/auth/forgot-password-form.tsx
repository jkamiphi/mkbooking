"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthBrand, AuthHomeLink } from "@/components/auth/auth-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo,
      });

      if (result.error) {
        setError(result.error.message || "No se pudo procesar la solicitud.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Ocurrió un error inesperado.");
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
            Recuperacion
          </div>
          <CardTitle className="text-3xl text-neutral-950">Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Si ese correo existe en el sistema, recibirás un enlace para restablecer tu
              contraseña.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Correo electrónico</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="h-11 rounded-2xl border-mkmedia-blue/15"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-mkmedia-blue text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-mkmedia-blue hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
