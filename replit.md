# Brain Training Game Platform

## Overview

A full-stack cognitive training platform featuring brain games designed to improve memory, logic, attention, and problem-solving skills. The application provides adaptive difficulty, progress tracking, and personalized training plans with premium subscription features powered by Stripe integration.

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

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Authentication**: OAuth 2.0 / OpenID Connect identity provider
- **Stripe Payment Processing**: Subscription management and payment handling
- **Replit Development Tools**: Banner injection and cartographer for development environment

### Key Libraries and Frameworks
- **Frontend**: React, TypeScript, Vite, Wouter, TanStack Query, Radix UI, Tailwind CSS
- **Backend**: Express.js, Passport.js, Drizzle ORM, connect-pg-simple
- **Database**: @neondatabase/serverless, drizzle-orm, pg
- **Authentication**: openid-client, express-session, memoizee
- **Payment**: @stripe/stripe-js, @stripe/react-stripe-js
- **Development**: tsx, esbuild, various Replit plugins

### API Integrations
- **Replit OIDC**: User authentication and profile management
- **Stripe API**: Subscription creation, payment processing, and webhook handling
- **Internal APIs**: RESTful endpoints for game sessions, progress tracking, and user statistics