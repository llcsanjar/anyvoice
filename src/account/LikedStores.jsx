// src/supported/LikedStores.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import ShopingLoader from '../shoping/ShopingLoader';
import '../shoping/ShopingLoader.css';
import { useNavigate } from 'react-router-dom';

const LikedStores = ({
  userId,
  backendUrl,
  avatar,
  username,
  display,
  fullContainerRef
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ==================== Ҳолат барои мағозаҳо ====================
  const [shopings, setShoping] = useState([]);
  const [shopingPlaceholders, setShopingPlaceholders] = useState([]);
  const [shopingLoading, setShopingLoading] = useState(false);
  const [noMoreShoping, setNoMoreShoping] = useState(false);
  const seenShopingIdsRef = useRef(new Set());
  const hasShopingEndedRef = useRef(false);
  const isFetchingShopingRef = useRef(false);

  const isMountedRef = useRef(true);
  const internalContainerRef = useRef(null);
  
  // Истифодаи ref аз берун агар мавҷуд бошад, вагарна ref дохилӣ
  const containerRef = fullContainerRef || internalContainerRef;
  
  const limit = 10;

  // =========================
  // Placeholders барои мағозаҳо
  // =========================
  const createShopingPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div key={`shoping-placeholder-${i}`} className="placeholder-card-shoping">
          <div className="placeholder-shoping"></div>
          <div className="placeholder-content-shoping">
            <div className="placeholder-line-shoping short"></div>
            <div className="placeholder-line-shoping medium"></div>
            <div className="placeholder-line-shoping full"></div>
          </div>
        </div>
      );
    }
    setShopingPlaceholders(items);
  };

  const clearShopingPlaceholders = () => setShopingPlaceholders([]);

  // =========================
  // Боргирии мағозаҳои лайкшуда
  // =========================
  const loadMoreShoping = useCallback(async () => {
    if (
      isFetchingShopingRef.current ||
      shopingLoading ||
      hasShopingEndedRef.current ||
      !isMountedRef.current
    ) {
      return;
    }

    isFetchingShopingRef.current = true;
    setShopingLoading(true);
    createShopingPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenShopingIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-liked-shoping`, {
        params: {
          limit,
          user_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const shopingsData = response.data.shopings || [];

      if (!shopingsData.length) {
        hasShopingEndedRef.current = true;
        setNoMoreShoping(true);
        clearShopingPlaceholders();
        return;
      }

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validShopingData = shopingsData.filter(s => s && s.id);
      
      validShopingData.forEach(s => seenShopingIdsRef.current.add(s.id));

      setShoping(prev => [
        ...prev,
        ...validShopingData.map(s => ({
          ...s,
          key: `shoping-${s.id}-${Date.now()}`
        }))
      ]);

      clearShopingPlaceholders();
    } catch (err) {
      message.error(t('likedStores.error'));
      clearShopingPlaceholders();
    } finally {
      setShopingLoading(false);
      isFetchingShopingRef.current = false;
    }
  }, [backendUrl, userId, shopingLoading, t]);

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
          loadMoreShoping();
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreShoping, containerRef]);

  // =========================
  // Боргирии аввал
  // =========================
  useEffect(() => {
    if (shopings.length === 0 && !hasShopingEndedRef.current) {
      loadMoreShoping();
    }
  }, [shopings.length, loadMoreShoping]);

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
      <button 
          className="back-from-account-button"
          onClick={() => navigate(`/@${username}`)}
        >
          ← {t('likedStores.back')}
      </button>

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
        {/* Мағозаҳо */}
        {shopings.length > 0 ? (
          shopings.map(shoping => {
            // Санҷидани мавҷудияти id
            if (!shoping || !shoping.id) {
              return null;
            }
            
            return (
              <div
                key={shoping.key || shoping.id}
                style={{
                  transition: 'transform 0.2s ease',
                }}
                className="card"
              >
                <ShopingLoader
                  shopingId={shoping.id}
                  backendUrl={backendUrl}
                  userId={userId}
                  avatarPath={avatar}
                  myUsername={username}
                  myDisplay={display}
                  userIdOfShoping={shoping.user_id}
                  fullContainerRef={containerRef}
                />
              </div>
            );
          }).filter(Boolean) // Фильтр кардани элементҳои null
        ) : (
          !shopingLoading && !noMoreShoping && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
              {t('likedStores.noStores')}
            </div>
          )
        )}

        {shopingPlaceholders}

        {shopingLoading && !noMoreShoping && (
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
          
          .card {
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  );
};

export default LikedStores;