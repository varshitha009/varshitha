import React from 'react';
import { X, Sparkles, Check, Send } from 'lucide-react';
import { NoticeData } from '../types';

interface NoticeModalProps {
  notice: NoticeData | null;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ notice, onClose }) => {
  if (!notice) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-title"
    >
      <div 
        className="relative w-full max-w-md rounded-xl bg-surface-container border border-outline-variant/60 shadow-2xl p-6 text-left transition-transform duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container-high"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            {notice.badge && (
              <span className="inline-block text-[10px] font-label-sm uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 mb-1">
                {notice.badge}
              </span>
            )}
            <h3 id="notice-title" className="font-title-lg text-title-lg font-semibold text-on-surface">
              {notice.title}
            </h3>
          </div>
        </div>

        <p className="font-body-md text-on-surface-variant leading-relaxed mb-6">
          {notice.message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <button
            onClick={onClose}
            className="btn-shimmer px-4 py-2 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold font-label-md text-label-md hover:from-primary-fixed hover:to-primary transition-all shadow-[0_0_12px_rgba(233,193,118,0.2)]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, message: string) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sent, setSent] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, message);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setEmail('');
      setMessage('');
      onClose();
    }, 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
    >
      <div 
        className="relative w-full max-w-md rounded-xl bg-surface-container border border-outline-variant/60 shadow-2xl p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container-high"
          aria-label="Close contact modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <span className="text-[10px] font-label-sm uppercase tracking-wider text-primary">Get in Touch</span>
          <h3 id="contact-title" className="font-headline-md text-headline-md font-semibold text-on-surface mt-0.5">
            Contact Project Team
          </h3>
          <p className="font-body-sm text-outline mt-1">
            Questions, feedback, or custom dataset requirements? Leave us a note.
          </p>
        </div>

        {sent ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-title-md text-on-surface font-semibold">Message Received!</p>
            <p className="font-body-sm text-outline">Thank you for your feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-label-sm text-xs text-outline mb-1" htmlFor="contact-email">
                Your Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface placeholder:text-outline text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div>
              <label className="block font-label-sm text-xs text-outline mb-1" htmlFor="contact-msg">
                Message
              </label>
              <textarea
                id="contact-msg"
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you'd like to analyze..."
                className="w-full p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface placeholder:text-outline text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold text-sm hover:from-primary-fixed hover:to-primary transition-all shadow-[0_0_12px_rgba(233,193,118,0.2)]"
              >
                <Send className="w-4 h-4" />
                <span>Send Note</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
