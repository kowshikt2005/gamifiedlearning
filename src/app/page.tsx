import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side with illustration */}
      <div className="relative hidden lg:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary to-accent text-white">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto w-64 h-64 relative">
            <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse"></div>
            <div className="absolute inset-8 bg-white/20 rounded-full animate-pulse animation-delay-1000"></div>
            <div className="absolute inset-16 bg-white/30 rounded-full flex items-center justify-center">
              <svg className="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold">Transform Your Learning Journey</h2>
          <p className="text-lg text-white/90">
            AI-powered study tools that adapt to your learning style. Upload documents, generate quizzes, and track your progress with gamified achievements.
          </p>
          {/* Dots navigation */}
          <div className="flex justify-center gap-2 pt-4">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <div className="w-2 h-2 rounded-full bg-white/40"></div>
            <div className="w-2 h-2 rounded-full bg-white/40"></div>
            <div className="w-2 h-2 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <LoginForm />
      </div>
    </div>
  );
}
