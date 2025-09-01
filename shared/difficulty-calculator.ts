export interface PerformanceMetrics {
  accuracy: number; // 0-1
  avgTime: number; // seconds
  streak: number; // consecutive successes
  recentGames: number; // number of recent games
}

export interface DifficultySettings {
  memory: {
    cardPairs: number; // 4-12 pairs
    previewTime: number; // seconds to show cards initially
  };
  logic: {
    sequenceLength: number; // 3-8 items in sequence
    complexityLevel: number; // 1-5 complexity
    totalRounds: number; // 5-15 rounds
  };
  attention: {
    spawnRate: number; // objects per second
    targetRatio: number; // 0.2-0.4 ratio of targets
    gameSpeed: number; // movement speed multiplier
    duration: number; // game duration in seconds
  };
}

export class DifficultyCalculator {
  // Calculate Memory Game difficulty
  static calculateMemoryDifficulty(metrics: PerformanceMetrics): DifficultySettings['memory'] {
    const { accuracy, avgTime, streak } = metrics;
    
    // Base difficulty
    let cardPairs = 4;
    let previewTime = 3;
    
    // Adjust based on accuracy (0.7+ is good performance)
    if (accuracy >= 0.9 && streak >= 3) {
      cardPairs = Math.min(12, cardPairs + 3);
      previewTime = Math.max(1, previewTime - 1);
    } else if (accuracy >= 0.8 && streak >= 2) {
      cardPairs = Math.min(10, cardPairs + 2);
      previewTime = Math.max(1.5, previewTime - 0.5);
    } else if (accuracy >= 0.7) {
      cardPairs = Math.min(8, cardPairs + 1);
    } else if (accuracy < 0.5) {
      // Make it easier
      cardPairs = Math.max(3, cardPairs - 1);
      previewTime = Math.min(5, previewTime + 1);
    }
    
    // Adjust based on speed (faster completion = higher difficulty)
    if (avgTime < 30 && accuracy >= 0.7) {
      cardPairs = Math.min(12, cardPairs + 1);
    } else if (avgTime > 90) {
      cardPairs = Math.max(3, cardPairs - 1);
      previewTime = Math.min(5, previewTime + 0.5);
    }
    
    return { cardPairs, previewTime };
  }
  
  // Calculate Logic Puzzle difficulty
  static calculateLogicDifficulty(metrics: PerformanceMetrics): DifficultySettings['logic'] {
    const { accuracy, streak, recentGames } = metrics;
    
    // Base difficulty
    let sequenceLength = 4;
    let complexityLevel = 1;
    let totalRounds = 10;
    
    // Adjust based on accuracy and streak
    if (accuracy >= 0.9 && streak >= 5) {
      sequenceLength = Math.min(8, sequenceLength + 2);
      complexityLevel = Math.min(5, complexityLevel + 2);
      totalRounds = Math.min(15, totalRounds + 3);
    } else if (accuracy >= 0.8 && streak >= 3) {
      sequenceLength = Math.min(7, sequenceLength + 1);
      complexityLevel = Math.min(4, complexityLevel + 1);
      totalRounds = Math.min(12, totalRounds + 2);
    } else if (accuracy >= 0.7) {
      complexityLevel = Math.min(3, complexityLevel + 1);
    } else if (accuracy < 0.5) {
      // Make it easier
      sequenceLength = Math.max(3, sequenceLength - 1);
      complexityLevel = Math.max(1, complexityLevel - 1);
      totalRounds = Math.max(5, totalRounds - 2);
    }
    
    // Progressive difficulty for experienced players
    if (recentGames >= 10 && accuracy >= 0.8) {
      complexityLevel = Math.min(5, complexityLevel + 1);
    }
    
    return { sequenceLength, complexityLevel, totalRounds };
  }
  
  // Calculate Attention Game difficulty
  static calculateAttentionDifficulty(metrics: PerformanceMetrics): DifficultySettings['attention'] {
    const { accuracy, avgTime, streak } = metrics;
    
    // Base difficulty
    let spawnRate = 1.0; // objects per second
    let targetRatio = 0.3; // 30% targets
    let gameSpeed = 1.0;
    let duration = 60;
    
    // Adjust based on accuracy
    if (accuracy >= 0.9 && streak >= 5) {
      spawnRate = Math.min(3.0, spawnRate + 0.8);
      targetRatio = Math.max(0.2, targetRatio - 0.05);
      gameSpeed = Math.min(2.0, gameSpeed + 0.5);
    } else if (accuracy >= 0.8 && streak >= 3) {
      spawnRate = Math.min(2.5, spawnRate + 0.5);
      targetRatio = Math.max(0.25, targetRatio - 0.02);
      gameSpeed = Math.min(1.7, gameSpeed + 0.3);
    } else if (accuracy >= 0.7) {
      spawnRate = Math.min(2.0, spawnRate + 0.3);
      gameSpeed = Math.min(1.4, gameSpeed + 0.2);
    } else if (accuracy < 0.5) {
      // Make it easier
      spawnRate = Math.max(0.5, spawnRate - 0.3);
      targetRatio = Math.min(0.4, targetRatio + 0.05);
      gameSpeed = Math.max(0.7, gameSpeed - 0.2);
    }
    
    return { spawnRate, targetRatio, gameSpeed, duration };
  }
  
  // Get default difficulty for new users
  static getDefaultDifficulty(): DifficultySettings {
    return {
      memory: { cardPairs: 4, previewTime: 3 },
      logic: { sequenceLength: 4, complexityLevel: 1, totalRounds: 8 },
      attention: { spawnRate: 1.0, targetRatio: 0.3, gameSpeed: 1.0, duration: 60 }
    };
  }
  
  // Calculate overall difficulty settings based on game type and metrics
  static calculateDifficulty(gameType: string, metrics: PerformanceMetrics): DifficultySettings {
    const defaultSettings = this.getDefaultDifficulty();
    
    switch (gameType) {
      case 'memory':
        return {
          ...defaultSettings,
          memory: this.calculateMemoryDifficulty(metrics)
        };
      case 'logic':
        return {
          ...defaultSettings,
          logic: this.calculateLogicDifficulty(metrics)
        };
      case 'attention':
        return {
          ...defaultSettings,
          attention: this.calculateAttentionDifficulty(metrics)
        };
      default:
        return defaultSettings;
    }
  }
}