import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setSecureToken, getSecureToken, removeSecureToken } from './secureStorage';
import './login.css';

const Login = ({ backendUrl }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorUsername, setErrorUsername] = useState({ visible: false, text: '' });
  const [errorPassword, setErrorPassword] = useState({ visible: false, text: '' });
  const [loading, setLoading] = useState(false);

  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTime, setBlockTime] = useState(0);

  const startBlock = () => {
    setIsBlocked(true);
    setBlockTime(10);

    const interval = setInterval(() => {
      setBlockTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsBlocked(false);
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (isBlocked) return;

    setErrorUsername({ visible: false, text: '' });
    setErrorPassword({ visible: false, text: '' });

    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername) {
      setErrorUsername({ visible: true, text: t('login.errors.usernameRequired') });
      return;
    }

    if (!password) {
      setErrorPassword({ visible: true, text: t('login.errors.passwordRequired') });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: trimmedUsername, Password: password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Токенро дар файли махфии дастгоҳ захира мекунем
        await setSecureToken(data.access_token);
        setLoading(false);
        navigate('/');
      } else {
        const errorData = await response.json();
        const error = errorData.detail || '';

        setLoading(false);

        if (error === 'User not found') {
          setErrorUsername({ visible: true, text: t('login.errors.userNotFound') });
        } 
        else if (error === 'Incorrect password') {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          if (newAttempts >= 3) {
            startBlock();
          }

          setErrorPassword({ visible: true, text: t('login.errors.incorrectPassword') });
        } 
        else {
          alert(error);
        }
      }
    } catch (error) {
      setLoading(false);
      alert(t('login.errors.connectionError'));
    }
  };

  const handleLogout = async () => {
    await removeSecureToken();
    navigate('/login');
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-row">
          <div className="login-form">

            <input
              type="text"
              placeholder={t('login.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              autoComplete="off"
              disabled={isBlocked}
            />

            {errorUsername.visible && (
              <div className="error-message">{errorUsername.text}</div>
            )}

            <input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              autoComplete="off"
              disabled={isBlocked}
            />

            {errorPassword.visible && (
              <div className="error-message">{errorPassword.text}</div>
            )}

            <button
              onClick={handleLogin}
              className="login-button"
              disabled={isBlocked}
            >
              {t('login.loginButton')}
            </button>

            <div className="forgot-password-link">
              <a href="/forgot_password">
                {t('login.forgotPassword')}
              </a>
            </div>

            <div className="signup-prompt">
              <span>{t('login.noAccount')}</span>
              <a href="/signup">{t('login.signup')}</a>
            </div>

          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {isBlocked && (
        <div className="block-overlay">
          <div className="block-message">
            {t('login.errors.tooManyAttempts')} {blockTime}s
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;