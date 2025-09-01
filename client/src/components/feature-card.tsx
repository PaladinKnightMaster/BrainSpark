import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  isPremium?: boolean;
}

export function FeatureCard({ icon, title, description, className, isPremium = false }: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "feature-card p-8 transition-all duration-300 hover:scale-105 premium-shadow",
        isPremium && "bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20",
        className
      )}
      data-testid={`feature-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-0">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          isPremium ? "bg-primary/20" : "bg-primary/10"
        )}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        {isPremium && (
          <div className="mt-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <i className="fas fa-credit-card mr-1"></i>
              Stripe Integration
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
