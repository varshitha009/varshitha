/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Workspace } from './components/Workspace';
import { DataReviewWorkspace } from './components/DataReviewWorkspace';
import { AuthModals } from './components/AuthModals';
import { NoticeModal, ContactModal } from './components/NoticeModal';
import { AppView, User, NoticeData, ParsedDataset } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [authModal, setAuthModal] = useState<'none' | 'signin' | 'signup'>('none');
  const [noticeData, setNoticeData] = useState<NoticeData | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentDataset, setCurrentDataset] = useState<ParsedDataset | null>(null);

  const handleOpenSignIn = () => {
    setAuthModal('signin');
  };

  const handleOpenSignUp = () => {
    setAuthModal('signup');
  };

  const handleCloseAuth = () => {
    setAuthModal('none');
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setAuthModal('none');
    // Navigate straight to the AI Data Workspace home / dashboard
    setCurrentView('workspace');
  };

  const handleGetStarted = () => {
    setCurrentView('workspace');
  };

  const handleBackToHome = () => {
    setCurrentView('landing');
  };

  const handleShowNotice = (notice: NoticeData) => {
    setNoticeData(notice);
  };

  const handleCloseNotice = () => {
    setNoticeData(null);
  };

  const handleDatasetParsed = (dataset: ParsedDataset) => {
    setCurrentDataset(dataset);
  };

  const handleBackToUpload = () => {
    setCurrentDataset(null);
  };

  const handleUpdateDataset = (updated: ParsedDataset) => {
    setCurrentDataset(updated);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {currentView === 'landing' ? (
        <LandingPage
          user={user}
          onOpenSignIn={handleOpenSignIn}
          onOpenSignUp={handleOpenSignUp}
          onGetStarted={handleGetStarted}
          onShowNotice={handleShowNotice}
          onOpenContact={() => setIsContactOpen(true)}
        />
      ) : currentDataset ? (
        <DataReviewWorkspace
          dataset={currentDataset}
          onBackToUpload={handleBackToUpload}
          onUpdateDataset={handleUpdateDataset}
        />
      ) : (
        <Workspace
          user={user}
          onBackToHome={handleBackToHome}
          onShowNotice={handleShowNotice}
          onDatasetParsed={handleDatasetParsed}
        />
      )}

      {/* Sign In & Sign Up Modals */}
      <AuthModals
        type={authModal}
        onClose={handleCloseAuth}
        onSwitchToSignUp={() => setAuthModal('signup')}
        onSwitchToSignIn={() => setAuthModal('signin')}
        onSuccess={handleAuthSuccess}
      />

      {/* Feature Notices for upcoming steps */}
      <NoticeModal notice={noticeData} onClose={handleCloseNotice} />

      {/* Contact Project Team Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        onSubmit={(email, msg) => {
          console.log('Contact inquiry received:', { email, msg });
        }}
      />
    </div>
  );
}

