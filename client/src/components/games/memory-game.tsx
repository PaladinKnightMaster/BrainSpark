import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

interface MemoryCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  onGameComplete: (score: number, moves: number, time: number, accuracy: number, difficultySettings: any) => void;
  onClose: () => void;
}

const CARD_VALUES = ["🎮", "🧠", "🎯", "⚡", "🔥", "💎", "🚀", "⭐", "🌟", "💫", "🎨", "🎪"];

const MEMORY_BEST_KEY = "brainboost_best_memory";

function getEncouragement(accuracy: number): string {
  if (accuracy >= 90) return "Incredible memory! You're in the top tier. 🏆";
  if (accuracy >= 70) return "Great job! Your memory is getting sharper. 💪";
  return "Keep practicing — every session builds your memory. 🌱";
}

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const step = Math.ceil(target / 30);
    const interval = setInterval(() => {
      setDisplay(prev => {
        const next = prev + step;
        if (next >= target) { clearInterval(interval); return target; }
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{display}</span>;
}

function MemoryResultScreen({ score, moves, time, accuracy, onPlayAgain, onClose }: {
  score: number; moves: number; time: number; accuracy: number;
  onPlayAgain: () => void; onClose: () => void;
}) {
  const prev = parseInt(localStorage.getItem(MEMORY_BEST_KEY) || "0", 10);
  const isNewBest = score > prev;
  useEffect(() => {
    if (isNewBest) localStorage.setItem(MEMORY_BEST_KEY, String(score));
  }, []);

  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-5xl">{accuracy >= 90 ? "🏆" : accuracy >= 70 ? "🎉" : "💪"}</div>
      <div>
        <h3 className="text-2xl font-bold text-primary mb-1">Congratulations!</h3>
        <p className="text-muted-foreground text-sm">{getEncouragement(accuracy)}</p>
      </div>
      {isNewBest && (
        <div className="inline-flex items-center gap-2 bg-chart-4/15 text-chart-4 px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
          ⭐ New Personal Best!
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-primary/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary"><AnimatedScore target={score} /></div>
          <div className="text-xs text-muted-foreground mt-1">Score</div>
        </div>
        <div className="bg-chart-3/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-chart-3">{moves}</div>
          <div className="text-xs text-muted-foreground mt-1">Moves</div>
        </div>
        <div className="bg-chart-2/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-chart-2">{accuracy}%</div>
          <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
        </div>
      </div>
      {!isNewBest && prev > 0 && (
        <p className="text-xs text-muted-foreground">Personal best: {prev} pts</p>
      )}
      <div className="flex gap-3 justify-center">
        <GradientButton onClick={onPlayAgain} data-testid="button-restart-memory">
          <i className="fas fa-redo mr-2"></i>Play Again
        </GradientButton>
        <Button variant="outline" onClick={onClose} data-testid="button-back-dashboard">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

export function MemoryGame({ onGameComplete, onClose }: MemoryGameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [gameTime, setGameTime] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const previewStartRef = useRef<number>(Date.now());
  const gameCompletedRef = useRef(false);

  const { data: difficultySettings, isLoading } = useQuery<{
    cardPairs: number;
    previewTime: number;
  }>({
    queryKey: ['/api/difficulty/memory'],
  });

  const cardPairs = difficultySettings?.cardPairs || 4;
  const previewTime = difficultySettings?.previewTime || 3;

  const initializeGame = useCallback(() => {
    if (!difficultySettings) return;

    const cardsToUse = CARD_VALUES.slice(0, cardPairs);
    const shuffledValues = [...cardsToUse, ...cardsToUse]
      .sort(() => Math.random() - 0.5);

    const newCards = shuffledValues.map((value, index) => ({
      id: index,
      value,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(newCards);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsGameComplete(false);
    setGameTime(0);
    setShowPreview(true);
    gameCompletedRef.current = false;

    // Reset preview start time so countdown is correct after restart
    previewStartRef.current = Date.now();

    setTimeout(() => {
      setShowPreview(false);
    }, previewTime * 1000);
  }, [cardPairs, previewTime, difficultySettings]);

  useEffect(() => {
    if (!isLoading && difficultySettings) {
      initializeGame();
    }
  }, [initializeGame, difficultySettings, isLoading]);

  // Game timer
  useEffect(() => {
    if (!isGameComplete) {
      const interval = setInterval(() => {
        setGameTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, isGameComplete]);

  const handleCardClick = (cardId: number) => {
    if (showPreview || flippedCards.length === 2 || cards[cardId].isFlipped || cards[cardId].isMatched) {
      return;
    }

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);

      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ));
          setMatchedPairs(prev => prev + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  // FIX: guard with matchedPairs > 0 and !isGameComplete to prevent double-fire
  // when parent re-renders (new onGameComplete ref) after mutation success
  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === cardPairs && !isGameComplete && !gameCompletedRef.current) {
      gameCompletedRef.current = true;
      setIsGameComplete(true);
      const finalTime = Math.floor((Date.now() - startTime) / 1000);
      const score = Math.max(1000 - (moves * 10) - (finalTime * 2), 100);
      const accuracy = matchedPairs / Math.max(moves, 1) * 100;
      onGameComplete(score, moves, finalTime, accuracy, difficultySettings || { cardPairs, previewTime });
    }
  }, [matchedPairs, cardPairs, isGameComplete]);

  const restartGame = () => {
    initializeGame();
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto premium-shadow">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading adaptive difficulty...</p>
        </CardContent>
      </Card>
    );
  }

  // FIX: preview countdown uses previewStartRef instead of stale startTime
  const previewSecondsLeft = Math.max(0, Math.ceil((previewTime * 1000 - (Date.now() - previewStartRef.current)) / 1000));

  return (
    <Card className="w-full max-w-4xl mx-auto premium-shadow">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-puzzle-piece text-primary"></i>
            Memory Card Game
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full ml-2">
              {cardPairs} pairs
            </span>
          </div>
          <Button variant="ghost" onClick={onClose} data-testid="button-close-memory-game">
            <i className="fas fa-times"></i>
          </Button>
        </CardTitle>
        <div className="flex justify-center gap-8 text-sm text-muted-foreground">
          <div data-testid="memory-moves">Moves: {moves}</div>
          <div data-testid="memory-time">Time: {gameTime}s</div>
          <div data-testid="memory-pairs">Pairs: {matchedPairs}/{cardPairs}</div>
          {showPreview && <div className="text-primary">Preview: {previewSecondsLeft}s</div>}
        </div>
      </CardHeader>
      <CardContent>
        {isGameComplete ? (
          <MemoryResultScreen
            score={Math.max(1000 - (moves * 10) - (gameTime * 2), 100)}
            moves={moves}
            time={gameTime}
            accuracy={Math.round((matchedPairs / Math.max(moves, 1)) * 100)}
            onPlayAgain={restartGame}
            onClose={onClose}
          />
        ) : (
          <div className={`grid gap-4 mx-auto ${cardPairs <= 6 ? 'grid-cols-4 max-w-md' : cardPairs <= 8 ? 'grid-cols-4 max-w-lg' : 'grid-cols-6 max-w-2xl'}`}>
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  aspect-square rounded-lg border-2 transition-all duration-300 text-xl font-bold
                  ${card.isFlipped || card.isMatched || showPreview
                    ? 'bg-primary text-white border-primary shadow-lg'
                    : 'bg-muted hover:bg-muted/80 border-border hover:border-primary/50'
                  }
                  ${card.isMatched ? 'opacity-75' : ''}
                  ${showPreview ? 'pointer-events-none' : ''}
                `}
                disabled={card.isFlipped || card.isMatched || showPreview}
                data-testid={`memory-card-${card.id}`}
              >
                {card.isFlipped || card.isMatched || showPreview ? card.value : "?"}
              </button>
            ))}
          </div>
        )}

        {!isGameComplete && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={restartGame} data-testid="button-restart-memory-mid">
              <i className="fas fa-redo mr-2"></i>
              Restart Game
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
