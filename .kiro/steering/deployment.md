---
inclusion: always
---

# 🚀 DEPLOYMENT-FIRST DEVELOPMENT

## CRITICAL DEPLOYMENT STATUS
**⚠️ THIS APPLICATION IS ACTIVELY BEING DEPLOYED TO PRODUCTION**

Every code change, configuration update, and feature implementation MUST be production-ready. This is not a development sandbox - this is a live application serving real users.

## DEPLOYMENT-READY REQUIREMENTS

### 🔒 Security & Authentication
- **JWT Tokens**: All authentication must use secure, production-grade JWT implementation
- **Environment Variables**: Never hardcode secrets, API keys, or sensitive data
- **HTTPS Only**: All external API calls and redirects must use HTTPS
- **Input Validation**: Every user input must be validated and sanitized
- **Rate Limiting**: API endpoints must have appropriate rate limiting
- **CORS Configuration**: Properly configured for production domains

### 🗄️ Database & Performance
- **MongoDB Atlas**: Optimized for M0 tier limitations (max 10 connections)
- **Connection Pooling**: Aggressive connection management for Atlas free tier
- **Error Handling**: Graceful degradation when database is unavailable
- **Query Optimization**: All database queries must be efficient and indexed
- **Connection Cleanup**: Automatic cleanup of idle connections
- **Retry Logic**: Robust retry mechanisms for network failures

### 🌐 Production Environment
- **Environment Detection**: Code must work correctly in both development and production
- **Logging**: Use console.error/warn only, no console.log in production code
- **Error Boundaries**: Comprehensive error handling and user-friendly error messages
- **Performance**: All operations must complete within reasonable timeouts
- **Memory Management**: No memory leaks or excessive resource usage
- **Graceful Shutdowns**: Proper cleanup on application termination

### 📦 Build & Deployment
- **Next.js Optimization**: Proper build configuration for production
- **Static Assets**: Optimized images, fonts, and static resources
- **Bundle Size**: Minimized JavaScript bundles and code splitting
- **SEO Ready**: Proper meta tags, structured data, and performance metrics
- **Progressive Enhancement**: Application works without JavaScript
- **Mobile Responsive**: Full mobile compatibility and touch interactions

## DEPLOYMENT CHECKLIST

### Before Every Code Change
- [ ] **Security Review**: No sensitive data exposed
- [ ] **Error Handling**: Comprehensive error boundaries and fallbacks
- [ ] **Performance**: Operations complete within 30 seconds
- [ ] **Mobile Testing**: Works on mobile devices and touch interfaces
- [ ] **Environment Variables**: All secrets properly configured
- [ ] **Database Limits**: Respects MongoDB Atlas M0 connection limits

### Before Every Feature
- [ ] **Production Testing**: Feature tested in production-like environment
- [ ] **Error States**: All error conditions handled gracefully
- [ ] **Loading States**: Proper loading indicators and feedback
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **SEO Impact**: No negative impact on search engine optimization
- [ ] **Performance Budget**: No significant performance degradation

### Before Every API Endpoint
- [ ] **Authentication**: Proper JWT validation and user authorization
- [ ] **Rate Limiting**: Protection against abuse and DoS attacks
- [ ] **Input Validation**: Zod schemas for all inputs
- [ ] **Error Responses**: Consistent, user-friendly error messages
- [ ] **Timeout Handling**: Proper timeouts and circuit breakers
- [ ] **Database Efficiency**: Optimized queries with proper indexing

## PRODUCTION-FIRST CODING STANDARDS

### Code Quality
```typescript
// ✅ PRODUCTION READY
export async function getUserProgress(userId: string): Promise<UserProgress | null> {
  try {
    const db = await getDatabase();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { progress: 1 } }
    );
    return user?.progress || null;
  } catch (error) {
    console.error('Failed to fetch user progress:', error);
    throw new Error('Unable to load progress data');
  }
}

// ❌ NOT PRODUCTION READY
export async function getUserProgress(userId: any) {
  console.log('Getting user progress for:', userId);
  const db = await getDatabase();
  return db.collection('users').findOne({ _id: userId });
}
```

### Environment Configuration
```typescript
// ✅ PRODUCTION READY
const config = {
  mongoUri: process.env.MONGODB_URI || (() => {
    throw new Error('MONGODB_URI environment variable is required');
  })(),
  jwtSecret: process.env.NEXTAUTH_SECRET || (() => {
    throw new Error('NEXTAUTH_SECRET environment variable is required');
  })(),
  nodeEnv: process.env.NODE_ENV || 'development'
};

// ❌ NOT PRODUCTION READY
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
```

### Error Handling
```typescript
// ✅ PRODUCTION READY
export async function createStudySession(data: CreateSessionData): Promise<ApiResponse> {
  try {
    const validatedData = createSessionSchema.parse(data);
    const session = await sessionService.create(validatedData);
    return { success: true, data: session };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Invalid session data provided' };
    }
    console.error('Session creation failed:', error);
    return { success: false, error: 'Unable to create study session' };
  }
}

// ❌ NOT PRODUCTION READY
export async function createStudySession(data: any) {
  const session = await sessionService.create(data);
  return session;
}
```

## DEPLOYMENT MONITORING

### Health Checks
- Database connectivity and response times
- API endpoint availability and performance
- Memory usage and connection pool status
- Error rates and user experience metrics

### Performance Metrics
- Page load times under 3 seconds
- API response times under 1 second
- Database query times under 500ms
- Memory usage under 512MB

### User Experience
- Mobile responsiveness on all devices
- Accessibility compliance (WCAG 2.1 AA)
- Progressive enhancement without JavaScript
- Graceful error handling and recovery

## EMERGENCY PROTOCOLS

### If Deployment Fails
1. **Immediate Rollback**: Revert to last known good state
2. **Error Investigation**: Check logs and error monitoring
3. **Database Integrity**: Verify data consistency
4. **User Communication**: Inform users of any service disruption

### If Performance Degrades
1. **Connection Cleanup**: Force MongoDB connection cleanup
2. **Cache Clearing**: Clear API and browser caches
3. **Resource Monitoring**: Check memory and CPU usage
4. **Database Optimization**: Review slow queries and indexes

## REMEMBER: PRODUCTION FIRST
- Every line of code will be seen by real users
- Every API call affects real user experience
- Every database query impacts performance
- Every error message shapes user perception
- Every security flaw is a potential breach

**When in doubt, choose the more secure, more robust, more user-friendly option.**