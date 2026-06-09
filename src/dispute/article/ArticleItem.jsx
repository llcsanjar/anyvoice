// ArticleItem.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import 'react-quill/dist/quill.snow.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import './article.css';
import { useNavigate, useLocation } from 'react-router-dom';
import CommentComponent from '../../explore/comment';
import CreateArticleModalComponent from './CreateArticleModalComponent';
import './article.css';

// Process content with syntax highlighting
const processContent = (content) => {
  if (!content) return '';
  
  // Create a temporary div to work with
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Find all code blocks
  const codeBlocks = tempDiv.querySelectorAll('pre code');
  
  codeBlocks.forEach((block) => {
    try {
      // Detect language from class
      let language = '';
      const classList = block.className.split(' ');
      for (const cls of classList) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '');
          break;
        }
      }
      
      // Get the code text
      const code = block.textContent || '';
      
      // Highlight using highlight.js
      let highlighted;
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(code, { language });
      } else {
        highlighted = hljs.highlightAuto(code);
      }
      
      // Replace with highlighted HTML
      block.innerHTML = highlighted.value;
      
      // Add language label
      const preElement = block.parentElement;
      if (preElement && preElement.tagName === 'PRE') {
        const langLabel = document.createElement('div');
        langLabel.className = 'article-components-code-language-label';
        langLabel.textContent = highlighted.language || language || 'text';
        preElement.style.position = 'relative';
        preElement.insertBefore(langLabel, preElement.firstChild);
      }
    } catch (err) {
      console.error('Error highlighting code:', err);
    }
  });
  
  return tempDiv.innerHTML;
};

