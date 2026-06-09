import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './image.css';
import { createPortal } from 'react-dom';
import CommentComponent from './comment';
import { useNavigate } from 'react-router-dom';

const ImageLoader = ({
  imageId,
  containerId,
  backendUrl,
  userId,
  avatarPath,
  myUsername,
  myDisplay,
  userIdOfImage,
  commentId = null,
  placeholders = [],
  fullContainerRef = null,
  isAd = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImagesData, setAllImagesData] = useState([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [supportCount, setSupportCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [collaborators, setCollaborators] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  
  // State-ҳои нав барои CommentComponent
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const imageRef = useRef(null);
  const commentInputRef = useRef(null);
  const shareSearchRef = useRef(null);
  const blockSearchRef = useRef(null);
  
  // Refs барои CommentComponent
  const commentsContainerRef = useRef(null);
  const pinnedContainerRef = useRef(null);
  const commentCountRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  const wsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load initial image data - такмил дода шуд барои дарёфти BlockUsersList
  useEffect(() => {
    const loadImageData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/get-image-preview/${imageId}?user_id=${userId}`
        );

        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            setError(t('image.error'));
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.is_banned) {
          setImageData({
            is_banned: true
          });
          setLoading(false);
          return;
        }

        setImageData(data);
        setSupportCount(data.support_count || 0);
        setCommentCount(data.comment_count || 0);
        setShareCount(data.share_count || 0);
        setSaveCount(data.save_count || 0);
        setViewCount(data.count_view || 0);

        // Дарёфти рӯйхати басташудагон
        if (data.BlockUsersList && Array.isArray(data.BlockUsersList)) {
          setBlockedUsers(data.BlockUsersList);
        }

        // Дарёфти шарикон
        if (data.collaborator_ids) {
          try {
            const collabIds =
              [...data.collaborator_ids.matchAll(/ObjectId\('([^']+)'\)/g)]
                .map(match => match[1]);

            const collaboratorsPromises = collabIds.map(async (collabId) => {
              const collabResponse = await fetch(
                `${backendUrl}/get-user-info/${collabId}`
              );
              if (collabResponse.ok) {
                return await collabResponse.json();
              }
              return null;
            });

            const collaboratorsData = await Promise.all(collaboratorsPromises);
            setCollaborators(collaboratorsData.filter(Boolean));
          } catch (err) {
            console.error('Error loading collaborators:', err);
          }
        }

        setError(null);

        const imageCount = data.image_count || 1;
        setAllImagesData(Array(imageCount).fill(''));
      } catch (err) {
        console.error('Error loading image data:', err);
        setError(err.message || t('image.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadImageData();
  }, [imageId, backendUrl, userId, t]);

  // Пас аз боргирии маълумот аз /get-image-preview
  useEffect(() => {
    if (imageData && imageData.allow_comments !== undefined) {
      setAllowComments(imageData.allow_comments); // true ё false аз сервер
    }
  }, [imageData]);

  // Ҷустуҷӯи аккаунтҳо барои бастан - такмил дода шуд
  const handleSearchAccounts = async (searchTerm, forBlock = false) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setAccountSearchLoading(false);
      return;
    }
    
    setAccountSearchLoading(true);
    
    try {
      const endpoint = forBlock ? 'accounts-block' : 'accounts';
      const params = new URLSearchParams({
        user_id: userId,
        search: searchTerm
      });
      
      if (forBlock) {
        // ИД-и ҳамаи шариконро ба exclude_ids фиристодан
        if (collaborators.length > 0) {
          params.append('exclude_ids', (collaborators.map(c => c.user_id)));
        }
      }
      
      const response = await fetch(`${backendUrl}/${endpoint}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          if (forBlock) {
            const results = data.map(account => ({
              ...account,
              isBlocked: blockedUsers.includes(account.id)
            }));
            setSearchResults(results);
          } else {
            const results = data.map(account => ({
              ...account,
              isShared: selectedAccounts.some(a => a.id === account.id)
            }));
            setSearchResults(results);
          }
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching accounts:', err);
      setSearchResults([]);
    } finally {
      setAccountSearchLoading(false);
    }
  };

  // Бастан ё боз кардани корбар - такмил дода шуд
  const handleBlockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/block-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          image_id: imageId
        })
      });
      
      if (response.ok) {
        // Илова кардани корбари басташуда ба рӯйхат
        setBlockedUsers(prev => [...prev, account.id]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: true } : a
        ));
        alert(t('image.block.blockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      alert(t('image.block.blockError'));
    }
  };

  const handleUnblockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-block-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          image_id: imageId
        })
      });
      
      if (response.ok) {
        // Дур кардани корбар аз рӯйхати басташудагон
        setBlockedUsers(prev => prev.filter(id => id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: false } : a
        ));
        alert(t('image.block.unblockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert(t('image.block.unblockError'));
    }
  };

  // Initialize WebSocket connection when modal opens
  useEffect(() => {
    if (!modalOpen || !backendUrl || !imageId) return;
    
    const initWebSocket = () => {
      const wsScheme = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const wsUrl = `${wsScheme}://${backendUrl.replace('https://', '').replace('http://', '')}/ws/updates-image/${imageId}`;
      
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;
      
      websocket.onopen = () => {
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      websocket.onclose = () => {
      };
    };
    
    initWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [modalOpen, backendUrl, imageId]);

  const [isSmallScreen, setIsSmallScreen] = useState(
    window.innerWidth < 1359
  );

  useEffect(() => {
    if (modalOpen) {
      reloadAllImageStats();
      loadSupportStatus();
      loadSaveStatus();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen && !isSmallScreen) {
      if (allowComments) {
        setShowComments(true);
      } else {
        setShowShareModal(true);
      }
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1359);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleWebSocketMessage = (data) => {
    const messageType = data.type;

    switch (messageType) {
      case 'support_count':
        setSupportCount(data.value);
        if (data.user_id === userId) {
          setIsSupported(data.support);
        }
        break;

      case 'comment_count':
        setCommentCount(data.value);
        if (commentCountRef.current) {
          commentCountRef.current.textContent = data.value;
        }
        break;
        
      case 'share_count':
        setShareCount(data.value);
        break;
        
      case 'save_count':
        setSaveCount(data.value);
        if (data.user_id === userId) {
          setIsSaved(data.saved);
        }
        break;
        
      case 'view_count':
        setViewCount(data.value);
        break;
        
      case 'delete_post':
        if (data.post_id === imageId) {
          handleDeletePost('deleted');
        }
        break;
    }
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return t('image.timeAgo.unknown');
    
    const past = new Date(timestamp);
    const now = new Date();
    const diff = now - past;
    const seconds = Math.floor(diff / 1000);
    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (seconds < minute) return t('image.timeAgo.secondsAgo');
    if (seconds < hour) {
      const minutes = Math.floor(seconds / minute);
      return minutes > 1 ? t('image.timeAgo.minutesAgo', { count: minutes }) : t('image.timeAgo.minuteAgo');
    }
    if (seconds < day) {
      const hours = Math.floor(seconds / hour);
      return hours > 1 ? t('image.timeAgo.hoursAgo', { count: hours }) : t('image.timeAgo.hourAgo');
    }
    if (seconds < week) {
      const days = Math.floor(seconds / day);
      return days > 1 ? t('image.timeAgo.daysAgo', { count: days }) : t('image.timeAgo.dayAgo');
    }
    if (seconds < month) {
      const weeks = Math.floor(seconds / week);
      return weeks > 1 ? t('image.timeAgo.weeksAgo', { count: weeks }) : t('image.timeAgo.weekAgo');
    }
    if (seconds < year) {
      const months = Math.floor(seconds / month);
      return months > 1 ? t('image.timeAgo.monthsAgo', { count: months }) : t('image.timeAgo.monthAgo');
    }
    const years = Math.floor(seconds / year);
    return years > 1 ? t('image.timeAgo.yearsAgo', { count: years }) : t('image.timeAgo.yearAgo');
  };

  const reloadAllImageStats = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/get-image-preview/${imageId}?user_id=${userId}`,
        { cache: 'no-store' } // 👈 муҳим
      );

      if (!response.ok) return;

      const data = await response.json();

      setSupportCount(data.support_count || 0);
      setCommentCount(data.comment_count || 0);
      setShareCount(data.share_count || 0);
      setSaveCount(data.save_count || 0);
      setViewCount(data.count_view || 0);

    } catch (err) {
      console.error('reload stats error', err);
    }
  };

  const handleImageClick = () => {
    if (!imageData?.Link) return;
    
    setModalOpen(true);
    
    window.history.pushState(null, '', `/image/${imageData.Link}`);
    
    loadFullImageData();
    loadSupportStatus();
    loadSaveStatus();
    reloadAllImageStats();
    trackView();
  };

  useEffect(() => {
    if (commentId && imageData) {

      // 1. Аввал назарияро кушоед
      handleImageClick();

      // 2. Баъд коментро оғоз кунед
      setShowComments(true);
    }
  }, [commentId, imageData]);

  useEffect(() => {
    if (isAd) {
      handleImageClick();
    }
  }, [isAd, imageData]);

  const loadFullImageData = async () => {
    try {
        const response = await fetch(
        `${backendUrl}/get-image-by-id/${imageId}?user_id=${userId}`
        );
        
        if (!response.ok) {
        if (response.status === 403) {
            console.error('Access forbidden');
            return;
        }
        throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        const imagesData = data.images_data || [];
        const imageCount = data.total_images || 1;
        
        // Инициализатсияи массиви расмҳо
        const newAllImagesData = Array(imageCount).fill('');
        
        // Пур кардани расмҳои боршуда
        imagesData.forEach((img, index) => {
        if (img) {
            newAllImagesData[index] = img;
        }
        });
        
        setAllImagesData(newAllImagesData);
        
        // Фақат расми аввалро нишон диҳед
        setCurrentImageIndex(0);
        
        // Боргирии маълумотҳои иловагӣ
        processImageData(data);
        
    } catch (err) {
        console.error('Error loading full image data:', err);
    }
  };

  const loadImageByIndex = async (index) => {
    if (index < 0 || index >= allImagesData.length) return;
    
    // Агар расми ин индекс аллакай бор шуда бошад
    if (allImagesData[index]) {
        setCurrentImageIndex(index);
        return;
    }
    
    // Агар расми ин индекс бор нашуда бошад
    try {
        setImageLoading(true); // 👈 загрузка сар шуд

        const response = await fetch(
        `${backendUrl}/get-image-by-index/${imageId}/${index}?user_id=${userId}`
        );
        
        if (response.ok) {
        const data = await response.json();
        const newImageData = data.image_id;
        if (newImageData) {
            const newAllImagesData = [...allImagesData];
            newAllImagesData[index] = newImageData;
            setAllImagesData(newAllImagesData);
            setCurrentImageIndex(index);
        }
        } else {
        console.error('Failed to load image by index');
        }
    } catch (err) {
        console.error('Error loading image by index:', err);
    } finally {
      setImageLoading(false); // 👈 загрузка тамом
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      loadImageByIndex(currentImageIndex - 1);
    }
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex < allImagesData.length - 1) {
      loadImageByIndex(currentImageIndex + 1);
    }
  };

  const processImageData = (data) => {
    // Коркарди маълумотҳои умумӣ
    setSupportCount(data.support_count || 0);
    setCommentCount(data.comment_count || 0);
    setShareCount(data.share_count || 0);
    setSaveCount(data.save_count || 0);
    setViewCount(data.count_view || 0);
    
    // Коркарди шарикон
    if (data.collaborator_ids) {
      try {
        const collabIds =
          [...data.collaborator_ids.matchAll(/ObjectId\('([^']+)'\)/g)]
            .map(match => match[1]);

        const collaboratorsPromises = collabIds.map(async (collabId) => {
          const collabResponse = await fetch(
            `${backendUrl}/get-user-info/${collabId}`
          );
          if (collabResponse.ok) {
            return await collabResponse.json();
          }
          return null;
        });

        Promise.all(collaboratorsPromises).then(collaboratorsData => {
          setCollaborators(collaboratorsData.filter(Boolean));
        });
      } catch (err) {
        console.error('Error processing collaborators:', err);
      }
    }
  };

  const loadSupportStatus = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/check-support-image?user_id=${userId}&image_id=${imageId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsSupported(data.supported || false);

        if (data !== undefined) {
          setIsSupported(data);
        }
      }
    } catch (err) {
      console.error('Error loading support status:', err);
    }
  };

  const loadSaveStatus = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/check-save-image-status?user_id=${userId}&image_id=${imageId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved || false);
      }
    } catch (err) {
      console.error('Error loading save status:', err);
    }
  };

  const trackView = async () => {
    try {
      await fetch(`${backendUrl}/track-view-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          image_id: imageId
        })
      });
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setShowShareModal(false);
    setShowBlockModal(false);
    setShowComments(false);

    if (imageRef.current) {
      imageRef.current.currentTime = 0;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    window.history.pushState(null, '', '/');
  };

  const handleDeletePost = (status) => {
    setModalOpen(false);
    if (containerRef.current) {
      containerRef.current.remove();
    }
    if (status === 'deleted') {
      alert(t('image.delete.success'));
    }
    if (status === 'removed_from_collaborators') {
      alert(t('image.delete.removedFromCollaborators'));
    }
    window.history.pushState(null, '', '/');
  };

  // Support functionality
  const handleSupport = async () => {
    try {
      const endpoint = isSupported ? 'support-image-delete' : 'support-image-save';
      const response = await fetch(
        `${backendUrl}/${endpoint}?user_id=${userId}&image_id=${imageId}`
      );
      
      if (response.ok) {
        setIsSupported(!isSupported);
      }
    } catch (err) {
      console.error('Error toggling support:', err);
      alert(t('image.errors.actionError'));
    }
  };

  // Save functionality
  const handleSave = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/save-image?user_id=${userId}&image_id=${imageId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved || false);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      alert(t('image.errors.saveError'));
    }
  };

  // Share functionality
  const handleShare = () => {
    setShowShareModal(true);
    setShowComments(false);
    setShowBlockModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setAccountSearchLoading(false);
  };

  const handleSearchWithDebounce = (searchValue, forBlock = false) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    setSearchTerm(searchValue);
    
    if (!searchValue.trim()) {
      setSearchResults([]);
      setAccountSearchLoading(false);
      return;
    }
    
    setAccountSearchLoading(true);
    
    const timeoutId = setTimeout(() => {
      handleSearchAccounts(searchValue, forBlock);
    }, 500);
    
    setSearchTimeout(timeoutId);
  };

  const handleSendShare = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/share-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          image_id: imageId
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => [...prev, account]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: true } : a
        ));
      }
    } catch (err) {
      console.error('Error sharing image:', err);
    }
  };

  const handleCancelShare = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-share-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          image_id: imageId
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => prev.filter(a => a.id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: false } : a
        ));
      }
    } catch (err) {
      console.error('Error canceling share:', err);
    }
  };

  // Block functionality
  const handleBlock = () => {
    setShowBlockModal(true);
    setShowComments(false);
    setShowShareModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setAccountSearchLoading(false);
  };

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (imageData?.Link) {
      navigator.clipboard.writeText(`https://www.anyvoice.world/image/${imageData.Link}`)
        .then(() => alert(t('image.copyLink.success')))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  // Report image
  const reportImage = () => {
    const reason = prompt(t('image.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        image_id: imageId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('image.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('image.report.alreadyReported'));
          return;
        }

        // дигар хатогиҳо
        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('image.report.error'));
      })
      .catch(err => {
        console.error('Error reporting image:', err);
        alert(t('image.report.error'));
      });
  };

  // Delete post
  const deletePost = () => {
    if (window.confirm(t('image.delete.confirm'))) {
      fetch(`${backendUrl}/delete-post-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: imageId,
          user_id: userId
        })
      })
      .then(response => {
        if (response.ok) {
          handleDeletePost(response.status);
        } else {
          alert(t('image.delete.error'));
        }
      })
      .catch(err => {
        console.error('Error deleting post:', err);
        alert(t('image.delete.error'));
      });
    }
  };

  // Edit image
  const editImage = () => {
    window.location.href = `/update/image/${imageData.Link}`;
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    setShowShareModal(false);
    setShowBlockModal(false);
  };

  if (loading) {
    return (
      <div className="image-placeholder" ref={containerRef}>
        <div className="image-thumbnail-placeholder"></div>
        <div className="image-info-placeholder">
          <div className="title-placeholder"></div>
          <div className="description-placeholder"></div>
          <div className="meta-placeholder"></div>
          <div className="author-placeholder"></div>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return null;
  }

  if (imageData?.is_banned) {
    return (
      <div className="image-banned-container" ref={containerRef}>
        <div className="image-banned-icon">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "100px" }}
          >
            block
          </span>
        </div>
      </div>
    );
  }

  const username = imageData.display || imageData.username || '';
  const timeAgoText = imageData.UploadAt ? timeAgo(imageData.UploadAt) : t('image.timeAgo.unknown');
  const isOwner = userId === userIdOfImage;
  const isPrivate = (imageData.visibility?.toLowerCase() === 'private' && !isOwner) || imageData.user_is_blocked;

  // Main image card
  const ImageCard = (
    <div
      className={`image-card ${isPrivate ? 'image-card--disabled' : ''}`}
      ref={containerRef}
      onClick={!isPrivate ? handleImageClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="image-thumbnail-container">
        {imageData.thumbnail_url ? (
          <img 
            src={imageData.thumbnail_url}
            alt={imageData.title}
            className="image-thumbnail"
          />
        ) : imageData.images_data ? (
          <img 
            src={`data:image/jpeg;base64,${imageData.images_data}`}
            alt={imageData.title}
            className="image-thumbnail"
          />
        ) : (
          <div className="no-thumbnail">
            <span>{t('image.noThumbnail')}</span>
          </div>
        )}

        {imageData.visibility?.toLowerCase() === 'private' && (
          <div className="visibility-badge private">
            🔒 {t('image.visibility.private')}
          </div>
        )}
        {imageData.visibility?.toLowerCase() === 'with_link' && (
          <div className="visibility-badge with-link">
            🔗 {t('image.visibility.withLink')}
          </div>
        )}

        <div className="play-icon-overlay">
          <span className="play-icon">▶</span>
        </div>

        {imageData.duration && (
          <div className="image-duration">
            {imageData.duration}
          </div>
        )}

        {imageData.image_count > 1 && (
          <div className="image-counter">
            {1}/{imageData.image_count}
          </div>
        )}
      </div>

      <div className="image-info">
        <h3 className="image-title">
          {imageData.title || t('image.untitled')}
        </h3>

        <p className="image-description">
          {imageData.description || ''}
        </p>

        <div className="image-stats">
          <div className="views">
            <span>👁</span>
            <span>{imageData.count_view || 0} {t('image.views')}</span>
          </div>
          
          <div className="upload-time">
            <span>🕒</span>
            <span>{timeAgoText}</span>
          </div>
        </div>

        <div className="image-author">
          {imageData.avatar ? (
            <img 
              src={`data:image/jpeg;base64,${imageData.avatar}`}
              alt={username}
              className="author-avatar"
            />
          ) : (
            <div className="avatar-placeholder"></div>
          )}
          
          <span className="author-name">
            {username}
          </span>
          {collaborators.length > 0 && (
            <span className="collaborator-count">
              +{collaborators.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Helper function to convert text to HTML links - вазъияти дуруст
  const convertTextToHtmlLinks = (text, navigate) => {
    if (!text) return '';
  
    const normalizedText = text;
  
    const linkRegex = /(https?:\/\/[^\s]+)|(@[^\s$]+)|(\$[^\s$]+)/g;
    
    return normalizedText.split('\n').map((line, lineIndex) => {
      let processedLine = line;

      return (
        <React.Fragment key={lineIndex}>
          {processedLine.split(' ').map((word, wordIndex) => {
            let content = word;
            
            if (word.match(/^@[^\s$]+$/)) {
              const username = word.substring(1);
              return (
                <a 
                  key={`${lineIndex}-${wordIndex}`}
                  href={`/@${username}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/@${username}`);
                  }}
                  className="text-link"
                >
                  {word + ' '}
                </a>
              );
            } else if (word.match(/^\$[^\s$]+$/)) {
              const shopingName = word.substring(1);
              return (
                <a 
                  key={`${lineIndex}-${wordIndex}`}
                  href={`/$${shopingName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/$${shopingName}`);
                  }}
                  className="text-link"
                >
                  {word + ' '}
                </a>
              );
            } else if (word.match(/^https?:\/\/[^\s]+$/)) {
              if (/^https:\/\/(www\.)?anyvoice\./.test(word)) {
                const relativePath = word.replace(/^https:\/\/(www\.)?anyvoice\.[^/]+/, '');
  
                return (
                  <a
                    key={`${lineIndex}-${wordIndex}`}
                    href={relativePath || '/'}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(relativePath || '/');
                    }}
                    className="text-link"
                  >
                    {word + ' '}
                  </a>
                );
              } else {
                return (
                  <a 
                    key={`${lineIndex}-${wordIndex}`}
                    href={`/${word}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    {word + ' '}
                  </a>
                );
              }
            }
            
            return <span key={`${lineIndex}-${wordIndex}`}>{word + ' '}</span>;
          })}
          <br />
        </React.Fragment>
      );
    });
  };

  // Modal content
  const modalContent = modalOpen && (
    <div className="image-modal-overlay">
      <button
        onClick={handleCloseModal}
        className="modal-close-button"
      >
        ×
      </button>

      <div className="image-modal-content" ref={modalRef}>
        <div className="image-modal-main">
          {/* Image player section */}
          <div className="image-container" onClick={(e) => e.stopPropagation()}>
            {allImagesData.length > 0 && (
              <div className="image-display-container">
                {imageLoading ? (
                  <div className="image-loading-placeholder">
                    <div className="loading-spinner"></div>
                    <p>{t('image.loadingImage')}</p>
                  </div>
                ) : allImagesData[currentImageIndex] ? (
                  <img
                    key={`image-${currentImageIndex}`}
                    src={`data:image/jpeg;base64,${allImagesData[currentImageIndex]}`}
                    alt={`Image ${currentImageIndex + 1}`}
                    className="modal-image-display"
                  />
                ) : (
                  <div className="image-loading-placeholder">
                  <div className="loading-spinner"></div>
                  <p>{t('image.loadingImage')}</p>
                  </div>
              )}
              </div>
            )}

            {allImagesData.length > 1 && (
              <>
              <div className="modal-image-counter">
                  {currentImageIndex + 1}/{allImagesData.length}
              </div>
              
              {/* Тугмаҳои навигатсия */}
              <div className="image-navigation">
                  {currentImageIndex > 0 && (
                  <button
                      onClick={handlePrevImage}
                      className="slider-button prev"
                  >
                      ‹
                  </button>
                  )}
                  
                  {currentImageIndex < allImagesData.length - 1 && (
                  <button
                      onClick={handleNextImage}
                      className="slider-button next"
                  >
                      ›
                  </button>
                  )}
              </div>
              </>
            )}
          </div>

          {/* Image info section - always visible */}
          <div className="modal-image-info">
            <h3 className="modal-image-title">
              {imageData.title || t('image.untitled')}
            </h3>

            {imageData.description && (
              <p className="modal-image-description">
                {imageData.description}
              </p>
            )}

            <div className="modal-author-info">
              <div className="author-avatar-container">
                {imageData.avatar ? (
                  <img 
                    src={`data:image/jpeg;base64,${imageData.avatar}`}
                    alt={username}
                    className="author-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder"></div>
                )}
                {collaborators.length > 0 && (
                  <div className="collaborators-badge" title={t('image.collaborators.count', { count: collaborators.length })}>
                    +{collaborators.length}
                  </div>
                )}
              </div>

              <div className="author-details">
                {imageData.display ? (
                  <>
                    <div className="author-display">
                      {imageData.display}
                    </div>
                    <div className="message-text">
                      {convertTextToHtmlLinks(`@${imageData.username}`, navigate)}
                    </div>
                  </>
                ) : (
                  <div className="message-text">
                    {convertTextToHtmlLinks(`@${imageData.username}`, navigate)}
                  </div>
                )}

                {/* Намоиши шарикон */}
                {collaborators.length > 0 && (
                  <div className="collaborators-list">
                    <span className="collaborators-label">{t('image.collaborators.label')} </span>
                    {collaborators.slice(0).map((collab, index) => (
                      <React.Fragment key={collab.id}>
                        <a
                          href={`/@${collab.username}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/@${collab.username}`);
                          }}
                          className="collaborator-link"
                        >
                          @{collab.username}
                        </a>
                        {index < collaborators.length - 0 && ', '}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-image-stats">
              <div className="views">
                <span>👁</span>
                <span>{viewCount} {t('image.stats.views')}</span>
              </div>
              <div className="upload-time">
                <span>🕒</span>
                <span>{timeAgoText}</span>
              </div>
              <div className="comment-count" ref={commentCountRef}>
                <span>💬</span>
                <span>{commentCount}</span>
              </div>
            </div>

            {/* Actions bar */}
            <div className="modal-actions">
              {/* Гурӯҳи тугмаҳои асосӣ дар чап */}
              <div className="action-buttons-left">
                <button
                  className={`support-button ${isSupported ? 'supported' : ''}`}
                  onClick={handleSupport}
                >
                  <span className="material-icons">volunteer_activism</span>
                  <span>{supportCount}</span>
                </button>

                {allowComments && (
                  <button
                    className="comment-button"
                    onClick={toggleComments}
                  >
                    <span className="material-icons">chat_bubble</span>
                    <span className="comment-count">{commentCount}</span>
                  </button>
                )}

                {/* Ҳамеша тугмаи share, ё агар comments пинҳон бошад контейнери share боз мешавад */}
                <button
                  className={`share-action-button`}
                  onClick={handleShare}
                >
                  <span className="material-icons">send</span>
                  <span>{shareCount}</span>
                </button>

                <button 
                  className={`save-button ${isSaved ? 'saved' : ''}`}
                  onClick={handleSave}
                >
                  <span className={`material-icons ${isSaved ? 'saved-icon' : ''}`}>
                    {'bookmark'}
                  </span>
                  <span>{saveCount}</span>
                </button>
              </div>

              {/* Тугмаи action-menu дар рост */}
              <div className="action-menu" ref={menuRef}>
                <button
                  title={t('image.actions.more')}
                  onClick={() => setMenuOpen(prev => !prev)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span
                    className="material-icons"
                    style={{
                      fontSize: "20px", // 👈 ИН ҶО АНДОЗА
                      color: "#6b7280"
                    }}
                  >
                    more_vert
                  </span>
                </button>

                <div className={`menu-dropdown ${menuOpen ? "open" : ""}`}>
                  <button onClick={copyLinkToClipboard}>{t('image.actions.copyLink')}</button>
                  {!isOwner && <button onClick={reportImage}>{t('image.actions.report')}</button>}
                  {isOwner && <button onClick={handleBlock}>{t('image.actions.block')}</button>}
                  {isOwner && <button onClick={editImage}>{t('image.actions.edit')}</button>}
                  {(isOwner || collaborators.some(c => c.user_id === userId)) && (
                    <button onClick={deletePost}>{t('image.actions.delete')}</button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="additional-info">
              <div className="info-row">
                <span>{t('image.additionalInfo.postTime')}</span>
                <span>{timeAgoText}</span>
              </div>
              <div className="info-row">
                <span>{t('image.additionalInfo.saves')}</span>
                <span>{saveCount}</span>
              </div>
              <div className="info-row">
                <span>{t('image.additionalInfo.views')}</span>
                <span>{viewCount}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Comments Section - appears on the right */}
        {allowComments && showComments && (
          <div className="comments-modal" ref={commentsContainerRef}>
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowComments(false)}>←</button>
              )}
              <h3>{t('image.comments')} (<span ref={commentCountRef}>{commentCount}</span>)</h3>
            </div>

            {/* 100% CommentComponent барои намоиши комментҳо */}
            <CommentComponent
              backendUrl={backendUrl}
              userIdFromMe={userIdOfImage}
              userId={userId}
              collaboratorIds={collaborators.map(c => c.user_id)}
              postId={imageId}
              typePost="image"
              selectedCommentId={commentId}
            />
          </div>
        )}

        {/* Share Modal - appears on the right */}
        {showShareModal && (
          <div className="share-modal">
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowShareModal(false)}>←</button>
              )}
              <h3>{t('image.share.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={shareSearchRef}
                type="text"
                placeholder={t('image.share.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, false)}
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('image.share.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('image.share.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('image.share.noResults')}</p>
                </div>
              ) : (
                searchResults.map(account => (
                  <div key={account.id} className="account-item">
                    <img src={account.avatar} alt={account.username} />
                    <div className="account-info">
                      <div className="account-display">@{account.username}</div>
                    </div>
                    <button
                      className={`share-button ${account.isShared ? 'shared' : ''}`}
                      onClick={() => account.isShared ? handleCancelShare(account) : handleSendShare(account)}
                    >
                      {account.isShared ? t('image.share.cancel') : t('image.share.send')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Block Modal */}
        {showBlockModal && (
          <div className="block-modal">
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowBlockModal(false)}>←</button>
              )}
              <h3>{t('image.block.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={blockSearchRef}
                type="text"
                placeholder={t('image.block.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, true)}
                autoFocus
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('image.block.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('image.block.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('image.block.noResults')}</p>
                </div>
              ) : (
                <>
                  {searchResults.map(account => (
                    <div key={account.id} className="account-item">
                      <img 
                        src={account.avatar || '/default-avatar.png'} 
                        alt={account.username} 
                        className="account-avatar"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="account-info">
                        <div className="account-display">
                          {account.display_name || account.username}
                          {account.isBlocked && (
                            <span className="blocked-badge">{t('image.block.blockedBadge')}</span>
                          )}
                        </div>
                        <div className="account-username">@{account.username}</div>
                      </div>
                      <button
                        className={`block-button ${account.isBlocked ? 'blocked' : ''}`}
                        onClick={() => account.isBlocked ? handleUnblockUser(account) : handleBlockUser(account)}
                        title={account.isBlocked ? t('image.actions.unblock') : t('image.actions.block')}
                      >
                        {account.isBlocked ? t('image.block.unblock') : t('image.block.block')}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <>
      {ImageCard}
      {modalOpen && fullContainerRef?.current &&
        createPortal(modalContent, fullContainerRef.current)
      }
    </>
  );
};

export default ImageLoader;