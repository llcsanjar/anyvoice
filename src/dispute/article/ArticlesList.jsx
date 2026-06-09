// ArticlesList.jsx - Version with Quill editor
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import 'react-quill/dist/quill.snow.css';
import 'highlight.js/styles/atom-one-dark.css';
import './article.css';
import axios from 'axios';
import { message } from 'antd';
import ArticleItem from './ArticleItem';

// Main Articles List Component
const ArticlesList  = ({
  userId,
  backendUrl,
}) => {
  const { t } = useTranslation();
  const limit = 10;

  const [articles, setArticles] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noMoreArticles, setNoMoreArticles] = useState(false);

  const containerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 🔒 request lock
  const isFetchingRef = useRef(false);

  // 🛑 флаг ниҳоӣ – дигар ҳеҷ гоҳ боргирӣ нашавад
  const hasEndedRef = useRef(false);

  // 👀 seen ids
  const seenArticleIdsRef = useRef(new Set());

  // =========================
  // Placeholders
  // =========================
  const createPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="article-components-placeholder" key={`placeholder-${i}`}>
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
    setPlaceholders(items);
  };

  const clearPlaceholders = () => setPlaceholders([]);

  // =========================
  // Load Articles
  // =========================
  const loadMoreArticles = useCallback(async () => {
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
      const excludeIds = Array.from(seenArticleIdsRef.current);

      const res = await axios.get(`${backendUrl}/get-random-articles`, {
        params: {
          limit,
          exclude_ids: excludeIds,
          current_user_id: userId
        },
        paramsSerializer: { indexes: null }
      });

      const articlesData = res.data.articles || [];

      // ❌ дигар мақола нест → қатъи абадӣ
      if (!articlesData.length) {
        hasEndedRef.current = true;
        setNoMoreArticles(true);
        clearPlaceholders();
        return;
      }

      // Ҳар як мақоларо барои дубликат санҷед
      const newArticles = [];
      for (const article of articlesData) {
        if (!seenArticleIdsRef.current.has(article.id)) {
          seenArticleIdsRef.current.add(article.id);
          newArticles.push({
            ...article,
            key: `${article.id}-${Date.now()}-${Math.random()}`
          });
        }
      }

      if (newArticles.length === 0) {
        hasEndedRef.current = true;
        setNoMoreArticles(true);
        clearPlaceholders();
        return;
      }

      setArticles(prev => [...prev, ...newArticles]);
      clearPlaceholders();
    } catch (err) {
      console.error('Error loading articles:', err);
      message.error(t('article.error'));
      clearPlaceholders();
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [backendUrl, userId, loading, t, limit]);

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
          loadMoreArticles();
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    // боргирии аввал
    if (articles.length === 0) {
      loadMoreArticles();
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreArticles, articles.length]);

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
    <>
      <div className="article-components-container">
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100vh',
            overflowY: 'auto'
          }}
        >
          {articles.length === 0 && !loading ? (
            <div className="article-components-empty">
              <i>📄</i>
              <p>{t('article.noArticles')}</p>
            </div>
          ) : (
            <div className="article-components-grid">
              {articles.map((article) => (
                <div key={article.key}>
                  <ArticleItem 
                    articleId={article.id} 
                    backendUrl={backendUrl} 
                    userId={userId} 
                  />
                </div>
              ))}

              {placeholders}
            </div>
          )}

          {loading && !noMoreArticles && (
            <div className="article-components-loading-more">
              <span
                className="article-components-text-placeholder"
                style={{ width: '200px', height: '20px' }}
              ></span>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ArticlesList;