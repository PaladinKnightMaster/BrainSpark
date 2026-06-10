import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GameCardProps {
  icon: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  onPlay: () => void;
}

const difficultyConfig = {
  easy: { stars: 2, color: 'text-chart-3', label: 'Easy' },
  medium: { stars: 3, color: 'text-chart-4', label: 'Medium' },
  hard: { stars: 4, color: 'text-destructive', label: 'Hard' },
};

const iconColors: Record<string, string> = {
  'fa-puzzle-piece': 'text-primary',
  'fa-brain': 'text-accent',
  'fa-eye': 'text-chart-3',
  'fa-calculator': 'text-chart-5',
  // FIX: fa-crosshairs was missing — attention game icon was falling back to text-primary
  'fa-crosshairs': 'text-chart-3',
};

export function GameCard({ icon, title, description, duration, difficulty, onPlay }: GameCardProps) {
  const config = difficultyConfig[difficulty];
  const iconColor = iconColors[icon] || 'text-primary';

  return (
    <Card className="premium-shadow hover:scale-105 transition-transform cursor-pointer" data-testid={`game-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <i className={cn("fas", icon, "text-2xl", iconColor)}></i>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
            {duration}
          </span>
        </div>
        <h3 className="font-semibold mb-2 text-card-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("flex", config.color)}>
              {Array.from({ length: config.stars }, (_, i) => (
                <i key={i} className="fas fa-star text-xs"></i>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlay}
            className="text-primary hover:text-primary/80 font-medium"
            data-testid={`button-play-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            Play Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
