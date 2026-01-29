import { OnboardingContent } from "./onboarding-content";

export const metadata = {
  title: "Complete Your Profile - MK Booking",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <OnboardingContent />
    </div>
  );
}