// Component for individual article
const ArticleItem = ({ 
  articleId,
  backendUrl, 
  userId, 
  ad, 
  commentId, 
  hidePreview = false 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { t, i18n } = useTranslation();
  const [showFull, setShowFull] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [showComments, setShowComments] = useState(true);
  const [viewRegistered, setViewRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [editArticle, setEditArticle] = useState(null); // Ҳолат барои модали таҳрир

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [authorInfo, setAuthorInfo] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);

  const [showUI, setShowUI] = useState(true);
  const lastScrollTop = useRef(0);

  // Дебаунс барои ҷустуҷӯ
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Функсия барои боргирии мақола
  const fetchArticle = useCallback(async () => {
    if (!articleId) {
      setError('No article ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${backendUrl}/articles/${articleId}?user_id=${userId || ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 404) {
        setIsDeleted(true);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      
      const data = await response.json();
      setCurrentArticle(data);
      setIsDeleted(false);
      
      // Set initial states from fetched article
      setLiked(data.liked || false);
      setLikeCount(data.likes || 0);
      setSaved(data.saved || false);
      setSaveCount(data.saves || 0);
      setShareCount(data.shareCount || 0);
      setCommentCount(data.comments || 0);
      
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, articleId, userId]);

  // Функсия барои навсозии мақола пас аз таҳрир
  const handleUpdateSuccess = useCallback((updatedArticle) => {
    setCurrentArticle(prev => ({ ...prev, ...updatedArticle }));
    setEditArticle(null);
    // Навсозии ҳолатҳо
    setLiked(updatedArticle.liked || false);
    setLikeCount(updatedArticle.likes || 0);
    setSaved(updatedArticle.saved || false);
    setSaveCount(updatedArticle.saves || 0);
    setShareCount(updatedArticle.shareCount || 0);
    setCommentCount(updatedArticle.comments || 0);
  }, []);

  // Функсия барои ҳазфи мақола
  const deleteArticle = useCallback(async () => {
    if (!currentArticle?.id || deleting) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${backendUrl}/articles/${currentArticle.id}?user_id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsDeleted(true);
        setShowFull(false);
        setShowDeleteConfirm(false);
        // Clear the article data
        setCurrentArticle(null);
        // Navigate to home if we're on the article page
        if (location.pathname.startsWith('/article/')) {
          navigate('/', { replace: true });
        }
      } else {
        alert(t('article.errors.deleteError'));
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      alert(t('article.errors.deleteError'));
    } finally {
      setDeleting(false);
    }
  }, [backendUrl, currentArticle?.id, userId, deleting, navigate, location.pathname, t]);

  // Fetch article when articleId changes
  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    if (commentId && currentArticle) {
      window.history.pushState({}, '', getArticleUrl());
      setShowFull(true);
    }
  }, [commentId, currentArticle]);

  useEffect(() => {
    if (ad && currentArticle) {
      window.history.pushState({}, '', getArticleUrl());
      setShowFull(true);
    }
  }, [ad, currentArticle]);

  const getArticleUrl = () => {
    if (!currentArticle) return '/';
    if (currentArticle.link) {
      return `/article/${currentArticle.link}`;
    }
    return `/article/${currentArticle.id}`;
  };

  // Функсия барои сабти тамошо
  const registerView = useCallback(async () => {
    if (!userId || !currentArticle?.id || viewRegistered) return;
    
    try {
      const response = await fetch(`${backendUrl}/articles/${currentArticle.id}/view?user_id=${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewRegistered(true);
        if (data.views !== undefined) {
          setCurrentArticle(prev => ({ ...prev, views: data.views }));
        }
      }
    } catch (err) {
      console.error('Error registering view:', err);
    }
  }, [backendUrl, userId, currentArticle?.id, viewRegistered]);

  useEffect(() => {
    if (showFull && !viewRegistered && userId && currentArticle?.id) {
      registerView();
    }
  }, [showFull, viewRegistered, userId, currentArticle?.id, registerView]);

  useEffect(() => {
    setViewRegistered(false);
  }, [currentArticle?.id]);

  useEffect(() => {
    if (location.pathname.startsWith('/article/')) {
      setShowFull(true);
    }
  }, [location.pathname]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!currentArticle?.id || isDeleted) return;
    
    const connectWebSocket = () => {
      const wsUrl = `${backendUrl.replace('http', 'ws')}/ws/updates-article/${currentArticle.id}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [currentArticle?.id, backendUrl, isDeleted]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'like_update':
        if (data.user_id === userId) setLiked(data.liked);
        setLikeCount(data.count);
        break;
      case 'save_update':
        if (data.user_id === userId) setSaved(data.saved);
        setSaveCount(data.count);
        break;
      case 'share_update':
        setShareCount(data.count);
        break;
      case 'comment_count':
        setCommentCount(data.value);
        break;
      case 'article_updated':
        setCurrentArticle(prev => ({ ...prev, ...data.article }));
        break;
      case 'article_deleted':
        setIsDeleted(true);
        setShowFull(false);
        setCurrentArticle(null);
        break;
      case 'view_update':
        setCurrentArticle(prev => ({ ...prev, views: data.count }));
        break;
      default: break;
    }
  };

  const handleScroll = (e) => {
    const currentScroll = e.target.scrollTop;

    if (currentScroll > lastScrollTop.current) {
      setShowUI(false);
    } else {
      setShowUI(true);
    }

    lastScrollTop.current = currentScroll <= 0 ? 0 : currentScroll;
  };

  const loadAuthorInfo = useCallback(async () => {
    if (!currentArticle?.user_id) return;
    
    setLoadingAuthor(true);
    try {
      const response = await fetch(`${backendUrl}/get-user-info/${currentArticle.user_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthorInfo(data);
      }
    } catch (err) {
      console.error('Error loading author info:', err);
    } finally {
      setLoadingAuthor(false);
    }
  }, [backendUrl, currentArticle?.user_id]);

  useEffect(() => {
    if (currentArticle?.user_id && !isDeleted) {
      loadAuthorInfo();
    }
  }, [currentArticle?.user_id, loadAuthorInfo, isDeleted]);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return t('article.timeAgo.justNow');
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 1) return t('article.timeAgo.justNow');
    if (diffMins < 60) {
      // Ба ҷои minutesAgo, аз minutesAgo_ҳисобкунӣ истифода баред
      // i18next худаш варианти дурустро интихоб мекунад
      return t('article.timeAgo.minutesAgo', { count: diffMins });
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('article.timeAgo.hoursAgo', { count: diffHours });
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t('article.timeAgo.daysAgo', { count: diffDays });
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return t('article.timeAgo.weeksAgo', { count: diffWeeks });
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return t('article.timeAgo.monthsAgo', { count: diffMonths });
    
    const diffYears = Math.floor(diffDays / 365);
    return t('article.timeAgo.yearsAgo', { count: diffYears });
  };

  const getReadingTime = (content) => {
    if (!content) return 1;
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200);
  };

  const handleLike = async () => {
    if (!userId || !currentArticle) return;
    try {
      const response = await fetch(`${backendUrl}/articles/${currentArticle.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      if (data.success) {
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch (err) {
      console.error('Error liking article:', err);
    }
  };

  const handleSave = async () => {
    if (!userId || !currentArticle) return;
    try {
      const response = await fetch(`${backendUrl}/articles/${currentArticle.id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      if (data.success) {
        setSaved(data.saved);
        setSaveCount(data.count);
      }
    } catch (err) {
      console.error('Error saving article:', err);
    }
  };

  const handleSearchAccounts = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setAccountSearchLoading(false);
      return;
    }
    
    setAccountSearchLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/accounts?user_id=${userId}&search=${searchTerm}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const results = data.map(account => ({
          ...account,
          isShared: selectedAccounts.some(a => a.id === account.id)
        }));
        setSearchResults(results);
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

  const handleSendShare = async (account) => {
    if (!currentArticle) return;
    try {
      const response = await fetch(`${backendUrl}/share-article`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          article_id: currentArticle.id
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => [...prev, account]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: true } : a
        ));
        alert(t('article.shareSuccess'));
      }
    } catch (err) {
      console.error('Error sharing article:', err);
      alert(t('article.shareError'));
    }
  };

  const handleCancelShare = async (account) => {
    if (!currentArticle) return;
    try {
      const response = await fetch(`${backendUrl}/cancel-share-article`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          article_id: currentArticle.id
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => prev.filter(a => a.id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: false } : a
        ));
        alert(t('article.shareCancelled'));
      }
    } catch (err) {
      console.error('Error cancelling share:', err);
    }
  };

  const handleSearchWithDebounce = (searchValue) => {
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
    setSearchResults([]);
    
    const timeoutId = setTimeout(() => {
      handleSearchAccounts(searchValue);
    }, 500);
    
    setSearchTimeout(timeoutId);
  };
  
  const handleEdit = () => {
    // Open edit modal with current article data
    setEditArticle(currentArticle);
  };

  // Report article
  const reportArticle = () => {
    const reason = prompt(t('article.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        article_id: articleId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('article.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('article.report.alreadyReported'));
          return;
        }

        // дигар хатогиҳо
        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('article.report.error'));
      })
      .catch(err => {
        console.error('Error reporting article:', err);
        alert(t('article.report.error'));
      });
  };

  // Show loading state
  if (loading && !commentId) {
    return (
      <div className="article-components-placeholder">
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

  // Show deleted state - completely black overlay
  if (isDeleted) {
    return (
      <div className="article-components-deleted-overlay">
        <div className="article-components-deleted-content">
          <span 
            className="material-symbols-outlined" 
            style={{ fontSize: "100px" }}
          >
            delete_forever
          </span>
          <p>{t('article.deleted') || 'This article has been deleted'}</p>
        </div>
      </div>
    );
  }

  // Show banned state - black container with ban icon
  if (currentArticle?.is_banned) {
    return (
      <div className="article-components-banned-overlay">
        <div className="article-components-banned-content">
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

  // Show error state
  if (error || !currentArticle) {
    return (
      <div className="article-components-error">
        <span className="material-symbols-outlined">error</span>
        <p>{error || t('article.errors.notFound') || 'Article not found'}</p>
        <button onClick={() => navigate('/')}>
          {t('article.backToHome') || 'Back to Home'}
        </button>
      </div>
    );
  }

  const readingTime = getReadingTime(currentArticle.content);
  const truncatedContent = currentArticle.content?.replace(/<[^>]*>/g, '').substring(0, 200);
  const isOwner = currentArticle.user_id === userId;
  const isRtl = i18n.language === 'tg' || i18n.language === 'fa' || i18n.language === 'ar';

  return (
    <>
      {!hidePreview && !isDeleted && (
        <div className="article-components-card" onClick={() => {
            setShowFull(true);
            window.history.pushState({}, '', getArticleUrl());
          }}>
          {currentArticle.images && currentArticle.images.length > 0 && (
            <div className="article-components-image-container">
              <img 
                src={currentArticle.images[0]} 
                alt={currentArticle.title}
                className="article-components-thumbnail"
                loading="lazy"
              />
            </div>
          )}

          <div className="article-components-content">
            <h3 className="article-components-title-text">{currentArticle.title}</h3>

            <p className="article-components-summary">{currentArticle.summary || truncatedContent}</p>

            <div className="article-components-writer-preview">
              <span className="article-components-writer-icon">✍️</span>
              <span className="article-components-writer-text">
                {t('article.writtenBy', { 
                  name: currentArticle.author_full_name || authorInfo?.display || currentArticle.display_name || t('article.unknownAuthor')
                })}
              </span>
            </div>

            <button className="article-components-read-more-btn" onClick={(e) => { 
              e.stopPropagation(); 
              setShowFull(true);
              window.history.pushState({}, '', getArticleUrl());
            }}>
              <span className="material-symbols-outlined">arrow_forward</span>
              {t('article.readFull')}
            </button>

            <div className="article-components-time">
              <span className="material-symbols-outlined">schedule</span>
              {formatTimeAgo(currentArticle.created_at)}
              {currentArticle.updated_at && (
                <>
                  <span className="material-symbols-outlined">edit</span>
                  {t('article.edited')} {formatTimeAgo(currentArticle.updated_at)}
                </>
              )}
            </div>

            <div className="article-components-stats">
              <span>
                <span className="material-symbols-outlined">visibility</span>
                {currentArticle.views || 0}
              </span>
              <span>
                <span className="material-symbols-outlined">favorite</span>
                {likeCount}
              </span>
              <span>
                <span className="material-symbols-outlined">chat_bubble</span>
                {commentCount}
              </span>
              <span>
                <span className="material-symbols-outlined">schedule</span>
                {t('article.readingTime', { minutes: readingTime })}
              </span>
            </div>
            
            <div className="article-components-author">
              {loadingAuthor ? (
                <div className="article-components-author-skeleton">
                  <div className="article-components-skeleton-avatar"></div>
                  <div className="article-components-skeleton-info">
                    <div className="article-components-skeleton-line"></div>
                    <div className="article-components-skeleton-line-small"></div>
                  </div>
                </div>
              ) : authorInfo ? (
                <>
                  <img 
                    src={`data:image/png;base64,${authorInfo.avatar}`} 
                    alt={authorInfo.display || authorInfo.username}
                    className="article-components-author-avatar"
                    onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="8" r="4" fill="%239ca3af"%3E%3C/circle%3E%3Cpath d="M5 20v-2a7 7 0 0 1 14 0v2" fill="%239ca3af"%3E%3C/path%3E%3C/svg%3E'}
                  />
                  <div className="article-components-author-info">
                    <div className="article-components-author-name">{authorInfo.display || authorInfo.username}</div>
                  </div>
                </>
              ) : (<></>)}
            </div>
            
            <div className="article-components-actions">
              <button className={`article-components-like-button ${liked ? 'article-components-liked' : ''}`} 
                onClick={(e) => { e.stopPropagation(); handleLike(); }}>
                <span className="material-symbols-outlined">favorite</span>
                {likeCount > 0 && likeCount}
              </button>
              <button className={`article-components-save-button ${saved ? 'article-components-saved' : ''}`} 
                onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                <span className="material-symbols-outlined">bookmark</span>
                {saveCount > 0 && saveCount}
              </button>
              <button className="article-components-comment-button" 
                onClick={(e) => { e.stopPropagation(); setShowFull(true); setTimeout(() => setShowComments(true), 100); }}>
                <span className="material-symbols-outlined">chat_bubble</span>
              </button>
              <button className="article-components-share-button" 
                onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}>
                <span className="material-symbols-outlined">share</span>
                {shareCount > 0 && shareCount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Article Modal - Full Screen */}
      {showFull && !isDeleted && (
        <div className="article-components-modal-overlay" onClick={() => {
            setShowFull(false);
            window.history.pushState({}, '', '/');
          }}>
          <div className="article-components-modal" onClick={(e) => e.stopPropagation()}>
            {showUI && (
              <div className="article-components-modal-header">
                <div className="article-components-modal-header-content">
                  <div className="article-components-modal-author-info">
                    {loadingAuthor ? (
                      <div className="article-components-info-skeleton">
                        <div className="article-components-skeleton-avatar"></div>
                        <div className="article-components-skeleton-text"></div>
                      </div>
                    ) : authorInfo ? (
                      <>
                        <img 
                          src={`data:image/png;base64,${authorInfo.avatar}`}
                          alt={authorInfo.display || authorInfo.username}
                          className="article-components-modal-author-avatar"
                          onError={(e) => e.target.src = 'data:image/svg+xml,...'}
                        />
                        <div className="article-components-modal-author-details">
                          <div className="article-components-modal-author-name">
                            {authorInfo.display || authorInfo.username}
                          </div>

                          <div
                            className="article-components-modal-author-username"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/@${authorInfo.username}`)}
                          >
                            @{authorInfo.username}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="article-components-modal-author-info">
                        <div className="article-components-modal-author-name">
                          {currentArticle.display_name || currentArticle.author_full_name || t('article.unknownAuthor')}
                        </div>
                      </div>
                    )}

                    {currentArticle.updated_at && (
                      <div className="article-components-modal-edited-info">
                        <div className="article-components-edited-text">
                          {t('article.edited')} {formatTimeAgo(currentArticle.updated_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  className="article-components-close-modal-btn"
                  onClick={() => {
                    setShowFull(false);
                    window.history.replaceState({}, '', '/');
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}
            <div 
              className="article-components-modal-body"
              onScroll={handleScroll}
              style={{ overflowY: 'auto', maxHeight: '100vh' }}
            >
              {currentArticle.images && currentArticle.images.length > 0 && (
                <div className="article-components-modal-images">
                  {currentArticle.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`${currentArticle.title} - ${idx + 1}`} className="article-components-modal-image" />
                  ))}
                </div>
              )}

              <h2 className="article-components-modal-title">{currentArticle.title}</h2>

              <h2 className="article-components-modal-summary">{currentArticle.summary}</h2>

              <div className="article-components-modal-content" dir={isRtl ? "rtl" : "auto"} dangerouslySetInnerHTML={{ __html: processContent(currentArticle.content) }} />

              <div className="article-components-writer">
                {t('article.writtenBy', { 
                  name: currentArticle.author_full_name || authorInfo?.display || currentArticle.display_name || t('article.unknownAuthor')
                })}
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="article-components-comments-section">
                  <h3 className="article-components-comments-title">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    {t('article.comments')} ({commentCount})
                  </h3>
                  <CommentComponent
                    backendUrl={backendUrl}
                    userId={userId}
                    userIdFromMe={currentArticle.user_id}
                    collaboratorIds={[]}
                    postId={currentArticle.id}
                    typePost="article"
                    selectedCommentId={commentId}
                  />
                </div>
              )}

              {!showComments && (
                <div className="article-components-show-comments-btn-container">
                  <button 
                    className="article-components-show-comments-btn"
                    onClick={() => setShowComments(true)}
                  >
                    <span className="material-symbols-outlined">chat_bubble</span>
                    {t('article.showComments')} ({commentCount})
                  </button>
                </div>
              )}
            </div>
            {showUI && (
              <div className="article-components-modal-footer">
                <div className="article-components-actions">
                  <button className={`article-components-like-button ${liked ? 'article-components-liked' : ''}`} 
                    onClick={handleLike}>
                    <span className="material-symbols-outlined">favorite</span>
                    {likeCount}
                  </button>

                  <button className={`article-components-save-button ${saved ? 'article-components-saved' : ''}`} 
                    onClick={handleSave}>
                    <span className="material-symbols-outlined">bookmark</span>
                    {saveCount}
                  </button>

                  <button className="article-components-comment-button" 
                    onClick={() => setShowComments(!showComments)}>
                    <span className="material-symbols-outlined">chat_bubble</span>
                    {commentCount}
                  </button>

                  <button className="article-components-share-button" 
                    onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}>
                    <span className="material-symbols-outlined">share</span>
                    {shareCount}
                  </button>

                  <div className="article-components-stats">
                    <span>
                      <span className="material-symbols-outlined">visibility</span>
                      {currentArticle.views || 0} {t('article.views')}
                    </span>
                    <span>
                      <span className="material-symbols-outlined">schedule</span>
                      {t('article.readingTime', { minutes: readingTime })}
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <div className="article-components-owner-actions">
                    <button className="article-components-toolbar-btn" 
                      onClick={handleEdit}
                      disabled={updating}>
                      <span className="material-symbols-outlined">edit</span>
                      {updating ? t('article.updating') || 'Updating...' : t('article.edit')}
                    </button>

                    <button className="article-components-delete-button" 
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}>
                      <span className="material-symbols-outlined">delete</span>
                      {deleting ? t('article.deleting') || 'Deleting...' : t('article.delete')}
                    </button>
                  </div>
                )}

                {!isOwner && (
                  <div className="article-components-owner-actions">
                    <button className="article-components-report-btn" 
                      onClick={reportArticle}
                      disabled={reporting}>
                      <span className="material-symbols-outlined">report</span>
                      {reporting ? t('article.reporting') || 'Reporting...' : t('article.reportButton')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="article-components-delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="article-components-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="article-components-delete-modal-header">
              <h2 className="article-components-delete-modal-title">{t('article.deleteArticle') || 'Ҳазфи мақола'}</h2>
              <button 
                className="article-components-delete-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="article-components-delete-modal-body">
              <div className="article-components-delete-modal-icon">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <p className="article-components-delete-modal-message">
                {t('article.confirmDelete') || 'Оё шумо боварӣ доред, ки ин мақоларо ҳазф кардан мехоҳед? Ин амал баргардонданашаванда аст.'}
              </p>
            </div>

            <div className="article-components-delete-modal-footer">
              <button 
                className="article-components-delete-modal-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('article.cancel') || 'Бекор'}
              </button>
              <button 
                className="article-components-delete-modal-confirm-btn"
                onClick={deleteArticle} 
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="article-components-loading-spinner-small"></span>
                    {t('article.deleting') || 'Ҳазф...'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">delete</span>
                    {t('article.delete') || 'Ҳазф'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="article-components-share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="article-components-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="article-components-share-modal-header">
              <h2 className="article-components-share-modal-title">{t('article.shareArticle')}</h2>
              <button 
                className="article-components-share-modal-close"
                onClick={() => setShowShareModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="article-components-share-modal-body">
              <div className="article-components-share-search-container">
                <input
                  type="text"
                  className="article-components-share-search-input"
                  placeholder={t('article.searchUsers') || 'Ҷустуҷӯи корбарон...'}
                  value={searchTerm}
                  onChange={(e) => handleSearchWithDebounce(e.target.value)}
                  autoFocus
                />
                {accountSearchLoading && (
                  <div className="article-components-share-search-loading">
                    <span className="article-components-loading-spinner"></span>
                    <span>{t('article.searching') || 'Ҷустуҷӯ...'}</span>
                  </div>
                )}
              </div>
              
              <div className="article-components-share-accounts-list">
                {accountSearchLoading && searchResults.length === 0 && searchTerm.trim() ? (
                  <div className="article-components-share-loading-state">
                    <div className="article-components-loading-spinner"></div>
                    <p>{t('article.searching') || 'Ҷустуҷӯ...'}</p>
                  </div>
                ) : !accountSearchLoading && searchResults.length === 0 && searchTerm.trim() ? (
                  <div className="article-components-share-no-results">
                    <span className="material-symbols-outlined">search_off</span>
                    <p>{t('article.noUsersFound') || 'Ҳеҷ корбаре пайдо нашуд'}</p>
                  </div>
                ) : !accountSearchLoading && searchResults.length === 0 && !searchTerm.trim() ? (
                  <div className="article-components-share-no-results">
                    <span className="material-symbols-outlined">person_search</span>
                    <p>{t('article.searchUsersPlaceholder') || 'Барои ҷустуҷӯи корбарон нависед...'}</p>
                  </div>
                ) : (
                  searchResults.map(account => (
                    <div key={account.id} className="article-components-share-account-item">
                      <img 
                        src={account.avatar ? (account.avatar.startsWith('data:') ? account.avatar : `data:image/png;base64,${account.avatar}`) : '/default-avatar.png'}
                        alt={account.username} 
                        className="article-components-share-account-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="8" r="4" fill="%239ca3af"%3E%3C/circle%3E%3Cpath d="M5 20v-2a7 7 0 0 1 14 0v2" fill="%239ca3af"%3E%3C/path%3E%3C/svg%3E';
                        }}
                      />
                      <div className="article-components-share-account-info">
                        <div className="article-components-share-account-display">
                          {account.display || account.display_name || account.username}
                        </div>
                        <div className="article-components-share-account-username">
                          @{account.username}
                        </div>
                      </div>
                      <button
                        className={`article-components-share-action-btn ${account.isShared ? 'article-components-share-action-cancel' : 'article-components-share-action-send'}`}
                        onClick={() => account.isShared ? handleCancelShare(account) : handleSendShare(account)}
                      >
                        {account.isShared ? (t('article.cancel') || 'Бекор') : (t('article.send') || 'Фиристодан')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="article-components-share-modal-footer">
              <button 
                className="article-components-share-close-btn"
                onClick={() => setShowShareModal(false)}
              >
                {t('article.close') || 'Пӯшидан'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal */}
      {editArticle && (
        <CreateArticleModalComponent 
          onClose={() => setEditArticle(null)} 
          onSuccess={handleUpdateSuccess} 
          backendUrl={backendUrl} 
          userId={userId} 
          editArticle={editArticle}
        />
      )}
    </>
  );
};

export default ArticleItem;