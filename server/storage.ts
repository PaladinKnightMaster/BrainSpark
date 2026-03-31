import {
  users,
  gameSessions,
  userProgress,
  trainingPlans,
  type User,
  type UpsertUser,
  type GameSession,
  type InsertGameSession,
  type UserProgress,
  type InsertUserProgress,
  type TrainingPlan,
} from "@shared/schema";
import { DifficultyCalculator, type PerformanceMetrics, type DifficultySettings } from "@shared/difficulty-calculator";
import { db } from "./db";
import { eq, desc, and, sql, gte, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  
  // Game operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getUserGameSessions(userId: string, limit?: number): Promise<GameSession[]>;
  
  // Progress operations
  getUserProgress(userId: string): Promise<UserProgress[]>;
  upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  getUserStats(userId: string): Promise<{
    totalScore: number;
    streak: number;
    level: number;
    trainingTime: number;
    sessionsPlayed: number;
  }>;
  getWeeklyProgress(userId: string): Promise<{
    memory: number;
    logic: number;
    attention: number;
    speed: number;
  }>;
  getTodayCompletedGames(userId: string): Promise<string[]>;
  
  // Training plans
  getUserTrainingPlan(userId: string): Promise<TrainingPlan | undefined>;
  createDefaultTrainingPlan(userId: string): Promise<TrainingPlan>;
  
  // Adaptive difficulty
  getUserPerformanceMetrics(userId: string, gameType: string): Promise<PerformanceMetrics>;
  getDifficultySettings(userId: string, gameType: string): Promise<DifficultySettings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPremium: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const [gameSession] = await db
      .insert(gameSessions)
      .values(session)
      .returning();
    return gameSession;
  }

  async getUserGameSessions(userId: string, limit = 10): Promise<GameSession[]> {
    return await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.completedAt))
      .limit(limit);
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [userProg] = await db
      .insert(userProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.gameType],
        set: {
          ...progress,
          totalScore: sql`${userProgress.totalScore} + ${progress.totalScore || 0}`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return userProg;
  }

  async getUserStats(userId: string): Promise<{
    totalScore: number;
    streak: number;
    level: number;
    trainingTime: number;
    sessionsPlayed: number;
  }> {
    const progressData = await this.getUserProgress(userId);
    const sessions = await this.getUserGameSessions(userId, 100);
    
    const totalScore = progressData.reduce((sum, p) => sum + (p.totalScore || 0), 0);
    const maxStreak = Math.max(...progressData.map(p => p.streak || 0), 0);
    const avgLevel = progressData.length > 0 
      ? Math.round(progressData.reduce((sum, p) => sum + (p.currentLevel || 1), 0) / progressData.length)
      : 1;
    const trainingTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    
    return {
      totalScore,
      streak: maxStreak,
      level: avgLevel,
      trainingTime: Math.round(trainingTime / 60),
      sessionsPlayed: sessions.length,
    };
  }

  async getWeeklyProgress(userId: string): Promise<{
    memory: number;
    logic: number;
    attention: number;
    speed: number;
  }> {
    // Get all sessions for this user, ordered newest first
    const allSessions = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.completedAt))
      .limit(50);

    const gameTypes = ['memory', 'logic', 'attention', 'speed'];
    const result: Record<string, number> = { memory: 0, logic: 0, attention: 0, speed: 0 };

    for (const gameType of gameTypes) {
      const typeSessions = allSessions.filter(s => s.gameType === gameType);
      if (typeSessions.length < 2) {
        // New to this game — show a positive baseline
        result[gameType] = typeSessions.length === 1 ? 5 : 0;
        continue;
      }

      // Compare recent 3 sessions vs previous 3 sessions by accuracy
      const recent = typeSessions.slice(0, Math.min(3, Math.floor(typeSessions.length / 2)));
      const older = typeSessions.slice(recent.length, recent.length * 2);

      const avgRecent = recent.reduce((s, g) => s + (g.accuracy || 70), 0) / recent.length;
      const avgOlder = older.reduce((s, g) => s + (g.accuracy || 70), 0) / older.length;

      if (avgOlder === 0) {
        result[gameType] = 0;
      } else {
        result[gameType] = Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
      }
    }

    return result as { memory: number; logic: number; attention: number; speed: number };
  }

  async getTodayCompletedGames(userId: string): Promise<string[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await db
      .select({ gameType: gameSessions.gameType })
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          gte(gameSessions.completedAt, todayStart),
          lt(gameSessions.completedAt, todayEnd)
        )
      );

    return [...new Set(todaySessions.map(s => s.gameType))];
  }

  async getUserTrainingPlan(userId: string): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)));
    return plan;
  }

  async createDefaultTrainingPlan(userId: string): Promise<TrainingPlan> {
    const defaultGames = [
      { type: 'memory', duration: 5, difficulty: 'medium' },
      { type: 'logic', duration: 3, difficulty: 'easy' },
      { type: 'attention', duration: 4, difficulty: 'medium' },
      { type: 'speed', duration: 2, difficulty: 'easy' },
    ];

    const [plan] = await db
      .insert(trainingPlans)
      .values({
        userId,
        planName: 'Personalized Training',
        description: 'AI-powered daily training routine customized to your goals',
        games: defaultGames,
      })
      .returning();
    return plan;
  }

  async getUserPerformanceMetrics(userId: string, gameType: string): Promise<PerformanceMetrics> {
    const recentSessions = await db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.userId, userId), eq(gameSessions.gameType, gameType)))
      .orderBy(desc(gameSessions.completedAt))
      .limit(10);

    if (recentSessions.length === 0) {
      return {
        accuracy: 0.7,
        avgTime: 60,
        streak: 0,
        recentGames: 0
      };
    }

    const totalAccuracy = recentSessions.reduce((sum, session) => sum + (session.accuracy || 70), 0);
    const avgAccuracy = totalAccuracy / recentSessions.length / 100;

    const totalTime = recentSessions.reduce((sum, session) => sum + session.duration, 0);
    const avgTime = totalTime / recentSessions.length;

    let streak = 0;
    for (const session of recentSessions) {
      if ((session.accuracy || 0) >= 70) {
        streak++;
      } else {
        break;
      }
    }

    return {
      accuracy: avgAccuracy,
      avgTime,
      streak,
      recentGames: recentSessions.length
    };
  }

  async getDifficultySettings(userId: string, gameType: string): Promise<DifficultySettings> {
    const metrics = await this.getUserPerformanceMetrics(userId, gameType);
    return DifficultyCalculator.calculateDifficulty(gameType, metrics);
  }
}

export const storage = new DatabaseStorage();
