import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressChartProps {
  data: {
    memory: number;
    logic: number;
    attention: number;
    speed: number;
  };
  isLoading?: boolean;
}

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const isPositive = value >= 0;
  const absValue = Math.abs(value);
  const barWidth = Math.min(100, absValue * 2);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <i className={`${icon} ${color} text-xs`}></i>
          <span className="text-card-foreground font-medium">{label}</span>
        </div>
        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${isPositive ? 'bg-chart-3/15 text-chart-3' : 'bg-destructive/15 text-destructive'}`}>
          {isPositive ? '+' : ''}{value}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isPositive ? 'bg-chart-3' : 'bg-destructive/60'}`}
          style={{ width: `${Math.max(4, barWidth)}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressChart({ data, isLoading }: ProgressChartProps) {
  if (isLoading) {
    return (
      <Card className="premium-shadow" data-testid="progress-chart">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base">Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded animate-pulse" style={{ width: `${40 + i * 15}%` }} />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const games = [
    { label: 'Memory', key: 'memory' as const, icon: 'fas fa-puzzle-piece', color: 'text-chart-1' },
    { label: 'Logic', key: 'logic' as const, icon: 'fas fa-brain', color: 'text-chart-2' },
    { label: 'Attention', key: 'attention' as const, icon: 'fas fa-crosshairs', color: 'text-chart-3' },
    { label: 'Speed Math', key: 'speed' as const, icon: 'fas fa-calculator', color: 'text-chart-4' },
  ];

  const hasAnyData = Object.values(data).some(v => v !== 0);

  return (
    <Card className="premium-shadow" data-testid="progress-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground text-base">Performance Trend</CardTitle>
          <span className="text-xs text-muted-foreground">vs. last session</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyData && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Play games to see your improvement trends
          </p>
        )}
        {games.map(g => (
          <StatBar
            key={g.key}
            label={g.label}
            value={data[g.key]}
            color={g.color}
            icon={g.icon}
          />
        ))}
      </CardContent>
    </Card>
  );
}
