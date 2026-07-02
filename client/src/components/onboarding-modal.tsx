import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

const STORAGE_KEY = "brainboost_onboarded";

const STEPS = [
  {
    emoji: "🧠",
    title: "Welcome to BrainBoost!",
    body: "You're about to start a science-backed cognitive training program. Just a few minutes a day can measurably improve your memory, focus, logic, and mental speed.",
  },
  {
    emoji: "📈",
    title: "It adapts to you",
    body: "Every game gets harder as you improve — and easier if you're struggling. Your difficulty is recalculated after each session so you're always training at exactly the right level.",
  },
  {
    emoji: "🎯",
    title: "Start with any game",
    body: "Your daily plan has 4 games. Try to complete all 4 to build your streak. We recommend starting with Memory — it's a great warm-up for your brain.",
  },
];

interface OnboardingModalProps {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, "1");
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onDismiss();
  };

  const current = STEPS[step];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />
      <div
        className={`relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 transition-all duration-300 ${visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
      >
        <div className="text-center space-y-5">
          <div className="text-6xl animate-bounce">{current.emoji}</div>
          <div>
            <h2 className="text-2xl font-bold mb-2">{current.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{current.body}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`}
              />
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <GradientButton onClick={handleNext} className="w-full py-3 text-base font-semibold">
              {isLast ? "Let's go! 🚀" : "Next →"}
            </GradientButton>
            {!isLast && (
              <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground text-sm">
                Skip intro
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(sessionsPlayed: number): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_KEY) && sessionsPlayed === 0;
}
