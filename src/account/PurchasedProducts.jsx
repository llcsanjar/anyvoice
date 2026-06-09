// src/supported/PurchasedProducts.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import ProductLoader from '../shoping/ProductLoader';
import '../explore/image.css';
import { useNavigate } from 'react-router-dom';

const PurchasedProducts = ({
  userId,
  backendUrl,
  avatar,
  username,
  display,
  fullContainerRef
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ==================== Ҳолат барои маҳсулҳо ====================
  const [products, setProducts] = useState([]);
  const [productsPlaceholders, setProductsPlaceholders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const seenProductIdsRef = useRef(new Set());
  const hasProductsEndedRef = useRef(false);
  const isFetchingProductsRef = useRef(false);

  const isMountedRef = useRef(true);
  const internalContainerRef = useRef(null);
  
  // Истифодаи ref аз берун агар мавҷуд бошад, вагарна ref дохилӣ
  const containerRef = fullContainerRef || internalContainerRef;
  
  const limit = 10;

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
  // Боргирии маҳсулҳои харидашуда
  // =========================
  const loadMoreProducts = useCallback(async () => {
    if (
      isFetchingProductsRef.current ||
      productsLoading ||
      hasProductsEndedRef.current ||
      !isMountedRef.current
    ) {
      return;
    }

    isFetchingProductsRef.current = true;
    setProductsLoading(true);
    createProductPlaceholders(limit);

    try {
      const excludeIds = Array.from(seenProductIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-buyed-products`, {
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

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validProductsData = productsData.filter(p => p && p.id);
      
      validProductsData.forEach(v => seenProductIdsRef.current.add(v.id));

      setProducts(prev => [
        ...prev,
        ...validProductsData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearProductPlaceholders();
    } catch (err) {
      message.error(t('purchasedProducts.error'));
      clearProductPlaceholders();
    } finally {
      setProductsLoading(false);
      isFetchingProductsRef.current = false;
    }
  }, [backendUrl, userId, productsLoading, t]);

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
          loadMoreProducts();
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreProducts, containerRef]);

  // =========================
  // Боргирии аввал
  // =========================
  useEffect(() => {
    if (products.length === 0 && !hasProductsEndedRef.current) {
      loadMoreProducts();
    }
  }, [products.length, loadMoreProducts]);

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
          ← {t('purchasedProducts.back')}
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
        {/* Маҳсулҳо */}
        {products.length > 0 ? (
          products.map(product => {
            // Санҷидани мавҷудияти id
            if (!product || !product.id) {
              return null;
            }
            
            return (
              <div
                key={product.key || product.id}
                style={{
                  transition: 'transform 0.2s ease',
                }}
                className="card"
              >
                <ProductLoader
                  productId={product.id}  // Тағйир дода шуд аз imageId ба productId
                  containerId={`purchased-product-${product.id}`}
                  backendUrl={backendUrl}
                  userId={userId}
                  avatarPath={avatar}
                  myUsername={username}
                  myDisplay={display}
                  userIdOfProduct={product.user_id}  // Тағйир дода шуд аз userIdOfImage ба userIdOfProduct
                  fullContainerRef={containerRef}
                />
              </div>
            );
          }).filter(Boolean) // Фильтр кардани элементҳои null
        ) : (
          !productsLoading && !noMoreProducts && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
              {t('purchasedProducts.noProducts')}
            </div>
          )
        )}

        {productsPlaceholders}

        {productsLoading && !noMoreProducts && (
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

export default PurchasedProducts;