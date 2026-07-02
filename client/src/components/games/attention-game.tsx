import { useState, useEffect, useCallback, useRef } from "react";
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
const TARGET_OBJECT = "🔴";

const ATTENTION_BEST_KEY = "brainboost_best_attention";

function AttentionAnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const step = Math.ceil(target / 30);
    const iv = setInterval(() => {
      setDisplay(prev => { const n = prev + step; if (n >= target) { clearInterval(iv); return target; } return n; });
    }, 30);
    return () => clearInterval(iv);
  }, [target]);
  return <span>{display}</span>;
}

function AttentionResultScreen({ score, level, accuracy, targetsHit, onPlayAgain, onClose }: {
  score: number; level: number; accuracy: number; targetsHit: number;
  onPlayAgain: () => void; onClose: () => void;
}) {
  const prev = parseInt(localStorage.getItem(ATTENTION_BEST_KEY) || "0", 10);
  const isNewBest = score > prev;
  useEffect(() => { if (isNewBest) localStorage.setItem(ATTENTION_BEST_KEY, String(score)); }, []);
  const msg = accuracy >= 90 ? "Laser-sharp focus! Elite attention skills. 🎯" : accuracy >= 70 ? "Great focus! Your attention is improving. 💪" : "Attention improves with practice — keep it up! 🌱";

  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-5xl">{accuracy >= 90 ? "🏆" : accuracy >= 70 ? "🎯" : "💪"}</div>
      <div>
        <h3 className="text-2xl font-bold text-primary mb-1">Game Over!</h3>
        <p className="text-muted-foreground text-sm">{msg}</p>
      </div>
      {isNewBest && (
        <div className="inline-flex items-center gap-2 bg-chart-4/15 text-chart-4 px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
          ⭐ New Personal Best!
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary"><AttentionAnimatedScore target={score} /></div>
          <div className="text-xs text-muted-foreground mt-1">Score</div>
        </div>
        <div className="bg-chart-2/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-chart-2">Level {level}</div>
          <div className="text-xs text-muted-foreground mt-1">Reached</div>
        </div>
        <div className="bg-chart-3/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-chart-3">{accuracy}%</div>
          <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
        </div>
        <div className="bg-chart-4/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-chart-4">{targetsHit}</div>
          <div className="text-xs text-muted-foreground mt-1">Targets Hit</div>
        </div>
      </div>
      {!isNewBest && prev > 0 && <p className="text-xs text-muted-foreground">Personal best: {prev} pts</p>}
      <div className="flex gap-3 justify-center">
        <GradientButton onClick={onPlayAgain} data-testid="button-restart-attention">
          <i className="fas fa-redo mr-2"></i>Play Again
        </GradientButton>
        <Button variant="outline" onClick={onClose} data-testid="button-back-dashboard-attention">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

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

  // FIX: refs to prevent double-endGame and read accurate values from async contexts
  const gameCompleteRef = useRef(false);
  const scoreRef = useRef(0);
  const correctClicksRef = useRef(0);
  const totalClicksRef = useRef(0);
  const levelRef = useRef(1);

  const { data: difficultyData } = useQuery<{
    spawnRate: number;
    targetRatio: number;
    gameSpeed: number;
    duration: number;
  }>({
    queryKey: ['/api/difficulty/attention'],
  });

  const gameDuration = difficultyData?.duration || 60;
  const baseSpawnInterval = difficultyData?.spawnRate ? Math.max(200, 1000 / difficultyData.spawnRate) : 500;
  const targetFrequency = difficultyData?.targetRatio || 0.3;
  const baseGameSpeed = difficultyData?.gameSpeed || 1.0;

  const spawnInterval = Math.max(baseSpawnInterval - (level * 50), 200);
  const objectSpeed = baseGameSpeed * (1 + (level * 0.3));

  const spawnObject = useCallback(() => {
    const now = Date.now();
    if (now - lastSpawnTime < spawnInterval) return;

    const isTarget = Math.random() < targetFrequency;
    const objectType = isTarget ? TARGET_OBJECT : OBJECTS[Math.floor(Math.random() * OBJECTS.length)];

    const newObject: GameObject = {
      id: now,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      type: objectType,
      isTarget,
      speed: objectSpeed,
    };

    setObjects(prev => [...prev, newObject]);
    setLastSpawnTime(now);
  }, [level, spawnInterval, objectSpeed, lastSpawnTime, targetFrequency]);

  // FIX: endGame uses refs to read accurate final values; guard prevents double-call
  const endGame = useCallback(() => {
    if (gameCompleteRef.current) return;
    gameCompleteRef.current = true;
    setIsGameActive(false);
    setGameComplete(true);
    const finalTotal = totalClicksRef.current;
    const finalCorrect = correctClicksRef.current;
    const finalScore = scoreRef.current;
    const finalLevel = levelRef.current;
    const accuracy = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0;
    onGameComplete(finalScore, accuracy, finalLevel, difficultyData);
  }, [onGameComplete, difficultyData]);

  // Game timer
  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isGameActive && timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isGameActive, endGame]);

  // Object spawning
  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      spawnObject();
    }, 100);
    return () => clearInterval(interval);
  }, [isGameActive, spawnObject]);

  // Object cleanup
  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      setObjects(prev => prev.filter(obj => {
        const age = Date.now() - obj.id;
        return age < 3000;
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [isGameActive]);

  const handleObjectClick = (obj: GameObject) => {
    // FIX: compute new values locally before calling setters, so endGame receives correct values
    const newTotalClicks = totalClicksRef.current + 1;
    totalClicksRef.current = newTotalClicks;
    setTotalClicks(newTotalClicks);

    if (obj.isTarget) {
      const newCorrect = correctClicksRef.current + 1;
      const newScore = scoreRef.current + (levelRef.current * 10);
      correctClicksRef.current = newCorrect;
      scoreRef.current = newScore;
      setCorrectClicks(newCorrect);
      setScore(newScore);

      if (newCorrect % 10 === 0) {
        const newLevel = levelRef.current + 1;
        levelRef.current = newLevel;
        setLevel(newLevel);
      }
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        endGame();
        return;
      }
    }

    setObjects(prev => prev.filter(o => o.id !== obj.id));
  };

  const startGame = () => {
    gameCompleteRef.current = false;
    scoreRef.current = 0;
    correctClicksRef.current = 0;
    totalClicksRef.current = 0;
    levelRef.current = 1;
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
          <AttentionResultScreen
            score={score}
            level={level}
            accuracy={totalClicks > 0 ? Math.round((correctClicks / totalClicks) * 100) : 0}
            targetsHit={correctClicks}
            onPlayAgain={restartGame}
            onClose={onClose}
          />
        ) : (
          <div className="relative">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Click the <span className="text-lg">🔴</span> red circles as fast as you can!
              </p>
            </div>

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

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 dark:bg-black/80 px-3 py-1 rounded-full text-sm font-medium">
                <span>Target:</span>
                <span className="text-lg">🔴</span>
              </div>
            </div>

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
