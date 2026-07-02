import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { Badge } from "@/components/ui/badge";
import { GameCard } from "@/components/game-card";
import { ProgressChart } from "@/components/progress-chart";
import { MemoryGame } from "@/components/games/memory-game";
import { LogicPuzzle } from "@/components/games/logic-puzzle";
import { AttentionGame } from "@/components/games/attention-game";
import { SpeedMathGame } from "@/components/games/speed-math";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingModal, shouldShowOnboarding } from "@/components/onboarding-modal";
import { Confetti } from "@/components/confetti";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { GameSession } from "@shared/schema";

type ActiveGame = 'memory' | 'logic' | 'attention' | 'speed' | null;

function StatCard({
  icon,
  iconColor,
  badge,
  badgeColor,
  value,
  label,
  testId,
  isLoading,
}: {
  icon: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  value: string | number;
  label: string;
  testId: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="premium-shadow hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <i className={`${icon} text-2xl ${iconColor}`}></i>
          {badge && (
            <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {isLoading ? (
          <div className="h-8 w-24 bg-muted rounded animate-pulse mb-1" />
        ) : (
          <div className="text-2xl font-bold text-card-foreground" data-testid={testId}>
            {value}
          </div>
        )}
        <div className="text-muted-foreground text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

function RecentGameRow({ session }: { session: GameSession }) {
  const icons: Record<string, string> = {
    memory: 'fas fa-puzzle-piece',
    logic: 'fas fa-brain',
    attention: 'fas fa-crosshairs',
    speed: 'fas fa-calculator',
  };
  const colors: Record<string, string> = {
    memory: 'text-chart-1',
    logic: 'text-chart-2',
    attention: 'text-chart-3',
    speed: 'text-chart-4',
  };
  const labels: Record<string, string> = {
    memory: 'Memory',
    logic: 'Logic',
    attention: 'Attention',
    speed: 'Speed Math',
  };

  const timeAgo = (date: Date | string | null) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
        <i className={`${icons[session.gameType] || 'fas fa-gamepad'} text-sm ${colors[session.gameType] || 'text-primary'}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-card-foreground truncate">
          {labels[session.gameType] || session.gameType}
        </div>
        <div className="text-xs text-muted-foreground">
          {session.accuracy != null ? `${session.accuracy}% accuracy` : `Score: ${session.score}`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-primary">{session.score}</div>
        <div className="text-xs text-muted-foreground">{timeAgo(session.completedAt)}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevCompletedCount, setPrevCompletedCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalScore: number;
    streak: number;
    level: number;
    trainingTime: number;
    sessionsPlayed: number;
  }>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const { data: weeklyProgress, isLoading: weeklyLoading } = useQuery<{
    memory: number;
    logic: number;
    attention: number;
    speed: number;
  }>({
    queryKey: ["/api/stats/weekly"],
    enabled: isAuthenticated,
  });

  const { data: todayData } = useQuery<{ completed: string[] }>({
    queryKey: ["/api/stats/today"],
    enabled: isAuthenticated,
  });

  const { data: recentSessions } = useQuery<GameSession[]>({
    queryKey: ["/api/game-sessions"],
    enabled: isAuthenticated,
  });

  const todayCompleted = todayData?.completed || [];

  // Onboarding: show for first-time users once stats load
  useEffect(() => {
    if (stats && shouldShowOnboarding(stats.sessionsPlayed)) {
      setShowOnboarding(true);
    }
  }, [stats]);

  // Streak milestone toasts
  useEffect(() => {
    if (!stats) return;
    const s = stats.streak;
    const milestones: Record<number, string> = { 3: "3-day streak! You're building a habit. 🔥", 7: "One week streak! Consistency is key. 🏅", 14: "Two weeks strong! Your brain thanks you. 🧠", 30: "30-day streak! You're a BrainBoost champion. 🏆" };
    if (milestones[s]) toast({ title: "Streak Milestone!", description: milestones[s] });
  }, [stats?.streak]);

  // Daily goal confetti when all 4 games completed
  useEffect(() => {
    const count = todayData?.completed?.length || 0;
    if (count === 4 && prevCompletedCount < 4) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      toast({ title: "Daily Goal Complete! 🎉", description: "You finished all 4 games today. Come back tomorrow to keep your streak!" });
    }
    setPrevCompletedCount(count);
  }, [todayData?.completed?.length]);

  const gameSessionMutation = useMutation({
    mutationFn: async (gameData: any) => {
      await apiRequest("POST", "/api/game-sessions", gameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions"] });
      toast({
        title: "Game Saved!",
        description: "Your progress has been recorded.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save game session.",
        variant: "destructive",
      });
    },
  });

  const handlePlayGame = (gameType: string) => {
    if (['memory', 'logic', 'attention', 'speed'].includes(gameType)) {
      setActiveGame(gameType as ActiveGame);
    }
  };

  const handleGameComplete = (gameType: string, score: number, ...additionalData: any[]) => {
    let sessionData: any = { gameType, score, difficulty: 'adaptive' };

    if (gameType === 'memory') {
      const [moves, time, accuracy, difficultySettings] = additionalData;
      sessionData = { ...sessionData, duration: time, moves, accuracy: accuracy ? Math.round(accuracy) : undefined, totalAttempts: moves, difficultySettings };
    } else if (gameType === 'logic') {
      // FIX: 4th param is now real elapsed duration (was hardcoded 180s), 5th is difficultySettings
      const [correct, total, duration, difficultySettings] = additionalData;
      sessionData = { ...sessionData, duration: duration || 180, correctAnswers: correct, totalAttempts: total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, difficultySettings };
    } else if (gameType === 'attention') {
      const [accuracy, level, difficultySettings] = additionalData;
      sessionData = { ...sessionData, duration: difficultySettings?.duration || 60, accuracy: accuracy ? Math.round(accuracy) : undefined, correctAnswers: level, difficultySettings };
    } else if (gameType === 'speed') {
      const [correct, total, difficultySettings] = additionalData;
      sessionData = { ...sessionData, duration: (difficultySettings?.timePerQuestion || 8) * (difficultySettings?.totalQuestions || 10), correctAnswers: correct, totalAttempts: total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, difficultySettings };
    }

    gameSessionMutation.mutate(sessionData);
    setActiveGame(null);
  };

  const handleLogout = () => { window.location.href = "/api/logout"; };
  const handleUpgrade = () => { setLocation("/subscribe"); };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const todaysGames = [
    {
      icon: "fa-puzzle-piece",
      title: "Memory Card Game",
      description: "Flip cards to find matching pairs and improve your visual memory",
      duration: "5 min",
      difficulty: "medium" as const,
      gameType: "memory",
    },
    {
      icon: "fa-brain",
      title: "Logic Puzzle",
      description: "Complete sequences and patterns to enhance reasoning skills",
      duration: "3 min",
      difficulty: "easy" as const,
      gameType: "logic",
    },
    {
      icon: "fa-crosshairs",
      title: "Attention Game",
      description: "React quickly to target objects to improve focus and attention",
      duration: "4 min",
      difficulty: "hard" as const,
      gameType: "attention",
    },
    {
      icon: "fa-calculator",
      title: "Speed Math",
      description: "Rapid-fire mental arithmetic to boost processing speed",
      duration: "2 min",
      difficulty: "medium" as const,
      gameType: "speed",
    },
  ];

  const planItems = [
    { gameType: 'memory', label: 'Memory training', duration: '5 min', color: 'bg-chart-1' },
    { gameType: 'logic', label: 'Logic puzzles', duration: '3 min', color: 'bg-chart-2' },
    { gameType: 'attention', label: 'Attention focus', duration: '4 min', color: 'bg-chart-3' },
    { gameType: 'speed', label: 'Speed math', duration: '2 min', color: 'bg-chart-4' },
  ];

  const completedCount = planItems.filter(p => todayCompleted.includes(p.gameType)).length;

  // Render active game
  if (activeGame) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {activeGame === 'memory' && (
            <MemoryGame
              onGameComplete={(score, moves, time, accuracy, ds) => handleGameComplete('memory', score, moves, time, accuracy, ds)}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === 'logic' && (
            <LogicPuzzle
              onGameComplete={(score, correct, total, duration, ds) => handleGameComplete('logic', score, correct, total, duration, ds)}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === 'attention' && (
            <AttentionGame
              onGameComplete={(score, accuracy, level, ds) => handleGameComplete('attention', score, accuracy, level, ds)}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === 'speed' && (
            <SpeedMathGame
              onGameComplete={(score, correct, total, ds) => handleGameComplete('speed', score, correct, total, ds)}
              onClose={() => setActiveGame(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}
      <Confetti active={showConfetti} />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-brain text-2xl text-primary"></i>
              <span className="text-xl font-bold">BrainBoost</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-muted-foreground text-sm" data-testid="text-welcome">
                Welcome, {(user as any)?.firstName || (user as any)?.email || 'User'}!
              </span>
              {!(user as any)?.isPremium && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUpgrade}
                  className="hidden sm:flex items-center gap-1 border-primary/50 text-primary hover:bg-primary/10"
                >
                  <i className="fas fa-crown text-xs"></i>
                  Upgrade
                </Button>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Your Training Dashboard</h1>
            <p className="text-muted-foreground">Keep building — every session counts.</p>
          </div>
          {(user as any)?.isPremium && (
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
              <i className="fas fa-crown text-xs"></i>
              Premium
            </Badge>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="fas fa-fire"
            iconColor="text-orange-500"
            badge={`${stats?.streak || 0} day streak`}
            badgeColor="bg-orange-500/10 text-orange-500"
            value={stats?.streak || 0}
            label="Day Streak"
            testId="stat-streak"
            isLoading={statsLoading}
          />
          <StatCard
            icon="fas fa-trophy"
            iconColor="text-chart-4"
            badge={
              weeklyProgress
                ? (() => {
                    const avg = Math.round(
                      (weeklyProgress.memory + weeklyProgress.logic + weeklyProgress.attention + weeklyProgress.speed) / 4
                    );
                    return avg > 0 ? `+${avg}% this week` : avg < 0 ? `${avg}% this week` : 'All-time';
                  })()
                : 'All-time'
            }
            badgeColor="bg-chart-4/10 text-chart-4"
            value={(stats?.totalScore || 0).toLocaleString()}
            label="Total Score"
            testId="stat-score"
            isLoading={statsLoading}
          />
          <StatCard
            icon="fas fa-brain"
            iconColor="text-primary"
            badge="Adaptive"
            badgeColor="bg-primary/10 text-primary"
            value={`Level ${stats?.level || 1}`}
            label="Current Level"
            testId="stat-level"
            isLoading={statsLoading}
          />
          <StatCard
            icon="fas fa-clock"
            iconColor="text-chart-3"
            badge={`${stats?.sessionsPlayed || 0} sessions`}
            badgeColor="bg-chart-3/10 text-chart-3"
            value={`${stats?.trainingTime || 0}m`}
            label="Training Time"
            testId="stat-time"
            isLoading={statsLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Games Section */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Today's Training</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {todaysGames.map((game) => (
                  <div key={game.gameType} className="relative">
                    {todayCompleted.includes(game.gameType) && (
                      <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-chart-3 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                    <GameCard
                      icon={game.icon}
                      title={game.title}
                      description={game.description}
                      duration={game.duration}
                      difficulty={game.difficulty}
                      onPlay={() => handlePlayGame(game.gameType)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sessions */}
            <div>
              <h2 className="text-xl font-bold mb-4">Recent Sessions</h2>
              <Card className="premium-shadow">
                <CardContent className="p-4">
                  {!recentSessions || recentSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-gamepad text-3xl mb-3 opacity-30"></i>
                      <p className="text-sm">No sessions yet — play a game to get started!</p>
                    </div>
                  ) : (
                    <div>
                      {recentSessions.slice(0, 8).map(session => (
                        <RecentGameRow key={session.id} session={session} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Your Progress</h2>

            {/* Performance Trend Chart */}
            <ProgressChart
              data={weeklyProgress || { memory: 0, logic: 0, attention: 0, speed: 0 }}
              isLoading={weeklyLoading}
            />

            {/* Today's Training Plan */}
            <Card className="premium-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-card-foreground">Today's Plan</CardTitle>
                  <span className="text-xs text-muted-foreground">{completedCount}/{planItems.length} done</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full mt-2">
                  <div
                    className="h-full bg-chart-3 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / planItems.length) * 100}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2.5">
                  {planItems.map(item => {
                    const done = todayCompleted.includes(item.gameType);
                    return (
                      <div
                        key={item.gameType}
                        className={`flex items-center gap-3 py-1 transition-opacity ${done ? 'opacity-60' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-chart-3' : item.color}`}></div>
                        <span className={`text-sm flex-1 ${done ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                          {item.label} ({item.duration})
                        </span>
                        {done && <i className="fas fa-check text-chart-3 text-xs"></i>}
                      </div>
                    );
                  })}
                </div>

                {completedCount === planItems.length && (
                  <div className="mt-4 p-3 bg-chart-3/10 rounded-xl text-center">
                    <div className="text-chart-3 font-semibold text-sm">🎉 Daily goal complete!</div>
                    <div className="text-xs text-muted-foreground">Come back tomorrow to keep your streak</div>
                  </div>
                )}

                {!(user as any)?.isPremium && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <GradientButton
                      onClick={handleUpgrade}
                      className="w-full py-3 rounded-xl font-medium"
                      data-testid="button-upgrade-premium"
                    >
                      <i className="fas fa-crown mr-2"></i>
                      Upgrade to Premium
                    </GradientButton>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Unlock advanced analytics & all games
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
