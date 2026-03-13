"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { AuthBrand, AuthHomeLink } from "@/components/auth/auth-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <div className="mx-auto w-full max-w-3xl">
      <AuthBrand className="mb-5" />

      <Card className="overflow-hidden rounded-[2rem] border-mkmedia-blue/15 bg-white/92 shadow-[0_32px_120px_-54px_rgba(3,89,168,0.3)] backdrop-blur">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <CardHeader className="space-y-3 border-b border-mkmedia-blue/10 bg-[linear-gradient(180deg,rgba(3,89,168,0.08),rgba(255,255,255,0))]">
              <div className="inline-flex w-fit items-center rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                Crear cuenta
              </div>
              <CardTitle className="text-3xl text-neutral-950">Empieza con tu acceso</CardTitle>
              <CardDescription className="max-w-xl text-sm leading-6 text-neutral-600">
                Crea tu cuenta primero. Luego podrás crear una marca, una agencia o usar accesos compartidos desde la misma sesión.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                    className="h-11 rounded-2xl border-mkmedia-blue/15"
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
                    className="h-11 rounded-2xl border-mkmedia-blue/15"
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
                      className="h-11 rounded-2xl border-mkmedia-blue/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-password-confirm">Confirmar contraseña</Label>
                    <Input
                      id="register-password-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repite tu contraseña"
                      required
                      className="h-11 rounded-2xl border-mkmedia-blue/15"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-mkmedia-blue text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
                  disabled={loading}
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-mkmedia-blue hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </CardContent>
          </div>

          <aside className="border-t border-mkmedia-blue/10 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(3,89,168,0.05))] p-6 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                  Después del acceso
                </p>
                <h2 className="mt-2 text-lg font-semibold text-neutral-950">
                  Configura solo lo necesario
                </h2>
              </div>

              <div className="space-y-3 text-sm text-neutral-600">
                <div className="rounded-2xl border border-mkmedia-blue/15 bg-white px-4 py-3">
                  Crea una marca o una agencia con un nombre simple cuando realmente lo necesites.
                </div>
                <div className="rounded-2xl border border-mkmedia-blue/15 bg-white px-4 py-3">
                  Si ya tienes accesos compartidos, entrarás directo a operarlos desde tu cuenta.
                </div>
                <div className="rounded-2xl border border-mkmedia-yellow/35 bg-mkmedia-yellow/15 px-4 py-3 text-neutral-700">
                  Los datos fiscales y comerciales quedan para después.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Card>

      <AuthHomeLink className="mt-4" />
    </div>
  );
}
