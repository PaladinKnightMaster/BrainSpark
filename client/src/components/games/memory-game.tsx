import { useState, useEffect, useCallback } from "react";
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

export function MemoryGame({ onGameComplete, onClose }: MemoryGameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [gameTime, setGameTime] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  // Fetch adaptive difficulty settings from API
  const { data: difficultySettings, isLoading } = useQuery<{
    cardPairs: number;
    previewTime: number;
  }>({
    queryKey: ['/api/difficulty/memory'],
  });

  // Adaptive difficulty settings
  const cardPairs = difficultySettings?.cardPairs || 4;
  const previewTime = difficultySettings?.previewTime || 3;

  // Initialize cards
  const initializeGame = useCallback(() => {
    if (!difficultySettings) return;
    
    // Use adaptive number of card pairs
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
    
    // Show cards for preview time, then hide them
    setTimeout(() => {
      setShowPreview(false);
    }, previewTime * 1000);
  }, [cardPairs, previewTime, difficultySettings]);

  useEffect(() => {
    if (!isLoading && difficultySettings) {
      initializeGame();
    }
  }, [initializeGame, difficultySettings, isLoading]);

  // Update game time
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

    // Flip the card
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    // Check for match when two cards are flipped
    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      
      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        // Match found
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
        // No match - flip cards back
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

  // Check for game completion
  useEffect(() => {
    if (matchedPairs === cardPairs) {
      setIsGameComplete(true);
      const finalTime = Math.floor((Date.now() - startTime) / 1000);
      const score = Math.max(1000 - (moves * 10) - (finalTime * 2), 100);
      const accuracy = matchedPairs / Math.max(moves, 1) * 100; // Efficiency percentage
      onGameComplete(score, moves, finalTime, accuracy, difficultySettings || { cardPairs, previewTime });
    }
  }, [matchedPairs, cardPairs, moves, startTime, onGameComplete, difficultySettings]);

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
          {showPreview && <div className="text-primary">Preview: {Math.ceil((previewTime * 1000 - (Date.now() - startTime)) / 1000)}s</div>}
        </div>
      </CardHeader>
      <CardContent>
        {isGameComplete ? (
          <div className="text-center space-y-6">
            <div className="text-4xl">🎉</div>
            <h3 className="text-2xl font-bold text-primary">Congratulations!</h3>
            <div className="space-y-2">
              <p>Game completed in <strong>{moves} moves</strong></p>
              <p>Time: <strong>{gameTime} seconds</strong></p>
              <p>Score: <strong>{Math.max(1000 - (moves * 10) - (gameTime * 2), 100)}</strong></p>
            </div>
            <div className="flex gap-4 justify-center">
              <GradientButton onClick={restartGame} data-testid="button-restart-memory">
                <i className="fas fa-redo mr-2"></i>
                Play Again
              </GradientButton>
              <Button variant="outline" onClick={onClose} data-testid="button-back-dashboard">
                Back to Dashboard
              </Button>
            </div>
          </div>
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