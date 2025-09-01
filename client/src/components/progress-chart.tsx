import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressChartProps {
  data: {
    memory: number;
    logic: number;
    attention: number;
  };
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <Card className="premium-shadow" data-testid="progress-chart">
      <CardHeader>
        <CardTitle className="text-card-foreground">This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Premium analytics visualization */}
        <img
          src="/attached_assets/generated_images/Data_analytics_visualization_background_021ca1fb.png"
          alt="Professional analytics dashboard showing brain training progress"
          className="w-full h-32 object-cover rounded-lg mb-4"
        />
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="flex justify-between" data-testid="progress-memory">
            <span>Memory</span>
            <span className="text-chart-1">+{data.memory}%</span>
          </div>
          <div className="flex justify-between" data-testid="progress-logic">
            <span>Logic</span>
            <span className="text-chart-2">+{data.logic}%</span>
          </div>
          <div className="flex justify-between" data-testid="progress-attention">
            <span>Attention</span>
            <span className="text-chart-3">+{data.attention}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
