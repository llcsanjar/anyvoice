import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './EditProfile.css';

const EditProfile = ({ 
  backendUrl, 
  userId, 
  userIdFromMe, 
  username, 
  display, 
  avatar 
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  
  // State variables
  const [myUsername, setMyUsername] = useState(username || '');
  const [myDisplay, setMyDisplay] = useState(display || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState(avatar || '');
  
  // Error states
  const [errorUsername, setErrorUsername] = useState({ visible: false, text: '' });
  const [errorPassword, setErrorPassword] = useState({ visible: false, text: '' });
  const [errorConfirmPassword, setErrorConfirmPassword] = useState({ visible: false, text: '' });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Load initial data
  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!userId) return;
      
      try {
        setInitialLoading(true);
        
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
        };
        const token = getCookie('AuthToken');
        
        const response = await fetch(
          `${backendUrl}/get-account-info/${userId}?requester_id=${userIdFromMe || userId}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setPassword(data.password || '');
          setConfirmPassword(data.password || '');
        }
      } catch (err) {
        console.error('Error fetching account info:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchAccountInfo();
  }, [backendUrl, userId, userIdFromMe]);

  // Update when props change
  useEffect(() => {
    if (username) setMyUsername(username);
    if (display) setMyDisplay(display);
    if (avatar) setProfilePic(avatar);
  }, [username, display, avatar]);

  // Go back to previous page
  const handleGoBack = () => {
    navigate(`/@${username}`);
  };

  // Handle profile image click
  const handleProfilePicClick = () => {
    fileInputRef.current.click();
  };

  // Process and crop image
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

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(t('editProfile.errors.fileType'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(t('editProfile.errors.fileSize'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        processImage(e.target.result, (processedImage) => {
          setProfilePic(processedImage);
        });
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  // Validate inputs (same as SignUp)
  const validateInputs = () => {
    setErrorUsername({ visible: false, text: '' });
    setErrorPassword({ visible: false, text: '' });
    setErrorConfirmPassword({ visible: false, text: '' });

    const trimmedUsername = myUsername.toLowerCase().trim();
    
    // Validate username
    if (!trimmedUsername) {
      setErrorUsername({ visible: true, text: t('editProfile.errors.usernameRequired') });
      return false;
    }

    if (trimmedUsername.length < 5 || trimmedUsername.length > 15) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameLength')
      });
      return false;
    }

    if (!/[a-zA-Z]/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameLetter')
      });
      return false;
    }

    if (!/^[a-zA-Z0-9_]/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameStart')
      });
      return false;
    }

    if (trimmedUsername.startsWith('.') || trimmedUsername.endsWith('.')) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameDot')
      });
      return false;
    }

    if (/\.\./.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameDoubleDot')
      });
      return false;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
      setErrorUsername({ 
        visible: true, 
        text: t('editProfile.errors.usernameChars')
      });
      return false;
    }

    // Validate password
    if (!password) {
      setErrorPassword({ visible: true, text: t('editProfile.errors.passwordRequired') });
      return false;
    }

    if (password.length < 8 || password.length > 30) {
      setErrorPassword({ 
        visible: true, 
        text: t('editProfile.errors.passwordLength')
      });
      return false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('editProfile.errors.confirmPasswordRequired') });
      return false;
    }

    if (password !== confirmPassword) {
      setErrorConfirmPassword({ visible: true, text: t('editProfile.errors.passwordMismatch') });
      return false;
    }

    return true;
  };

  // Handle update profile
  const handleUpdateProfile = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    const userData = {
      Username: username,
      Password: password,
      Display: myDisplay,
      ProfileImage: profilePic,
      new_username: myUsername.toLowerCase().trim()
    };

    try {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      const token = getCookie('AuthToken');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${backendUrl}/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(userData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        navigate(`/@${myUsername.toLowerCase().trim()}`);
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          const error = errorData.detail || '';
          
          if (error === 'Username already exists') {
            setErrorUsername({ visible: true, text: t('editProfile.errors.usernameExists') });
          } else if (error === 'User not found') {
            alert(t('editProfile.errors.userNotFound'));
          } else if (error.includes('list index out of range')) {
            alert(t('editProfile.errors.imageError'));
          } else {
            alert(`${t('editProfile.errors.unknownError')}: ${error}`);
          }
        } else {
          const text = await response.text();
          alert(`${t('editProfile.errors.serverResponse')}: ${text}`);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        alert(t('editProfile.errors.requestTimeout'));
      } else if (error.name === 'TypeError') {
        if (error.message.includes('fetch')) {
          alert(t('editProfile.errors.connectionErrorShort'));
        } else {
          alert(`${t('editProfile.errors.connectionErrorType')}: ${error.message}`);
        }
      } else {
        alert(`${t('editProfile.errors.unknownError')}: ${error.message}`);
      }
      
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (initialLoading) {
    return (
      <div className="edit-profile-container">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{t('editProfile.loading')}</p>
        </div>
      </div>
    );
  }

  // Main edit profile page
  return (
    <div className="edit-profile-container">
      {/* Back Button */}
      <div 
        className="back-button"
        onClick={handleGoBack}
      >
        ←
      </div>

      {/* Main Form */}
      <div className="form-wrapper">
        <div className="form-container">
          <div className="form-content">
            
            {/* Profile Image */}
            <div className="profile-pic-container">
              <img
                src={profilePic}
                alt={t('editProfile.profileImage')}
                className="profile-pic"
                onClick={handleProfilePicClick}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            {/* Username Input */}
            <div className="input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder={t('editProfile.usernamePlaceholder')}
                value={myUsername}
                onChange={(e) => setMyUsername(e.target.value)}
                autoComplete="off"
                disabled={loading}
              />
              {errorUsername.visible && (
                <div className="error-label">{errorUsername.text}</div>
              )}
            </div>

            {/* Password Input */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('editProfile.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                autoComplete="off"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? (t('editProfile.hidePassword') || 'Hide password') : (t('editProfile.showPassword') || 'Show password')}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>

              {errorPassword.visible && (
                <div className="error-label">{errorPassword.text}</div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('editProfile.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                autoComplete="off"
                disabled={loading}
              />

              {errorConfirmPassword.visible && (
                <div className="error-label">{errorConfirmPassword.text}</div>
              )}
            </div>

            {/* Display Name Input */}
            <div className="input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder={t('editProfile.displayNamePlaceholder')}
                value={myDisplay}
                onChange={(e) => setMyDisplay(e.target.value)}
                autoComplete="off"
                maxLength="500"
                disabled={loading}
              />
            </div>

            {/* Update Button */}
            <button
              className="update-button"
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? t('editProfile.updating') : t('editProfile.update')}
            </button>

          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default EditProfile;