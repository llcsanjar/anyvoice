import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './video.css';
import { createPortal } from 'react-dom';
import CommentComponent from './comment';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';

const VideoLoader = ({ 
  typeVideo,
  videoId,
  containerId,
  backendUrl,
  userId,
  avatarPath,
  myUsername,
  myDisplay,
  userIdOfVideo,
  commentId = null,
  placeholders = [],
  fullContainerRef = null,
  isAd = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [allVideosData, setAllVideosData] = useState([]);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
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
  const [isSaved, setIsSaved] = useState(false);
  
  // HLS related states
  const [hls, setHls] = useState(null);
  const [availableQualities, setAvailableQualities] = useState(['360p', '480p', '720p']);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [currentBitrate, setCurrentBitrate] = useState(0);
  const [currentSegment, setCurrentSegment] = useState({ current: 0, total: 0 });
  const [postId, setPostId] = useState(null);  // Барои HLS endpoint
  
  // State-ҳои нав барои CommentComponent
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const videoRef = useRef(null);
  const shareSearchRef = useRef(null);
  const blockSearchRef = useRef(null);
  
  // Refs барои CommentComponent
  const commentsContainerRef = useRef(null);
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

  // Load initial video data
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/get-video-preview/${videoId}?user_id=${userId}`
        );

        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            setError(t('video.error'));
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.is_banned) {
          setVideoData({
            is_banned: true
          });
          setLoading(false);
          return;
        }

        setVideoData(data);
        setSupportCount(data.support_count || 0);
        setCommentCount(data.comment_count || 0);
        setShareCount(data.share_count || 0);
        setSaveCount(data.save_count || 0);
        setViewCount(data.count_view || 0);
        setPostId(data.id);  // Save post ID for HLS

        // Set available qualities from server
        if (data.qualities && data.qualities.length > 0) {
          setAvailableQualities(data.qualities);
        }

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

        const videoCount = data.video_count || 1;
        setAllVideosData(Array(videoCount).fill(null));
      } catch (err) {
        console.error('Error loading video data:', err);
        setError(err.message || t('video.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
  }, [videoId, backendUrl, userId, t]);

  // Пас аз боргирии маълумот аз /get-video-preview
  useEffect(() => {
    if (videoData && videoData.allow_comments !== undefined) {
      setAllowComments(videoData.allow_comments);
    }
  }, [videoData]);

  // Initialize HLS when video is loaded
  const initializeHls = (videoElement, masterUrl) => {
    // Destroy existing HLS instance
    if (hls) {
      hls.destroy();
    }

    if (Hls.isSupported()) {
      const newHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 10,
        startFragPrefetch: true,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
      });

      // Setup HLS event handlers
      newHls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setAvailableQualities(data.levels.map(level => `${level.height}p`));
        videoElement.play().catch(() => {});
      });

      newHls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = newHls.levels[data.level];
        if (level) {
          setCurrentQuality(`${level.height}p`);
        }
      });

      newHls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
        if (newHls.media) {
          setCurrentSegment({
            current: newHls.media.currentSegment || 0,
            total: newHls.media.segments?.length || 0
          });
        }
      });

      // Update bitrate estimate
      const updateBitrate = () => {
        if (newHls.bandwidthEstimate) {
          setCurrentBitrate(newHls.bandwidthEstimate);
        }
      };
      setInterval(updateBitrate, 1000);

      newHls.loadSource(masterUrl);
      newHls.attachMedia(videoElement);
      setHls(newHls);

      return newHls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoElement.src = masterUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play().catch(() => {});
      });
      return null;
    }
    
    return null;
  };

  // Change HLS quality
  const changeQuality = (qualityIndex) => {
    if (!hls) return;
    
    if (qualityIndex === -1) {
      // Auto quality
      hls.currentLevel = -1;
      setCurrentQuality('auto');
    } else {
      hls.currentLevel = qualityIndex;
      const level = hls.levels[qualityIndex];
      if (level) {
        setCurrentQuality(`${level.height}p`);
      }
    }
  };

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [hls]);

  // Ҷустуҷӯи аккаунтҳо барои бастан
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
      
      // Илова кардани рӯйхати басташудагон барои ҷустуҷӯи бастан
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
            // Баррасӣ ки оё аккаунт аллакай баста шудааст
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

  // Бастан ё боз кардани корбар
  const handleBlockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/block-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          video_id: videoId
        })
      });
      
      if (response.ok) {
        // Илова кардани корбари басташуда ба рӯйхат
        setBlockedUsers(prev => [...prev, account.id]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: true } : a
        ));
        alert(t('video.block.blockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      alert(t('video.block.blockError'));
    }
  };

  const handleUnblockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-block-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          video_id: videoId
        })
      });
      
      if (response.ok) {
        // Дур кардани корбар аз рӯйхати басташудагон
        setBlockedUsers(prev => prev.filter(id => id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: false } : a
        ));
        alert(t('video.block.unblockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert(t('video.block.unblockError'));
    }
  };

  // Initialize WebSocket connection when modal opens
  useEffect(() => {
    if (!modalOpen || !backendUrl || !videoId) return;
    
    const initWebSocket = () => {
      const wsScheme = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const wsUrl = `${wsScheme}://${backendUrl.replace('https://', '').replace('http://', '')}/ws/updates-video/${videoId}`;
      
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
  }, [modalOpen, backendUrl, videoId]);

  const [isSmallScreen, setIsSmallScreen] = useState(
    window.innerWidth < 1359
  );

  useEffect(() => {
    if (modalOpen) {
      reloadAllVideoStats();
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
  }, [modalOpen, isSmallScreen, allowComments]);

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
        if (data.post_id === videoId) {
          handleDeletePost('deleted');
        }
        break;
    }
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return t('video.timeAgo.unknown');
    
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

    if (seconds < minute) return t('video.timeAgo.secondsAgo');
    if (seconds < hour) {
      const minutes = Math.floor(seconds / minute);
      return minutes > 1 ? t('video.timeAgo.minutesAgo', { count: minutes }) : t('video.timeAgo.minuteAgo');
    }
    if (seconds < day) {
      const hours = Math.floor(seconds / hour);
      return hours > 1 ? t('video.timeAgo.hoursAgo', { count: hours }) : t('video.timeAgo.hourAgo');
    }
    if (seconds < week) {
      const days = Math.floor(seconds / day);
      return days > 1 ? t('video.timeAgo.daysAgo', { count: days }) : t('video.timeAgo.dayAgo');
    }
    if (seconds < month) {
      const weeks = Math.floor(seconds / week);
      return weeks > 1 ? t('video.timeAgo.weeksAgo', { count: weeks }) : t('video.timeAgo.weekAgo');
    }
    if (seconds < year) {
      const months = Math.floor(seconds / month);
      return months > 1 ? t('video.timeAgo.monthsAgo', { count: months }) : t('video.timeAgo.monthAgo');
    }
    const years = Math.floor(seconds / year);
    return years > 1 ? t('video.timeAgo.yearsAgo', { count: years }) : t('video.timeAgo.yearAgo');
  };

  const reloadAllVideoStats = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/get-video-preview/${videoId}?user_id=${userId}`,
        { cache: 'no-store' }
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

  const handleVideoClick = () => {
    if (!videoData?.Link) return;
    
    setModalOpen(true);
    
    window.history.pushState(null, '', `/video/${videoData.Link}`);
    
    loadFullVideoData();
    loadSupportStatus();
    loadSaveStatus();
    reloadAllVideoStats();
    trackView();
  };

  useEffect(() => {
    if (commentId && videoData) {
      handleVideoClick();
      setShowComments(true);
    }
  }, [commentId, videoData]);

  useEffect(() => {
    if (isAd) {
      handleVideoClick();
    }
  }, [isAd, videoData]);

  const loadFullVideoData = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/get-video-by-id/${videoId}?user_id=${userId}`
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          console.error('Access forbidden');
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      const videosData = data.videos_data || [];
      
      if (videosData.length > 0) {
        setAllVideosData(videosData);
        // Load first video immediately
        if (videosData[0]) {
          setCurrentVideoIndex(0);
        }
      }
      
    } catch (err) {
      console.error('Error loading full video data:', err);
    }
  };

  const loadSupportStatus = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/check-support-video?user_id=${userId}&video_id=${videoId}`
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
        `${backendUrl}/check-save-video-status?user_id=${userId}&video_id=${videoId}`
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
      await fetch(`${backendUrl}/track-view-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          video_id: videoId
        })
      });
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  const loadVideoByIndex = async (index) => {
    if (index < 0 || index >= allVideosData.length) return;
    
    const videoDataAtIndex = allVideosData[index];
    if (videoDataAtIndex && videoDataAtIndex.video_id) {
      setCurrentVideoIndex(index);
    } else {
      try {
        const response = await fetch(
          `${backendUrl}/get-video-by-index/${videoId}/${index}?user_id=${userId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.video_id) {
            const newAllVideosData = [...allVideosData];
            newAllVideosData[index] = data;
            setAllVideosData(newAllVideosData);
            setCurrentVideoIndex(index);
          }
        }
      } catch (err) {
        console.error('Error loading video by index:', err);
      }
    }
  };

  // Effect to load HLS when current video changes
  useEffect(() => {
    if (modalOpen && videoRef.current && allVideosData[currentVideoIndex]) {
      const currentVideo = allVideosData[currentVideoIndex];
      if (currentVideo && currentVideo.master_url) {
        const masterUrl = `${backendUrl}${currentVideo.master_url}`;
        initializeHls(videoRef.current, masterUrl);
      }
    }
  }, [modalOpen, currentVideoIndex, allVideosData, backendUrl]);

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      // Cleanup current HLS
      if (hls) {
        hls.destroy();
        setHls(null);
      }
      loadVideoByIndex(currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < allVideosData.length - 1) {
      // Cleanup current HLS
      if (hls) {
        hls.destroy();
        setHls(null);
      }
      loadVideoByIndex(currentVideoIndex + 1);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setShowShareModal(false);
    setShowBlockModal(false);
    setShowComments(false);
    setVideoPlaying(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    if (hls) {
      hls.destroy();
      setHls(null);
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
      alert(t('video.delete.success'));
    }
    if (status === 'removed_from_collaborators') {
      alert(t('video.delete.removedFromCollaborators'));
    }
    window.history.pushState(null, '', '/');
  };

  // Support functionality
  const handleSupport = async () => {
    try {
      const endpoint = isSupported ? 'support-video-delete' : 'support-video-save';
      const response = await fetch(
        `${backendUrl}/${endpoint}?user_id=${userId}&video_id=${videoId}`
      );
      
      if (response.ok) {
        setIsSupported(!isSupported);
      }
    } catch (err) {
      console.error('Error toggling support:', err);
      alert(t('video.errors.actionError'));
    }
  };

  // Save functionality
  const handleSave = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/save-video?user_id=${userId}&video_id=${videoId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved || false);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      alert(t('video.errors.saveError'));
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
      const response = await fetch(`${backendUrl}/share-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          video_id: videoId
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => [...prev, account]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: true } : a
        ));
      }
    } catch (err) {
      console.error('Error sharing video:', err);
    }
  };

  const handleCancelShare = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-share-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          video_id: videoId
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
    if (videoData?.Link) {
      navigator.clipboard.writeText(`https://www.anyvoice.world/video/${videoData.Link}`)
        .then(() => alert(t('video.copyLink.success')))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  // Report video
  const reportVideo = () => {
    const reason = prompt(t('video.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        video_id: videoId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('video.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('video.report.alreadyReported'));
          return;
        }

        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('video.report.error'));
      })
      .catch(err => {
        console.error('Error reporting video:', err);
        alert(t('video.report.error'));
      });
  };

  // Delete post
  const deletePost = () => {
    if (window.confirm(t('video.delete.confirm'))) {
      fetch(`${backendUrl}/delete-post-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          user_id: userId
        })
      })
      .then(response => {
        if (response.ok) {
          handleDeletePost(response.status);
        } else {
          alert(t('video.delete.error'));
        }
      })
      .catch(err => {
        console.error('Error deleting post:', err);
        alert(t('video.delete.error'));
      });
    }
  };

  // Edit video
  const editVideo = () => {
    window.location.href = `/update/video/${videoData.Link}`;
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    setShowShareModal(false);
    setShowBlockModal(false);
  };

  if (loading) {
    return (
      <div className="video-placeholder" ref={containerRef}>
        <div className="video-thumbnail-placeholder"></div>
        <div className="video-info-placeholder">
          <div className="title-placeholder"></div>
          <div className="description-placeholder"></div>
          <div className="meta-placeholder"></div>
          <div className="author-placeholder"></div>
        </div>
      </div>
    );
  }

  if (error || !videoData) {
    return null;
  }

  if (videoData?.is_banned) {
    return (
      <div className="video-banned-container" ref={containerRef}>
        <div className="video-banned-icon">
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

  const username = videoData.display || videoData.username || '';
  const timeAgoText = videoData.UploadAt ? timeAgo(videoData.UploadAt) : t('video.timeAgo.unknown');
  const isOwner = userId === userIdOfVideo;
  const isPrivate = (videoData.visibility?.toLowerCase() === 'private' && !isOwner) || videoData.user_is_blocked;

  // Main video card
  const videoCard = (
    <div 
      className={`video-card ${isPrivate ? 'video-card--disabled' : ''}`}
      ref={containerRef}
      onClick={!isPrivate ? handleVideoClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="video-thumbnail-container">
        {videoData.thumbnail_url ? (
          <img 
            src={videoData.thumbnail_url}
            alt={videoData.title}
            className="video-thumbnail"
          />
        ) : videoData.first_video_base64 ? (
          <img 
            src={`data:image/jpeg;base64,${videoData.first_video_base64}`}
            alt={videoData.title}
            className="video-thumbnail"
          />
        ) : (
          <div className="no-thumbnail">
            <span>{t('video.noThumbnail')}</span>
          </div>
        )}

        {videoData.visibility?.toLowerCase() === 'private' && (
          <div className="visibility-badge private">
            🔒 {t('video.visibility.private')}
          </div>
        )}
        {videoData.visibility?.toLowerCase() === 'with_link' && (
          <div className="visibility-badge with-link">
            🔗 {t('video.visibility.withLink')}
          </div>
        )}

        <div className="play-icon-overlay">
          <span className="play-icon">▶</span>
        </div>

        {videoData.duration && (
          <div className="video-duration">
            {videoData.duration}
          </div>
        )}

        {videoData.video_count > 1 && (
          <div className="video-counter">
            {1}/{videoData.video_count}
          </div>
        )}
      </div>

      <div className="video-info">
        <h3 className="video-title">
          {videoData.title || t('video.untitled')}
        </h3>

        <p className="video-description">
          {videoData.description || ''}
        </p>

        <div className="video-stats">
          <div className="views">
            <span>👁</span>
            <span>{videoData.count_view || 0} {t('video.views')}</span>
          </div>
          
          <div className="upload-time">
            <span>🕒</span>
            <span>{timeAgoText}</span>
          </div>
        </div>

        <div className="video-author">
          {videoData.avatar ? (
            <img 
              src={`data:image/jpeg;base64,${videoData.avatar}`}
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

  // Helper function to convert text to HTML links
  const convertTextToHtmlLinks = (text, navigate, t) => {
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

  // Get current video data
  const currentVideoData = allVideosData[currentVideoIndex] || {};

  // Modal content
  const modalContent = modalOpen && (
    <div className="video-modal-overlay">
      <button
        onClick={handleCloseModal}
        className="modal-close-button"
      >
        ×
      </button>

      <div className="video-modal-content" ref={modalRef}>
        <div className="video-modal-main">
          {/* Video player section */}
          <div className="video-container">
            <video
              ref={videoRef}
              key={currentVideoData.video_id || currentVideoIndex}
              className="video-player"
              controls
              autoPlay
              playsInline
              preload="metadata"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
            />
            
            {/* HLS Quality Selector */}
            {hls && hls.levels && hls.levels.length > 0 && (
              <div className="hls-quality-selector">
                <select 
                  value={hls.currentLevel === -1 ? 'auto' : hls.currentLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    changeQuality(val === 'auto' ? -1 : parseInt(val));
                  }}
                  className="quality-select"
                >
                  <option value="auto">Auto</option>
                  {hls.levels.map((level, idx) => (
                    <option key={idx} value={idx}>
                      {level.height}p
                    </option>
                  ))}
                </select>
                
                {/* Bitrate indicator */}
                {currentBitrate > 0 && (
                  <span className="bitrate-indicator">
                    {(currentBitrate / 1000000).toFixed(2)} Mbps
                  </span>
                )}
              </div>
            )}

            {allVideosData.length > 1 && (
              <div className="modal-video-counter">
                {currentVideoIndex + 1}/{allVideosData.length}
              </div>
            )}

            {currentVideoIndex > 0 && (
              <button
                onClick={handlePrevVideo}
                className="slider-button prev"
              >
                ‹
              </button>
            )}

            {currentVideoIndex < allVideosData.length - 1 && (
              <button
                onClick={handleNextVideo}
                className="slider-button next"
              >
                ›
              </button>
            )}

          </div>

          {/* Video info section - always visible */}
          <div className="modal-video-info">
            <h3 className="modal-video-title">
              {videoData.title || t('video.untitled')}
            </h3>

            {videoData.description && (
              <p className="modal-video-description">
                {videoData.description}
              </p>
            )}

            <div className="modal-author-info">
              <div className="author-avatar-container">
                {videoData.avatar ? (
                  <img 
                    src={`data:image/jpeg;base64,${videoData.avatar}`}
                    alt={username}
                    className="author-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder"></div>
                )}
                {collaborators.length > 0 && (
                  <div className="collaborators-badge" title={t('video.collaborators.count', { count: collaborators.length })}>
                    +{collaborators.length}
                  </div>
                )}
              </div>

              <div className="author-details">
                {videoData.display ? (
                  <>
                    <div className="author-display">
                      {videoData.display}
                    </div>
                    <div className="message-text">
                      {convertTextToHtmlLinks(`@${videoData.username}`, navigate)}
                    </div>
                  </>
                ) : (
                  <div className="message-text">
                    {convertTextToHtmlLinks(`@${videoData.username}`, navigate)}
                  </div>
                )}

                {/* Намоиши шарикон */}
                {collaborators.length > 0 && (
                  <div className="collaborators-list">
                    <span className="collaborators-label">{t('video.collaborators.label')} </span>
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

            <div className="modal-video-stats">
              <div className="views">
                <span>👁</span>
                <span>{viewCount} {t('video.stats.views')}</span>
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
                  <span className="material-icons">
                    volunteer_activism
                  </span>
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

                <button
                  className={`share-action-button`}
                  onClick={handleShare}
                >
                  <span className="material-icons">
                    send
                  </span>
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
                  title={t('video.actions.more')}
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
                      fontSize: "20px",
                      color: "#6b7280"
                    }}
                  >
                    more_vert
                  </span>
                </button>

                <div className={`menu-dropdown ${menuOpen ? "open" : ""}`}>
                  <button onClick={copyLinkToClipboard}>{t('video.actions.copyLink')}</button>
                  {!isOwner && <button onClick={reportVideo}>{t('video.actions.report')}</button>}
                  {isOwner && <button onClick={handleBlock}>{t('video.actions.block')}</button>}
                  {isOwner && <button onClick={editVideo}>{t('video.actions.edit')}</button>}
                  {(isOwner || collaborators.some(c => c.user_id === userId)) && (
                    <button onClick={deletePost}>{t('video.actions.delete')}</button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="additional-info">
              <div className="info-row">
                <span>{t('video.additionalInfo.postTime')}</span>
                <span>{timeAgoText}</span>
              </div>
              <div className="info-row">
                <span>{t('video.additionalInfo.saves')}</span>
                <span>{saveCount}</span>
              </div>
              <div className="info-row">
                <span>{t('video.additionalInfo.views')}</span>
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
              <h3>{t('video.comments')} (<span ref={commentCountRef}>{commentCount}</span>)</h3>
            </div>

            {/* 100% CommentComponent барои намоиши комментҳо */}
            <CommentComponent
              backendUrl={backendUrl}
              userIdFromMe={userIdOfVideo}
              userId={userId}
              collaboratorIds={collaborators.map(c => c.user_id)}
              postId={videoId}
              typePost="video"
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
              <h3>{t('video.share.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={shareSearchRef}
                type="text"
                placeholder={t('video.share.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, false)}
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('video.share.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('video.share.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('video.share.noResults')}</p>
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
                      {account.isShared ? t('video.share.cancel') : t('video.share.send')}
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
              <h3>{t('video.block.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={blockSearchRef}
                type="text"
                placeholder={t('video.block.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, true)}
                autoFocus
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('video.block.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('video.block.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('video.block.noResults')}</p>
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
                            <span className="blocked-badge">{t('video.block.blockedBadge')}</span>
                          )}
                        </div>
                        <div className="account-username">@{account.username}</div>
                      </div>
                      <button
                        className={`block-button ${account.isBlocked ? 'blocked' : ''}`}
                        onClick={() => account.isBlocked ? handleUnblockUser(account) : handleBlockUser(account)}
                        title={account.isBlocked ? t('video.block.unblock') : t('video.block.block')}
                      >
                        {account.isBlocked ? t('video.block.unblock') : t('video.block.block')}
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
      {videoCard}
      {modalOpen && fullContainerRef?.current &&
        createPortal(modalContent, fullContainerRef.current)
      }
    </>
  );
};

export default VideoLoader;