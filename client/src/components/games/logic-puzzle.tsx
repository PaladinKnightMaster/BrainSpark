import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

interface LogicPuzzleProps {
  onGameComplete: (score: number, correct: number, total: number) => void;
  onClose: () => void;
}

interface Puzzle {
  sequence: string[];
  options: string[];
  correctAnswer: string;
  pattern: string;
}

const SHAPES = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function LogicPuzzle({ onGameComplete, onClose }: LogicPuzzleProps) {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime] = useState(Date.now());

  const totalRounds = 10;

  const generateShapePattern = (): Puzzle => {
    const patterns = [
      // Repeating pattern
      () => {
        const base = [SHAPES[0], SHAPES[1], SHAPES[2]];
        const sequence = [...base, ...base, base[0], base[1]];
        return {
          sequence,
          correctAnswer: base[2],
          pattern: "Repeating sequence"
        };
      },
      // Alternating pattern
      () => {
        const shape1 = SHAPES[0];
        const shape2 = SHAPES[1];
        const sequence = [shape1, shape2, shape1, shape2, shape1];
        return {
          sequence,
          correctAnswer: shape2,
          pattern: "Alternating pattern"
        };
      },
      // Color progression
      () => {
        const sequence = [SHAPES[0], SHAPES[1], SHAPES[2], SHAPES[3]];
        return {
          sequence,
          correctAnswer: SHAPES[4],
          pattern: "Sequential progression"
        };
      }
    ];

    const generator = patterns[Math.floor(Math.random() * patterns.length)];
    const result = generator();
    
    // Generate wrong options
    const wrongOptions = SHAPES.filter(shape => 
      shape !== result.correctAnswer && !result.sequence.includes(shape)
    ).slice(0, 2);
    
    const options = [result.correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

    return {
      sequence: result.sequence,
      options,
      correctAnswer: result.correctAnswer,
      pattern: result.pattern
    };
  };

  const generateNumberPattern = (): Puzzle => {
    const patterns = [
      // Arithmetic sequence
      () => {
        const start = Math.floor(Math.random() * 5) + 1;
        const diff = Math.floor(Math.random() * 3) + 1;
        const sequence = Array.from({ length: 4 }, (_, i) => (start + i * diff).toString());
        return {
          sequence,
          correctAnswer: (start + 4 * diff).toString(),
          pattern: "Arithmetic sequence"
        };
      },
      // Fibonacci-like
      () => {
        const sequence = ["1", "1", "2", "3"];
        return {
          sequence,
          correctAnswer: "5",
          pattern: "Fibonacci sequence"
        };
      },
      // Even/Odd pattern
      () => {
        const sequence = ["2", "4", "6", "8"];
        return {
          sequence,
          correctAnswer: "10",
          pattern: "Even numbers"
        };
      }
    ];

    const generator = patterns[Math.floor(Math.random() * patterns.length)];
    const result = generator();
    
    // Generate wrong options
    const wrongOptions = NUMBERS.filter(num => 
      num !== result.correctAnswer && !result.sequence.includes(num)
    ).slice(0, 2);
    
    const options = [result.correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

    return {
      sequence: result.sequence,
      options,
      correctAnswer: result.correctAnswer,
      pattern: result.pattern
    };
  };

  const generateNewPuzzle = () => {
    const puzzle = Math.random() > 0.5 ? generateShapePattern() : generateNumberPattern();
    setCurrentPuzzle(puzzle);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  useEffect(() => {
    generateNewPuzzle();
  }, [currentRound]);

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    const correct = answer === currentPuzzle?.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentRound >= totalRounds) {
      setGameComplete(true);
      const timeBonus = Math.max(0, 300 - Math.floor((Date.now() - startTime) / 1000));
      const score = correctAnswers * 100 + timeBonus;
      onGameComplete(score, correctAnswers, totalRounds);
    } else {
      setCurrentRound(prev => prev + 1);
    }
  };

  const restartGame = () => {
    setCurrentRound(1);
    setCorrectAnswers(0);
    setGameComplete(false);
    generateNewPuzzle();
  };

  if (!currentPuzzle) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto premium-shadow">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-brain text-primary"></i>
            Logic Puzzle
          </div>
          <Button variant="ghost" onClick={onClose} data-testid="button-close-logic-game">
            <i className="fas fa-times"></i>
          </Button>
        </CardTitle>
        <div className="flex justify-center gap-8 text-sm text-muted-foreground">
          <div data-testid="logic-round">Round: {currentRound}/{totalRounds}</div>
          <div data-testid="logic-score">Correct: {correctAnswers}</div>
        </div>
      </CardHeader>
      <CardContent>
        {gameComplete ? (
          <div className="text-center space-y-6">
            <div className="text-4xl">🧠</div>
            <h3 className="text-2xl font-bold text-primary">Game Complete!</h3>
            <div className="space-y-2">
              <p>Correct answers: <strong>{correctAnswers}/{totalRounds}</strong></p>
              <p>Accuracy: <strong>{Math.round((correctAnswers / totalRounds) * 100)}%</strong></p>
            </div>
            <div className="flex gap-4 justify-center">
              <GradientButton onClick={restartGame} data-testid="button-restart-logic">
                <i className="fas fa-redo mr-2"></i>
                Play Again
              </GradientButton>
              <Button variant="outline" onClick={onClose} data-testid="button-back-dashboard-logic">
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">What comes next in this sequence?</h3>
              
              {/* Sequence Display */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {currentPuzzle.sequence.map((item, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg border-2 border-border text-2xl font-bold"
                  >
                    {item}
                  </div>
                ))}
                <div className="text-2xl text-muted-foreground mx-2">→</div>
                <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-primary rounded-lg text-primary text-xl">
                  ?
                </div>
              </div>

              {/* Options */}
              <div className="flex justify-center gap-4 mb-6">
                {currentPuzzle.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-16 h-16 flex items-center justify-center rounded-lg border-2 transition-all text-2xl font-bold
                      ${selectedAnswer === option
                        ? showResult
                          ? option === currentPuzzle.correctAnswer
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-red-100 border-red-500 text-red-700'
                          : 'bg-primary text-white border-primary'
                        : 'bg-muted hover:bg-muted/80 border-border hover:border-primary/50'
                      }
                      ${showResult && option === currentPuzzle.correctAnswer && selectedAnswer !== option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : ''
                      }
                    `}
                    disabled={showResult}
                    data-testid={`logic-option-${index}`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Result */}
              {showResult && (
                <div className="space-y-4">
                  <div className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pattern: {currentPuzzle.pattern}
                  </p>
                  <GradientButton onClick={handleNext} data-testid="button-next-logic">
                    {currentRound >= totalRounds ? 'Finish Game' : 'Next Puzzle'}
                  </GradientButton>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}