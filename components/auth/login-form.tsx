"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { signIn } from "@/lib/auth-client";

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

      router.push("/profile");
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
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              MK Booking
            </p>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              Catálogo OOH
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Regístrate
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
        <Link
          href="/"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Regresar al home
        </Link>
      </p>
    </div>
  );
}
