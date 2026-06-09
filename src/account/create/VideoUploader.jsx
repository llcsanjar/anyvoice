import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './VideoUploader.css';

const VideoUploader = ({ backendUrl, userId, videoId = null, link = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { link: urlLink } = useParams();
  const actualLink = link || urlLink;
  
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  
  // State ҳо
  const [videos, setVideos] = useState([]);
  const [videoNames, setVideoNames] = useState([]);
  const [videoIds, setVideoIds] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
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
  const [oldVideos, setOldVideos] = useState([]);
  const [oldVideoIds, setOldVideoIds] = useState([]);
  const [linkVideo, setLinkVideo] = useState('');
  const [postId, setPostId] = useState(videoId);
  const [uploadId, setUploadId] = useState('');
  const [websocket, setWebsocket] = useState(null);
  const [countAdvertisement, setCountAdvertisement] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [postInfo, setPostInfo] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [postOwner, setPostOwner] = useState(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [newVideos, setNewVideos] = useState([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState([]);
  const [thumbnailError, setThumbnailError] = useState('');
  const [videoError, setVideoError] = useState('');

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

  // Эффект барои боркунии маълумоти пост агар videoId ё link дода шуда бошад
  useEffect(() => {
    if (videoId) {
      loadPostData(videoId);
    } else if (actualLink) {
      checkLinkAndLoadPost(actualLink);
    }
  }, [videoId, actualLink]);

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
      const checkResponse = await fetch(`${backendUrl}/check-link-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, user_id: userId })
      });

      if (!checkResponse.ok) {
        if (checkResponse.status === 403) {
          addError(t('videoUploader.errors.accessDenied'));
        } else if (checkResponse.status === 404) {
          addError(t('videoUploader.errors.invalidLink'));
        } else {
          addError(t('videoUploader.errors.linkCheckError'));
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
      await loadPostData(linkInfo.video_id);
      
    } catch (err) {
      addError(t('videoUploader.errors.connectionError'));
      console.error('Error checking link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPostData = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/post-video/${id}`);
      if (!response.ok) throw new Error(t('videoUploader.errors.postLoadError'));
      
      const data = await response.json();
      
      const videoLinkServer = data.link;
      setLinkVideo(videoLinkServer.split('/video/').pop());
      setTitle(data.title || '');
      setDescription(data.description || '');
      setVisibility(data.visibility || 'public');
      setAllowComments(data.allow_comments !== false);
      setAdvertisementEnabled(data.advertisement_checkbox || false);
      setCountAdvertisement(data.advertisement_count || 0);
      setAdvertisementCount(data.advertisement_count || 0);
      
      // Маълумоти видеоҳо
      const videoData = data.video_names || [];
      setOldVideos(videoData);
      setOldVideoIds(data.videos_data || []);
      setPostId(id);
      
      // Танзими видеоҳо барои нишон додан
      const videoMetadata = videoData.map((video, index) => ({
        id: `old-${index}`,
        name: video,
        isOld: true
      }));
      setVideos(videoMetadata);
      setVideoNames(videoData);
      setVideoIds(data.videos_data || []);
      
      // Танзими thumbnail
      if (data.first_video_base64) {
        const base64 = data.first_video_base64;
        const preview = `data:image/jpeg;base64,${base64}`;
        setThumbnailPreview(preview);

        // 👉 табдил додан ба File
        const byteString = atob(base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uintArray = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uintArray[i] = byteString.charCodeAt(i);
        }

        const file = new File([uintArray], "thumbnail.jpg", {
          type: "image/jpeg",
        });

        setThumbnailFile(file);
      }
      
      // Боркунии аккаунтҳои шарик
      if (data.collaboration_accounts?.length > 0) {
        fetchAccountsByIds(data.collaboration_accounts);
      }
      
      // Нигоҳ доштани рӯйхати корбарони блокшуда
      setBlockedUsers(data.block_users_list || []);
      
    } catch (err) {
      addError(t('videoUploader.errors.connectionError'));
      console.error('Error loading post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountsByIds = async (ids) => {
    try {
      const response = await fetch(`${backendUrl}/account/by_ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!response.ok) throw new Error(t('videoUploader.errors.accountLoadError'));
      const accounts = await response.json();
      setSelectedAccounts(accounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Функсияи handleVideoUpload
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Санҷиш барои ҳадди файли 500 MB
    const MAX_SIZE_MB = 500;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      setVideoError(t('videoUploader.video.maxSize', { size: MAX_SIZE_MB }));
      e.target.value = null;
      return;
    }

    if (videos.length >= 10) {
      setVideoError(t('videoUploader.video.maxCount'));
      e.target.value = null;
      return;
    }

    setIsProcessingFile(true);
    setProcessingProgress(0);
    setVideoError('');

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProcessingProgress(percent);
      }
    };

    reader.onloadend = () => {
      const newVideoId = `new-${Date.now()}-${Math.random()}`;
      const videoData = reader.result;

      const newVideo = {
        id: newVideoId,
        name: file.name,
        data: videoData.split(',')[1] || videoData, // Base64 data
        file: file,
        isNew: true
      };

      setVideos(prev => [...prev, newVideo]);
      setVideoNames(prev => [...prev, file.name]);
      setNewVideos(prev => [...prev, newVideo]);

      setIsProcessingFile(false);
      setProcessingProgress(0);
    };

    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // Функсия барои интихоби thumbnail
  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Санҷиши андоза
    if (file.size > 10 * 1024 * 1024) {
      setThumbnailError(t('videoUploader.video.thumbnailMaxSize'));
      e.target.value = null;
      return;
    }

    // Санҷиши формат
    if (!file.type.startsWith('image/')) {
      setThumbnailError(t('videoUploader.video.thumbnailInvalidType'));
      e.target.value = null;
      return;
    }

    setThumbnailError('');
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Кад кардан ба 16:9
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const targetRatio = 16 / 9;
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        let sourceX = 0;
        let sourceY = 0;

        if (sourceWidth / sourceHeight > targetRatio) {
          // Акс васеътар аст - аз паҳлӯҳо бурида мешавад
          sourceWidth = sourceHeight * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Акс баландтар аст - аз боло ва поён бурида мешавад
          sourceHeight = sourceWidth / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        canvas.width = 800;  // Андозаи стандартӣ
        canvas.height = 450; // 800 / 16 * 9 = 450
        
        ctx.drawImage(
          img, 
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
        
        // Барои намоиш дар UI - Base64
        const previewUrl = canvas.toDataURL('image/jpeg', 0.95);
        setThumbnailPreview(previewUrl);
        
        // Барои фиристодан ба сервер - файлро табдил диҳед
        canvas.toBlob((blob) => {
          const croppedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          setThumbnailFile(croppedFile);
          setIsProcessingFile(false);
        }, 'image/jpeg', 0.95);
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      setThumbnailError(t('videoUploader.video.thumbnailLoadError'));
      setIsProcessingFile(false);
    };
    
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // Интихоби/бекор кардани интихоби видео
  const toggleVideoSelection = (index) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Ҳазфи видеоҳои интихобшуда
  const deleteSelectedVideos = () => {
    if (selectedIndices.size === 0) {
      setVideoError(t('videoUploader.video.noSelection'));
      return;
    }

    const indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a);
    const idsToDelete = [];
    
    // Ҷамъоварии ID-и видеоҳои кӯҳна барои ҳазф
    indicesToDelete.forEach(index => {
      const video = videos[index];
      if (!video.isNew && oldVideoIds[index]) {
        idsToDelete.push(oldVideoIds[index]);
      }
    });

    // Тоза кардани видеоҳо аз рӯйхатҳо
    const newVideosList = [...videos];
    const newVideoNamesList = [...videoNames];
    const newVideoIdsList = [...videoIds];
    
    indicesToDelete.forEach(index => {
      newVideosList.splice(index, 1);
      newVideoNamesList.splice(index, 1);
      if (index < newVideoIdsList.length) {
        newVideoIdsList.splice(index, 1);
      }
    });

    setVideos(newVideosList);
    setVideoNames(newVideoNamesList);
    setVideoIds(newVideoIdsList);
    setSelectedIndices(new Set());
    
    // Иловаи ID ба рӯйхати ҳазфшуда
    if (idsToDelete.length > 0) {
      setDeletedVideoIds(prev => [...prev, ...idsToDelete]);
    }

    // Агар видеоҳои нав бошад, аз newVideos низ ҳазф кунем
    const newVideosToKeep = newVideos.filter(v => 
      indicesToDelete.every(index => videos[index]?.id !== v.id)
    );
    setNewVideos(newVideosToKeep);
  };

  // Ҳазфи thumbnail
  const deleteThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
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
      const response = await fetch(
        `${backendUrl}/accounts-block?user_id=${userId}&search=${encodeURIComponent(searchTerm)}&exclude_ids=${blockedUsers}`,
        { timeout: 30000 }
      );
      
      if (!response.ok) throw new Error(t('videoUploader.errors.searchError'));
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.message === 'No accounts found for your search.') {
        setSearchResults([]);
      }
      
    } catch (err) {
      addError(t('videoUploader.errors.connectionError'));
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
        addError(t('videoUploader.video.maxCount'));
        return;
      }
      setSelectedAccounts(prev => [...prev, account]);
    }
  };

  // Функсияи пост кардан
  const handlePost = async () => {
    // Валидатсия
    if (videos.length === 0) {
      setVideoError(t('videoUploader.video.videoRequired'));
      return;
    }

    if (!thumbnailFile) {
      setThumbnailError(t('videoUploader.video.thumbnailRequired'));
      return;
    }

    setVideoError('');
    setThumbnailError('');
    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    try {
      // Пайвастшавӣ ба WebSocket барои прогресс
      const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
      const wsUrl = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/upload-progress-for-video/${uploadIdGenerated}`;
      
      const ws = new WebSocket(wsUrl);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(t('videoUploader.errors.webSocketError')));
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
        try {
          const data = JSON.parse(event.data);

          if (data.type === "ping") return;

          if (data.type === "progress") {
            const fixed = parseFloat(data.value.toFixed(2));
            setUploadProgress((prev) => Math.max(prev, fixed));
          }

          if (data.type === "complete") {
            setUploadProgress(100);
          }
        } catch (e) {
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Баъд запрос равон кун
      const formData = new FormData();
      
      formData.append("user_id", userId);
      formData.append("title", title || '');
      formData.append("description", description || '');
      formData.append("allow_comments", allowComments);
      formData.append("visibility", visibility);
      formData.append("upload_id", uploadIdGenerated);
      formData.append("thumbnail", thumbnailFile);

      if (advertisementEnabled && visibility !== 'private') {
        formData.append("advertisement_checkbox", "true");
        formData.append("advertisement_count", advertisementCount || "0");
      } else {
        formData.append("advertisement_checkbox", "false");
        formData.append("advertisement_count", "0");
      }

      if (visibility !== 'private') {
        const collaborationIds = selectedAccounts.map(acc => acc.id);
        formData.append("collaboration_accounts", JSON.stringify(collaborationIds));
      }

      const videosToUpload = videos.filter(v => v.isNew && v.file);
      videosToUpload.forEach((video) => {
        if (video.file) {
          formData.append("videos", video.file, video.name);
        }
      });

      const xhr = new XMLHttpRequest();

      xhr.open("POST", `${backendUrl}/save_post_video`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 95;
          const fixed = parseFloat(percent.toFixed(2));
          setUploadProgress((prev) => Math.max(prev, fixed));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");

          if (xhr.status === 200) {
            setUploadProgress(100);
            navigate(`/video/${data.post_link}`);
            return;
          }

          // 🔴 ҲАНДЛИНГИ ХАТОГИҲО
          if (xhr.status === 408) {
            addError(t('videoUploader.errors.insufficientFunds'));
          } else if (xhr.status === 400) {
            addError(data.detail || "Bad request");
          } else if (xhr.status === 500) {
            addError(data.detail || "Server error");
          } else {
            addError(data.detail || t('videoUploader.errors.uploadFailed'));
          }

        } catch (e) {
          console.error("❌ JSON parse error:", e);
          addError("Unexpected server response");
        } finally {
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        console.error("❌ Network error");
        addError(t('videoUploader.errors.uploadFailed'));
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (err) {
      console.error('Upload error:', err);
      addError(err.message || t('videoUploader.errors.uploadFailed'));
    }
  };

  // Функсияи навсозӣ кардани пост
  const handleUpdatePost = async () => {
    if (videos.length === 0) {
      setVideoError(t('videoUploader.video.videoRequired'));
      return;
    }

    if (!thumbnailFile) {
      setThumbnailError(t('videoUploader.video.thumbnailRequired'));
      return;
    }

    setVideoError('');
    setThumbnailError('');
    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    try {
      // ✅ WebSocket (мисли handlePost)
      const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
      const wsUrl = `${wsScheme}${backendUrl
        .replace('https://', '')
        .replace('http://', '')}/ws/upload-progress-for-video/${uploadIdGenerated}`;

      const ws = new WebSocket(wsUrl);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(t('videoUploader.errors.webSocketError')));
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

        try {
          const data = JSON.parse(event.data);

          if (data.type === "ping") return;

          if (data.type === "progress") {
            const fixed = parseFloat(data.value.toFixed(2));
            setUploadProgress((prev) => Math.max(prev, fixed));
          }

          if (data.type === "complete") {
            setUploadProgress(100);
          }

        } catch (e) {
        }
      };

      // =====================================================
      // ✅ FORM DATA
      // =====================================================
      const formData = new FormData();

      formData.append("post_id", postId);
      formData.append("upload_id", uploadIdGenerated);
      formData.append("user_id", userId);
      formData.append("title", title || '');
      formData.append("description", description || '');
      formData.append("allow_comments", allowComments);
      formData.append("visibility", visibility);
      formData.append("thumbnail", thumbnailFile);
      formData.append("link", linkVideo);

      if (deletedVideoIds.length > 0) {
        formData.append("deleted_videos", JSON.stringify(deletedVideoIds));
      }

      if (advertisementEnabled && visibility !== 'private') {
        formData.append("advertisement_checkbox", "true");
        formData.append("advertisement_count", advertisementCount || "0");
      } else {
        formData.append("advertisement_checkbox", "false");
        formData.append("advertisement_count", "0");
      }

      const collaborationAccounts = selectedAccounts.map(acc => acc.id);
      formData.append("collaboration_accounts", JSON.stringify(collaborationAccounts));

      const videosToUpload = videos.filter(v => v.isNew && v.file);
      videosToUpload.forEach((video) => {
        if (video.file) {
          formData.append("videos", video.file, video.name);
        }
      });

      // =====================================================
      // 🔥 XHR (ба ҷои fetch)
      // =====================================================
      const xhr = new XMLHttpRequest();

      xhr.open("POST", `${backendUrl}/update_post_video`);

      // ✅ Upload progress (0–95%)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 95;
          const fixed = parseFloat(percent.toFixed(2));
          setUploadProgress((prev) => Math.max(prev, fixed));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");

          if (xhr.status === 200) {
            setUploadProgress(100);
            navigate(`/video/${linkVideo}`);
            return;
          }

          if (xhr.status === 408) {
            addError(t('videoUploader.errors.insufficientFunds'));
          } else {
            addError(data.detail || t('videoUploader.errors.updateFailed'));
          }

        } catch (e) {
          addError("Unexpected server response");
        } finally {
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        addError(t('videoUploader.errors.updateFailed'));
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (err) {
      console.error('Update error:', err);
      addError(err.message || t('videoUploader.errors.updateFailed'));
      setIsUploading(false);
    } finally {
      setDeletedVideoIds([]);
    }
  };

  // Рендери компонент
  return (
    <div className="video-uploader-container">
      {/* Loading overlay */}
      {isLoading && (
        <div className="video-uploader-loading-overlay">
          <div className="video-uploader-loading-spinner" />
        </div>
      )}

      {/* Back button */}
      <button
        className="video-uploader-back-button"
        onClick={() => navigate(videoId || actualLink ? `/video/${linkVideo || actualLink}` : `/create`)}
        title={t('videoUploader.back')}
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

      <div className="video-uploader-main-card">
        <div className="video-uploader-content-wrapper">
          {/* Left column - Video section */}
          <div className="video-uploader-video-section">
            <div className="video-uploader-video-container">
              
              {/* Thumbnail preview */}
              <div className="video-uploader-thumbnail-wrapper">
                {thumbnailPreview  ? (
                  <>
                    <img
                      src={thumbnailPreview }
                      alt="Thumbnail"
                      className="video-uploader-thumbnail-image"
                    />
                    {(isPostOwner || !actualLink) && (
                      <button
                        className="video-uploader-delete-thumbnail-button"
                        onClick={deleteThumbnail}
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <div className="video-uploader-thumbnail-placeholder">
                    <span>{t('videoUploader.video.noThumbnail')}</span>
                  </div>
                )}
              </div>

              {/* Video list */}
              {videos.length > 0 && (
                <div className="video-uploader-video-list">
                  <h3>{t('videoUploader.video.selectedVideos', { count: videos.length })}</h3>
                  {videos.map((video, index) => (
                    <div key={video.id} className="video-uploader-video-item">
                      <label className="video-uploader-video-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(index)}
                          onChange={() => toggleVideoSelection(index)}
                        />
                        <span className="video-uploader-video-name">
                          {index + 1}. {video.name}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Error messages */}
              {videoError && (
                <p className="video-uploader-error-message">{videoError}</p>
              )}
              
              {thumbnailError && (
                <p className="video-uploader-error-message">{thumbnailError}</p>
              )}
              
              {/* Progress bar барои коркарди файл */}
              {isProcessingFile && (
                <div className="video-uploader-processing-progress">
                  <p className="video-uploader-progress-label">
                    {t('videoUploader.processingProgress', { progress: processingProgress })}
                  </p>
                  <div className="video-uploader-progress-bar">
                    <div
                      className="video-uploader-progress-fill"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Upload buttons */}
              {(isPostOwner || !actualLink) && (
                <div className="video-uploader-upload-area">
                  {/* Video upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    style={{ display: 'none' }}
                    id="video-uploader-file-upload"
                    disabled={isProcessingFile}
                  />
                  <label 
                    htmlFor="video-uploader-file-upload" 
                    className={`video-uploader-upload-label ${isProcessingFile ? 'disabled' : ''}`}
                  >
                    {isProcessingFile ? t('videoUploader.video.processing') : t('videoUploader.video.select')}
                  </label>

                  {/* Thumbnail upload */}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    style={{ display: 'none' }}
                    id="video-uploader-thumbnail-upload"
                    disabled={isProcessingFile}
                  />
                  <label 
                    htmlFor="video-uploader-thumbnail-upload" 
                    className={`video-uploader-upload-label ${isProcessingFile ? 'disabled' : ''}`}
                  >
                    {isProcessingFile ? t('videoUploader.video.processing') : t('videoUploader.video.selectThumbnail')}
                  </label>

                  {/* Delete selected videos button */}
                  {selectedIndices.size > 0 && (
                    <button
                      className="video-uploader-delete-videos-button"
                      onClick={deleteSelectedVideos}
                    >
                      {t('videoUploader.video.deleteSelected', { count: selectedIndices.size })}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Form section */}
          {(isPostOwner || !actualLink) && (
            <div className="video-uploader-form-section">
              <div className="video-uploader-form-group">
                <label>{t('videoUploader.form.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('videoUploader.form.titlePlaceholder')}
                  maxLength={500}
                  className="video-uploader-form-input"
                />
              </div>
              
              <div className="video-uploader-form-group">
                <label>{t('videoUploader.form.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('videoUploader.form.descriptionPlaceholder')}
                  maxLength={5000}
                  rows={4}
                  className="video-uploader-form-textarea"
                />
              </div>
              
              <div className="video-uploader-form-group">
                <label>{t('videoUploader.form.visibility')}</label>
                <select
                  value={visibility}
                  onChange={handleVisibilityChange}
                  className="video-uploader-form-select"
                >
                  <option value="public">{t('videoUploader.form.public')}</option>
                  <option value="private">{t('videoUploader.form.private')}</option>
                  <option value="with_link">{t('videoUploader.form.withLink')}</option>
                </select>
              </div>
              
              <div className="video-uploader-checkbox-group">
                <label className="video-uploader-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                  />
                  {t('videoUploader.form.allowComments')}
                </label>
              </div>
              
              {visibility !== 'private' && (
                <>
                  <div className="video-uploader-checkbox-group">
                    <label className="video-uploader-checkbox-label">
                      <input
                        type="checkbox"
                        checked={advertisementEnabled}
                        onChange={handleAdvertisementToggle}
                      />
                      {t('videoUploader.form.advertise')}
                    </label>
                  </div>
                  
                  {advertisementEnabled && (
                    <>
                      <p className="video-uploader-advertisement-note">
                        {t('videoUploader.form.advertisementNote')}
                      </p>
                      
                      <div className="video-uploader-form-group">
                        <input
                          type="number"
                          value={advertisementCount}
                          onChange={(e) => setAdvertisementCount(e.target.value)}
                          placeholder={t('videoUploader.form.advertisementCount')}
                          min="0"
                          className="video-uploader-form-input"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {visibility !== 'private' && (
                <div className="video-uploader-collaboration-section">
                  <button
                    className="video-uploader-collaboration-button"
                    onClick={() => setShowPopup(true)}
                  >
                    {t('videoUploader.form.collaborate')}
                  </button>
                  
                  {selectedAccounts.length > 0 && (
                    <div className="video-uploader-selected-accounts">
                      <p>{t('videoUploader.form.selectedAccounts', { count: selectedAccounts.length })}</p>
                      {selectedAccounts.map(account => (
                        <div key={account.id} className="video-uploader-account-card">
                          <img 
                            src={account.avatar || '/default-avatar.png'} 
                            alt={account.username}
                            className="video-uploader-account-avatar"
                          />
                          <div className="video-uploader-account-info">
                            <div className="video-uploader-account-name">
                              {account.display_name || `@${account.username}`}
                            </div>
                            <div className="video-uploader-account-username">
                              @{account.username}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="video-uploader-action-buttons">
                <button
                  className="video-uploader-post-button"
                  onClick={videoId || actualLink ? handleUpdatePost : handlePost}
                  disabled={isUploading || videos.length === 0 || !thumbnailFile || isProcessingFile}
                >
                  {isUploading 
                    ? t('videoUploader.form.uploading', { progress: uploadProgress }) 
                    : (videoId || actualLink ? t('videoUploader.form.update') : t('videoUploader.form.post'))}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collaboration popup */}
        {showPopup && (
          <div className="video-uploader-popup-overlay" onClick={() => setShowPopup(false)}>
            <div className="video-uploader-popup-content" onClick={e => e.stopPropagation()}>
              <div className="video-uploader-search-container">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('videoUploader.collaboration.searchPlaceholder')}
                  className="video-uploader-search-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className="video-uploader-search-button"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  🔍
                </button>
              </div>

              <div className="video-uploader-search-results">
                {isSearching ? (
                  <p className="video-uploader-text-center">{t('videoUploader.collaboration.searching')}</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(account => {
                    const isSelected = selectedAccounts.some(a => a.id === account.id);
                    return (
                      <div key={account.id} className="video-uploader-account-search-item">
                        <img 
                          src={account.avatar || '/default-avatar.png'} 
                          alt={account.username}
                          className="video-uploader-account-avatar"
                        />
                        <div className="video-uploader-account-info">
                          <div className="video-uploader-account-name">
                            @{account.username}
                          </div>
                        </div>
                        <button
                          className={`video-uploader-select-button ${isSelected ? 'video-uploader-selected' : ''}`}
                          onClick={() => handleSendButton(account)}
                        >
                          {isSelected ? t('videoUploader.collaboration.cancel') : t('videoUploader.collaboration.send')}
                        </button>
                      </div>
                    );
                  })
                ) : null}
              </div>

              <button
                className="video-uploader-close-popup-button"
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="video-uploader-upload-progress-overlay">
            <div className="video-uploader-progress-content">
              <p className="video-uploader-progress-label">
                {t('videoUploader.uploadProgress', { progress: uploadProgress })}
              </p>
              <div className="video-uploader-progress-bar">
                <div
                  className="video-uploader-progress-fill"
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

export default VideoUploader;