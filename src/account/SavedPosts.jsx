// src/saved/SavedPosts.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message, Tabs } from 'antd';
import ImageLoader from '../explore/ImageLoader';
import VideoLoader from '../explore/VideoLoader';
import ProductLoader from '../shoping/ProductLoader';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import '../explore/image.css';
import '../explore/video.css';
import '../dispute/theory/theory.css';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const SavedPosts = ({
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

  // ==================== Ҳолат барои маҳсулҳо ====================
  const [products, setProducts] = useState([]);
  const [productsPlaceholders, setProductsPlaceholders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const seenProductIdsRef = useRef(new Set());
  const hasProductsEndedRef = useRef(false);
  const isFetchingProductsRef = useRef(false);

  // ==================== Ҳолат барои назарияҳо ====================
  const [theories, setTheories] = useState([]);
  const [theoriesPlaceholders, setTheoriesPlaceholders] = useState([]);
  const [theoriesLoading, setTheoriesLoading] = useState(false);
  const [noMoreTheories, setNoMoreTheories] = useState(false);
  const seenTheoryIdsRef = useRef(new Set());
  const hasTheoriesEndedRef = useRef(false);
  const isFetchingTheoriesRef = useRef(false);

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
  // Placeholders барои маҳсулҳо
  // =========================
  const createProductPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="image-placeholder" key={`product-placeholder-${i}`}>
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
    setProductsPlaceholders(items);
  };

  const clearProductPlaceholders = () => setProductsPlaceholders([]);

  // =========================
  // Placeholders барои назарияҳо
  // =========================
  const createTheoryPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="theory-placeholder" key={`theory-placeholder-${i}`}>
          <div className="theory-info-placeholder">
            <div className="text-theory-placeholder"></div>
            <div className="text-theory-placeholder"></div>
            <div className="text-theory-placeholder"></div>
            <div className="title-placeholder"></div>
            <div className="description-placeholder"></div>
            <div className="meta-placeholder"></div>
            <div className="author-placeholder"></div>
          </div>
        </div>
      );
    }
    setTheoriesPlaceholders(items);
  };

  const clearTheoryPlaceholders = () => setTheoriesPlaceholders([]);

  // =========================
  // Боргирии расмҳои захирашуда
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

      const response = await axios.get(`${backendUrl}/get-user-saved-images`, {
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
      message.error(t('savedPosts.error'));
      clearImagePlaceholders();
    } finally {
      setImagesLoading(false);
      isFetchingImagesRef.current = false;
    }
  }, [backendUrl, userId, imagesLoading, activeTab, t]);

  // =========================
  // Боргирии видеоҳои захирашуда
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

      const response = await axios.get(`${backendUrl}/get-user-saved-videos`, {
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
      message.error(t('savedPosts.error'));
      clearVideoPlaceholders();
    } finally {
      setVideosLoading(false);
      isFetchingVideosRef.current = false;
    }
  }, [backendUrl, userId, videosLoading, activeTab, t]);

  // =========================
  // Боргирии маҳсулҳои захирашуда
  // =========================
  const loadMoreProducts = useCallback(async () => {
    if (
      isFetchingProductsRef.current ||
      productsLoading ||
      hasProductsEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'products'
    ) {
      return;
    }

    isFetchingProductsRef.current = true;
    setProductsLoading(true);
    createProductPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenProductIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-saved-products`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const productsData = response.data.products || [];

      if (!productsData.length) {
        hasProductsEndedRef.current = true;
        setNoMoreProducts(true);
        clearProductPlaceholders();
        return;
      }

      productsData.forEach(v => seenProductIdsRef.current.add(v.id));

      setProducts(prev => [
        ...prev,
        ...productsData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearProductPlaceholders();
    } catch (err) {
      message.error(t('savedPosts.error'));
      clearProductPlaceholders();
    } finally {
      setProductsLoading(false);
      isFetchingProductsRef.current = false;
    }
  }, [backendUrl, userId, productsLoading, activeTab, t]);

  // =========================
  // Боргирии назарияҳои захирашуда
  // =========================
  const loadMoreTheories = useCallback(async () => {
    if (
      isFetchingTheoriesRef.current ||
      theoriesLoading ||
      hasTheoriesEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'theories'
    ) {
      return;
    }

    isFetchingTheoriesRef.current = true;
    setTheoriesLoading(true);
    createTheoryPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenTheoryIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-saved-theories`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const theoriesData = response.data.theories || [];

      if (!theoriesData.length) {
        hasTheoriesEndedRef.current = true;
        setNoMoreTheories(true);
        clearTheoryPlaceholders();
        return;
      }

      theoriesData.forEach(v => seenTheoryIdsRef.current.add(v.id));

      setTheories(prev => [
        ...prev,
        ...theoriesData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearTheoryPlaceholders();
    } catch (err) {
      message.error(t('savedPosts.error'));
      clearTheoryPlaceholders();
    } finally {
      setTheoriesLoading(false);
      isFetchingTheoriesRef.current = false;
    }
  }, [backendUrl, userId, theoriesLoading, activeTab, t]);

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
          } else if (activeTab === 'products') {
            loadMoreProducts();
          } else if (activeTab === 'theories') {
            loadMoreTheories();
          }
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreImages, loadMoreVideos, loadMoreProducts, loadMoreTheories, activeTab, containerRef]);

  // =========================
  // Боргирии аввал вобаста ба tab
  // =========================
  useEffect(() => {
    if (activeTab === 'images' && images.length === 0 && !hasImagesEndedRef.current) {
      loadMoreImages();
    } else if (activeTab === 'videos' && videos.length === 0 && !hasVideosEndedRef.current) {
      loadMoreVideos();
    } else if (activeTab === 'products' && products.length === 0 && !hasProductsEndedRef.current) {
      loadMoreProducts();
    } else if (activeTab === 'theories' && theories.length === 0 && !hasTheoriesEndedRef.current) {
      loadMoreTheories();
    }
  }, [activeTab, images.length, videos.length, products.length, theories.length, loadMoreImages, loadMoreVideos, loadMoreProducts, loadMoreTheories]);

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
          ← {t('savedPosts.back')}
      </button>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        centered
        size="large"
        style={{ marginBottom: 24 }}
        tabBarStyle={{ color: '#fff' }}
      >
        <TabPane tab={t('savedPosts.tabs.images')} key="images" />
        <TabPane tab={t('savedPosts.tabs.videos')} key="videos" />
        {/* <TabPane tab={t('savedPosts.tabs.products')} key="products" /> */}
        {/* <TabPane tab={t('savedPosts.tabs.theories')} key="theories" /> */}
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
                    containerId={`saved-image-${image.id}`}
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
                  {t('savedPosts.noImages')}
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
                    typeVideo="saved"
                    videoId={video.id}
                    containerId={`saved-video-${video.id}`}
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
                  {t('savedPosts.noVideos')}
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

        {/* Маҳсулҳо */}
        {activeTab === 'products' && (
          <>
            {products.length > 0 ? (
              products.map(product => (
                <div
                  key={product.key}
                  style={{
                    transition: 'transform 0.2s ease',
                  }}
                  className="card"
                >
                  <ProductLoader
                    productId={product.id}
                    containerId={`saved-product-${product.id}`}
                    backendUrl={backendUrl}
                    userId={userId}
                    avatarPath={avatar}
                    myUsername={username}
                    myDisplay={display}
                    userIdOfProduct={product.user_id}
                    fullContainerRef={containerRef}
                  />
                </div>
              ))
            ) : (
              !productsLoading && !noMoreProducts && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('savedPosts.noProducts')}
                </div>
              )
            )}

            {productsPlaceholders}

            {productsLoading && !noMoreProducts && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}
          </>
        )}

        {/* Назарияҳо */}
        {activeTab === 'theories' && (
          <>
            {theories.length > 0 ? (
              theories.map(theory => (
                <div
                  key={theory.key}
                  style={{
                    transition: 'transform 0.2s ease',
                  }}
                  className="card"
                >
                  <TheoryLoader
                    theoryId={theory.id}
                    containerId={`saved-theory-${theory.id}`}
                    backendUrl={backendUrl}
                    userId={userId}
                    avatarPath={avatar}
                    myUsername={username}
                    myDisplay={display}
                    userIdOfTheory={theory.user_id}
                    fullContainerRef={containerRef}
                  />
                </div>
              ))
            ) : (
              !theoriesLoading && !noMoreTheories && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('savedPosts.noTheories')}
                </div>
              )
            )}

            {theoriesPlaceholders}

            {theoriesLoading && !noMoreTheories && (
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

export default SavedPosts;