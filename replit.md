# Brain Training Game Platform — BrainBoost

## Overview

A full-stack cognitive training platform featuring four brain games designed to improve memory, logic, attention, and processing speed. The application provides adaptive difficulty, real-time progress tracking, personalized training plans, and premium subscription features powered by Stripe.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Component-based architecture using React 18 with TypeScript for type safety
- **Vite Build System**: Fast development server and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Authentication Flow**: Session-based authentication with automatic redirects

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware for logging, error handling, and static file serving
- **Authentication System**: Replit OAuth integration with Passport.js strategy
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **API Structure**: Route-based organization with authentication middleware protection
- **Database Layer**: Drizzle ORM with type-safe schema definitions and query building

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless driver for connection pooling
- **Session Storage**: PostgreSQL table for persistent user sessions
- **Schema Design**: 
  - Users table with OAuth profile data and Stripe integration fields
  - Game sessions table tracking performance metrics
  - User progress table for skill development tracking
  - Training plans table for personalized workout routines

### Authentication and Authorization
- **OAuth Provider**: Replit OpenID Connect integration
- **Session Security**: HTTP-only cookies with CSRF protection
- **Route Protection**: Middleware-based authentication checks for API endpoints
- **User Management**: Automatic user creation/update on OAuth login

### Database Schema Design
- **Normalized Structure**: Separate tables for users, game sessions, progress tracking, and training plans
- **Performance Tracking**: Comprehensive metrics including score, difficulty, duration, and completion timestamps
- **Progress Analytics**: Aggregated statistics for skill development and streak tracking
- **Premium Features**: Stripe customer and subscription ID storage for payment integration

## Games Implemented

1. **Memory Card Game** — Flip cards to find matching pairs. Adaptive: card pairs (4–12), preview time (1–5s)
2. **Logic Puzzle** — Complete number/pattern sequences. Adaptive: sequence length, complexity, rounds
3. **Attention Game** — Click targets while avoiding distractors. Adaptive: spawn rate, target ratio, game speed
4. **Speed Math** — Answer arithmetic questions under time pressure. Adaptive: time per question, number range, operation types

## Key API Endpoints

- `GET /api/auth/user` — current authenticated user
- `POST /api/game-sessions` — save a completed game session
- `GET /api/game-sessions` — recent sessions (last 10)
- `GET /api/stats` — aggregate stats (score, streak, level, trainingTime, sessionsPlayed)
- `GET /api/stats/weekly` — per-game improvement % vs prior sessions
- `GET /api/stats/today` — which games were completed today
- `GET /api/progress` — per-game progress records
- `GET /api/difficulty/:gameType` — adaptive difficulty settings for a game
- `GET /api/performance/:gameType` — raw performance metrics
- `GET /api/training-plan` — user's active training plan
- `POST /api/create-subscription` — Stripe subscription creation

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Authentication**: OAuth 2.0 / OpenID Connect identity provider
- **Stripe Payment Processing**: Subscription management and payment handling

### Key Libraries and Frameworks
- **Frontend**: React, TypeScript, Vite, Wouter, TanStack Query, Radix UI, Tailwind CSS, Lucide Icons
- **Backend**: Express.js, Passport.js, Drizzle ORM, connect-pg-simple
- **Database**: @neondatabase/serverless, drizzle-orm, pg
- **Authentication**: openid-client, express-session, memoizee
- **Payment**: @stripe/stripe-js, @stripe/react-stripe-js
