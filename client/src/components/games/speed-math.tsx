import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GradientButton } from "@/components/ui/gradient-button";

interface SpeedMathProps {
  onGameComplete: (score: number, correct: number, total: number, difficultySettings: any) => void;
  onClose: () => void;
}

interface Question {
  a: number;
  b: number;
  operation: string;
  answer: number;
  display: string;
}

function generateQuestion(maxNumber: number, operations: string[]): Question {
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a = Math.floor(Math.random() * maxNumber) + 1;
  let b = Math.floor(Math.random() * maxNumber) + 1;
  let answer: number;
  let display: string;

  switch (op) {
    case 'subtract':
      if (b > a) [a, b] = [b, a];
      answer = a - b;
      display = `${a} − ${b}`;
      break;
    case 'multiply':
      a = Math.min(a, Math.max(2, Math.floor(maxNumber / 4)));
      b = Math.min(b, Math.max(2, Math.floor(maxNumber / 4)));
      answer = a * b;
      display = `${a} × ${b}`;
      break;
    case 'divide':
      answer = Math.floor(Math.random() * Math.min(a, 12)) + 1;
      b = Math.floor(Math.random() * Math.min(b, 12)) + 1;
      a = answer * b;
      display = `${a} ÷ ${b}`;
      break;
    default:
      answer = a + b;
      display = `${a} + ${b}`;
  }

  return { a, b, operation: op, answer, display };
}

