"use client";

import Link from "next/link";
import { useState } from "react";
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

      <Card className="overflow-hidden rounded-xs border border-neutral-200/80 bg-white/95 shadow-[0_28px_88px_-52px_rgba(3,89,168,0.45)]">
        <CardHeader className="space-y-3 border-b border-neutral-200/80 bg-[linear-gradient(180deg,rgba(3,89,168,0.05),rgba(255,255,255,0.9)_75%)] pb-4">
          <CardTitle className="text-3xl text-neutral-950">
            Recuperar contraseña
          </CardTitle>
          <CardDescription>
            Te enviaremos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {submitted ? (
            <div className="rounded-xs border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Si ese correo existe en el sistema, recibirás un enlace para
              restablecer tu contraseña.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xs border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xs bg-mkmedia-blue text-white shadow-[0_12px_30px_-16px_rgba(3,89,168,0.75)] hover:bg-mkmedia-blue/90"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-mkmedia-blue hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
