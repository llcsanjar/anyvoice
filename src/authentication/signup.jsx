import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './signup.css';

// Verification Modal Component
function VerificationModal({
  targetEmojis,
  selectedEmojis,
  displayEmojis,
  wrongAttempts,
  showSuccessMessage,
  showFailureMessage,
  handleEmojiSelect,
  handleCloseModal,
  initializeVerification,
  t
}) {
  return (
    <div className="verification-modal-overlay" onClick={handleCloseModal}>
      <div
        className="verification-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="verification-modal-header">
          <h2>{t('signup.verification.title')}</h2>
          <button
            className="verification-modal-close"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>

        <div className="verification-modal-body">
          <div className="target-emojis-display">
            <p className="target-label">
              {t('signup.verification.findThese')}:
            </p>

            <button 
              className="verification-refresh-button"
              onClick={() => initializeVerification()}
              type="button"
            >
              🔄
            </button>

            <div className="target-emojis">
              {targetEmojis.map((emoji, idx) => {
                const isFound = selectedEmojis.some(
                  item => item.emoji === emoji
                );

                return (
                  <span
                    key={idx}
                    className={`target-emoji ${!isFound ? 'not-found' : 'found'}`}
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="emoji-grid-container">
            <div className="emoji-grid">
              {displayEmojis.map((emoji, index) => {
                const isSelected = selectedEmojis.some(
                  item => item.index === index
                );

                return (
                  <button
                    key={index}
                    className={`emoji-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleEmojiSelect(emoji, index)}
                    disabled={isSelected}
                    type="button"
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="attempts-counter">
            {t('signup.verification.attemptsLeft')}: {3 - wrongAttempts}
          </p>
        </div>

        {showSuccessMessage && (
          <div className="verification-success-message">
            <div className="success-content">
              <span className="success-icon">✅</span>
              <p>{t('signup.verification.success')}</p>
            </div>
          </div>
        )}

        {showFailureMessage && (
          <div className="verification-failure-message">
            <div className="failure-content">
              <span className="failure-icon">❌</span>
              <p>{t('signup.verification.failure')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Функсияҳои генератсияи рандом
const generateRandomCredentials = () => {
  const adjectives = ['happy', 'lucky', 'swift', 'calm', 'wise', 'cool', 'kind', 'nice', 'wild', 'gold',
                      'dark', 'star', 'moon', 'brave', 'clever', 'daring', 'eager', 'fancy', 'gentle', 'jolly'];
  
  const nouns = ['fox', 'wolf', 'bear', 'lion', 'eagle', 'hawk', 'owl', 'deer', 'hawk', 'dove',
                 'star', 'wave', 'wind', 'fire', 'ice', 'moon', 'sun', 'sky', 'lake', 'tree'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 99999);
  
  return `${randomAdjective}.${randomNoun}${randomNum}`;
};

const generateRandomPassword = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
  let password = '';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
};

const generateRandomDisplay = (username) => {
  return username.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const SignUp = ({ backendUrl }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State variables
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [display, setDisplay] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageSrc, setProfileImageSrc] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Error states
  const [errorUsername, setErrorUsername] = useState({ visible: false, text: '' });
  const [errorPassword, setErrorPassword] = useState({ visible: false, text: '' });
  const [errorConfirmPassword, setErrorConfirmPassword] = useState({ visible: false, text: '' });
  
  // UI states
  const [loading, setLoading] = useState(false);
  
  // Recovery code popup states
  const [showRecoveryPopup, setShowRecoveryPopup] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [tempUsername, setTempUsername] = useState('');

  // Terms and Conditions Checkbox
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Anti-bot verification states
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [displayEmojis, setDisplayEmojis] = useState([]);
  const [targetEmojis, setTargetEmojis] = useState([]);
  const [selectedEmojis, setSelectedEmojis] = useState([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showFailureMessage, setShowFailureMessage] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // List of 100 friendly emojis (none offensive)
  const emojiList = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
    '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
    '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '🤖'
  ];

  // Initialize random credentials when component mounts
  useEffect(() => {
    const randomUser = generateRandomCredentials();
    const randomPass = generateRandomPassword();
    const randomDisp = generateRandomDisplay(randomUser);
    
    setUsername(randomUser);
    setPassword(randomPass);
    setDisplay(randomDisp);
    // Checkboxҳо фаъол нестанд
  }, []);

  // Initialize verification when modal opens
  const initializeVerification = useCallback(() => {
    const uniqueTargets = [];
    const tempList = [...emojiList];
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * tempList.length);
      uniqueTargets.push(tempList[randomIndex]);
      tempList.splice(randomIndex, 1);
    }
    setTargetEmojis(uniqueTargets);

    const otherEmojis = tempList.filter(emoji => !uniqueTargets.includes(emoji));
    const shuffledOthers = [...otherEmojis].sort(() => Math.random() - 0.5);
    const selectedOthers = shuffledOthers.slice(0, 15);
    
    const combined = [...uniqueTargets, ...selectedOthers];
    const shuffledDisplay = combined.sort(() => Math.random() - 0.5);
    setDisplayEmojis(shuffledDisplay);
    
    setSelectedEmojis([]);
    setWrongAttempts(0);
  }, []);

  // Handle checkbox change
  const handleHumanVerificationCheckbox = (e) => {
    if (e.target.checked) {
      initializeVerification();
      setShowVerificationModal(true);
    } else {
      setShowVerificationModal(false);
      setIsHumanVerified(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji, index) => {
    if (selectedEmojis.some(item => item.index === index)) {
      return;
    }

    if (targetEmojis.includes(emoji)) {
      const newSelected = [...selectedEmojis, { emoji, index }];
      setSelectedEmojis(newSelected);

      const foundTargets = newSelected.map(item => item.emoji);
      const allFound = targetEmojis.every(target => foundTargets.includes(target));

      if (allFound) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          setIsHumanVerified(true);
          setShowVerificationModal(false);
          setShowSuccessMessage(false);
          setSelectedEmojis([]);
        }, 1500);
      }
    } else {
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);

      if (newAttempts >= 3) {
        setShowFailureMessage(true);
        setTimeout(() => {
          setShowVerificationModal(false);
          setShowFailureMessage(false);
          setIsHumanVerified(false);
          setSelectedEmojis([]);
          setWrongAttempts(0);
          const checkbox = document.getElementById('human-verification');
          if (checkbox) checkbox.checked = false;
        }, 2000);
      } else {
        const notification = document.createElement('div');
        notification.className = 'verification-notification';
        notification.textContent = `${t('signup.verification.wrongEmoji')} (${newAttempts}/3 ${t('signup.verification.attempts')})`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 2000);
      }
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowVerificationModal(false);
    setIsHumanVerified(false);
    setSelectedEmojis([]);
    setWrongAttempts(0);
    const checkbox = document.getElementById('human-verification');
    if (checkbox) checkbox.checked = false;
  };

  // Function for cropping and resizing image
  const processImage = (base64Image, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const minSize = Math.min(img.width, img.height);
      const sx = (img.width - minSize) / 2;
      const sy = (img.height - minSize) / 2;
      
      canvas.width = 256;
      canvas.height = 256;
      
      ctx.drawImage(img, sx, sy, minSize, minSize, 0, 0, 256, 256);
      
      const croppedBase64 = canvas.toDataURL('image/png');
      callback(croppedBase64);
    };
    img.src = base64Image;
  };

  // Load and process default image
  useEffect(() => {
    const loadAndProcessDefaultImage = async () => {
      try {
        const response = await fetch('/default-avatar.png');
        if (!response.ok) {
          throw new Error('Failed to load default image');
        }
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64data = reader.result;
          processImage(base64data, (processedImage) => {
            setProfileImage(processedImage);
            setProfileImageSrc(processedImage);
          });
        };
        
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error loading default profile image:', error);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', 32, 32);
        
        const defaultAvatar = canvas.toDataURL('image/png');
        setProfileImage(defaultAvatar);
        setProfileImageSrc(defaultAvatar);
      }
    };

    loadAndProcessDefaultImage();
  }, []);

  // Handle profile image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(t('signup.errors.fileType'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(t('signup.errors.fileSize'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        processImage(e.target.result, (processedImage) => {
          setProfileImage(processedImage);
          setProfileImageSrc(processedImage);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate new random credentials
  const regenerateRandomCredentials = () => {
    const randomUser = generateRandomCredentials();
    const randomPass = generateRandomPassword();
    const randomDisp = generateRandomDisplay(randomUser);
    
    setUsername(randomUser);
    setPassword(randomPass);
    setDisplay(randomDisp);
  };

  // Validate inputs
  const validateInputs = () => {
    setErrorUsername({ visible: false, text: '' });
    setErrorPassword({ visible: false, text: '' });
    setErrorConfirmPassword({ visible: false, text: '' });

    const trimmedUsername = username.toLowerCase().trim();
    
    // Validate username
    if (!trimmedUsername) {
      setErrorUsername({ visible: true, text: t('signup.errors.usernameRequired') });
      return false;
    }

    if (trimmedUsername.length < 5 || trimmedUsername.length > 15) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameLength')
      });
      return false;
    }

    if (!/[a-zA-Z]/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameLetter')
      });
      return false;
    }

    if (!/^[a-zA-Z0-9_]/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameStart')
      });
      return false;
    }

    if (trimmedUsername.startsWith('.') || trimmedUsername.endsWith('.')) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameDot')
      });
      return false;
    }

    if (/\.\./.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameDoubleDot')
      });
      return false;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('signup.errors.usernameChars')
      });
      return false;
    }

    // Validate password
    if (!password) {
      setErrorPassword({ visible: true, text: t('signup.errors.passwordRequired') });
      return false;
    }

    if (password.length < 8 || password.length > 30) {
      setErrorPassword({ 
        visible: true, 
        text: t('signup.errors.passwordLength')
      });
      return false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('signup.errors.confirmPasswordRequired') });
      return false;
    }

    if (password !== confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('signup.errors.passwordMismatch') });
      return false;
    }

    return true;
  };

  // Handle close popup and redirect to login
  const handleClosePopup = () => {
    setShowRecoveryPopup(false);
    navigate('/login');
  };

  // Handle copy recovery code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(recoveryCode);
    alert(t('signup.recovery.codeCopied'));
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateInputs()) {
      return;
    }

    if (!termsAccepted) {
      alert(t('signup.terms.pleaseAccept'));
      return;
    }

    if (!isHumanVerified) {
      alert(t('signup.verification.pleaseVerify'));
      return;
    }

    setLoading(true);

    const userData = {
      Username: username.toLowerCase().trim(),
      Password: password,
      Display: display,
      ProfileImage: profileImage
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${backendUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        
        if (responseData.recovery_code) {
          setRecoveryCode(responseData.recovery_code);
          setTempUserId(responseData.user_id);
          setTempUsername(userData.Username);
          setShowRecoveryPopup(true);
        } else {
          navigate('/login');
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          const error = errorData.detail || '';
          
          if (error === 'Username already exists') {
            setErrorUsername({ visible: true, text: t('signup.errors.usernameExists') });
          } else if (error.includes('list index out of range')) {
            alert(t('signup.errors.imageError'));
          } else {
            alert(`${t('signup.errors.unknownError')}: ${error}`);
          }
        } else {
          const text = await response.text();
          alert(`${t('signup.errors.serverResponse')}: ${text}`);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        alert(t('signup.errors.requestTimeout'));
      } else if (error.name === 'TypeError') {
        if (error.message.includes('fetch')) {
          alert(t('signup.errors.connectionErrorShort'));
        } else {
          alert(`${t('signup.errors.connectionErrorType')}: ${error.message}`);
        }
      } else {
        alert(`${t('signup.errors.unknownError')}: ${error.message}`);
      }
      
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recovery Code Popup Component
  const RecoveryCodePopup = () => (
    <div className="recovery-popup-overlay">
      <div className="recovery-popup">
        <div className="recovery-popup-header">
          <h2>{t('signup.recovery.title')}</h2>
          <button className="recovery-popup-close" onClick={handleClosePopup}>×</button>
        </div>
        
        <div className="recovery-popup-content">
          <p className="recovery-warning">
            ⚠️ {t('signup.recovery.warning')}
          </p>
          
          <p className="recovery-info">
            {t('signup.recovery.info')}
          </p>
          
          <div className="recovery-code-container">
            <div className="recovery-code-display">
              <code>{recoveryCode}</code>
            </div>
            <button 
              className="recovery-copy-button"
              onClick={handleCopyCode}
            >
              📋 {t('signup.recovery.copy')}
            </button>
          </div>
          
          <p className="recovery-security-note">
            🔒 {t('signup.recovery.securityNote')}
          </p>
          
          <p className="recovery-instruction">
            {t('signup.recovery.instruction')}
          </p>
          
          <button 
            className="recovery-confirm-button"
            onClick={handleClosePopup}
          >
            {t('signup.recovery.confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="signup-container">
      {/* Back Button */}
      <div 
        className="back-button" 
        onClick={() => navigate('/login')}
      >
        ←
      </div>

      {/* Page Container */}
      <div className="signup-background">
        <div className="signup-row">
          <div className="signup-form">
            {/* Random Account Info Banner */}
            <div className="random-account-banner">
              <span className="random-icon">🎲</span>
              <span className="random-text">{t('signup.randomAccountGenerated') || 'Random account credentials generated for you!'}</span>
            </div>

            {/* Profile Image Upload */}
            <div className="profile-image-container">
              <img 
                src={profileImageSrc} 
                alt={t('signup.profileImage')} 
                className="profile-image"
                onClick={() => document.getElementById('profile-upload').click()}
              />
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Username Input */}
            <input
              type="text"
              placeholder={t('signup.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="signup-input"
              autoComplete="off"
              disabled={loading}
            />
            
            {/* Error Username */}
            {errorUsername.visible && (
              <div className="error-message">
                {errorUsername.text}
              </div>
            )}

            {/* Password Input with Eye Icon */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('signup.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="signup-input password-input"
                autoComplete="off"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? (t('signup.hidePassword') || 'Hide password') : (t('signup.showPassword') || 'Show password')}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            
            {/* Error Password */}
            {errorPassword.visible && (
              <div className="error-message">
                {errorPassword.text}
              </div>
            )}

            {/* Confirm Password Input */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('signup.passwordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="signup-input password-input"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            {/* Error Confirm Password */}
            {errorConfirmPassword.visible && (
              <div className="error-message">
                {errorConfirmPassword.text}
              </div>
            )}

            {/* Display Name Input */}
            <input
              type="text"
              placeholder={t('signup.displayNamePlaceholder')}
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              className="signup-input"
              autoComplete="off"
              maxLength="500"
              disabled={loading}
            />

            {/* Regenerate Button */}
            <button
              type="button"
              className="regenerate-btn"
              onClick={regenerateRandomCredentials}
              disabled={loading}
            >
              🔄 {t('signup.regenerate') || 'Regenerate credentials'}
            </button>

            {/* Human Verification Checkbox - фаъол нест то он даме ки корбар клик кунад */}
            <div className="verification-checkbox-container">
              <label className="verification-checkbox-label">
                <input
                  id="human-verification"
                  type="checkbox"
                  checked={isHumanVerified}
                  onChange={handleHumanVerificationCheckbox}
                  disabled={loading || isHumanVerified}
                />
                <span className="checkmark"></span>
                <span className="checkbox-text">{t('signup.verification.iAmHuman')}</span>
              </label>
              {isHumanVerified && (
                <span className="verified-badge">✓ {t('signup.verification.verified')}</span>
              )}
            </div>

            {/* Terms and Conditions Checkbox - фаъол нест то он даме ки корбар клик кунад */}
            <div className="verification-checkbox-container">
              <label className="verification-checkbox-label">
                <input
                  id="terms-agreement"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                <span className="checkbox-text">
                  {t('signup.terms.agree')}{' '}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="terms-link"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/privacy', '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {t('signup.terms.link')}
                  </a>
                </span>
              </label>
            </div>

            {/* Register Button */}
            <button 
              onClick={handleRegister}
              className="signup-button"
              disabled={loading || !isHumanVerified || !termsAccepted}
            >
              {loading ? t('signup.registering') : t('signup.registerButton')}
            </button>

            {/* Already have account? */}
            <div className="login-prompt">
              <span>{t('signup.alreadyHaveAccount')}</span>
              <Link to="/login" className="login-link">
                {t('signup.loginLink')}
              </Link>
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

      {/* Verification Modal */}
      {showVerificationModal && (
        <VerificationModal
          targetEmojis={targetEmojis}
          selectedEmojis={selectedEmojis}
          displayEmojis={displayEmojis}
          wrongAttempts={wrongAttempts}
          showSuccessMessage={showSuccessMessage}
          showFailureMessage={showFailureMessage}
          handleEmojiSelect={handleEmojiSelect}
          handleCloseModal={handleCloseModal}
          initializeVerification={initializeVerification}
          t={t}
        />
      )}

      {/* Recovery Code Popup */}
      {showRecoveryPopup && <RecoveryCodePopup />}
    </div>
  );
};

export default SignUp;