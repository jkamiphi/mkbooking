"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronLeft, CircleCheckBig, UserRound } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AuthBrand, AuthHomeLink } from "@/components/auth/auth-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerType = "natural" | "business" | null;

const steps = ["Tipo de cuenta", "Credenciales"] as const;

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                index <= currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </div>
            <p
              className={cn(
                "text-xs font-medium",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="h-1 rounded-full bg-muted">
        <div
          className="h-1 rounded-full bg-primary transition-all"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function AccountTypeCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-md p-2",
            selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState<CustomerType>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!customerType) {
      setError("Selecciona un tipo de cuenta para continuar.");
      return;
    }

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

      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboarding_customer_type", customerType);
      }

      router.push("/onboarding");
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

      <Card className="overflow-hidden border-border/70 shadow-lg">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Crear cuenta</CardTitle>
              <CardDescription>
                Regístrate y completa tu perfil comercial en unos pasos.
              </CardDescription>
              <StepIndicator currentStep={step} />
            </CardHeader>

            <CardContent className="space-y-5">
              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              {step === 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      ¿Cómo usarás MK Booking?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Esto nos ayuda a preparar tu proceso de onboarding.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <AccountTypeCard
                      title="Persona natural"
                      description="Anuncias como individuo y usarás tu cédula."
                      icon={<UserRound className="h-5 w-5" />}
                      selected={customerType === "natural"}
                      onClick={() => setCustomerType("natural")}
                    />
                    <AccountTypeCard
                      title="Empresa / negocio"
                      description="Operas como empresa, agencia u organización."
                      icon={<Building2 className="h-5 w-5" />}
                      selected={customerType === "business"}
                      onClick={() => setCustomerType("business")}
                    />
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={!customerType}
                    onClick={() => setStep(1)}
                  >
                    Continuar
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    Tipo seleccionado:{" "}
                    <span className="font-medium text-foreground">
                      {customerType === "natural" ? "Persona natural" : "Empresa / negocio"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-name">
                      {customerType === "natural" ? "Nombre completo" : "Nombre de contacto"}
                    </Label>
                    <Input
                      id="register-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={
                        customerType === "natural" ? "Juan Pérez" : "Nombre del responsable"
                      }
                      required
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
                        placeholder="Mínimo 8 caracteres"
                        required
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
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-auto"
                      onClick={() => setStep(0)}
                      disabled={loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Volver
                    </Button>
                    <Button type="submit" className="sm:flex-1" disabled={loading}>
                      {loading ? "Creando cuenta..." : "Crear cuenta y continuar"}
                    </Button>
                  </div>
                </form>
              )}

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </CardContent>
          </div>

          <aside className="hidden border-l bg-muted/30 p-6 lg:block">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Qué sigue
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Completarás datos personales o de empresa en onboarding.
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Tu cuenta quedará lista para crear campañas y reservas.
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Puedes cambiar o completar datos más adelante.
                  </p>
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
