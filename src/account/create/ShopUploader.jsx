import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ShopUploader.css';

const ShopUploader = ({ backendUrl, userId, shopingName, shopingId }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [thumbnailImage, setThumbnailImage] = useState('');
  const [oldThumbnailImage, setOldThumbnailImage] = useState('');
  const [shopName, setShopName] = useState('');
  const [oldShopName, setOldShopName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [oldDisplayName, setOldDisplayName] = useState('');
  const [shopData, setShopData] = useState('');
  const [oldShopData, setOldShopData] = useState('');
  
  const [advertisementEnabled, setAdvertisementEnabled] = useState(false);
  const [advertisementCount, setAdvertisementCount] = useState(0);
  const [originalAdvertisementEnabled, setOriginalAdvertisementEnabled] = useState(false);
  const [originalAdvertisementCount, setOriginalAdvertisementCount] = useState(0);

  const [errorImage, setErrorImage] = useState('');
  const [errorName, setErrorName] = useState('');
  const [errorDisplay, setErrorDisplay] = useState('');
  const [errorData, setErrorData] = useState('');
  const [errorAdvCount, setErrorAdvCount] = useState('');

  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (shopingName && shopingId) {
      loadPostData(shopingName);
    }
  }, [shopingName, shopingId]);

  const loadPostData = async () => {
    setIsDownloadingData(true);
    try {
      const response = await fetch(`${backendUrl}/post-shoping/${encodeURIComponent(shopingId)}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Мағоза ёфт нашуд - ин ҳолати сохтани мағозаи нав аст
          return;
        }
        throw new Error('Network response was not ok');
      }
      const data = await response.json();

      setShopName(data.shoping_name || '');
      setOldShopName(data.shoping_name || '');
      setDisplayName(data.shoping_display || '');
      setOldDisplayName(data.shoping_display || '');
      setShopData(data.data_of_shoping || '');
      setOldShopData(data.data_of_shoping || '');
      
      // Нигоҳ доштани ҳолати аслии таблиғ
      const enabled = data.advertisement_checkbox || false;
      const count = data.advertisement_count || 0;
      
      setAdvertisementEnabled(enabled);
      setOriginalAdvertisementEnabled(enabled);
      setAdvertisementCount(count);
      setOriginalAdvertisementCount(count);

      if (data.thumbnail) {
        const imageUrl = `data:image/jpeg;base64,${data.thumbnail}`;
        setThumbnailImage(imageUrl);
        setOldThumbnailImage(imageUrl);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      // Хатогиро пинҳон мекунем, зеро ин метавонад ҳолати сохтани мағозаи нав бошад
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const size = Math.min(img.width, img.height);
        const xOffset = (img.width - size) / 2;
        const yOffset = (img.height - size) / 2;

        canvas.width = 256;
        canvas.height = 256;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 256, 256);
        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, 256, 256);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setThumbnailImage(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteThumbnail = () => setThumbnailImage('');

  const generateUploadId = () => Math.random().toString(36).substring(2, 12);

  const connectWebsocket = (uploadId) => {
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const baseUrl = backendUrl.replace(/^https?:\/\//, '');
    const uri = `${wsScheme}${baseUrl}/ws/upload-progress-for-shop/${uploadId}`;
    
    const ws = new WebSocket(uri);
    ws.onmessage = (event) => {
      if (event.data === 'ping') return;
      const progress = parseFloat(event.data);
      setUploadProgress(progress);
      if (progress >= 100) ws.close();
    };
    ws.onerror = () => alert(t('shopUploader.errors.networkError'));
  };

  const validateForm = () => {
    let isValid = true;
    setErrorImage(''); setErrorName(''); setErrorDisplay(''); setErrorData(''); setErrorAdvCount('');

    const name = shopName.trim().toLowerCase();

    if (!thumbnailImage) {
      setErrorImage(t('shopUploader.errors.imageRequired'));
      isValid = false;
    } else if (!name) {
      setErrorName(t('shopUploader.errors.nameRequired'));
      isValid = false;
    } else {
      const hasLetter = /[a-zA-Z]/.test(name);
      const isAlnumOrUnderscoreStart = /^[a-zA-Z0-9_]/.test(name);
      const invalidChars = /[^a-zA-Z0-9_.]/.test(name);
      
      if (name.length < 3 || name.length > 30 || !hasLetter || !isAlnumOrUnderscoreStart || 
          name.startsWith('.') || name.endsWith('.') || name.includes('..') || invalidChars) {
        setErrorName(t('shopUploader.errors.nameInvalid'));
        isValid = false;
      }
    }

    if (!displayName) {
      setErrorDisplay(t('shopUploader.errors.displayRequired'));
      isValid = false;
    }

    if (!shopData) {
      setErrorData(t('shopUploader.errors.dataRequired'));
      isValid = false;
    }

    // Санҷиши миқдори таблиғ
    if (advertisementEnabled && (!advertisementCount || Number(advertisementCount) <= 0)) {
      setErrorAdvCount(t('shopUploader.errors.adCountRequired'));
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsUploading(true);
    setUploadProgress(0);
    const uploadId = generateUploadId();

    // Муайян кардани миқдори таблиғ барои фиристодан
    let advertisementCountToSend = 0;
    
    if (advertisementEnabled) {
      // Агар checkbox фаъол бошад, миқдори таблиғро фиристед
      advertisementCountToSend = Number(advertisementCount);
    } else {
      // Агар checkbox ғайрифаъол бошад, миқдори таблиғро ба 0 гузоред
      advertisementCountToSend = 0;
    }

    const payload = {
      user_id: userId,
      Thumbnail: thumbnailImage,
      ShopingName: shopName.trim().toLowerCase(),
      DisplayShoping: displayName,
      DataOfShoping: shopData,
      advertisement_count: advertisementCountToSend,
      advertisement_checkbox: advertisementEnabled,
      upload_id: uploadId,
    };

    // Агар shopingId мавҷуд бошад, пас ин таҳрири мағоза аст
    if (shopingId) {
      payload.shoping_id = shopingId;

      // Агар расм тағйир наёфта бошад, онро фиристода нашавад
      if (thumbnailImage === oldThumbnailImage) {
        payload.Thumbnail = null;
      }
      
      // АДАД: Агар checkbox ва миқдори таблиғ тағйир наёфта бошад, advertisement_count-ро фиристода нашавад
      if (advertisementEnabled === originalAdvertisementEnabled && 
          Number(advertisementCount) === originalAdvertisementCount) {
        // Тағйироте дар таблиғ нест, пас advertisement_count-ро аз payload хориҷ мекунем
        // то сервер пули такрорӣ нагирад
        delete payload.advertisement_count;
      } else {
        // Тағйирот ҳаст, пас миқдори навро фиристед
        // Боварӣ ҳосил кунед, ки агар checkbox ғайрифаъол бошад, миқдор 0 аст
        payload.advertisement_count = advertisementCountToSend;
      }
    }

    connectWebsocket(uploadId);

    // Муайян кардани endpoint ва method
    let endpoint, method;
    if (payload.shoping_id) {
      endpoint = `${backendUrl}/update-shoping`;
      method = 'PUT';
    } else {
      endpoint = `${backendUrl}/create-shoping`;
      method = 'POST';
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 200) {
        navigate(`/$${shopName.trim().toLowerCase()}`);
      } else if (response.status === 400) {
        setErrorName(t('shopUploader.errors.nameExists'));
      } else if (response.status === 408) {
        setErrorAdvCount(t('shopUploader.errors.insufficientFunds'));
      } else {
        alert(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      alert(t('shopUploader.errors.networkError'));
    } finally {
      setIsUploading(false);
    }
  };

  // Функсия барои бозгашт ба саҳифаи мувофиқ
  const handleBack = () => {
    if (shopingId || (shopingName && shopingName.trim() !== '')) {
      // Агар дар ҳолати таҳрир бошем, ба саҳифаи мағоза баргардем
      const targetName = shopName || shopingName;
      if (targetName && targetName.trim() !== '') {
        navigate(`/$${targetName.trim().toLowerCase()}`);
      } else {
        navigate('/create');
      }
    } else {
      navigate('/create');
    }
  };

  // ИСЛОҲ: Функсияи нави ҳаракати checkbox
  const handleAdvertisementToggle = (e) => {
    const isChecked = e.target.checked;
    setAdvertisementEnabled(isChecked);
    
    // Агар checkbox фаъол карда шавад, миқдори аслиро барқарор кунем
    if (isChecked && advertisementCount === 0 && originalAdvertisementCount > 0) {
      setAdvertisementCount(originalAdvertisementCount);
    }
    
    // Агар checkbox ғайрифаъол карда шавад, миқдорро 0 мекунем
    if (!isChecked) {
      setAdvertisementCount(0);
    }
  };

  return (
    <>
      <div className="shop-back-btn" onClick={handleBack} title={t('shopUploader.back')}>
        &#8592;
      </div>

      <div className="shop-main-wrapper">
        <div className="shop-app-container">
          <div className="shop-scrollable-content shop-custom-scrollbar">
            <div className="shop-card">
              <div className="shop-card-layout">
                
                {/* Image Section */}
                <div className="shop-image-section">
                  {thumbnailImage ? (
                    <div className="shop-thumbnail-preview-container">
                      <img src={thumbnailImage} alt="Thumbnail" className="shop-thumbnail-image" />
                      <button onClick={deleteThumbnail} className="shop-delete-thumbnail-btn">
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="shop-upload-placeholder">
                      <label className="shop-upload-label">
                        {t('shopUploader.form.selectImage')}
                        <input type="file" accept="image/*" className="shop-hidden-input" ref={fileInputRef} onChange={handleImageSelect} />
                      </label>
                    </div>
                  )}
                  {errorImage && <div className="shop-error-text">{errorImage}</div>}
                </div>

                {/* Form Section */}
                <div className="shop-form-section">
                  <div className="shop-input-group">
                    <input type="text" placeholder={t('shopUploader.form.shopNamePlaceholder')} maxLength="30" autoComplete="off"
                      value={shopName} onChange={(e) => setShopName(e.target.value)}
                      className="shop-form-input" />
                    {errorName && <div className="shop-error-text">{errorName}</div>}
                  </div>

                  <div className="shop-input-group">
                    <input type="text" placeholder={t('shopUploader.form.displayNamePlaceholder')} maxLength="500" autoComplete="off"
                      value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      className="shop-form-input" />
                    {errorDisplay && <div className="shop-error-text">{errorDisplay}</div>}
                  </div>

                  <div className="shop-input-group">
                    <textarea placeholder={t('shopUploader.form.shopDataPlaceholder')} maxLength="5000" autoComplete="off" rows="4"
                      value={shopData} onChange={(e) => setShopData(e.target.value)}
                      className="shop-form-textarea"></textarea>
                    {errorData && <div className="shop-error-text">{errorData}</div>}
                  </div>

                  {/* Таблиғ */}
                  <div className="shop-product-uploader-checkbox-group">
                    <label className="shop-product-uploader-checkbox-label">
                      <input
                        type="checkbox"
                        checked={advertisementEnabled}
                        onChange={handleAdvertisementToggle}
                      />
                      {t('shopUploader.form.advertise')}
                    </label>
                  </div>
                  
                  {advertisementEnabled && (
                    <>
                      <p className="shop-product-uploader-note">
                        {t('shopUploader.form.advertisementNote')}
                      </p>
                      
                      <div className="shop-product-uploader-form-group">
                        <input
                          type="number"
                          value={advertisementCount}
                          onChange={(e) => setAdvertisementCount(e.target.value)}
                          placeholder={t('shopUploader.form.advertisementCount')}
                          min="1"
                          className="shop-product-uploader-form-input"
                        />
                      </div>
                      {errorAdvCount && <div className="shop-error-text">{errorAdvCount}</div>}
                    </>
                  )}

                  <div className="shop-submit-section">
                    <button onClick={handleSubmit} className="shop-submit-btn">
                      {shopingId || (shopingName && shopingName.trim() !== '') ? t('shopUploader.form.update') : t('shopUploader.form.create')}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Overlay */}
      {isUploading && (
        <div className="shop-overlay shop-upload-overlay">
          <div className="shop-upload-modal">
            <div className="shop-upload-warning">
              {t('shopUploader.uploadNote')}
            </div>
            <div className="shop-upload-progress-text">
              {t('shopUploader.uploadProgress', { progress: uploadProgress.toFixed(1) })}
            </div>
            <div className="shop-progress-bar-container">
              <div className="shop-progress-bar-fill shop-stripe-bg" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Download Overlay */}
      {isDownloadingData && (
        <div className="shop-overlay shop-download-overlay">
          <div className="shop-spinner"></div>
        </div>
      )}
    </>
  );
};

export default ShopUploader;