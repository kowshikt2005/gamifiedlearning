# Technology Stack & Build System

## 🚀 PRODUCTION DEPLOYMENT STATUS
**⚠️ LIVE APPLICATION**: This tech stack is actively serving real users in production. All configurations must be production-optimized.

## Core Technologies
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas with connection pooling
- **AI**: Google Genkit AI framework with Gemini API
- **Authentication**: Custom JWT-based system with bcrypt
- **Styling**: Tailwind CSS with CSS variables for theming

## UI Framework
- **Component Library**: Radix UI primitives + shadcn/ui components
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom design system
- **Animations**: tailwindcss-animate plugin
- **Theme**: CSS variables with dark mode support

## Key Dependencies
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API
- **Charts**: Recharts for analytics
- **Date Handling**: date-fns
- **PDF Processing**: pdf-parse for document handling
- **Carousel**: Embla Carousel React

## Production Configuration
- **TypeScript**: Strict mode enabled, ES2017 target, NO `any` types allowed
- **ESLint**: Next.js config with ZERO tolerance for console.log in production
- **Path Aliases**: `@/*` maps to `./src/*`
- **Port**: Development server runs on port 9003, production uses Vercel routing
- **Environment**: All secrets via environment variables, NO hardcoded values
- **Security**: JWT-based auth, input validation, rate limiting on all endpoints

## Common Commands

### Development
```bash
npm run dev              # Start development server (port 9003)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

### Database & Setup
```bash
npm run setup:db        # Initialize database collections and indexes
npm run test:connection # Test MongoDB Atlas connection
npm run clean-install   # Clean dependency installation
```

### Testing & Debugging
```bash
npm run test:login      # Test authentication functionality
node scripts/fix-user-passwords.js  # Fix test user passwords
node scripts/verify-database.js     # Verify database setup
```

## Production Optimizations
- **Webpack**: Top-level await enabled, bundle splitting for performance
- **Images**: Next.js Image optimization with remote patterns, WebP conversion
- **Compression**: Gzip/Brotli enabled for all static assets
- **TypeScript**: STRICT compilation, NO build errors allowed in production
- **Connection Pooling**: MongoDB Atlas M0 tier optimized (max 10 connections, aggressive cleanup)
- **Performance**: <3s page loads, <1s API responses, <500ms database queries
- **Security**: HTTPS only, secure headers, input sanitization, rate limiting