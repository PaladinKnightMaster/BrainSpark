import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGameSessionSchema, insertUserProgressSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game session routes
  app.post('/api/game-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertGameSessionSchema.parse({ ...req.body, userId });
      const session = await storage.createGameSession(sessionData);
      
      // Calculate level from performance metrics instead of difficulty label
      let currentLevel = 1;
      if (sessionData.accuracy) {
        // Adaptive level based on accuracy
        if (sessionData.accuracy >= 90) currentLevel = 5;
        else if (sessionData.accuracy >= 80) currentLevel = 4;
        else if (sessionData.accuracy >= 70) currentLevel = 3;
        else if (sessionData.accuracy >= 60) currentLevel = 2;
        else currentLevel = 1;
      } else {
        // Fallback to difficulty label if no accuracy
        currentLevel = sessionData.difficulty === 'easy' ? 1 : sessionData.difficulty === 'medium' ? 2 : 3;
      }
      
      // Update user progress
      const progressUpdate = {
        userId,
        gameType: sessionData.gameType,
        currentLevel,
        totalScore: sessionData.score,
        streak: sessionData.accuracy && sessionData.accuracy >= 70 ? 1 : 0,
        lastPlayedAt: new Date(),
      };
      
      await storage.upsertUserProgress(progressUpdate);
      
      res.json(session);
    } catch (error) {
      console.error("Error creating game session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get('/api/game-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getUserGameSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching game sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Progress routes
  app.get('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Weekly progress per game
  app.get('/api/stats/weekly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekly = await storage.getWeeklyProgress(userId);
      res.json(weekly);
    } catch (error) {
      console.error("Error fetching weekly progress:", error);
      res.status(500).json({ message: "Failed to fetch weekly progress" });
    }
  });

  // Today's completed games
  app.get('/api/stats/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completed = await storage.getTodayCompletedGames(userId);
      res.json({ completed });
    } catch (error) {
      console.error("Error fetching today's completions:", error);
      res.status(500).json({ message: "Failed to fetch today's completions" });
    }
  });

  // Get adaptive difficulty settings for a game
  app.get("/api/difficulty/:gameType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const gameType = req.params.gameType;
      const allSettings = await storage.getDifficultySettings(userId, gameType);
      
      // Extract only the specific game's settings
      let gameSettings;
      if (gameType === 'memory') {
        gameSettings = allSettings.memory;
      } else if (gameType === 'logic') {
        gameSettings = allSettings.logic;
      } else if (gameType === 'attention') {
        gameSettings = allSettings.attention;
      } else if (gameType === 'speed') {
        gameSettings = allSettings.speed;
      } else {
        return res.status(400).json({ message: "Invalid game type" });
      }
      
      res.json(gameSettings);
    } catch (error) {
      console.error("Error fetching difficulty settings:", error);
      res.status(500).json({ message: "Failed to fetch difficulty settings" });
    }
  });

  // Get user performance metrics for a game
  app.get("/api/performance/:gameType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const gameType = req.params.gameType;
      const metrics = await storage.getUserPerformanceMetrics(userId, gameType);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Training plan routes
  app.get('/api/training-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let plan = await storage.getUserTrainingPlan(userId);
      
      if (!plan) {
        plan = await storage.createDefaultTrainingPlan(userId);
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching training plan:", error);
      res.status(500).json({ message: "Failed to fetch training plan" });
    }
  });

  // Stripe subscription route
  if (stripe) {
    app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          const latestInvoice = subscription.latest_invoice as any;
          return res.json({
            subscriptionId: subscription.id,
            clientSecret: latestInvoice?.payment_intent?.client_secret,
          });
        }
        
        if (!user.email) {
          return res.status(400).json({ message: 'No user email on file' });
        }

        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: process.env.STRIPE_PRICE_ID || 'price_premium_monthly',
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(userId, customer.id, subscription.id);
    
        const latestInvoice = subscription.latest_invoice as any;
        res.json({
          subscriptionId: subscription.id,
          clientSecret: latestInvoice?.payment_intent?.client_secret,
        });
      } catch (error: any) {
        console.error("Stripe error:", error);
        res.status(400).json({ error: { message: error.message } });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
