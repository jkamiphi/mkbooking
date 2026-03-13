"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CircleCheckBig, Link2, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";

type CustomerType = "natural" | "business" | "agency";

const steps = ["Tipo de cuenta", "Datos", "Completar"] as const;

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

function NaturalPersonForm({
  onSubmit,
  isLoading,
  error,
}: {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    cedula: string;
    phone?: string;
    email?: string;
  }) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      cedula: cedula.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Datos personales</p>
        <p className="text-sm text-muted-foreground">
          Completa esta información para activar tu cuenta como persona natural.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="onboard-natural-first-name">Nombre</Label>
          <Input
            id="onboard-natural-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Juan"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboard-natural-last-name">Apellido</Label>
          <Input
            id="onboard-natural-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Pérez"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onboard-natural-cedula">Cédula</Label>
        <Input
          id="onboard-natural-cedula"
          value={cedula}
          onChange={(event) => setCedula(event.target.value)}
          placeholder="8-123-4567"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="onboard-natural-phone">Teléfono</Label>
          <Input
            id="onboard-natural-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+507 6000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboard-natural-email">Correo de contacto</Label>
          <Input
            id="onboard-natural-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contacto@ejemplo.com"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Configurando cuenta..." : "Completar onboarding"}
      </Button>
    </form>
  );
}

function BusinessForm({
  onSubmit,
  isLoading,
  error,
  title,
  description,
  submitLabel,
}: {
  onSubmit: (data: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    dvCode?: string;
    phone?: string;
    email?: string;
    industry?: string;
  }) => void;
  isLoading: boolean;
  error: string | null;
  title: string;
  description: string;
  submitLabel: string;
}) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [dvCode, setDvCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || undefined,
      taxId: taxId.trim(),
      dvCode: dvCode.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      industry: industry || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="onboard-business-legal-name">Razón social</Label>
        <Input
          id="onboard-business-legal-name"
          value={legalName}
          onChange={(event) => setLegalName(event.target.value)}
          placeholder="Empresa Demo S.A."
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onboard-business-trade-name">Nombre comercial</Label>
        <Input
          id="onboard-business-trade-name"
          value={tradeName}
          onChange={(event) => setTradeName(event.target.value)}
          placeholder="Marca Demo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="onboard-business-tax-id">RUC</Label>
          <Input
            id="onboard-business-tax-id"
            value={taxId}
            onChange={(event) => setTaxId(event.target.value)}
            placeholder="12345-1-123456"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboard-business-dv">DV</Label>
          <Input
            id="onboard-business-dv"
            value={dvCode}
            onChange={(event) => setDvCode(event.target.value)}
            placeholder="12"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="onboard-business-phone">Teléfono</Label>
          <Input
            id="onboard-business-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+507 6000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboard-business-email">Correo corporativo</Label>
          <Input
            id="onboard-business-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="info@empresa.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="onboard-business-industry">Industria</Label>
        <SelectNative
          id="onboard-business-industry"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
        >
          <option value="">Selecciona una industria</option>
          <option value="retail">Comercio</option>
          <option value="food_beverage">Alimentos y bebidas</option>
          <option value="healthcare">Salud</option>
          <option value="technology">Tecnología</option>
          <option value="finance">Finanzas y banca</option>
          <option value="real_estate">Bienes raíces</option>
          <option value="automotive">Automotriz</option>
          <option value="education">Educación</option>
          <option value="entertainment">Entretenimiento</option>
          <option value="travel">Viajes y turismo</option>
          <option value="professional_services">Servicios profesionales</option>
          <option value="manufacturing">Manufactura</option>
          <option value="other">Otro</option>
        </SelectNative>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Configurando organización..." : submitLabel}
      </Button>
    </form>
  );
}

function SuccessStep() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/profile");
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="space-y-4 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CircleCheckBig className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">¡Registro completado!</h3>
        <p className="text-sm text-muted-foreground">
          Tu perfil está listo. Te redirigimos a tu panel.
        </p>
      </div>
      <Button variant="outline" onClick={() => router.push("/profile")}>
        Ir ahora
      </Button>
    </div>
  );
}

function getInitialCustomerType(): CustomerType | null {
  if (typeof window === "undefined") return null;
  const storedType = sessionStorage.getItem("onboarding_customer_type");
  if (
    storedType === "natural" ||
    storedType === "business" ||
    storedType === "agency"
  ) {
    return storedType;
  }
  return null;
}

