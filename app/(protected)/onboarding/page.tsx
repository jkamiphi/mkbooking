import { OnboardingContent } from "./onboarding-content";

export const metadata = {
  title: "Completa Tu Perfil - MK Booking",
};

export default function OnboardingPage() {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-12 pt-6">
      <OnboardingContent />
    </div>
  );
}
