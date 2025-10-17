<!------------------------------------------------------------------------------------
---
inclusion: always
---

# StudyMaster AI - Production-Ready Code Standards

## 🚀 CRITICAL DEPLOYMENT STATUS
**⚠️ THIS APPLICATION IS LIVE IN PRODUCTION - EVERY CHANGE AFFECTS REAL USERS**

## Critical Task Completion Protocol

**MANDATORY**: Before marking ANY task complete, verify ALL items in the Final Checklist section AND the Production Deployment Checklist.

## API Endpoint Standards

### RESTful Conventions
```typescript
// ✅ CORRECT
GET    /api/user/profile
POST   /api/user/study-session  
PUT    /api/user/progress
DELETE /api/user/study-session/:id

// ❌ INCORRECT
GET    /api/getUser
POST   /api/session-create
```

### Response Format
```typescript
// Success
{ success: true, data: {...}, message?: "..." }

// Error  
{ success: false, error: "User-friendly message", code?: "ERROR_CODE" }
```

### Status Codes
- `200` GET/PUT/DELETE success
- `201` POST resource created
- `400` Invalid input
- `401` Authentication required
- `404` Not found
- `500` Server error

## Code Standards

### TypeScript Requirements
- **No `any` types** - Use explicit interfaces/types
- **Zod validation** for API inputs and forms
- **Proper error handling** with user-friendly messages

```typescript
// ✅ CORRECT
interface ProgressUpdate {
  points: number;
  level: number;
  badges: string[];
}

function updateProgress(data: ProgressUpdate): Promise<UserProgress> { }

// ❌ INCORRECT  
function updateProgress(data: any): any { }
```

### React Component Standards
```typescript
interface StudyCardProps {
  topic: string;
  duration: number;
  onStart: () => void;
  isLoading?: boolean;
}

export function StudyCard({ topic, duration, onStart, isLoading = false }: StudyCardProps) {
  if (!topic) return <EmptyState message="No topic selected" />;
  
  return (
    <div className="study-card" role="article" aria-label={`Study ${topic}`}>
      {/* Component content */}
    </div>
  );
}
```

### Required Component Features
- Typed props with interfaces
- Loading, error, and empty states
- Accessibility attributes (aria-labels, roles)
- Early returns for edge cases

## Dead Code Prevention

### Must Remove
- Unused imports, variables, functions
- Commented-out code blocks  
- Console.log debugging statements
- TODO/FIXME without tickets
- Orphaned components

### Code Cleanliness
```typescript
// ❌ INCORRECT - Unused imports
import { useState, useEffect, useMemo } from 'react';
import { formatDate } from '@/lib/utils';

function Component() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ✅ CORRECT - Clean imports
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

## MANDATORY Production Deployment Checklist

**CRITICAL**: Before marking ANY task complete, verify ALL items:

### Code Quality & Security
- [ ] **Dead Code**: Removed unused imports, variables, functions, commented code
- [ ] **Console Logs**: No debugging logs remain (only console.error/warn allowed)
- [ ] **TypeScript**: Proper typing, no `any` types, well-defined interfaces
- [ ] **Input Validation**: All user inputs validated with Zod schemas
- [ ] **Error Messages**: User-friendly, not technical jargon or stack traces
- [ ] **Authentication**: Proper JWT validation for protected endpoints
- [ ] **Environment Variables**: No hardcoded secrets or API keys

### Production Performance
- [ ] **Database Efficiency**: Optimized queries with proper indexing
- [ ] **Connection Management**: Respects MongoDB Atlas M0 limits (max 10 connections)
- [ ] **Error Handling**: Graceful degradation when services unavailable
- [ ] **Timeout Handling**: All operations complete within 30 seconds
- [ ] **Memory Management**: No memory leaks or excessive resource usage
- [ ] **Rate Limiting**: API endpoints protected against abuse

### User Experience
- [ ] **Mobile Responsive**: Works on all device sizes and touch interfaces
- [ ] **Loading States**: Proper loading indicators and user feedback
- [ ] **Error States**: All error conditions handled gracefully
- [ ] **Accessibility**: WCAG 2.1 AA compliance (aria-labels, keyboard navigation)
- [ ] **Progressive Enhancement**: Core functionality works without JavaScript
- [ ] **SEO Ready**: Proper meta tags and structured data

### Integration & Testing
- [ ] **API Conventions**: RESTful endpoints with proper HTTP verbs
- [ ] **Testing**: Traced logic for success, error, and edge cases
- [ ] **Integration**: Verified compatibility with existing features
- [ ] **Loose Ends**: Addressed or documented all TODO/FIXME comments
- [ ] **Readability**: Code is immediately understandable to experienced developers
- [ ] **Production Ready**: Secure, performant, complete error handling

### Production Deployment Response Format

```
Modified Files: [list all changed files]

🔒 Security & Quality Verification:
✅ Dead Code: [specific evidence]
✅ Console Logs: [debugging removed, only error/warn remain]
✅ TypeScript: [typing verification, no any types]
✅ Input Validation: [Zod schemas implemented]
✅ Authentication: [JWT validation confirmed]
✅ Environment Variables: [no hardcoded secrets]

⚡ Performance & Database:
✅ Database Efficiency: [optimized queries confirmed]
✅ Connection Management: [Atlas M0 limits respected]
✅ Error Handling: [graceful degradation implemented]
✅ Timeout Handling: [30-second limits enforced]
✅ Memory Management: [no leaks detected]
✅ Rate Limiting: [abuse protection confirmed]

👥 User Experience:
✅ Mobile Responsive: [tested on multiple devices]
✅ Loading States: [proper feedback implemented]
✅ Error States: [graceful error handling]
✅ Accessibility: [WCAG 2.1 AA compliance]
✅ Progressive Enhancement: [works without JS]
✅ SEO Ready: [meta tags and structure verified]

🔗 Integration & Standards:
✅ API Conventions: [RESTful patterns confirmed]
✅ Testing: [scenarios verified]
✅ Integration: [compatibility confirmed]
✅ Loose Ends: [TODO status]
✅ Readability: [clarity confirmation]
✅ Production Ready: [deployment-ready verification]

🚀 PRODUCTION DEPLOYMENT READY: All checks passed. Code is live-ready.
```

**If ANY item fails, continue working until ALL pass. This code will be seen by real users.**
-------------------------------------------------------------------------------------> 