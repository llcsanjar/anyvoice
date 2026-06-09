// src/supported/SupportedPosts.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message, Tabs } from 'antd';
import ImageLoader from '../explore/ImageLoader';
import VideoLoader from '../explore/VideoLoader';
import '../explore/image.css';
import '../explore/video.css';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const SupportedPosts = ({
  userId,
  backendUrl,
  avatar,
  username,
  display,
  fullContainerRef
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Ҳолат барои tabs
  const [activeTab, setActiveTab] = useState('images');
  
  // ==================== Ҳолат барои расмҳо ====================
  const [images, setImages] = useState([]);
  const [imagesPlaceholders, setImagesPlaceholders] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [noMoreImages, setNoMoreImages] = useState(false);
  const seenImageIdsRef = useRef(new Set());
  const hasImagesEndedRef = useRef(false);
  const isFetchingImagesRef = useRef(false);

  // ==================== Ҳолат барои видеоҳо ====================
  const [videos, setVideos] = useState([]);
  const [videosPlaceholders, setVideosPlaceholders] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [noMoreVideos, setNoMoreVideos] = useState(false);
  const seenVideoIdsRef = useRef(new Set());
  const hasVideosEndedRef = useRef(false);
  const isFetchingVideosRef = useRef(false);

  const isMountedRef = useRef(true);
  const internalContainerRef = useRef(null);
  
  // Истифодаи ref аз берун агар мавҷуд бошад, вагарна ref дохилӣ
  const containerRef = fullContainerRef || internalContainerRef;
  
  const limit = 10;

  // =========================
  // Placeholders барои расмҳо
  // =========================
  const createImagePlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="image-placeholder" key={`image-placeholder-${i}`}>
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
    setImagesPlaceholders(items);
  };

  const clearImagePlaceholders = () => setImagesPlaceholders([]);

  // =========================
  // Placeholders барои видеоҳо
  // =========================
  const createVideoPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="video-placeholder" key={`video-placeholder-${i}`}>
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
    setVideosPlaceholders(items);
  };

  const clearVideoPlaceholders = () => setVideosPlaceholders([]);

  // =========================
  // Боргирии расмҳои дастгиришуда
  // =========================
  const loadMoreImages = useCallback(async () => {
    if (
      isFetchingImagesRef.current ||
      imagesLoading ||
      hasImagesEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'images'
    ) {
      return;
    }

    isFetchingImagesRef.current = true;
    setImagesLoading(true);
    createImagePlaceholders(limit);

    try {
      const excludeIds = Array.from(seenImageIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-supported-images`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const imagesData = response.data.images || [];

      if (!imagesData.length) {
        hasImagesEndedRef.current = true;
        setNoMoreImages(true);
        clearImagePlaceholders();
        return;
      }

      imagesData.forEach(v => seenImageIdsRef.current.add(v.id));

      setImages(prev => [
        ...prev,
        ...imagesData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearImagePlaceholders();
    } catch (err) {
      message.error(t('supportedPosts.error'));
      clearImagePlaceholders();
    } finally {
      setImagesLoading(false);
      isFetchingImagesRef.current = false;
    }
  }, [backendUrl, userId, imagesLoading, activeTab, t]);

  // =========================
  // Боргирии видеоҳои дастгиришуда
  // =========================
  const loadMoreVideos = useCallback(async () => {
    if (
      isFetchingVideosRef.current ||
      videosLoading ||
      hasVideosEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'videos'
    ) {
      return;
    }

    isFetchingVideosRef.current = true;
    setVideosLoading(true);
    createVideoPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenVideoIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-supported-videos`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const videosData = response.data.videos || [];

      if (!videosData.length) {
        hasVideosEndedRef.current = true;
        setNoMoreVideos(true);
        clearVideoPlaceholders();
        return;
      }

      videosData.forEach(v => seenVideoIdsRef.current.add(v.id));

      setVideos(prev => [
        ...prev,
        ...videosData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearVideoPlaceholders();
    } catch (err) {
      message.error(t('supportedPosts.error'));
      clearVideoPlaceholders();
    } finally {
      setVideosLoading(false);
      isFetchingVideosRef.current = false;
    }
  }, [backendUrl, userId, videosLoading, activeTab, t]);

  // =========================
  // Scroll listener
  // =========================
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout;

    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { scrollTop, clientHeight, scrollHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 300) {
          if (activeTab === 'images') {
            loadMoreImages();
          } else if (activeTab === 'videos') {
            loadMoreVideos();
          }
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreImages, loadMoreVideos, activeTab, containerRef]);

  // =========================
  // Боргирии аввал вобаста ба tab
  // =========================
  useEffect(() => {
    if (activeTab === 'images' && images.length === 0 && !hasImagesEndedRef.current) {
      loadMoreImages();
    } else if (activeTab === 'videos' && videos.length === 0 && !hasVideosEndedRef.current) {
      loadMoreVideos();
    }
  }, [activeTab, images.length, videos.length, loadMoreImages, loadMoreVideos]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // =========================
  // Тағйири tab
  // =========================
  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // =========================
  // Render
  // =========================
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#303030'
      }}
    >
      <button 
          className="back-from-account-button"
          onClick={() => navigate(`/@${username}`)}
        >
          ← {t('supportedPosts.back')}
      </button>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        centered
        size="large"
        style={{ marginBottom: 24 }}
        tabBarStyle={{ color: '#fff' }}
      >
        <TabPane tab={t('supportedPosts.tabs.images')} key="images" />
        <TabPane tab={t('supportedPosts.tabs.videos')} key="videos" />
      </Tabs>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto',
          gridAutoRows: 'auto',
          alignItems: 'start'
        }}
      >
        {/* Расмҳо */}
        {activeTab === 'images' && (
          <>
            {images.length > 0 ? (
              images.map(image => (
                <div
                  key={image.key}
                  style={{
                    transition: 'transform 0.2s ease',
                  }}
                  className="card"
                >
                  <ImageLoader
                    imageId={image.id}
                    containerId={`supported-image-${image.id}`}
                    backendUrl={backendUrl}
                    userId={userId}
                    avatarPath={avatar}
                    myUsername={username}
                    myDisplay={display}
                    userIdOfImage={image.user_id}
                    fullContainerRef={containerRef}
                  />
                </div>
              ))
            ) : (
              !imagesLoading && !noMoreImages && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('supportedPosts.noImages')}
                </div>
              )
            )}

            {imagesPlaceholders}

            {imagesLoading && !noMoreImages && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}
          </>
        )}

        {/* Видеоҳо */}
        {activeTab === 'videos' && (
          <>
            {videos.length > 0 ? (
              videos.map(video => (
                <div
                  key={video.key}
                  style={{
                    transition: 'transform 0.2s ease',
                  }}
                  className="card"
                >
                  <VideoLoader
                    typeVideo="supported"
                    videoId={video.id}
                    containerId={`supported-video-${video.id}`}
                    backendUrl={backendUrl}
                    userId={userId}
                    avatarPath={avatar}
                    myUsername={username}
                    myDisplay={display}
                    userIdOfVideo={video.user_id}
                    fullContainerRef={containerRef}
                  />
                </div>
              ))
            ) : (
              !videosLoading && !noMoreVideos && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('supportedPosts.noVideos')}
                </div>
              )
            )}

            {videosPlaceholders}

            {videosLoading && !noMoreVideos && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}
          </>
        )}

      </div>

      <style>
        {`
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          .ant-tabs-tab {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          
          .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #1890ff !important;
          }
          
          .ant-tabs-ink-bar {
            background: #1890ff !important;
          }
          
          .card {
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  );
};

export default SupportedPosts;