export function SpeedMathGame({ onGameComplete, onClose }: SpeedMathProps) {
  const { data: difficultySettings, isLoading } = useQuery<{
    timePerQuestion: number;
    maxNumber: number;
    operationTypes: string[];
    totalQuestions: number;
  }>({
    queryKey: ['/api/difficulty/speed'],
  });

  const timePerQuestion = difficultySettings?.timePerQuestion || 8;
  const maxNumber = difficultySettings?.maxNumber || 10;
  const operationTypes = difficultySettings?.operationTypes || ['add'];
  const totalQuestions = difficultySettings?.totalQuestions || 10;

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ correct: boolean; question: string; userAnswer: string; correctAnswer: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextQuestion = useCallback(() => {
    if (!difficultySettings) return;
    const q = generateQuestion(maxNumber, operationTypes);
    setCurrentQuestion(q);
    setUserAnswer('');
    setTimeLeft(timePerQuestion);
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficultySettings, maxNumber, operationTypes, timePerQuestion]);

  const endGame = useCallback((finalCorrect: number, finalScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameOver(true);
  }, []);

  const handleAnswer = useCallback((answerStr: string, isTimeout = false) => {
    if (!currentQuestion || feedback || gameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const parsed = parseInt(answerStr, 10);
    const isCorrect = !isTimeout && !isNaN(parsed) && parsed === currentQuestion.answer;
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const timeBonus = isCorrect ? Math.max(0, Math.round((timeLeft / timePerQuestion) * 50)) : 0;
    const questionScore = isCorrect ? 100 + timeBonus : 0;
    const newScore = score + questionScore;

    setResults(prev => [...prev, {
      correct: isCorrect,
      question: currentQuestion.display,
      userAnswer: isTimeout ? 'Time!' : answerStr || '?',
      correctAnswer: currentQuestion.answer,
    }]);

    if (isCorrect) setCorrectCount(newCorrect);
    setScore(newScore);

    const nextIdx = questionIndex + 1;
    setQuestionIndex(nextIdx);

    setTimeout(() => {
      if (nextIdx >= totalQuestions) {
        endGame(newCorrect, newScore);
      } else {
        nextQuestion();
      }
    }, 600);
  }, [currentQuestion, feedback, gameOver, correctCount, score, timeLeft, timePerQuestion, questionIndex, totalQuestions, nextQuestion, endGame]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameOver || feedback || !currentQuestion) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer('', true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver, feedback, currentQuestion, handleAnswer]);

  const startGame = () => {
    if (!difficultySettings) return;
    setGameStarted(true);
    setGameOver(false);
    setQuestionIndex(0);
    setCorrectCount(0);
    setScore(0);
    setResults([]);
    setFeedback(null);
    nextQuestion();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer.trim()) handleAnswer(userAnswer.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim()) {
      handleAnswer(userAnswer.trim());
    }
  };

  const handleFinish = () => {
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    onGameComplete(score, correctCount, totalQuestions, difficultySettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Game Over Screen
  if (gameOver) {
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    return (
      <Card className="max-w-lg mx-auto premium-shadow">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Speed Math Complete! ⚡</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="bg-chart-3/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-chart-3">{correctCount}/{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="bg-accent/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-accent">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          <div className="text-left space-y-2 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.correct ? 'bg-chart-3/10' : 'bg-destructive/10'}`}>
                <span className="font-mono">{r.question} = {r.correctAnswer}</span>
                <span className={r.correct ? 'text-chart-3' : 'text-destructive'}>
                  {r.correct ? '✓' : `✗ (you: ${r.userAnswer})`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={startGame} className="flex-1">Play Again</Button>
            <GradientButton onClick={handleFinish} className="flex-1">Save & Continue</GradientButton>
          </div>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // Start Screen
  if (!gameStarted) {
    return (
      <Card className="max-w-lg mx-auto premium-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-calculator text-primary"></i>
              Speed Math
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-4">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-muted-foreground">
              Answer {totalQuestions} math questions as fast as you can!
              You have <strong>{timePerQuestion} seconds</strong> per question.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions</span>
              <span className="font-medium">{totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time per question</span>
              <span className="font-medium">{timePerQuestion}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operations</span>
              <span className="font-medium capitalize">{operationTypes.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max number</span>
              <span className="font-medium">{maxNumber}</span>
            </div>
          </div>
          <GradientButton onClick={startGame} className="w-full py-4 text-lg font-semibold">
            <i className="fas fa-play mr-2"></i>
            Start Game
          </GradientButton>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">Cancel</Button>
        </CardContent>
      </Card>
    );
  }

  // Active Game
  const timerPercent = (timeLeft / timePerQuestion) * 100;
  const timerColor = timerPercent > 50 ? 'bg-chart-3' : timerPercent > 25 ? 'bg-chart-4' : 'bg-destructive';

  return (
    <Card className="max-w-lg mx-auto premium-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-calculator text-primary"></i>
            Speed Math
          </CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{questionIndex}/{totalQuestions}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${timerColor}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Score: {score}</span>
          <span className={`font-bold ${timerPercent <= 25 ? 'text-destructive' : ''}`}>{timeLeft}s</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Question display */}
        <div className={`text-center py-8 rounded-2xl transition-all duration-200 ${
          feedback === 'correct' ? 'bg-chart-3/20' :
          feedback === 'wrong' ? 'bg-destructive/20' :
          'bg-muted/30'
        }`}>
          <div className="text-5xl font-bold font-mono mb-2">
            {currentQuestion?.display} = ?
          </div>
          {feedback && (
            <div className={`text-2xl font-bold mt-4 ${feedback === 'correct' ? 'text-chart-3' : 'text-destructive'}`}>
              {feedback === 'correct' ? '✓ Correct!' : `✗ Answer: ${currentQuestion?.answer}`}
            </div>
          )}
        </div>

        {/* Answer input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            type="number"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            className="text-center text-2xl font-mono h-16 text-lg"
            disabled={!!feedback}
            autoFocus
          />
          <GradientButton
            type="submit"
            className="w-full py-4 text-lg font-semibold"
            disabled={!userAnswer.trim() || !!feedback}
          >
            Submit Answer
          </GradientButton>
        </form>

        {/* Progress dots */}
        <div className="flex justify-center gap-1 flex-wrap">
          {results.map((r, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${r.correct ? 'bg-chart-3' : 'bg-destructive'}`}
            />
          ))}
          {Array.from({ length: totalQuestions - results.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-3 h-3 rounded-full bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
