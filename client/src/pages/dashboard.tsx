import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { GameCard } from "@/components/game-card";
import { ProgressChart } from "@/components/progress-chart";
import { MemoryGame } from "@/components/games/memory-game";
import { LogicPuzzle } from "@/components/games/logic-puzzle";
import { AttentionGame } from "@/components/games/attention-game";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

type ActiveGame = 'memory' | 'logic' | 'attention' | null;

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  // Redirect to home if not authenticated
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
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const { data: progress } = useQuery({
    queryKey: ["/api/progress"],
    enabled: isAuthenticated,
  });

  const gameSessionMutation = useMutation({
    mutationFn: async (gameData: { gameType: string; score: number; difficulty: string; duration: number }) => {
      await apiRequest("POST", "/api/game-sessions", gameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Game Completed!",
        description: "Your progress has been saved.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save game session.",
        variant: "destructive",
      });
    },
  });

  const handlePlayGame = (gameType: string, difficulty: string, duration: number) => {
    // Check if it's one of our mini-games
    if (gameType === 'memory' || gameType === 'logic' || gameType === 'attention') {
      setActiveGame(gameType);
      return;
    }
    
    // Simulate game play for other games
    const score = Math.floor(Math.random() * 1000) + 500;
    gameSessionMutation.mutate({ gameType, score, difficulty, duration });
  };

  const handleGameComplete = (gameType: string, score: number, ...additionalData: any[]) => {
    const difficulty = 'medium';
    const duration = Math.floor(Math.random() * 300) + 120; // 2-7 minutes
    gameSessionMutation.mutate({ gameType, score, difficulty, duration });
    setActiveGame(null);
  };

  const handleCloseGame = () => {
    setActiveGame(null);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleUpgrade = () => {
    setLocation("/subscribe");
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const progressData = {
    memory: 12,
    logic: 8,
    attention: 15,
  };

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
      description: "Quick mental arithmetic to boost processing speed",
      duration: "2 min",
      difficulty: "medium" as const,
      gameType: "speed",
    },
  ];

  // Render active game if one is selected
  if (activeGame) {
    return (
      <div className="min-h-screen bg-background p-8">
        {activeGame === 'memory' && (
          <MemoryGame
            onGameComplete={(score, moves, time) => handleGameComplete('memory', score, moves, time)}
            onClose={handleCloseGame}
          />
        )}
        {activeGame === 'logic' && (
          <LogicPuzzle
            onGameComplete={(score, correct, total) => handleGameComplete('logic', score, correct, total)}
            onClose={handleCloseGame}
          />
        )}
        {activeGame === 'attention' && (
          <AttentionGame
            onGameComplete={(score, accuracy, level) => handleGameComplete('attention', score, accuracy, level)}
            onClose={handleCloseGame}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-brain text-2xl text-primary"></i>
              <span className="text-xl font-bold">BrainBoost</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground" data-testid="text-welcome">
                Welcome, {(user as any)?.firstName || (user as any)?.email || 'User'}!
              </span>
              <ThemeToggle />
              <Button
                variant="ghost"
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Training Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and continue your cognitive training journey</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="premium-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <i className="fas fa-calendar-check text-2xl text-primary"></i>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {(stats as any)?.streak || 0} day streak
                </span>
              </div>
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-streak">
                {(stats as any)?.streak || 0}
              </div>
              <div className="text-muted-foreground text-sm">Day Streak</div>
            </CardContent>
          </Card>
          
          <Card className="premium-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <i className="fas fa-trophy text-2xl text-chart-4"></i>
                <span className="text-xs bg-chart-4/10 text-chart-4 px-2 py-1 rounded-full">+5% this week</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-score">
                {(stats as any)?.totalScore || 0}
              </div>
              <div className="text-muted-foreground text-sm">Total Score</div>
            </CardContent>
          </Card>
          
          <Card className="premium-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <i className="fas fa-brain text-2xl text-accent"></i>
                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">Advanced</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-level">
                Level {(stats as any)?.level || 1}
              </div>
              <div className="text-muted-foreground text-sm">Current Level</div>
            </CardContent>
          </Card>
          
          <Card className="premium-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <i className="fas fa-clock text-2xl text-chart-3"></i>
              </div>
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-time">
                {(stats as any)?.trainingTime || 0}m
              </div>
              <div className="text-muted-foreground text-sm">Training Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Games Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Today's Training</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {todaysGames.map((game, index) => (
                <GameCard
                  key={index}
                  icon={game.icon}
                  title={game.title}
                  description={game.description}
                  duration={game.duration}
                  difficulty={game.difficulty}
                  onPlay={() => handlePlayGame(game.gameType, game.difficulty, parseInt(game.duration))}
                />
              ))}
            </div>
          </div>

          {/* Progress Sidebar */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
            
            {/* Weekly Progress Chart */}
            <div className="mb-6">
              <ProgressChart data={progressData} />
            </div>

            {/* Training Plan */}
            <Card className="premium-shadow">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-card-foreground">Your Plan</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Memory training (5 min)</span>
                    <i className="fas fa-check text-chart-3 ml-auto"></i>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Logic puzzles (3 min)</span>
                    <i className="fas fa-check text-chart-3 ml-auto"></i>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Attention focus (4 min)</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border">
                  <GradientButton
                    onClick={handleUpgrade}
                    className="w-full py-3 rounded-xl font-medium"
                    data-testid="button-upgrade-premium"
                  >
                    Upgrade to Premium
                  </GradientButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
