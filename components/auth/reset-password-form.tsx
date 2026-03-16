"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
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

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("El enlace no es válido o ha expirado.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword,
      });

      if (result.error) {
        setError(
          result.error.message || "No se pudo restablecer la contraseña.",
        );
        return;
      }

      setCompleted(true);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const hasInvalidLink = tokenError === "INVALID_TOKEN" || !token;

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthBrand className="mb-5" />

      <Card className="overflow-hidden rounded-md border border-neutral-200/80 bg-white/95 shadow-[0_28px_88px_-52px_rgba(3,89,168,0.45)]">
        <CardHeader className="space-y-3 border-b border-neutral-200/80 bg-[linear-gradient(180deg,rgba(3,89,168,0.05),rgba(255,255,255,0.9)_75%)]">
          <div className="inline-flex w-fit items-center rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
            Seguridad
          </div>
          <CardTitle className="text-3xl text-neutral-950">
            Nueva contraseña
          </CardTitle>
          <CardDescription>
            Define una contraseña nueva para volver a acceder a tu cuenta.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {completed ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Tu contraseña se actualizó correctamente.
            </div>
          ) : null}

          {hasInvalidLink ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              El enlace de recuperación no es válido o expiró. Solicita uno
              nuevo.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!completed && !hasInvalidLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="h-11 rounded-xl border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="h-11 rounded-xl border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-mkmedia-blue text-white shadow-[0_12px_30px_-16px_rgba(3,89,168,0.75)] hover:bg-mkmedia-blue/90"
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </form>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href={completed ? "/login" : "/forgot-password"}
              className="font-medium text-mkmedia-blue hover:underline"
            >
              {completed ? "Ir a iniciar sesión" : "Solicitar nuevo enlace"}
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
