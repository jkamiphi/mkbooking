"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
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

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"DIRECT_CLIENT" | "AGENCY">(
    "DIRECT_CLIENT",
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!workspaceName.trim()) {
      setError("Debes indicar el nombre de tu primer negocio.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (result.error) {
        setError(result.error.message || "Error al crear la cuenta.");
        return;
      }

      const bootstrapResponse = await fetch("/api/auth/bootstrap-workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType,
          workspaceName: workspaceName.trim(),
        }),
      });
      if (!bootstrapResponse.ok && bootstrapResponse.status !== 409) {
        const responseBody = (await bootstrapResponse
          .json()
          .catch(() => null)) as { message?: string } | null;
        setError(responseBody?.message || "No se pudo crear tu espacio inicial.");
        return;
      }

      const redirectResponse = await fetch("/api/auth/post-login-path", {
        method: "GET",
      });
      const redirectData = (await redirectResponse.json()) as { path?: string };
      const nextPath = redirectData.path || "/onboarding";

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AuthBrand className="mb-5" />

      <Card className="overflow-hidden rounded-xs border border-neutral-200/80 bg-white/95 shadow-[0_28px_88px_-52px_rgba(3,89,168,0.45)]">
        <CardHeader className="space-y-3 border-b border-neutral-200/80 bg-[linear-gradient(180deg,rgba(3,89,168,0.05),rgba(255,255,255,0.9)_75%)] pb-4">
          <CardTitle className="text-3xl text-neutral-950">
            Empieza con tu acceso
          </CardTitle>
          <CardDescription className="max-w-xl text-sm leading-6 text-neutral-600">
            Define tu tipo de cuenta y crea tu primer espacio desde el registro.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error ? (
            <div className="rounded-xs border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-name">Nombre</Label>
              <Input
                id="register-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre o nombre del responsable"
                required
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email">Correo electrónico</Label>
              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="register-password">Contraseña</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  required
                  className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-password-confirm">
                  Confirmar contraseña
                </Label>
                <Input
                  id="register-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de cuenta</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={accountType === "DIRECT_CLIENT" ? "default" : "outline"}
                  className={
                    accountType === "DIRECT_CLIENT"
                      ? "rounded-xs bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                      : "rounded-xs"
                  }
                  onClick={() => setAccountType("DIRECT_CLIENT")}
                >
                  Cliente directo
                </Button>
                <Button
                  type="button"
                  variant={accountType === "AGENCY" ? "default" : "outline"}
                  className={
                    accountType === "AGENCY"
                      ? "rounded-xs bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                      : "rounded-xs"
                  }
                  onClick={() => setAccountType("AGENCY")}
                >
                  Agencia
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-workspace-name">
                {accountType === "AGENCY"
                  ? "Nombre de tu agencia"
                  : "Nombre de tu marca"}
              </Label>
              <Input
                id="register-workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder={
                  accountType === "AGENCY"
                    ? "Ej. Unicornio Azul"
                    : "Ej. Marca Atlas"
                }
                required
                className="h-11 rounded-xs border-neutral-300 focus-visible:border-mkmedia-blue/45 focus-visible:ring-mkmedia-blue/20"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xs bg-mkmedia-blue text-white shadow-[0_12px_30px_-16px_rgba(3,89,168,0.75)] hover:bg-mkmedia-blue/90"
              disabled={loading}
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-mkmedia-blue hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
