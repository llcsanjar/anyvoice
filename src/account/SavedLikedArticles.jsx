// src/article/SavedLikedArticles.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { message, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import ArticleItem from '../dispute/article/ArticleItem';
import '../dispute/article/article.css';

const { TabPane } = Tabs;

const SavedLikedArticles = ({
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
  const [activeTab, setActiveTab] = useState('saved');
  
  // ==================== Ҳолат барои мақолаҳои захиракарда ====================
  const [savedArticles, setSavedArticles] = useState([]);
  const [savedPlaceholders, setSavedPlaceholders] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [noMoreSaved, setNoMoreSaved] = useState(false);
  const seenSavedIdsRef = useRef(new Set());
  const hasSavedEndedRef = useRef(false);
  const isFetchingSavedRef = useRef(false);

  // ==================== Ҳолат барои мақолаҳои лайккарда ====================
  const [likedArticles, setLikedArticles] = useState([]);
  const [likedPlaceholders, setLikedPlaceholders] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [noMoreLiked, setNoMoreLiked] = useState(false);
  const seenLikedIdsRef = useRef(new Set());
  const hasLikedEndedRef = useRef(false);
  const isFetchingLikedRef = useRef(false);

  const isMountedRef = useRef(true);
  const internalContainerRef = useRef(null);
  
  // Истифодаи ref аз берун агар мавҷуд бошад, вагарна ref дохилӣ
  const containerRef = fullContainerRef || internalContainerRef;
  
  const limit = 10;

  // =========================
  // Placeholders барои мақолаҳо
  // =========================
  const createArticlePlaceholders = (count, type) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="article-components-placeholder" key={`${type}-placeholder-${i}`}>
          <div className="article-info-placeholder">
            <div className="article-components-text-placeholder"></div>
            <div className="article-components-text-placeholder"></div>
            <div className="article-components-text-placeholder"></div>
            <div className="title-placeholder"></div>
            <div className="description-placeholder"></div>
            <div className="meta-placeholder"></div>
            <div className="author-placeholder"></div>
          </div>
        </div>
      );
    }
    
    if (type === 'saved') {
      setSavedPlaceholders(items);
    } else {
      setLikedPlaceholders(items);
    }
  };

  const clearPlaceholders = (type) => {
    if (type === 'saved') {
      setSavedPlaceholders([]);
    } else {
      setLikedPlaceholders([]);
    }
  };

  // =========================
  // Боргирии мақолаҳои захиракарда
  // =========================
  const loadMoreSaved = useCallback(async () => {
    if (
      isFetchingSavedRef.current ||
      savedLoading ||
      hasSavedEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'saved'
    ) {
      return;
    }

    isFetchingSavedRef.current = true;
    setSavedLoading(true);
    createArticlePlaceholders(limit, 'saved');

    try {
      const excludeIds = Array.from(seenSavedIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-saved-articles`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const articlesData = response.data.articles || [];

      if (!articlesData.length) {
        hasSavedEndedRef.current = true;
        setNoMoreSaved(true);
        clearPlaceholders('saved');
        return;
      }

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validArticlesData = articlesData.filter(a => a && a.id);
      
      validArticlesData.forEach(a => seenSavedIdsRef.current.add(a.id));

      setSavedArticles(prev => [
        ...prev,
        ...validArticlesData.map(a => ({
          ...a,
          key: `${a.id}-${Date.now()}-${Math.random()}`
        }))
      ]);

      clearPlaceholders('saved');
    } catch (err) {
      console.error('Error loading saved articles:', err);
      message.error(t('savedLikedArticles.error'));
      clearPlaceholders('saved');
    } finally {
      setSavedLoading(false);
      isFetchingSavedRef.current = false;
    }
  }, [backendUrl, userId, savedLoading, activeTab, t]);

  // =========================
  // Боргирии мақолаҳои лайккарда
  // =========================
  const loadMoreLiked = useCallback(async () => {
    if (
      isFetchingLikedRef.current ||
      likedLoading ||
      hasLikedEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'liked'
    ) {
      return;
    }

    isFetchingLikedRef.current = true;
    setLikedLoading(true);
    createArticlePlaceholders(limit, 'liked');

    try {
      const excludeIds = Array.from(seenLikedIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-liked-articles`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const articlesData = response.data.articles || [];

      if (!articlesData.length) {
        hasLikedEndedRef.current = true;
        setNoMoreLiked(true);
        clearPlaceholders('liked');
        return;
      }

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validArticlesData = articlesData.filter(a => a && a.id);
      
      validArticlesData.forEach(a => seenLikedIdsRef.current.add(a.id));

      setLikedArticles(prev => [
        ...prev,
        ...validArticlesData.map(a => ({
          ...a,
          key: `${a.id}-${Date.now()}-${Math.random()}`
        }))
      ]);

      clearPlaceholders('liked');
    } catch (err) {
      console.error('Error loading liked articles:', err);
      message.error(t('savedLikedArticles.error'));
      clearPlaceholders('liked');
    } finally {
      setLikedLoading(false);
      isFetchingLikedRef.current = false;
    }
  }, [backendUrl, userId, likedLoading, activeTab, t]);

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
          if (activeTab === 'saved') {
            loadMoreSaved();
          } else if (activeTab === 'liked') {
            loadMoreLiked();
          }
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreSaved, loadMoreLiked, activeTab, containerRef]);

  // =========================
  // Боргирии аввал вобаста ба tab
  // =========================
  useEffect(() => {
    if (activeTab === 'saved' && savedArticles.length === 0 && !hasSavedEndedRef.current) {
      loadMoreSaved();
    } else if (activeTab === 'liked' && likedArticles.length === 0 && !hasLikedEndedRef.current) {
      loadMoreLiked();
    }
  }, [activeTab, savedArticles.length, likedArticles.length, loadMoreSaved, loadMoreLiked]);

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
    <>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#303030'
        }}
      >
        <button 
          className="back-from-account-button"
          onClick={() => navigate(`/@${username}`)}
        >
          ← {t('savedLikedArticles.back')}
        </button>

        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          centered
          size="large"
          style={{ marginBottom: 24 }}
          tabBarStyle={{ color: '#fff' }}
        >
          <TabPane tab={t('savedLikedArticles.tabs.saved')} key="saved" />
          <TabPane tab={t('savedLikedArticles.tabs.liked')} key="liked" />
        </Tabs>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              width: '100%',
              padding: '0 16px'
            }}
          >
            {activeTab === 'saved' && (
              <>
                {savedArticles.length === 0 && !savedLoading ? (
                  <div className="article-components-empty">
                    <i>📄</i>
                    <p>{t('savedLikedArticles.noSaved')}</p>
                  </div>
                ) : (
                  <div className="article-components-grid">
                    {savedArticles.map(article => {
                      if (!article || !article.id) {
                        return null;
                      }
                      
                      return (
                        <div key={article.key || article.id}>
                          <ArticleItem
                            articleId={article.id}
                            backendUrl={backendUrl}
                            userId={userId}
                          />
                        </div>
                      );
                    }).filter(Boolean)}

                    {savedPlaceholders}
                  </div>
                )}

                {savedLoading && !noMoreSaved && (
                  <div className="article-components-loading-more">
                    <span
                      className="article-components-text-placeholder"
                      style={{ width: '200px', height: '20px' }}
                    ></span>
                  </div>
                )}
              </>
            )}

            {activeTab === 'liked' && (
              <>
                {likedArticles.length === 0 && !likedLoading ? (
                  <div className="article-components-empty">
                    <i>❤️</i>
                    <p>{t('savedLikedArticles.noLiked')}</p>
                  </div>
                ) : (
                  <div className="article-components-grid">
                    {likedArticles.map(article => {
                      if (!article || !article.id) {
                        return null;
                      }
                      
                      return (
                        <div key={article.key || article.id}>
                          <ArticleItem
                            articleId={article.id}
                            backendUrl={backendUrl}
                            userId={userId}
                          />
                        </div>
                      );
                    }).filter(Boolean)}

                    {likedPlaceholders}
                  </div>
                )}

                {likedLoading && !noMoreLiked && (
                  <div className="article-components-loading-more">
                    <span
                      className="article-components-text-placeholder"
                      style={{ width: '200px', height: '20px' }}
                    ></span>
                  </div>
                )}
              </>
            )}
          </div>
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
          `}
        </style>
      </div>
    </>
  );
};

export default SavedLikedArticles;