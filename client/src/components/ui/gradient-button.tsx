import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: "primary" | "secondary";
}

export function GradientButton({ className, variant = "primary", ...props }: GradientButtonProps) {
  return (
    <Button
      className={cn(
        "btn-primary text-primary-foreground font-semibold transition-all duration-300",
        variant === "secondary" && "bg-gradient-to-r from-secondary to-muted text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}
