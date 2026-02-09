import { OnboardingContent } from "./onboarding-content";

export const metadata = {
  title: "Completa Tu Perfil - MK Booking",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,theme(colors.blue.50)_0%,theme(colors.slate.50)_40%,theme(colors.white)_100%)] px-4 py-12 dark:bg-neutral-950">
      <OnboardingContent />
    </div>
  );
}
