import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  type: 'signin' | 'signup' | 'none';
  onClose: () => void;
  onSwitchToSignUp: () => void;
  onSwitchToSignIn: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModals: React.FC<AuthModalProps> = ({
  type,
  onClose,
  onSwitchToSignUp,
  onSwitchToSignIn,
  onSuccess,
}) => {
  const [email, setEmail] = useState('demo.analyst@company.com');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Alex Morgan');
  const [isLoading, setIsLoading] = useState(false);

  if (type === 'none') return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: email.split('@')[0].replace('.', ' ') || 'Demo User',
        email: email || 'demo.analyst@company.com',
      });
    }, 400);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: name || 'Demo User',
        email: email || 'demo.analyst@company.com',
      });
    }, 400);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: 'Google Workspace User',
        email: 'user@workspace.google.com',
      });
    }, 350);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface-container border border-outline-variant/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 md:p-8 text-left transition-transform duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container-high"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-[11px] font-label-sm uppercase tracking-wider text-primary mb-2">
            <span>{type === 'signin' ? 'Sign In' : 'Sign Up'}</span>
          </div>
          <h2 id="auth-modal-title" className="font-headline-md text-headline-md font-semibold text-on-surface">
            {type === 'signin' ? 'Welcome Back to AI Data' : 'Create Your Workspace Account'}
          </h2>
          <p className="font-body-sm text-outline mt-1">
            {type === 'signin'
              ? 'Enter your credentials to enter your AI Data Workspace.'
              : 'Sign up to start organizing and understanding your spreadsheets.'}
          </p>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="mb-5 p-3 rounded-lg bg-surface-container-low border border-primary/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            <strong className="text-primary-fixed">Interactive Front-End Demo:</strong> You can click below to test the full workspace workflow immediately.
          </p>
        </div>

        {/* Google Continue Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface text-sm font-medium transition-all mb-4 group shadow-sm active:scale-[0.99]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.3-4.3 1.3-3 0-5.5-2-6.4-4.8L1.9 16.5C3.7 20.4 7.5 23 12 23z"
            />
          </svg>
          <span className="group-hover:text-primary transition-colors">Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-outline-variant/30"></div>
          <span className="bg-surface-container px-3 text-[11px] font-label-sm uppercase text-outline tracking-wider">
            or with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={type === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {type === 'signup' && (
            <div>
              <label className="block font-label-sm text-xs text-outline mb-1.5" htmlFor="auth-name">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-label-sm text-xs text-outline mb-1.5" htmlFor="auth-email">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-xs text-outline mb-1.5" htmlFor="auth-password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-shimmer w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold font-label-md text-label-md hover:from-primary-fixed hover:to-primary hover:text-on-primary-fixed transition-all shadow-[0_0_15px_rgba(233,193,118,0.25)] hover:shadow-[0_0_24px_rgba(233,193,118,0.4)] active:scale-[0.99] cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                <span>Connecting Workspace...</span>
              </span>
            ) : (
              <>
                <span>{type === 'signin' ? 'Sign In to Workspace' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 pt-4 border-t border-outline-variant/20 text-center font-body-sm text-xs text-outline">
          {type === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-primary hover:underline font-semibold ml-1 focus:outline-none"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignIn}
                className="text-primary hover:underline font-semibold ml-1 focus:outline-none"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
