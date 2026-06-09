import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ImageUploader.css';

const ImageUploader = ({ backendUrl, userId, imageId = null, link = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actualLink = link
  
  const fileInputRef = useRef(null);
  
  // State ҳо
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [allowComments, setAllowComments] = useState(true);
  const [advertisementEnabled, setAdvertisementEnabled] = useState(false);
  const [advertisementCount, setAdvertisementCount] = useState(0);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [oldImages, setOldImages] = useState([]);
  const [oldImagesId, setOldImagesId] = useState([]);
  const [linkImage, setLinkImage] = useState('');
  const [postId, setPostId] = useState(imageId);
  const [uploadId, setUploadId] = useState('');
  const [websocket, setWebsocket] = useState(null);
  const [countAdvertisement, setCountAdvertisement] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState({}); // Барои нигоҳ доштани расмҳои боршуда
  const [postInfo, setPostInfo] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [postOwner, setPostOwner] = useState(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [newImages, setNewImages] = useState([]); // Расмҳои нав барои навсозӣ
  const [deletedImageIds, setDeletedImageIds] = useState([]); // Барои нигоҳ доштани ID-и расмҳои ҳазфшуда

  // Хатогиҳо
  const addError = (message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type: 'error' }]);

    // Барои тоза кардани автоматии хатогӣ пас аз 3 сония
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Эффект барои боркунии маълумоти пост агар imageId ё link дода шуда бошад
  useEffect(() => {
    if (imageId) {
      loadPostData(imageId);
    } else if (actualLink) {
      checkLinkAndLoadPost(actualLink);
    }
  }, [imageId, actualLink]);

  // Эффект барои тоза кардани WebSocket
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  // Санҷиши link ва боркунии пост
  const checkLinkAndLoadPost = async (link) => {
    setIsLoading(true);
    try {
      // Аввал link-ро санҷед
      const checkResponse = await fetch(`${backendUrl}/check-link-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, user_id: userId })
      });

      if (!checkResponse.ok) {
        if (checkResponse.status === 403) {
          addError(t('imageUploader.errors.accessDenied'));
        } else if (checkResponse.status === 404) {
          addError(t('imageUploader.errors.invalidLink'));
        } else {
          addError(t('imageUploader.errors.linkCheckError'));
        }
        setIsLoading(false);
        return;
      }

      const linkInfo = await checkResponse.json();
      
      // Нигоҳ доштани маълумоти соҳиби пост
      setPostOwner({
        id: linkInfo.user_id,
        username: linkInfo.username,
        display: linkInfo.display,
        avatar: linkInfo.avatar
      });
      
      // Санҷидани он ки оё корбари ҷорӣ соҳиби пост аст
      setIsPostOwner(linkInfo.user_id === userId);
      
      // Боркунии маълумоти пурраи пост
      await loadPostData(linkInfo.image_id);
      
    } catch (err) {
      addError(t('imageUploader.errors.connectionError'));
      console.error('Error checking link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPostData = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/post-image/${id}`);
      if (!response.ok) throw new Error(t('imageUploader.errors.postLoadError'));
      
      const data = await response.json();
      
      const imageLinkServer = data.link;
      setLinkImage(imageLinkServer.split('/image/').pop());
      setTitle(data.title);
      setDescription(data.description);
      setVisibility(data.visibility);
      setAllowComments(data.allow_comments);
      setAdvertisementEnabled(data.advertisement_checkbox);
      setCountAdvertisement(data.advertisement_count || 0);
      setAdvertisementCount(data.advertisement_count || 0);
      setOldImages(data.images || []);
      setOldImagesId(data.images_id || []);
      setPostId(id);
      
      // Нигоҳ доштани рӯйхати корбарони блокшуда
      setBlockedUsers(data.block_users_list || []);
      
      // Танзими images барои нишон додан (танҳо метамаълумот)
      const imageMetadata = (data.images || []).map((img, index) => ({
        id: `old-${index}`,
        url: img,
        isLoaded: false,
        isOld: true
      }));
      setImages(imageMetadata);
      
      // Боркурии расми аввал
      if (imageMetadata.length > 0) {
        loadImageAtIndex(0, imageMetadata);
      }
      
      if (data.collaboration_accounts?.length > 0) {
        fetchAccountsByIds(data.collaboration_accounts);
      }
      
    } catch (err) {
      addError(t('imageUploader.errors.connectionError'));
      console.error('Error loading post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Боркурии расм аз рӯи индекс
  const loadImageAtIndex = async (index, imagesList = images) => {
    if (!imagesList[index] || imagesList[index].isLoaded) return;
    
    try {
      // Агар расм қаблан бор шуда бошад, аз хотира гирем
      if (loadedImages[imagesList[index].id]) {
        const updatedImages = [...imagesList];
        updatedImages[index] = {
          ...updatedImages[index],
          url: loadedImages[imagesList[index].id],
          isLoaded: true
        };
        setImages(updatedImages);
        return;
      }
      
      // Боркурии расм аз сервер
      const imageUrl = imagesList[index].url;
      if (imageUrl.startsWith('data:')) {
        // Агар расм аллакай base64 бошад, мустақиман истифода барем
        const updatedImages = [...imagesList];
        updatedImages[index] = {
          ...updatedImages[index],
          isLoaded: true
        };
        setImages(updatedImages);
        setLoadedImages(prev => ({
          ...prev,
          [imagesList[index].id]: imageUrl
        }));
      } else {
        // Боркурии расм аз сервер
        const response = await fetch(`${backendUrl}/get-image-by-id/${postId}?index=${index}&user_id=${userId}`);
        if (!response.ok) throw new Error(t('imageUploader.errors.imageLoadError'));
        
        const data = await response.json();
        const imageBase64 = data.images_data[0];
        
        const updatedImages = [...imagesList];
        updatedImages[index] = {
          ...updatedImages[index],
          url: `data:image/jpeg;base64,${imageBase64}`,
          isLoaded: true
        };
        setImages(updatedImages);
        setLoadedImages(prev => ({
          ...prev,
          [imagesList[index].id]: `data:image/jpeg;base64,${imageBase64}`
        }));
      }
    } catch (err) {
      console.error('Error loading image:', err);
      addError(t('imageUploader.errors.imageLoadError'));
    }
  };

  // Вақте ки индекс тағйир меёбад, расми навро бор кунем
  useEffect(() => {
    if (images.length > 0 && currentImageIndex < images.length) {
      loadImageAtIndex(currentImageIndex);
    }
  }, [currentImageIndex, images.length]);

  const fetchAccountsByIds = async (ids) => {
    try {
      const response = await fetch(`${backendUrl}/account/by_ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!response.ok) throw new Error(t('imageUploader.errors.accountLoadError'));
      const accounts = await response.json();
      setSelectedAccounts(accounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Функсияи handleUpload
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Санҷиш барои ҳадди файли 5 МБ
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      addError(t('imageUploader.errors.maxFileSize', { size: MAX_SIZE_MB }));
      e.target.value = null;
      return;
    }

    if (images.length >= 10) {
      addError(t('imageUploader.errors.maxImages'));
      e.target.value = null;
      return;
    }

    setIsProcessingFile(true);
    setProcessingProgress(0);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProcessingProgress(percent);
      }
    };

    reader.onloadend = () => {
      const previewUrl = URL.createObjectURL(file);
      const newImageId = `new-${Date.now()}-${Math.random()}`;

      const newImage = {
        id: newImageId,
        file,
        previewUrl,
        isLoaded: true,
        isNew: true
      };

      setImages(prev => [...prev, newImage]);
      setNewImages(prev => [...prev, newImage]);
      setCurrentImageIndex(images.length);

      setIsProcessingFile(false);
      setProcessingProgress(0);
    };

    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const slideLeft = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const slideRight = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  // функсияи deleteCurrentImage
  const deleteCurrentImage = () => {
    const deletedImage = images[currentImageIndex];
    
    // Агар расм кӯҳна бошад (аз сервер), ID-и онро ба deletedImageIds илова кунем
    if (!deletedImage.isNew && deletedImage.id) {
      // Барои расмҳои кӯҳна, ID-и аслии онро аз oldImagesId мегирем
      const imageIdToDelete = oldImagesId[currentImageIndex];
      if (imageIdToDelete) {
        setDeletedImageIds(prev => [...prev, imageIdToDelete]);
      }
    }
    
    // Агар расм нав бошад, аз newImages низ нест кунем
    if (deletedImage.isNew) {
      setNewImages(prev => prev.filter(img => img.id !== deletedImage.id));
    }
    
    // Агар расми кӯҳна бошад ва мо онро ҳазф мекунем, 
    // онро аз oldImages ва oldImagesId низ бояд нест кунем
    if (!deletedImage.isNew) {
      // Индексро барои ҳазф аз oldImagesId ва oldImages истифода мебарем
      setOldImages(prev => prev.filter((_, index) => index !== currentImageIndex));
      setOldImagesId(prev => prev.filter((_, index) => index !== currentImageIndex));
    }
    
    setImages(prev => prev.filter((_, index) => index !== currentImageIndex));
    setCurrentImageIndex(prev => Math.max(0, Math.min(prev, images.length - 2)));
  };

  const handleVisibilityChange = (e) => {
    const newVisibility = e.target.value;
    setVisibility(newVisibility);
    
    if (newVisibility === 'private') {
      setAdvertisementEnabled(false);
      setAdvertisementCount(0);
      setSelectedAccounts([]);
    }
  };

  const handleAdvertisementToggle = (e) => {
    const enabled = e.target.checked;
    setAdvertisementEnabled(enabled);
    if (!enabled) {
      setAdvertisementCount(0);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      // Барои ҷустуҷӯ рӯйхати корбарони блокшударо ирсол мекунем
      const response = await fetch(
        `${backendUrl}/accounts-block?user_id=${userId}&search=${encodeURIComponent(searchTerm)}&exclude_ids=${blockedUsers}`,
        { timeout: 30000 }
      );
      
      if (!response.ok) throw new Error(t('imageUploader.errors.searchError'));
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.message === 'No accounts found for your search.') {
        setSearchResults([]);
      }
      
    } catch (err) {
      addError(t('imageUploader.errors.connectionError'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendButton = (account) => {
    const existingIndex = selectedAccounts.findIndex(a => a.id === account.id);
    
    if (existingIndex >= 0) {
      setSelectedAccounts(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      if (selectedAccounts.length >= 10) {
        addError(t('imageUploader.errors.maxImages'));
        return;
      }
      setSelectedAccounts(prev => [...prev, account]);
    }
  };

  // Функсияи handlePost
  const handlePost = async () => {
    if (images.length === 0) {
      addError(t('imageUploader.errors.selectImage'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    // Пайвастшавӣ ба WebSocket барои прогресс
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const wsUrl = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/upload-progress-for-image/${uploadIdGenerated}`;
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(t('imageUploader.errors.webSocketError')));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        setWebsocket(ws);
        resolve();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    ws.onmessage = (event) => {
      if (event.data === 'ping') return;
      
      const progress = parseFloat(event.data);
      setUploadProgress(progress);
      
      if (progress >= 100) {
        setTimeout(() => ws.close(), 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("visibility", visibility);
    formData.append("allow_comments", allowComments);
    formData.append("upload_id", uploadIdGenerated);
    
    if (advertisementEnabled && visibility !== 'private') {
      formData.append("advertisement_checkbox", "true");
      formData.append("advertisement_count", advertisementCount);
    } else {
      formData.append("advertisement_checkbox", "false");
      formData.append("advertisement_count", "0");
    }

    selectedAccounts.forEach(account => {
      if (account?.id) {
        formData.append("collaboration_accounts", account.id);
      }
    });

    // Танҳо расмҳои навро ба сервер мефиристем
    const imagesToUpload = images.filter(img => img.isNew && img.file);
    
    imagesToUpload.forEach((img) => {
      if (img.file) {
        formData.append("images", img.file);
      }
    });

    try {
      const response = await fetch(`${backendUrl}/save_post_image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 408) {
          addError(t('imageUploader.errors.insufficientFunds'));
        } else {
          throw new Error(errorData.detail || t('imageUploader.errors.uploadFailed'));
        }
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      setUploadProgress(100);
      navigate(`/image/${data.post_link}`);

    } catch (err) {
      console.error('Upload error:', err);
      addError(err.message || t('imageUploader.errors.uploadFailed'));
      ws.close();
    } finally {
      setIsUploading(false);
    }
  };

  // функсияи handleUpdatePost
  const handleUpdatePost = async () => {
    if (images.length === 0) {
      addError(t('imageUploader.errors.selectImage'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    // 🔹 WebSocket connection
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const wsUrl = `${wsScheme}${backendUrl
      .replace('https://', '')
      .replace('http://', '')}/ws/upload-progress-for-image/${uploadIdGenerated}`;

    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(t('imageUploader.errors.webSocketError')));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setWebsocket(ws);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    ws.onmessage = (event) => {
      if (event.data === 'ping') return;

      const progress = parseFloat(event.data);
      setUploadProgress(progress);

      if (progress >= 100) {
        setTimeout(() => ws.close(), 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket update error:', error);
    };

    // 🔹 FormData
    const formData = new FormData();
    formData.append("post_id", postId);
    formData.append("upload_id", uploadIdGenerated);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("visibility", visibility);
    formData.append("allow_comments", allowComments);

    // 🔹 Илова кардани ID-и расмҳои ҳазфшуда - ТАҒЙИР ДОДА ШУД
    if (deletedImageIds.length > 0) {
      // Ба JSON табдил дода, ба FormData илова мекунем
      formData.append("deleted_images", JSON.stringify(deletedImageIds));
    } else {
      // Агар ҳамаи расмҳои кӯҳна ҳазф шуда бошанд, 
      // мо бояд инро ба сервер равон кунем
      const allOldImageIds = oldImagesId.filter((_, index) => 
        !images.some(img => img.isOld && img.id === `old-${index}`)
      );
      if (allOldImageIds.length > 0) {
        formData.append("deleted_images", JSON.stringify(allOldImageIds));
      }
    }

    // 🔹 Advertisement
    if (visibility !== 'private' && advertisementEnabled) {
      formData.append("advertisement_checkbox", "true");
      formData.append("advertisement_count", advertisementCount || "0");
    } else {
      formData.append("advertisement_checkbox", "false");
      formData.append("advertisement_count", "0");
    }

    // 🔹 Collaboration (танҳо агар public бошад)
    if (visibility !== 'private') {
      selectedAccounts.forEach(account => {
        if (account?.id) {
          formData.append("collaboration_accounts", account.id);
        }
      });
    }

    // 🔹 Танҳо расмҳои нав
    const imagesToUpload = images.filter(img => img.isNew && img.file);

    imagesToUpload.forEach(img => {
      if (img.file) {
        formData.append("images", img.file);
      }
    });

    try {
      const response = await fetch(`${backendUrl}/update_post_image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 408) {
          addError(t('imageUploader.errors.insufficientFunds'));
        } else {
          throw new Error(errorData.detail || t('imageUploader.errors.updateFailed'));
        }
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      setUploadProgress(100);

      navigate(`/image/${linkImage}`);

    } catch (err) {
      console.error('Update error:', err);
      addError(err.message || t('imageUploader.errors.updateFailed'));
      ws.close();
    } finally {
      setIsUploading(false);
      setDeletedImageIds([]); // Тоза кардани рӯйхати ID-ҳои ҳазфшуда
    }
  };

  // Рендери компонент
  return (
    <div className="image-uploader-container">
      {/* Loading overlay */}
      {isLoading && (
        <div className="image-uploader-loading-overlay">
          <div className="image-uploader-loading-spinner" />
        </div>
      )}

      {/* Back button */}
      <button
        className="image-uploader-back-button"
        onClick={() => navigate(imageId || actualLink ? `/image/${linkImage || actualLink}` : `/create`)}
        title={t('imageUploader.back')}
      >
        ←
      </button>

      <div className="notifications-error-container">
        {notifications.map(notification => (
          <div key={notification.id} className="notification-error error">
            {notification.message}
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>×</button>
          </div>
        ))}
      </div>

      <div className="image-uploader-main-card">
        <div className="image-uploader-content-wrapper">
          {/* Left column - Image section */}
          <div className="image-uploader-image-section">
            <div className="image-uploader-image-container">
              <div className="image-uploader-image-wrapper">
                {images.length > 0 && images[currentImageIndex] && (
                  <>
                    {images[currentImageIndex].isLoaded ? (
                      <img
                        src={images[currentImageIndex].url || images[currentImageIndex].previewUrl}
                        alt="Post"
                        className="image-uploader-post-image"
                      />
                    ) : (
                      <div className="image-uploader-loading-placeholder">
                        <div className="image-uploader-loading-spinner-small" />
                        <p>{t('imageUploader.loadingImage')}</p>
                      </div>
                    )}
                  </>
                )}
                
                {images.length > 1 && currentImageIndex > 0 && (
                  <button
                    className="image-uploader-nav-button image-uploader-left-button"
                    onClick={slideLeft}
                  >
                    ‹
                  </button>
                )}
                
                {images.length > 1 && currentImageIndex < images.length - 1 && (
                  <button
                    className="image-uploader-nav-button image-uploader-right-button"
                    onClick={slideRight}
                  >
                    ›
                  </button>
                )}
                
                {images.length > 0 && (isPostOwner || !actualLink) && (
                  <button
                    className="image-uploader-delete-button"
                    onClick={deleteCurrentImage}
                  >
                    ×
                  </button>
                )}
              </div>
              
              <p className="image-uploader-image-counter">
                {images.length > 0 
                  ? t('imageUploader.imageCounter', { current: currentImageIndex + 1, total: images.length }) 
                  : t('imageUploader.imageCounter', { current: 0, total: 0 })}
              </p>
              
              {/* Progress bar барои коркарди файл */}
              {isProcessingFile && (
                <div className="image-uploader-processing-progress">
                  <p className="image-uploader-progress-label">
                    {t('imageUploader.processingProgress', { progress: processingProgress })}
                  </p>
                  <div className="image-uploader-progress-bar">
                    <div
                      className="image-uploader-progress-fill"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {(isPostOwner || !actualLink) && (
                <div className="image-uploader-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                    id="image-uploader-file-upload"
                    disabled={isProcessingFile}
                  />
                  <label 
                    htmlFor="image-uploader-file-upload" 
                    className={`image-uploader-upload-label ${isProcessingFile ? 'disabled' : ''}`}
                  >
                    {isProcessingFile ? t('imageUploader.processing') : t('imageUploader.selectImages')}
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Right column - Form section */}
          {(isPostOwner || !actualLink) && (
            <div className="image-uploader-form-section">
              <div className="image-uploader-form-group">
                <label>{t('imageUploader.form.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('imageUploader.form.titlePlaceholder')}
                  maxLength={500}
                  className="image-uploader-form-input"
                />
              </div>
              
              <div className="image-uploader-form-group">
                <label>{t('imageUploader.form.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('imageUploader.form.descriptionPlaceholder')}
                  maxLength={5000}
                  rows={4}
                  className="image-uploader-form-textarea"
                />
              </div>
              
              <div className="image-uploader-form-group">
                <label>{t('imageUploader.form.visibility')}</label>
                <select
                  value={visibility}
                  onChange={handleVisibilityChange}
                  className="image-uploader-form-select"
                >
                  <option value="public">{t('imageUploader.form.public')}</option>
                  <option value="private">{t('imageUploader.form.private')}</option>
                  <option value="with_link">{t('imageUploader.form.withLink')}</option>
                </select>
              </div>
              
              <div className="image-uploader-checkbox-group">
                <label className="image-uploader-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                  />
                  {t('imageUploader.form.allowComments')}
                </label>
              </div>
              
              {visibility !== 'private' && (
                <>
                  <div className="image-uploader-checkbox-group">
                    <label className="image-uploader-checkbox-label">
                      <input
                        type="checkbox"
                        checked={advertisementEnabled}
                        onChange={handleAdvertisementToggle}
                      />
                      {t('imageUploader.form.advertise')}
                    </label>
                  </div>
                  
                  {advertisementEnabled && (
                    <>
                      <p className="image-uploader-advertisement-note">
                        {t('imageUploader.form.advertisementNote')}
                      </p>
                      
                      <div className="image-uploader-form-group">
                        <input
                          type="number"
                          value={advertisementCount}
                          onChange={(e) => setAdvertisementCount(e.target.value)}
                          placeholder={t('imageUploader.form.advertisementCount')}
                          min="0"
                          className="image-uploader-form-input"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {visibility !== 'private' && (
                <div className="image-uploader-collaboration-section">
                  <button
                    className="image-uploader-collaboration-button"
                    onClick={() => setShowPopup(true)}
                  >
                    {t('imageUploader.form.collaborate')}
                  </button>
                  
                  {selectedAccounts.length > 0 && (
                    <div className="image-uploader-selected-accounts">
                      <p>{t('imageUploader.form.selectedAccounts', { count: selectedAccounts.length })}</p>
                      {selectedAccounts.map(account => (
                        <div key={account.id} className="account-item">
                          <img src={account.avatar} alt={account.username} />
                          <div className="account-info">
                            <div className="account-display">@{account.username}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="image-uploader-action-buttons">
                <button
                  className="image-uploader-post-button"
                  onClick={imageId || actualLink ? handleUpdatePost : handlePost}
                  disabled={isUploading || images.length === 0 || isProcessingFile}
                >
                  {imageId || actualLink ? t('imageUploader.form.update') : t('imageUploader.form.post')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collaboration popup */}
        {showPopup && (
          <div className="image-uploader-popup-overlay" onClick={() => setShowPopup(false)}>
            <div className="image-uploader-popup-content" onClick={e => e.stopPropagation()}>
              <div className="image-uploader-search-container">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('imageUploader.collaboration.searchPlaceholder')}
                  className="image-uploader-search-input"
                />
                <button
                  className="image-uploader-search-button"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  🔍
                </button>
              </div>

              <div className="image-uploader-search-results">
                {isSearching ? (
                  <p className="image-uploader-text-center">{t('imageUploader.collaboration.searching')}</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(account => {
                    const isSelected = selectedAccounts.some(a => a.id === account.id);
                    return (
                      <div key={account.id} className="account-item">
                        <img src={account.avatar} alt={account.username} />
                        <div className="account-info">
                          <div className="account-display">@{account.username}</div>
                        </div>
                        <button
                          className={`share-button ${isSelected ? 'shared' : ''}`}
                          onClick={() => handleSendButton(account)}
                        >
                          {isSelected ? t('imageUploader.collaboration.cancel') : t('imageUploader.collaboration.send')}
                        </button>
                      </div>
                    );
                  })
                ) : null}
              </div>
              
              <button
                className="image-uploader-close-popup-button"
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="image-uploader-upload-progress-overlay">
            <div className="image-uploader-progress-content">
              <p className="image-uploader-progress-label">
                {t('imageUploader.uploadProgress', { progress: uploadProgress })}
              </p>
              <div className="image-uploader-progress-bar">
                <div
                  className="image-uploader-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;