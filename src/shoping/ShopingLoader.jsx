import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductLoader from './ProductLoader';
import './ShopingLoader.css';

const ShopingLoader = ({
  shopingId,
  backendUrl,
  userId,
  avatarPath,
  myUsername,
  myDisplay,
  userIdOfShoping,
  fullContainerRef,
  isAd = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [shopingData, setShopingData] = useState(null);
  const [shopingDataUrl, setShopingDataUrl] = useState('');
  const [shopingName, setShopingName] = useState('');
  const [shopingDisplay, setShopingDisplay] = useState('');
  const [countViews, setCountViews] = useState(0);
  const [countLikes, setCountLikes] = useState(0);
  const [countProducts, setCountProducts] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [shopingLoadedSuccessfully, setShopingLoadedSuccessfully] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewStartTime, setViewStartTime] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [clientActive, setClientActive] = useState(true);
  
  // Thumbnail data state
  const [thumbnailUsername, setThumbnailUsername] = useState('');
  const [thumbnailAvatar, setThumbnailAvatar] = useState('');
  const [thumbnailUploadAt, setThumbnailUploadAt] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  
  // Refs
  const containerRef = useRef(null);
  const innerDivRef = useRef(null);
  const loadingSpinnerRef = useRef(null);
  const noProductLabelRef = useRef(null);
  const likeIconRef = useRef(null);
  const imageElementRef = useRef(null);
  const modalImageElementRef = useRef(null);
  const modalShopingNameRef = useRef(null);
  const modalShopingDisplayRef = useRef(null);
  const ownerUsernameLabelRef = useRef(null);
  const viewsPostLabelRef = useRef(null);
  const productsPostLabelRef = useRef(null);
  const likesPostLabelRef = useRef(null);
  const dataOfShopingRef = useRef(null);
  const timeOfPostLabelRef = useRef(null);
  
  // Thumbnail refs
  const thumbnailTitleRef = useRef(null);
  const thumbnailDisplayRef = useRef(null);
  const thumbnailUsernameRef = useRef(null);
  const thumbnailAvatarRef = useRef(null);
  const thumbnailViewsRef = useRef(null);
  const thumbnailProductsRef = useRef(null);
  const thumbnailLikesRef = useRef(null);
  const thumbnailTimeRef = useRef(null);

  // Generate unique IDs
  const instanceId = useRef(`shoping-${Math.random().toString(36).substr(2, 9)}`);
  const containerId = `shoping-container-${instanceId.current}`;
  const innerId = `shoping-inner-${instanceId.current}`;

  // Load shoping data
  useEffect(() => {
    if (shopingId) {
      loadShopingData();
    }
    
    return () => {
      // Cleanup WebSocket on unmount
      setClientActive(false);
      if (websocket) {
        websocket.close();
      }
    };
  }, [shopingId]);

  const loadShopingData = async () => {
    setDataLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/get-shoping-preview/${shopingId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const imageUrl = `data:image/jpeg;base64,${data.shoping_thumbnail}`;
      setShopingDataUrl(imageUrl);
      
      if (modalImageElementRef.current) {
        modalImageElementRef.current.src = imageUrl;
      }
      
      setShopingName(data.shoping_name || '');
      setShopingDisplay(data.shoping_display || '');
      
      const rawUsername = data.display || data.username || '';
      const username = rawUsername.startsWith('@')
        ? rawUsername
        : `@${rawUsername}`;

      setThumbnailUsername(username);
      setOwnerUsername(`@${data.username || ''}`);

      // Set avatar
      if (data.avatar) {
        const avatarUrl = `data:image/jpeg;base64,${data.avatar}`;
        setThumbnailAvatar(avatarUrl);
      }
      
      // Set upload time
      if (data.upload_at) {
        setThumbnailUploadAt(data.upload_at);
      }
      
      // Update modal refs
      if (modalShopingNameRef.current) {
        modalShopingNameRef.current.textContent = data.shoping_name || '';
      }
      
      if (modalShopingDisplayRef.current) {
        modalShopingDisplayRef.current.textContent = data.shoping_display || '';
      }
      
      if (ownerUsernameLabelRef.current) {
        ownerUsernameLabelRef.current.textContent = `@${data.username || ''}`;
      }
      
      setCountViews(data.count_views || 0);
      if (viewsPostLabelRef.current) {
        viewsPostLabelRef.current.textContent = data.count_views || 0;
      }
      
      setCountProducts(data.count_products || 0);
      if (productsPostLabelRef.current) {
        productsPostLabelRef.current.textContent = data.count_products || 0;
      }
      
      setCountLikes(data.count_likes || 0);
      if (likesPostLabelRef.current) {
        likesPostLabelRef.current.textContent = data.count_likes || 0;
      }
      
      if (dataOfShopingRef.current) {
        dataOfShopingRef.current.textContent = data.data_of_shoping || '';
      }
      
      // Update thumbnail refs
      if (thumbnailTitleRef.current) {
        thumbnailTitleRef.current.textContent = data.shoping_name || '';
      }
      
      if (thumbnailDisplayRef.current) {
        thumbnailDisplayRef.current.textContent = data.shoping_display || '';
      }
      
      if (thumbnailUsernameRef.current) {
        thumbnailUsernameRef.current.textContent = `@${username}`;
      }
      
      if (thumbnailAvatarRef.current && data.avatar) {
        thumbnailAvatarRef.current.src = `data:image/jpeg;base64,${data.avatar}`;
      }
      
      if (thumbnailViewsRef.current) {
        thumbnailViewsRef.current.textContent = data.count_views || 0;
      }
      
      if (thumbnailProductsRef.current) {
        thumbnailProductsRef.current.textContent = data.count_products || 0;
      }
      
      if (thumbnailLikesRef.current) {
        thumbnailLikesRef.current.textContent = data.count_likes || 0;
      }
      
      // Update time ago
      if (data.upload_at) {
        const timeAgoText = timeAgo(data.upload_at);
        if (timeOfPostLabelRef.current) {
          timeOfPostLabelRef.current.textContent = timeAgoText;
        }
        if (thumbnailTimeRef.current) {
          thumbnailTimeRef.current.textContent = timeAgoText;
        }
      }
      
      setShopingData(data);
      setShopingLoadedSuccessfully(true);
      
    } catch (error) {
      console.error('Error loading shoping data:', error);
      setShopingLoadedSuccessfully(false);
    } finally {
      setDataLoading(false);
      if (loadingSpinnerRef.current) {
        loadingSpinnerRef.current.style.display = 'none';
      }
    }
  };

  useEffect(() => {
    if (!modalVisible || !shopingId || !userId) return;

    checkLikeStatus();

  }, [modalVisible, shopingId, userId]);

  const checkLikeStatus = async () => {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        shoping_id: shopingId,
      });
      
      const response = await fetch(`${backendUrl}/check-like-shoping?${params}`);
      
      if (response.ok) {
        const liked = await response.json();
        setIsLiked(liked);
        
        if (likeIconRef.current) {
          if (liked) {
            likeIconRef.current.classList.remove('like-icon-black');
            likeIconRef.current.classList.add('like-icon-red');
          } else {
            likeIconRef.current.classList.remove('like-icon-red');
            likeIconRef.current.classList.add('like-icon-black');
          }
        }
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!modalVisible || !shopingId || !clientActive) return;
    
    const connectWebSocket = async () => {
      const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
      const uri = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/updates-shoping/${shopingId}`;
      
      const maxReconnectAttempts = 10;
      const baseReconnectDelay = 1000; // 1 second
      
      let currentAttempts = 0;
      
      const connect = () => {
        if (!clientActive) return;

        const ws = new WebSocket(uri);
        
        ws.onopen = () => {
          setWebsocket(ws);
          setReconnectAttempts(0);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            processWebSocketMessage(data);
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        ws.onclose = (event) => {
          setWebsocket(null);
          
          if (clientActive && currentAttempts < maxReconnectAttempts) {
            currentAttempts++;
            const delay = baseReconnectDelay * Math.pow(2, currentAttempts - 1);
            const finalDelay = Math.min(delay, 60000); // Max 60 seconds

            setTimeout(connect, finalDelay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      };
      
      connect();
    };
    
    connectWebSocket();
    
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [modalVisible, shopingId, backendUrl, clientActive]);

  const processWebSocketMessage = (data) => {
    const messageType = data.type;
    
    if (!messageType) {
      return;
    }
    
    if (messageType === 'view_count') {
      handleViewCount(data);
    } else if (messageType === 'like_count') {
      handleLikeCount(data);
    }
  };

  const handleViewCount = (data) => {
    const value = data.value;
    setCountViews(value);
    
    if (viewsPostLabelRef.current) {
      viewsPostLabelRef.current.textContent = value;
    }
    
    if (thumbnailViewsRef.current) {
      thumbnailViewsRef.current.textContent = value;
    }
  };

  const handleLikeCount = (data) => {
    const value = data.value;
    setCountLikes(value);
    
    if (likesPostLabelRef.current) {
      likesPostLabelRef.current.textContent = value;
    }
    
    if (thumbnailLikesRef.current) {
      thumbnailLikesRef.current.textContent = value;
    }
  };

  // Shoping click handler
  const handleShopingClick = async () => {
    if (!shopingName || !shopingLoadedSuccessfully) return;
    
    try {
      if (shopingName) {
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith(`$${shopingName}`)) {
          if (!currentPath.includes('/${shoping_name}')) {
            window.history.pushState(null, '', `/$${shopingName}`);
          } else {
            window.history.replaceState(null, '', `/$${shopingName}`);
          }
        }
      }
      
      // Open modal
      setModalVisible(true);
      
      // Start view timer
      startViewTimer();
      
    } catch (error) {
      console.error('Error in shoping click:', error);
    }
  };

  // Scroll handler initialization
  useEffect(() => {
    if (!modalVisible) return;

    // reset states when modal opens
    setProducts([]);
    setOffset(0);
    setNoMoreProducts(false);

    // load first batch automatically
    loadMoreProducts();

  }, [modalVisible]);

  useEffect(() => {
    if (!modalVisible || !containerRef.current) return;

    const container = containerRef.current;

    const handleScroll = () => {
      if (loadingMore || noMoreProducts) return;

      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        loadMoreProducts();
      }
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [modalVisible, loadingMore, noMoreProducts]);

  useEffect(() => {
    if (isAd) {
      handleShopingClick();
    }
  }, [isAd, shopingData]);

  const loadMoreProducts = async () => {
    if (loadingMore || noMoreProducts) return;

    setLoadingMore(true);
    setPlaceholders(Array(limit).fill(null));

    try {
      const params = new URLSearchParams({
        shoping_id: shopingId,
        limit,
        offset,
        user_id: userId,
      });

      const response = await fetch(`${backendUrl}/get-shoping-products?${params}`);
      const data = await response.json();
      const newProducts = data.products || [];

      setPlaceholders([]);

      if (newProducts.length === 0) {
        setNoMoreProducts(true);
        setLoadingMore(false);
        return;
      }

      setProducts(prev => [...prev, ...newProducts]);
      setOffset(prev => prev + newProducts.length);

      if (newProducts.length < limit) {
        setNoMoreProducts(true);
      }

    } catch (error) {
      console.error(error);
      setPlaceholders([]);
    } finally {
      setLoadingMore(false);
    }
  };

  const createPlaceholder = () => {
    return (
      <div className="placeholder-card">
        <div className="placeholder-image"></div>
        <div className="placeholder-content">
          <div className="placeholder-line short"></div>
          <div className="placeholder-line medium"></div>
          <div className="placeholder-line full"></div>
        </div>
      </div>
    );
  };

  // Toggle like
  const toggleLike = async () => {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        shoping_id: shopingId,
      });

      if (!isLiked) {
        const response = await fetch(`${backendUrl}/like-shoping-save?${params}`);
        if (response.ok) {
          setIsLiked(true);
          
          if (likeIconRef.current) {
            likeIconRef.current.classList.remove('like-icon-black');
            likeIconRef.current.classList.add('like-icon-red');
          }
        }
      } else {
        const response = await fetch(`${backendUrl}/like-shoping-delete?${params}`);
        if (response.ok) {
          setIsLiked(false);
          
          if (likeIconRef.current) {
            likeIconRef.current.classList.remove('like-icon-red');
            likeIconRef.current.classList.add('like-icon-black');
          }
        }
      }

    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Time ago function
  const timeAgo = (timestampStr) => {
    try {
      const past = new Date(timestampStr);
      const now = new Date();
      const diffMs = now - past;
      const seconds = Math.floor(diffMs / 1000);
      
      const minute = 60;
      const hour = minute * 60;
      const day = hour * 24;
      const week = day * 7;
      const month = day * 30;
      const year = day * 365;
      
      if (seconds < minute) {
        return t('shoping.timeAgo.secondsAgo');
      } else if (seconds < hour) {
        const minutes = Math.floor(seconds / minute);
        return minutes > 1 ? t('shoping.timeAgo.minutesAgo', { count: minutes }) : t('shoping.timeAgo.minuteAgo');
      } else if (seconds < day) {
        const hours = Math.floor(seconds / hour);
        return hours > 1 ? t('shoping.timeAgo.hoursAgo', { count: hours }) : t('shoping.timeAgo.hourAgo');
      } else if (seconds < week) {
        const days = Math.floor(seconds / day);
        return days > 1 ? t('shoping.timeAgo.daysAgo', { count: days }) : t('shoping.timeAgo.dayAgo');
      } else if (seconds < month) {
        const weeks = Math.floor(seconds / week);
        return weeks > 1 ? t('shoping.timeAgo.weeksAgo', { count: weeks }) : t('shoping.timeAgo.weekAgo');
      } else if (seconds < year) {
        const months = Math.floor(seconds / month);
        return months > 1 ? t('shoping.timeAgo.monthsAgo', { count: months }) : t('shoping.timeAgo.monthAgo');
      } else {
        const years = Math.floor(seconds / year);
        return years > 1 ? t('shoping.timeAgo.yearsAgo', { count: years }) : t('shoping.timeAgo.yearAgo');
      }
    } catch (error) {
      return t('shoping.timeAgo.invalid');
    }
  };

  // View timer
  const startViewTimer = () => {
    if (!viewStartTime) {
      setViewStartTime(new Date());
      notifyViewStart();
    }
  };

  const notifyViewStart = async () => {
    try {
      await fetch(`${backendUrl}/track-view-shoping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          shoping_id: shopingId,
        }),
      });
    } catch (error) {
      console.error('Error notifying view start:', error);
      setModalVisible(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);

    // Reset all product-related state
    setProducts([]);
    setOffset(0);
    setNoMoreProducts(false);
    setPlaceholders([]);
    setLoadingMore(false);

    window.history.pushState(null, '', '/');
  };

  // Edit shoping
  const editShoping = () => {
    navigate(`/edit-shop/${shopingName}`);
  };

  // Navigate to user profile
  const goToUserProfile = () => {
    navigate(`/${ownerUsername}`);
  };

  return (
    <>
      {/* Thumbnail preview with all information */}
      <div 
        className="thumbnail-container"
        onClick={handleShopingClick}
        style={{ cursor: 'pointer' }}
      >
        {dataLoading ? (
          <div className="placeholder-card-shoping">
            <div className="placeholder-shoping"></div>
            <div className="placeholder-content-shoping">
              <div className="placeholder-line-shoping short"></div>
              <div className="placeholder-line-shoping medium"></div>
              <div className="placeholder-line-shoping full"></div>
            </div>
          </div>
        ) : (
          <>
            <img
              ref={imageElementRef}
              src={shopingDataUrl}
              alt={shopingName}
              className="thumbnail-preview"
            />
            <div className="thumbnail-content">
              {/* Store name */}
              <div ref={thumbnailTitleRef} className="thumbnail-title">
                {shopingName}
              </div>
              
              {/* Display name */}
              <div ref={thumbnailDisplayRef} className="thumbnail-display">
                {shopingDisplay}
              </div>
              
              {/* Owner info */}
              <div className="thumbnail-owner">
                <img
                  ref={thumbnailAvatarRef}
                  src={thumbnailAvatar || ''}
                  alt="avatar"
                  className="thumbnail-avatar"
                />
                <span ref={thumbnailUsernameRef} className="thumbnail-username">
                  {thumbnailUsername}
                </span>
              </div>
              
              {/* Stats */}
              <div className="thumbnail-stats">
                <div className="thumbnail-stat-item">
                  <span className="thumbnail-stat-icon">👁</span>
                  <span ref={thumbnailViewsRef}>{countViews}</span>
                </div>
                <div className="thumbnail-stat-item">
                  <span className="thumbnail-stat-icon">📦</span>
                  <span ref={thumbnailProductsRef}>{countProducts}</span>
                </div>
                <div className="thumbnail-stat-item">
                  <span className="thumbnail-stat-icon">❤️</span>
                  <span ref={thumbnailLikesRef}>{countLikes}</span>
                </div>
              </div>
              
              {/* Time */}
              <div className="thumbnail-time">
                <span className="thumbnail-stat-icon">🕒</span>
                <span ref={thumbnailTimeRef}>
                  {thumbnailUploadAt ? timeAgo(thumbnailUploadAt) : ''}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalVisible && fullContainerRef?.current && (
        <div 
          ref={containerRef}
          id={containerId}
          className="shoping-container"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#ffffff',
            zIndex: 20,
          }}
        >
          <button 
            className="back-button"
            onClick={closeModal}
            style={{
              color: "#16a34a",
              border: "none"
            }}
          >
            ←
          </button>

          {/* Main content */}
          <div className="main-content-row">
            <div className="shoping-card">
              <div className="card-content">
                {/* Store image */}
                <div className="image-column">
                  <img
                    ref={modalImageElementRef}
                    src={shopingDataUrl}
                    alt={shopingName}
                    className="shoping-image"
                  />
                  
                  {userId === userIdOfShoping && (
                    <div className="edit-button-container">
                      <button 
                        className="edit-shoping-button"
                        onClick={editShoping}
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </div>

                {/* Store stats */}
                <div className="stats-column">
                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.storeName')}</span>
                    <div className="stat-value-container">
                      <span 
                        ref={modalShopingNameRef}
                        className="stat-value"
                      >
                        {shopingName}
                      </span>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.storeDisplay')}</span>
                    <div className="stat-value-container">
                      <span 
                        ref={modalShopingDisplayRef}
                        className="stat-value"
                      >
                        {shopingDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.storeOwner')}</span>
                    <div className="stat-value-container">
                      <span 
                        ref={ownerUsernameLabelRef}
                        className="stat-link"
                        onClick={goToUserProfile}
                      >
                        {ownerUsername}
                      </span>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.views')}</span>
                    <div className="stat-value-container">
                      <span className="stat-icon">👁</span>
                      <span 
                        ref={viewsPostLabelRef}
                        className="stat-value"
                      >
                        {countViews}
                      </span>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.productsCount')}</span>
                    <div className="stat-value-container">
                      <span className="stat-icon icon-blue">📦</span>
                      <span 
                        ref={productsPostLabelRef}
                        className="stat-value"
                      >
                        {countProducts}
                      </span>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-shoping-label">{t('shoping.createdTime')}</span>
                    <div className="stat-value-container">
                      <span className="stat-icon icon-yellow">🕒</span>
                      <span 
                        ref={timeOfPostLabelRef}
                        className="stat-value"
                      >
                        {shopingData?.upload_at ? timeAgo(shopingData.upload_at) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="likes-section">
                    <div className="stat-row">
                      <span className="stat-shoping-label">{t('shoping.likes')}</span>
                      <div className="stat-value-container">
                        <span className="stat-icon icon-red">❤️</span>
                        <span 
                          ref={likesPostLabelRef}
                          className="stat-value"
                        >
                          {countLikes}
                        </span>
                      </div>
                    </div>

                    <button
                      ref={likeIconRef}
                      className={`like-shoping-button ${isLiked ? 'liked' : ''}`}
                      onClick={toggleLike}
                    >
                      <svg
                          width="55"
                          height="55"
                          viewBox="0 0 24 24"
                          fill={isLiked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      >
                          <path d="M20.8 4.6c-1.8-1.8-4.7-1.8-6.5 0L12 6.9l-2.3-2.3c-1.8-1.8-4.7-1.8-6.5 0s-1.8 4.7 0 6.5L12 21l8.8-8.9c1.8-1.8 1.8-4.7 0-6.5z" />
                      </svg>
                    </button>

                  </div>

                  <div className="separator"></div>

                  <div 
                    ref={dataOfShopingRef}
                    className="data-text"
                  >
                    {shopingData?.data_of_shoping}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products grid */}
          <div 
            ref={innerDivRef}
            id={innerId}
            className="shoping-inner-grid"
          >
            {/* Render existing products */}
            {products.map(product => (
              <div
                key={product.key || product.id}
                style={{
                  transition: 'transform 0.2s ease',
                }}
                className="product-card"
              >
                <ProductLoader
                  productId={product.id}
                  containerId={`product-${product.id}`}
                  backendUrl={backendUrl}
                  userId={userId}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfProduct={product.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Render placeholders */}
            {placeholders.map((placeholder, index) => (
              <div key={`placeholder-${index}`}>
                {createPlaceholder()}
              </div>
            ))}
          </div>

          {/* No products label */}
          <div 
            ref={noProductLabelRef}
            className="no-products-label"
            style={{ display: products.length === 0 && !loadingMore ? 'block' : 'none' }}
          >
            {t('shoping.noProducts')}
          </div>
        </div>
      )}
    </>
  );
};

export default ShopingLoader;