import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './forgot_password.css';

const ForgotPassword = ({ backendUrl }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State variables
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: username & recovery code, 2: new password
  
  // Error states
  const [errorUsername, setErrorUsername] = useState({ visible: false, text: '' });
  const [errorRecoveryCode, setErrorRecoveryCode] = useState({ visible: false, text: '' });
  const [errorNewPassword, setErrorNewPassword] = useState({ visible: false, text: '' });
  const [errorConfirmPassword, setErrorConfirmPassword] = useState({ visible: false, text: '' });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [verifiedUsername, setVerifiedUsername] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  
  // New recovery code popup states
  const [showNewRecoveryPopup, setShowNewRecoveryPopup] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState('');

  // Lockout timer effect
  useEffect(() => {
    let timer;
    if (isLocked && lockoutSeconds > 0) {
      timer = setTimeout(() => {
        setLockoutSeconds(prev => prev - 1);
      }, 1000);
    } else if (lockoutSeconds === 0 && isLocked) {
      setIsLocked(false);
      setFailedAttempts(0);
    }
    return () => clearTimeout(timer);
  }, [isLocked, lockoutSeconds]);

  // Handle recovery code verification
  const handleVerifyRecoveryCode = async () => {
    // Reset errors
    setErrorUsername({ visible: false, text: '' });
    setErrorRecoveryCode({ visible: false, text: '' });

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedRecoveryCode = recoveryCode.trim().toUpperCase();

    // Validate username
    if (!trimmedUsername) {
      setErrorUsername({ visible: true, text: t('forgotPassword.errors.usernameRequired') });
      return;
    }

    // Validate recovery code
    if (!trimmedRecoveryCode) {
      setErrorRecoveryCode({ visible: true, text: t('forgotPassword.errors.recoveryCodeRequired') });
      return;
    }

    if (trimmedRecoveryCode.length !== 8) {
      setErrorRecoveryCode({ visible: true, text: t('forgotPassword.errors.recoveryCodeLength') });
      return;
    }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${backendUrl}/verify_recovery_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          recovery_code: trimmedRecoveryCode
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Verification successful - move to step 2
        setVerifiedUsername(trimmedUsername.toLowerCase());
        setIsCodeVerified(true);
        setStep(2);
        setErrorRecoveryCode({ visible: false, text: '' });
        setFailedAttempts(0);
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          const error = errorData.detail || '';
          
          // Increment failed attempts
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          if (newFailedAttempts >= 3) {
            // Lock the user for 10 seconds
            setIsLocked(true);
            setLockoutSeconds(10);
            setErrorRecoveryCode({ 
              visible: true, 
              text: t('forgotPassword.errors.tooManyAttempts', { seconds: 10 })
            });
          } else {
            if (error === 'User not found') {
              setErrorUsername({ visible: true, text: t('forgotPassword.errors.userNotFound') });
            } else if (error === 'Recovery code not found for this user') {
              setErrorRecoveryCode({ visible: true, text: t('forgotPassword.errors.recoveryCodeNotFound') });
            } else if (error === 'Invalid recovery code') {
              setErrorRecoveryCode({ 
                visible: true, 
                text: t('forgotPassword.errors.invalidRecoveryCode', { attemptsLeft: 3 - newFailedAttempts })
              });
            } else {
              setErrorRecoveryCode({ visible: true, text: t('forgotPassword.errors.unknownError') });
            }
          }
        } else {
          const text = await response.text();
          alert(`${t('forgotPassword.errors.serverResponse')}: ${text}`);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        alert(t('forgotPassword.errors.requestTimeout'));
      } else if (error.name === 'TypeError') {
        if (error.message.includes('fetch')) {
          alert(t('forgotPassword.errors.connectionError'));
        } else {
          alert(`${t('forgotPassword.errors.connectionErrorType')}: ${error.message}`);
        }
      } else {
        alert(`${t('forgotPassword.errors.unknownError')}: ${error.message}`);
      }
      
      console.error('Recovery code verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    // Reset errors
    setErrorNewPassword({ visible: false, text: '' });
    setErrorConfirmPassword({ visible: false, text: '' });

    // Validate passwords
    if (!newPassword) {
      setErrorNewPassword({ visible: true, text: t('forgotPassword.errors.newPasswordRequired') });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 30) {
      setErrorNewPassword({ visible: true, text: t('forgotPassword.errors.newPasswordLength') });
      return;
    }

    if (!confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('forgotPassword.errors.confirmPasswordRequired') });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('forgotPassword.errors.passwordsDoNotMatch') });
      return;
    }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${backendUrl}/update_password_with_recovery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: verifiedUsername,
          recovery_code: recoveryCode.trim().toUpperCase(),
          new_password: newPassword,
          confirm_password: confirmPassword
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        
        // Show new recovery code popup
        if (responseData.new_recovery_code) {
          setNewRecoveryCode(responseData.new_recovery_code);
          setShowNewRecoveryPopup(true);
        } else {
          alert(t('forgotPassword.successMessage'));
          navigate('/login');
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          const error = errorData.detail || '';
          
          if (error === 'Passwords do not match') {
            setErrorConfirmPassword({ visible: true, text: t('forgotPassword.errors.passwordsDoNotMatch') });
          } else if (error === 'Password must be between 8 and 30 characters') {
            setErrorNewPassword({ visible: true, text: t('forgotPassword.errors.newPasswordLength') });
          } else if (error === 'User not found') {
            setErrorUsername({ visible: true, text: t('forgotPassword.errors.userNotFound') });
          } else if (error === 'Recovery code not verified. Please verify your recovery code first.') {
            setErrorRecoveryCode({ visible: true, text: t('forgotPassword.errors.recoveryCodeNotVerified') });
            setStep(1);
            setIsCodeVerified(false);
          } else if (error === 'Verification has expired. Please verify your recovery code again.') {
            alert(t('forgotPassword.errors.verificationExpired'));
            setStep(1);
            setIsCodeVerified(false);
          } else {
            alert(`${t('forgotPassword.errors.unknownError')}: ${error}`);
          }
        } else {
          const text = await response.text();
          alert(`${t('forgotPassword.errors.serverResponse')}: ${text}`);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        alert(t('forgotPassword.errors.requestTimeout'));
      } else if (error.name === 'TypeError') {
        if (error.message.includes('fetch')) {
          alert(t('forgotPassword.errors.connectionError'));
        } else {
          alert(`${t('forgotPassword.errors.connectionErrorType')}: ${error.message}`);
        }
      } else {
        alert(`${t('forgotPassword.errors.unknownError')}: ${error.message}`);
      }
      
      console.error('Update password error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step - WITHOUT invalidating the verification
  const handleBack = () => {
    if (step === 2) {
      // Just go back to step 1, but keep the verification status
      // The recovery code is NOT marked as used yet, so it's safe
      setStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setErrorNewPassword({ visible: false, text: '' });
      setErrorConfirmPassword({ visible: false, text: '' });
      // Do NOT reset isCodeVerified or verifiedUsername
      // The recovery code is still valid for 15 minutes
    } else {
      navigate('/login');
    }
  };

  // Handle close new recovery popup and redirect to login
  const handleCloseNewRecoveryPopup = () => {
    setShowNewRecoveryPopup(false);
    navigate('/login');
  };

  // Handle copy new recovery code
  const handleCopyNewCode = () => {
    navigator.clipboard.writeText(newRecoveryCode);
    alert(t('forgotPassword.newRecovery.codeCopied'));
  };

  // New Recovery Code Popup Component
  const NewRecoveryPopup = () => (
    <div className="recovery-popup-overlay">
      <div className="recovery-popup">
        <div className="recovery-popup-header">
          <h2>{t('forgotPassword.newRecovery.title')}</h2>
          <button className="recovery-popup-close" onClick={handleCloseNewRecoveryPopup}>×</button>
        </div>
        
        <div className="recovery-popup-content">
          <p className="recovery-warning">
            ⚠️ {t('forgotPassword.newRecovery.warning')}
          </p>
          
          <p className="recovery-info">
            {t('forgotPassword.newRecovery.info')}
          </p>
          
          <div className="recovery-code-container">
            <div className="recovery-code-display">
              <code>{newRecoveryCode}</code>
            </div>
            <button 
              className="recovery-copy-button"
              onClick={handleCopyNewCode}
            >
              📋 {t('forgotPassword.newRecovery.copy')}
            </button>
          </div>
          
          <p className="recovery-security-note">
            🔒 {t('forgotPassword.newRecovery.securityNote')}
          </p>
          
          <p className="recovery-instruction">
            {t('forgotPassword.newRecovery.instruction')}
          </p>
          
          <button 
            className="recovery-confirm-button"
            onClick={handleCloseNewRecoveryPopup}
          >
            {t('forgotPassword.newRecovery.confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  // Render step 1: Username and recovery code
  const renderStep1 = () => (
    <>
      <h2 className="forgot-password-title">{t('forgotPassword.step1.title')}</h2>
      <p className="forgot-password-description">
        {t('forgotPassword.step1.description')}
      </p>

      {isCodeVerified && (
        <div className="verification-success-banner">
          ✅ {t('forgotPassword.step1.codeVerified')}
        </div>
      )}

      <div className="input-group">
        <input
          type="text"
          placeholder={t('forgotPassword.usernamePlaceholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="forgot-input"
          autoComplete="off"
          disabled={loading || isLocked || isCodeVerified}
        />
        {errorUsername.visible && (
          <div className="error-message">
            {errorUsername.text}
          </div>
        )}
      </div>

      <div className="input-group">
        <input
          type="text"
          placeholder={t('forgotPassword.recoveryCodePlaceholder')}
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
          className="forgot-input"
          autoComplete="off"
          maxLength="8"
          disabled={loading || isLocked || isCodeVerified}
        />
        {errorRecoveryCode.visible && (
          <div className="error-message">
            {errorRecoveryCode.text}
          </div>
        )}
      </div>

      <div className="recovery-info">
        <p>ℹ️ {t('forgotPassword.step1.recoveryInfo')}</p>
        <p>🔒 {t('forgotPassword.step1.recoveryNote')}</p>
      </div>

      {isLocked && (
        <div className="lockout-warning">
          ⏰ {t('forgotPassword.errors.tooManyAttempts', { seconds: lockoutSeconds })}
        </div>
      )}

      {!isCodeVerified ? (
        <button 
          onClick={handleVerifyRecoveryCode}
          className="forgot-button"
          disabled={loading || isLocked}
        >
          {loading ? t('forgotPassword.verifying') : t('forgotPassword.continueButton')}
        </button>
      ) : (
        <button 
          onClick={() => setStep(2)}
          className="forgot-button"
        >
          {t('forgotPassword.goToStep2')}
        </button>
      )}
    </>
  );

  // Render step 2: New password
  const renderStep2 = () => (
    <>
      <h2 className="forgot-password-title">{t('forgotPassword.step2.title')}</h2>
      <p className="forgot-password-description">
        {t('forgotPassword.step2.description', { username: verifiedUsername })}
      </p>

      <div className="input-group">
        <input
          type="password"
          placeholder={t('forgotPassword.newPasswordPlaceholder')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="forgot-input"
          autoComplete="off"
          disabled={loading}
        />
        {errorNewPassword.visible && (
          <div className="error-message">
            {errorNewPassword.text}
          </div>
        )}
      </div>

      <div className="input-group">
        <input
          type="password"
          placeholder={t('forgotPassword.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="forgot-input"
          autoComplete="off"
          disabled={loading}
        />
        {errorConfirmPassword.visible && (
          <div className="error-message">
            {errorConfirmPassword.text}
          </div>
        )}
      </div>

      <div className="password-requirements">
        <p>{t('forgotPassword.passwordRequirements')}</p>
        <ul>
          <li>{t('forgotPassword.requirement1')}</li>
          <li>{t('forgotPassword.requirement2')}</li>
        </ul>
      </div>

      <button 
        onClick={handleUpdatePassword}
        className="forgot-button"
        disabled={loading}
      >
        {loading ? t('forgotPassword.updating') : t('forgotPassword.updateButton')}
      </button>
    </>
  );

  return (
    <div className="forgot-password-container">
      {/* Back Button */}
      <div 
        className="back-button" 
        onClick={handleBack}
      >
        ←
      </div>

      {/* Page Container */}
      <div className="forgot-password-background">
        <div className="forgot-password-row">
          <div className="forgot-password-form">
            {/* Step indicator */}
            <div className="step-indicator">
              <div className={`step ${step >= 1 ? 'active' : ''}`}>
                <span>1</span>
                <p>{t('forgotPassword.stepIndicator.recovery')}</p>
              </div>
              <div className={`step ${step >= 2 ? 'active' : ''}`}>
                <span>2</span>
                <p>{t('forgotPassword.stepIndicator.newPassword')}</p>
              </div>
            </div>

            {/* Render current step */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            {/* Back to login link */}
            <div className="back-to-login">
              <span>{t('forgotPassword.remembered')}</span>
              <button 
                className="login-link" 
                onClick={() => navigate('/login')}
              >
                {t('forgotPassword.backToLogin')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* New Recovery Code Popup */}
      {showNewRecoveryPopup && <NewRecoveryPopup />}
    </div>
  );
};

export default ForgotPassword;