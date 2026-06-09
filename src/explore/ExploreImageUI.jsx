// src/explore/ExploreImageUI.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import ImageLoader from './ImageLoader';
import './image.css';

const ExploreImageUI = ({
  userId,
  backendUrl,
  avatarPath,
  myUsername,
  myDisplay,
  fullContainerRef, // Гирифтани ref аз menu.js
}) => {
  const { t } = useTranslation();
  const limit = 10;

  const [images, setImages] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noMoreImages, setNoMoreImages] = useState(false);

  const containerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 🔒 request lock
  const isFetchingRef = useRef(false);

  // 🛑 флаг ниҳоӣ – дигар ҳеҷ гоҳ боргирӣ нашавад
  const hasEndedRef = useRef(false);

  // 👀 seen ids
  const seenImageIdsRef = useRef(new Set());

  // =========================
  // Placeholders
  // =========================
  const createPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="image-placeholder" key={`placeholder-${i}`}>
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
    setPlaceholders(items);
  };

  const clearPlaceholders = () => setPlaceholders([]);

  // =========================
  // Load images
  // =========================
  const loadMoreImages = useCallback(async () => {
    if (
      isFetchingRef.current ||
      loading ||
      hasEndedRef.current ||
      !isMountedRef.current
    ) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    createPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenImageIdsRef.current);

      const res = await axios.get(`${backendUrl}/get-random-images`, {
        params: {
          limit,
          user_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const imagesData = res.data.images || [];

      // ❌ дигар расм нест → қатъи абадӣ
      if (!imagesData.length) {
        hasEndedRef.current = true;
        setNoMoreImages(true);
        clearPlaceholders();
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

      clearPlaceholders();
    } catch (err) {
      message.error(t('exploreImage.error'));
      clearPlaceholders();
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [backendUrl, userId, loading, t]);

  // =========================
  // Scroll listener (ЯКТО)
  // =========================
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout;

    const onScroll = () => {
      if (hasEndedRef.current) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { scrollTop, clientHeight, scrollHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 300) {
          loadMoreImages();
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    // боргирии аввал
    if (images.length === 0) {
      loadMoreImages();
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreImages, images.length]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}
      >
        {images.map(image => (
          <div
            key={image.key}
            style={{
              transition: 'transform 0.2s ease',
            }}
            className="card"
          >
            <ImageLoader
              imageId={image.id}
              containerId={`image-${image.id}`}
              backendUrl={backendUrl}
              userId={userId}
              avatarPath={avatarPath}
              myUsername={myUsername}
              myDisplay={myDisplay}
              userIdOfImage={image.user_id}
              fullContainerRef={fullContainerRef} // Интиқоли ref ба ImageLoader
            />
          </div>
        ))}

        {placeholders}

        {loading && !noMoreImages && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </div>
  );
};

export default ExploreImageUI;