export function OnboardingContent() {
  const router = useRouter();
  const [customerType, setCustomerType] = useState<CustomerType | null>(
    getInitialCustomerType
  );
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: organizations, isLoading: loadingOrgs } =
    trpc.organization.myOrganizations.useQuery();

  const registerNaturalPerson = trpc.organization.registerNaturalPerson.useMutation({
    onSuccess: () => {
      setCompleted(true);
      setError(null);
      sessionStorage.removeItem("onboarding_customer_type");
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const registerBusiness = trpc.organization.registerBusiness.useMutation({
    onSuccess: () => {
      setCompleted(true);
      setError(null);
      sessionStorage.removeItem("onboarding_customer_type");
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const registerAgency = trpc.organization.registerAgency.useMutation({
    onSuccess: () => {
      setCompleted(true);
      setError(null);
      sessionStorage.removeItem("onboarding_customer_type");
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  useEffect(() => {
    if (!loadingOrgs && organizations && organizations.length > 0) {
      router.push("/profile");
    }
  }, [loadingOrgs, organizations, router]);

  function handleNaturalPersonSubmit(data: {
    firstName: string;
    lastName: string;
    cedula: string;
    phone?: string;
    email?: string;
  }) {
    setError(null);
    registerNaturalPerson.mutate(data);
  }

  function handleBusinessSubmit(data: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    dvCode?: string;
    phone?: string;
    email?: string;
    industry?: string;
  }) {
    setError(null);
    registerBusiness.mutate(data);
  }

  function handleAgencySubmit(data: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    dvCode?: string;
    phone?: string;
    email?: string;
    industry?: string;
  }) {
    setError(null);
    registerAgency.mutate(data);
  }

  function handleCustomerTypeSelect(type: CustomerType) {
    setCustomerType(type);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("onboarding_customer_type", type);
    }
  }

  const currentStep = completed ? 2 : customerType ? 1 : 0;

  if (loadingOrgs) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Card className="overflow-hidden border-border/70 shadow-lg">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Completa tu registro</CardTitle>
              <CardDescription>
                Último paso para activar tu perfil comercial en MK Booking.
              </CardDescription>
              <StepIndicator currentStep={currentStep} />
            </CardHeader>

            <CardContent className="space-y-4">
              {!customerType && !completed ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Selecciona el tipo de perfil
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Podrás ajustarlo más adelante si cambia tu operación.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <AccountTypeCard
                      title="Persona natural"
                      description="Perfil para anunciantes individuales."
                      icon={<UserRound className="h-5 w-5" />}
                      selected={customerType === "natural"}
                      onClick={() => handleCustomerTypeSelect("natural")}
                    />
                    <AccountTypeCard
                      title="Empresa / negocio"
                      description="Perfil para anunciantes, marcas y empresas con operación propia."
                      icon={<Building2 className="h-5 w-5" />}
                      selected={customerType === "business"}
                      onClick={() => handleCustomerTypeSelect("business")}
                    />
                    <AccountTypeCard
                      title="Agencia"
                      description="Perfil para agencias que operan marcas cliente y trabajan por contexto."
                      icon={<Link2 className="h-5 w-5" />}
                      selected={customerType === "agency"}
                      onClick={() => handleCustomerTypeSelect("agency")}
                    />
                  </div>
                </div>
              ) : null}

              {customerType === "natural" && !completed ? (
                <NaturalPersonForm
                  onSubmit={handleNaturalPersonSubmit}
                  isLoading={registerNaturalPerson.isPending}
                  error={error}
                />
              ) : null}

              {customerType === "business" && !completed ? (
                <BusinessForm
                  onSubmit={handleBusinessSubmit}
                  isLoading={registerBusiness.isPending}
                  error={error}
                  title="Datos de empresa"
                  description="Completa la información fiscal y de contacto de tu organización anunciante."
                  submitLabel="Completar onboarding"
                />
              ) : null}

              {customerType === "agency" && !completed ? (
                <BusinessForm
                  onSubmit={handleAgencySubmit}
                  isLoading={registerAgency.isPending}
                  error={error}
                  title="Datos de agencia"
                  description="Registra la agencia y luego podrás vincular marcas cliente desde relaciones multi-organización."
                  submitLabel="Crear agencia"
                />
              ) : null}

              {completed ? <SuccessStep /> : null}

              {customerType && !completed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomerType(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cambiar tipo de cuenta
                </Button>
              ) : null}
            </CardContent>
          </div>

          <aside className="hidden border-l bg-muted/30 p-6 lg:block">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Checklist
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Datos de identificación y contacto.
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Configuración base de tu perfil comercial.
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-muted-foreground">
                    Acceso inmediato a tu área de cliente.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}
