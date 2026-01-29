"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type CustomerType = "natural" | "business";

interface StepIndicatorProps {
  currentStep: number;
  labels: string[];
}

function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {labels.map((label, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentStep
                  ? "bg-green-600 text-white"
                  : index === currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
              )}
            >
              {index < currentStep ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium text-center",
                index <= currentStep
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex mt-4">
        {labels.slice(0, -1).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-1 mx-2 rounded-full transition-colors",
              index < currentStep
                ? "bg-green-600"
                : "bg-neutral-200 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>
    </div>
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      cedula,
      phone: phone || undefined,
      email: email || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
          Personal Information
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Please provide your personal details to complete your registration.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            First Name *
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="John"
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Last Name *
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="cedula"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Cedula (Personal ID) *
        </label>
        <input
          id="cedula"
          type="text"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          required
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
          placeholder="8-123-4567"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Your personal identification number
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="+507 6000-0000"
          />
        </div>
        <div>
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="contact@example.com"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Optional: A different email for business communications
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {isLoading ? "Setting up your account..." : "Complete Registration"}
      </button>
    </form>
  );
}

function BusinessForm({
  onSubmit,
  isLoading,
  error,
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
}) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [dvCode, setDvCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      legalName,
      tradeName: tradeName || undefined,
      taxId,
      dvCode: dvCode || undefined,
      phone: phone || undefined,
      email: email || undefined,
      industry: industry || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
          Business Information
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Please provide your company details to complete your registration.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="legalName"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Legal Name *
        </label>
        <input
          id="legalName"
          type="text"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
          placeholder="Company Legal Name S.A."
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          The official registered name of your company
        </p>
      </div>

      <div>
        <label
          htmlFor="tradeName"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Trade Name / Brand Name
        </label>
        <input
          id="tradeName"
          type="text"
          value={tradeName}
          onChange={(e) => setTradeName(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
          placeholder="Brand Name"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          The name your company operates under (if different from legal name)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="taxId"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            RUC (Tax ID) *
          </label>
          <input
            id="taxId"
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="12345-1-123456"
          />
        </div>
        <div>
          <label
            htmlFor="dvCode"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            DV Code
          </label>
          <input
            id="dvCode"
            type="text"
            value={dvCode}
            onChange={(e) => setDvCode(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="businessPhone"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Business Phone
          </label>
          <input
            id="businessPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="+507 000-0000"
          />
        </div>
        <div>
          <label
            htmlFor="businessEmail"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Business Email
          </label>
          <input
            id="businessEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            placeholder="info@company.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="industry"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Industry
        </label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
        >
          <option value="">Select an industry</option>
          <option value="retail">Retail</option>
          <option value="food_beverage">Food & Beverage</option>
          <option value="healthcare">Healthcare</option>
          <option value="technology">Technology</option>
          <option value="finance">Finance & Banking</option>
          <option value="real_estate">Real Estate</option>
          <option value="automotive">Automotive</option>
          <option value="education">Education</option>
          <option value="entertainment">Entertainment</option>
          <option value="travel">Travel & Tourism</option>
          <option value="professional_services">Professional Services</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {isLoading ? "Setting up your account..." : "Complete Registration"}
      </button>
    </form>
  );
}

function SuccessStep() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/profile");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-10 h-10 text-green-600"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
        Registration Complete!
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Your account has been set up successfully. Redirecting to your profile...
      </p>
      <div className="animate-pulse">
        <div className="h-1 w-32 mx-auto bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-[loading_3s_ease-in-out]" />
        </div>
      </div>
    </div>
  );
}

function getInitialCustomerType(): CustomerType | null {
  if (typeof window === "undefined") return null;
  const storedType = sessionStorage.getItem("onboarding_customer_type");
  if (storedType === "natural" || storedType === "business") {
    return storedType;
  }
  return null;
}

export function OnboardingContent() {
  const router = useRouter();
  const [customerType, setCustomerType] = useState<CustomerType | null>(getInitialCustomerType);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: organizations, isLoading: loadingOrgs } =
    trpc.organization.myOrganizations.useQuery();

  const registerNaturalPerson = trpc.organization.registerNaturalPerson.useMutation({
    onSuccess: () => {
      setStep(1);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const registerBusiness = trpc.organization.registerBusiness.useMutation({
    onSuccess: () => {
      setStep(1);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Check if user already has an organization
  useEffect(() => {
    if (!loadingOrgs && organizations && organizations.length > 0) {
      router.push("/profile");
    }
  }, [organizations, loadingOrgs, router]);

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

  function handleCustomerTypeSelect(type: CustomerType) {
    setCustomerType(type);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("onboarding_customer_type", type);
    }
  }

  if (loadingOrgs) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mx-auto" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mx-auto" />
            <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const stepLabels =
    customerType === "natural"
      ? ["Personal Info", "Complete"]
      : customerType === "business"
        ? ["Business Info", "Complete"]
        : ["Account Type", "Details", "Complete"];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-neutral-900 dark:text-white">
          Complete Your Registration
        </h1>
        <p className="text-center text-neutral-600 dark:text-neutral-400 mb-6">
          Just a few more details to get you started
        </p>

        <StepIndicator
          currentStep={step}
          labels={stepLabels}
        />

        {step === 0 && !customerType && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center text-neutral-900 dark:text-white">
                What type of account do you need?
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => handleCustomerTypeSelect("natural")}
                className="p-6 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 text-left transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-neutral-600 dark:text-neutral-400"
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
                      Natural Person
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      For individuals advertising their own products or services
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCustomerTypeSelect("business")}
                className="p-6 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 text-left transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-neutral-600 dark:text-neutral-400"
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
                      Business / Company
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      For companies, agencies, or organizations
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 0 && customerType === "natural" && (
          <NaturalPersonForm
            onSubmit={handleNaturalPersonSubmit}
            isLoading={registerNaturalPerson.isPending}
            error={error}
          />
        )}

        {step === 0 && customerType === "business" && (
          <BusinessForm
            onSubmit={handleBusinessSubmit}
            isLoading={registerBusiness.isPending}
            error={error}
          />
        )}

        {step === 1 && <SuccessStep />}

        {step === 0 && customerType && (
          <button
            type="button"
            onClick={() => setCustomerType(null)}
            className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            &larr; Change account type
          </button>
        )}
      </div>
    </div>
  );
}
