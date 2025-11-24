import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

interface LogicPuzzleProps {
  onGameComplete: (score: number, correct: number, total: number, difficultySettings?: any) => void;
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

  // Fetch adaptive difficulty settings
  const { data: difficultyData } = useQuery<{ 
    sequenceLength: number;
    complexityLevel: number;
    totalRounds: number;
  }>({
    queryKey: ['/api/difficulty/logic'],
  });

  const totalRounds = difficultyData?.totalRounds || 8;
  const sequenceLength = difficultyData?.sequenceLength || 4;
  const complexity = difficultyData?.complexityLevel || 1;

  const generateShapePattern = (): Puzzle => {
    const patternLength = Math.min(sequenceLength, SHAPES.length - 1);
    
    const patterns = [
      // Repeating pattern
      () => {
        const baseLength = Math.max(2, Math.floor(patternLength / 2));
        const base = SHAPES.slice(0, baseLength);
        const sequence = [...base, ...base].slice(0, patternLength);
        return {
          sequence,
          correctAnswer: base[0],
          pattern: "Repeating sequence"
        };
      },
      // Alternating pattern
      () => {
        const shape1 = SHAPES[0];
        const shape2 = SHAPES[1];
        const sequence = Array.from({ length: patternLength }, (_, i) => 
          i % 2 === 0 ? shape1 : shape2
        );
        return {
          sequence,
          correctAnswer: patternLength % 2 === 0 ? shape1 : shape2,
          pattern: "Alternating pattern"
        };
      },
      // Sequential progression
      () => {
        const sequence = SHAPES.slice(0, patternLength);
        return {
          sequence,
          correctAnswer: SHAPES[patternLength] || SHAPES[0],
          pattern: "Sequential progression"
        };
      }
    ];

    // Use more complex patterns at higher complexity levels
    const availablePatterns = patterns.slice(0, Math.min(complexity, patterns.length));
    const generator = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
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
    const patternLength = Math.min(sequenceLength, 6);
    
    const patterns = [
      // Arithmetic sequence
      () => {
        const start = Math.floor(Math.random() * 5) + 1;
        const diff = Math.max(1, complexity); // Higher complexity = bigger jumps
        const sequence = Array.from({ length: patternLength }, (_, i) => (start + i * diff).toString());
        return {
          sequence,
          correctAnswer: (start + patternLength * diff).toString(),
          pattern: "Arithmetic sequence"
        };
      },
      // Fibonacci-like
      () => {
        const fib = [1, 1];
        for (let i = 2; i < patternLength; i++) {
          fib.push(fib[i - 1] + fib[i - 2]);
        }
        return {
          sequence: fib.map(String),
          correctAnswer: (fib[fib.length - 1] + fib[fib.length - 2]).toString(),
          pattern: "Fibonacci sequence"
        };
      },
      // Even/Odd/Skip pattern
      () => {
        const start = 2;
        const step = complexity + 1; // Higher complexity = bigger steps
        const sequence = Array.from({ length: patternLength }, (_, i) => (start + i * step).toString());
        return {
          sequence,
          correctAnswer: (start + patternLength * step).toString(),
          pattern: complexity > 1 ? "Skip counting" : "Even numbers"
        };
      }
    ];

    // Use more complex patterns at higher complexity levels
    const availablePatterns = patterns.slice(0, Math.min(complexity, patterns.length));
    const generator = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
    const result = generator();
    
    // Generate wrong options based on common mistakes
    const correctNum = parseInt(result.correctAnswer);
    const wrongOptions = [
      (correctNum + 1).toString(),
      (correctNum - 1).toString(),
      (correctNum * 2).toString()
    ].filter(num => num !== result.correctAnswer && !result.sequence.includes(num))
     .slice(0, 2);
    
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
      onGameComplete(score, correctAnswers, totalRounds, difficultyData);
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

  // Show loading state while fetching difficulty settings
  if (!difficultyData) {
    return (
      <Card className="w-full max-w-2xl mx-auto premium-shadow">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="text-4xl">🧠</div>
            <p className="text-muted-foreground">Loading adaptive difficulty...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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