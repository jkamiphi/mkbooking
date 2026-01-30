"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type CustomerType = "natural" | "business" | null;

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            index < currentStep
              ? "bg-blue-600"
              : index === currentStep
                ? "bg-blue-600"
                : "bg-neutral-300 dark:bg-neutral-700"
          )}
        />
      ))}
    </div>
  );
}

interface CustomerTypeSelectorProps {
  onSelect: (type: CustomerType) => void;
  selected: CustomerType;
}

function CustomerTypeSelector({ onSelect, selected }: CustomerTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-center text-neutral-700 dark:text-neutral-300">
        ¿Cómo usarás MK Booking?
      </h2>
      <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={() => onSelect("natural")}
          className={cn(
            "p-6 rounded-lg border-2 text-left transition-all",
            selected === "natural"
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800"
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
              selected === "natural"
                ? "bg-blue-100 dark:bg-blue-900/50"
                : "bg-neutral-100 dark:bg-neutral-800"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={cn(
                  "w-6 h-6",
                  selected === "natural" ? "text-blue-600" : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Persona Natural
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Para individuos que anuncian sus propios productos o servicios. Usarás tu cédula personal.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("business")}
          className={cn(
            "p-6 rounded-lg border-2 text-left transition-all",
            selected === "business"
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800"
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
              selected === "business"
                ? "bg-blue-100 dark:bg-blue-900/50"
                : "bg-neutral-100 dark:bg-neutral-800"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={cn(
                  "w-6 h-6",
                  selected === "business" ? "text-blue-600" : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Empresa / Negocio
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Para empresas, agencias u organizaciones. Usarás tu RUC empresarial.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
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

  const totalSteps = 2;

  function handleCustomerTypeSelect(type: CustomerType) {
    setCustomerType(type);
  }

  function handleNext() {
    if (step === 0 && customerType) {
      setStep(1);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Error al crear la cuenta");
        return;
      }

      // Store the customer type for the onboarding flow
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboarding_customer_type", customerType || "");
      }

      // Redirect to onboarding to complete organization setup
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Crear Cuenta</h1>
        <StepIndicator currentStep={step} totalSteps={totalSteps} />

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-6">
            <CustomerTypeSelector
              onSelect={handleCustomerTypeSelect}
              selected={customerType}
            />
            <button
              type="button"
              onClick={handleNext}
              disabled={!customerType}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Registrándose como:{" "}
                <span className="font-medium">
                  {customerType === "natural" ? "Persona Natural" : "Empresa / Negocio"}
                </span>
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {customerType === "natural" ? "Nombre Completo" : "Nombre de Contacto"}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                placeholder={customerType === "natural" ? "Juan Pérez" : "Nombre del contacto"}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                placeholder="Confirma tu contraseña"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2 px-4 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-md transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? "Creando cuenta..." : "Crear Cuenta"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
