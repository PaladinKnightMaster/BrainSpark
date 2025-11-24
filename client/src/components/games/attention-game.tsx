import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

interface GameObject {
  id: number;
  x: number;
  y: number;
  type: string;
  isTarget: boolean;
  speed: number;
}

interface AttentionGameProps {
  onGameComplete: (score: number, accuracy: number, level: number, difficultySettings?: any) => void;
  onClose: () => void;
}

const OBJECTS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⭐", "💎"];
const TARGET_OBJECT = "🔴"; // Red circle is the target

export function AttentionGame({ onGameComplete, onClose }: AttentionGameProps) {
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [correctClicks, setCorrectClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [lastSpawnTime, setLastSpawnTime] = useState(0);

  // Fetch adaptive difficulty settings
  const { data: difficultyData } = useQuery<{
    spawnRate: number;
    targetRatio: number;
    gameSpeed: number;
    duration: number;
  }>({
    queryKey: ['/api/difficulty/attention'],
  });

  const gameDuration = difficultyData?.duration || 60;
  // Convert spawnRate (objects per second) to spawn interval (milliseconds)
  const baseSpawnInterval = difficultyData?.spawnRate ? Math.max(200, 1000 / difficultyData.spawnRate) : 500;
  const targetFrequency = difficultyData?.targetRatio || 0.3;
  const baseGameSpeed = difficultyData?.gameSpeed || 1.0;

  const spawnInterval = Math.max(baseSpawnInterval - (level * 50), 200);
  const objectSpeed = baseGameSpeed * (1 + (level * 0.3)); // Apply adaptive game speed

  const spawnObject = useCallback(() => {
    const now = Date.now();
    if (now - lastSpawnTime < spawnInterval) return;

    const isTarget = Math.random() < targetFrequency;
    const objectType = isTarget ? TARGET_OBJECT : OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
    
    const newObject: GameObject = {
      id: now,
      x: Math.random() * 80 + 10, // 10-90% of container width
      y: Math.random() * 80 + 10, // 10-90% of container height
      type: objectType,
      isTarget,
      speed: objectSpeed,
    };

    setObjects(prev => [...prev, newObject]);
    setLastSpawnTime(now);
  }, [level, spawnInterval, objectSpeed, lastSpawnTime, targetFrequency]);

  // Game timer
  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isGameActive]);

  // Object spawning
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      spawnObject();
    }, 100);

    return () => clearInterval(interval);
  }, [isGameActive, spawnObject]);

  // Object movement and cleanup
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      setObjects(prev => prev.filter(obj => {
        // Remove objects that have been on screen too long
        const age = Date.now() - obj.id;
        return age < 3000; // Remove after 3 seconds
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [isGameActive]);

  const handleObjectClick = (obj: GameObject) => {
    setTotalClicks(prev => prev + 1);
    
    if (obj.isTarget) {
      setCorrectClicks(prev => prev + 1);
      setScore(prev => prev + (level * 10));
      
      // Level up every 10 correct clicks
      if ((correctClicks + 1) % 10 === 0) {
        setLevel(prev => prev + 1);
      }
    } else {
      setLives(prev => prev - 1);
      if (lives <= 1) {
        endGame();
        return;
      }
    }

    // Remove clicked object
    setObjects(prev => prev.filter(o => o.id !== obj.id));
  };

  const endGame = () => {
    setIsGameActive(false);
    setGameComplete(true);
    const accuracy = totalClicks > 0 ? Math.round((correctClicks / totalClicks) * 100) : 0;
    onGameComplete(score, accuracy, level, difficultyData);
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameComplete(false);
    setScore(0);
    setLevel(1);
    setLives(3);
    setTotalClicks(0);
    setCorrectClicks(0);
    setTimeLeft(gameDuration);
    setObjects([]);
  };

  const restartGame = () => {
    startGame();
  };

  // Show loading state while fetching difficulty settings
  if (!difficultyData) {
    return (
      <Card className="w-full max-w-4xl mx-auto premium-shadow">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="text-4xl">🎯</div>
            <p className="text-muted-foreground">Loading adaptive difficulty...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto premium-shadow">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-crosshairs text-primary"></i>
            Attention Game
          </div>
          <Button variant="ghost" onClick={onClose} data-testid="button-close-attention-game">
            <i className="fas fa-times"></i>
          </Button>
        </CardTitle>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <div data-testid="attention-score">Score: {score}</div>
          <div data-testid="attention-level">Level: {level}</div>
          <div data-testid="attention-lives">Lives: {lives}</div>
          <div data-testid="attention-time">Time: {timeLeft}s</div>
        </div>
      </CardHeader>
      <CardContent>
        {!isGameActive && !gameComplete ? (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎯</div>
            <h3 className="text-2xl font-bold">Attention Training</h3>
            <div className="space-y-2 text-muted-foreground max-w-md mx-auto">
              <p>Click only the <span className="text-2xl">🔴</span> red circles!</p>
              <p>Avoid clicking other objects or you'll lose a life.</p>
              <p>Objects appear faster as you level up.</p>
            </div>
            <GradientButton onClick={startGame} data-testid="button-start-attention">
              <i className="fas fa-play mr-2"></i>
              Start Game
            </GradientButton>
          </div>
        ) : gameComplete ? (
          <div className="text-center space-y-6">
            <div className="text-4xl">🎯</div>
            <h3 className="text-2xl font-bold text-primary">Game Over!</h3>
            <div className="space-y-2">
              <p>Final Score: <strong>{score}</strong></p>
              <p>Level Reached: <strong>{level}</strong></p>
              <p>Accuracy: <strong>{totalClicks > 0 ? Math.round((correctClicks / totalClicks) * 100) : 0}%</strong></p>
              <p>Targets Hit: <strong>{correctClicks}</strong></p>
            </div>
            <div className="flex gap-4 justify-center">
              <GradientButton onClick={restartGame} data-testid="button-restart-attention">
                <i className="fas fa-redo mr-2"></i>
                Play Again
              </GradientButton>
              <Button variant="outline" onClick={onClose} data-testid="button-back-dashboard-attention">
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Instructions */}
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Click the <span className="text-lg">🔴</span> red circles as fast as you can!
              </p>
            </div>

            {/* Game Area */}
            <div className="relative h-96 bg-muted/30 rounded-lg border-2 border-border overflow-hidden">
              {objects.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => handleObjectClick(obj)}
                  className="absolute w-12 h-12 flex items-center justify-center text-2xl transition-all duration-150 hover:scale-110 animate-pulse"
                  style={{
                    left: `${obj.x}%`,
                    top: `${obj.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  data-testid={`attention-object-${obj.isTarget ? 'target' : 'distractor'}`}
                >
                  {obj.type}
                </button>
              ))}
              
              {/* Target indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full text-sm font-medium">
                <span>Target:</span>
                <span className="text-lg">🔴</span>
              </div>
            </div>

            {/* Pause button */}
            <div className="text-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsGameActive(false)}
                data-testid="button-pause-attention"
              >
                <i className="fas fa-pause mr-2"></i>
                Pause
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}