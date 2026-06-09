// src/comments/CommentsPosted.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import ImageLoader from '../explore/ImageLoader';
import VideoLoader from '../explore/VideoLoader';
import ProductLoader from '../shoping/ProductLoader';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import ArticleItem from '../dispute/article/ArticleItem';
import '../explore/comment.css';

const CommentsPosted = ({
  userId,
  backendUrl,
  username,
  display,
  avatar,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Ҳолатҳо
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreComments, setNoMoreComments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const limit = 10;
  
  // Массив барои нигоҳ доштани постҳои кушодашуда
  const [openedImages, setOpenedImages] = useState([]);
  const [openedVideos, setOpenedVideos] = useState([]);
  const [openedArticles, setOpenedArticles] = useState([]);
  const [openedProducts, setOpenedProducts] = useState([]);
  const [openedTheories, setOpenedTheories] = useState([]);
  
  const fullContainerRef = useRef(null);
  const isMountedRef = useRef(true);

  // =========================
  // Боркунии аввалини комментҳо
  // =========================
  const loadInitialComments = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await axios.get(`${backendUrl}/get-user-comments`, {
        params: {
          user_id: userId,
          page: 1,
          limit: limit
        }
      });

      const data = response.data;
      
      if (data.comments && data.comments.length > 0) {
        setComments(data.comments);
        setTotalComments(data.total || data.comments.length);
        
        // Агар камтар аз limit коммент бошад, дигар коммент нест
        if (data.comments.length < limit) {
          setNoMoreComments(true);
        }
      } else {
        setComments([]);
        setNoMoreComments(true);
      }
      
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        message.error(t('commentsPosted.errors.connectionError'));
      } else {
        message.error(`${t('commentsPosted.errors.loadError')}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [backendUrl, userId, t]);

  // =========================
  // Боркунии комментҳои иловагӣ
  // =========================
  const loadMoreComments = useCallback(async () => {
    if (loadingMore || noMoreComments) return;
    
    setLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      
      const response = await axios.get(`${backendUrl}/get-user-comments`, {
        params: {
          user_id: userId,
          page: nextPage,
          limit: limit
        }
      });

      const data = response.data;
      
      if (data.comments && data.comments.length > 0) {
        setComments(prev => [...prev, ...data.comments]);
        setCurrentPage(nextPage);
        
        // Агар камтар аз limit коммент омада бошад, дигар коммент нест
        if (data.comments.length < limit) {
          setNoMoreComments(true);
        }
      } else {
        setNoMoreComments(true);
      }
      
    } catch (err) {
      message.error(t('commentsPosted.errors.loadError'));
    } finally {
      setLoadingMore(false);
    }
  }, [backendUrl, userId, currentPage, loadingMore, noMoreComments, t]);

  // =========================
  // Рефреш кардани комментҳо
  // =========================
  const refreshComments = useCallback(() => {
    setComments([]);
    setCurrentPage(1);
    setNoMoreComments(false);
    setLoadingMore(false);
    loadInitialComments();
  }, [loadInitialComments]);

  // =========================
  // Боргирии аввал
  // =========================
  useEffect(() => {
    loadInitialComments();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadInitialComments]);

  // =========================
  // Функсияҳои кӯмакӣ
  // =========================
  const convertTextToHtmlLinks = (text, navigate) => {
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

  const timeAgo = (timestampStr) => {
    if (!timestampStr) return t('commentsPosted.timeAgo.unknown');
    
    try {
      const past = new Date(timestampStr);
      const now = new Date();
      const diff = now - past;
      const seconds = Math.floor(diff / 1000);
      
      const minute = 60;
      const hour = 60 * minute;
      const day = 24 * hour;
      const week = 7 * day;
      const month = 30 * day;
      const year = 365 * day;
      
      if (seconds < minute) {
        return t('commentsPosted.timeAgo.secondsAgo');
      } else if (seconds < hour) {
        const minutes = Math.floor(seconds / minute);
        return minutes > 1 ? t('commentsPosted.timeAgo.minutesAgo', { count: minutes }) : t('commentsPosted.timeAgo.minuteAgo');
      } else if (seconds < day) {
        const hours = Math.floor(seconds / hour);
        return hours > 1 ? t('commentsPosted.timeAgo.hoursAgo', { count: hours }) : t('commentsPosted.timeAgo.hourAgo');
      } else if (seconds < week) {
        const days = Math.floor(seconds / day);
        return days > 1 ? t('commentsPosted.timeAgo.daysAgo', { count: days }) : t('commentsPosted.timeAgo.dayAgo');
      } else if (seconds < month) {
        const weeks = Math.floor(seconds / week);
        return weeks > 1 ? t('commentsPosted.timeAgo.weeksAgo', { count: weeks }) : t('commentsPosted.timeAgo.weekAgo');
      } else if (seconds < year) {
        const months = Math.floor(seconds / month);
        return months > 1 ? t('commentsPosted.timeAgo.monthsAgo', { count: months }) : t('commentsPosted.timeAgo.monthAgo');
      } else {
        const years = Math.floor(seconds / year);
        return years > 1 ? t('commentsPosted.timeAgo.yearsAgo', { count: years }) : t('commentsPosted.timeAgo.yearAgo');
      }
    } catch (e) {
      return t('commentsPosted.timeAgo.unknown');
    }
  };

  // =========================
  // Функсияҳои намоиши постҳо
  // =========================
  const openImageWithComment = (imageId, imageUserId, commentId, imageLink) => {
    const newImage = {
      imageId,
      userIdOfImage: imageUserId,
      commentId,
      imageLink,
      key: `image-${imageId}-${commentId}-${Date.now()}`
    };
    setOpenedImages(prev => [...prev, newImage]);
  };

  const openVideoWithComment = (videoId, videoUserId, commentId, videoLink) => {
    const newVideo = {
      videoId,
      userIdOfVideo: videoUserId,
      commentId,
      videoLink,
      key: `video-${videoId}-${commentId}-${Date.now()}`
    };
    setOpenedVideos(prev => [...prev, newVideo]);
  };

  const openArticleWithComment = async (articleId, articleUserId, commentId, articleLink) => {
    // Мақолаи навро ба массив илова кунем
    const newArticle = {
      articleId,
      userIdOfArticle: articleUserId,
      commentId,
      articleLink,
      key: `${articleLink}-${Date.now()}`
    };

    setOpenedArticles(prev => [...prev, newArticle]);
  };

  const openProductWithComment = (productId, productUserId, commentId, productLink) => {
    const newProduct = {
      productId,
      userIdOfProduct: productUserId,
      commentId,
      productLink,
      key: `product-${productId}-${commentId}-${Date.now()}`
    };
    setOpenedProducts(prev => [...prev, newProduct]);
  };

  const openTheoryWithComment = (theoryId, theoryUserId, commentId, theoryLink) => {
    const newTheory = {
      theoryId,
      userIdOfTheory: theoryUserId,
      commentId,
      theoryLink,
      key: `theory-${theoryId}-${commentId}-${Date.now()}`
    };
    setOpenedTheories(prev => [...prev, newTheory]);
  };

  // =========================
  // Коркарди клик ба тугмаи "Дидани шарҳ"
  // =========================
  const handleViewComment = async (postId, commentId, postType) => {
    try {
      const response = await axios.get(`${backendUrl}/get-${postType}-comment-by-id`, {
        params: { comment_id: commentId }
      });

      if (response.status === 200 && response.data.comment_data) {
        const commentData = response.data.comment_data;

        let postLink = '';
        if (postType === 'image') {
          postLink = `/image/${postId}`;
        } else if (postType === 'video') {
          postLink = `/video/${postId}`;
        } else if (postType === 'article') {
          postLink = `/article/${postId}`;
        } else if (postType === 'product') {
          postLink = `/product/${postId}`;
        } else if (postType === 'theory') {
          postLink = `/theory/${postId}`;
        }

        switch (postType) {
          case 'image':
            openImageWithComment(postId, commentData.image_user_id, commentId, postLink);
            break;
          case 'video':
            openVideoWithComment(postId, commentData.video_user_id, commentId, postLink);
            break;
          case 'article':
            openArticleWithComment(postId, commentData.article_user_id, commentId, postLink);
            break;
          case 'product':
            openProductWithComment(postId, commentData.product_user_id, commentId, postLink);
            break;
          case 'theory':
            openTheoryWithComment(postId, commentData.theory_user_id, commentId, postLink);
            break;
          default:
        }
      }
    } catch (err) {
      message.error(t('commentsPosted.errors.commentDataError'));
    }
  };

  // =========================
  // Render
  // =========================
  return (
    <>
      <div
        ref={fullContainerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
        }}
      >
        {/* Сарлавҳа */}
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          height: '60px'
        }}>
          <div 
            style={{ fontSize: '2rem', color: '#000000', cursor: 'pointer' }}
            onClick={() => navigate(`/@${username}`)}
            title={t('commentsPosted.back')}
          >
            ←
          </div>
          
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '1.875rem',
            fontWeight: 600
          }}>
            {t('commentsPosted.title')}
          </div>
          
          <div 
            style={{ fontSize: '2rem', color: '#000000', cursor: 'pointer' }}
            onClick={refreshComments}
            title={t('commentsPosted.refresh')}
          >
            ⟳
          </div>
        </div>

        {/* Контейнери комментҳо */}
        <div style={{ width: '100%', padding: '16px' }}>
          {/* Ҳолати боркунӣ */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 'calc(100vh - 100px)',
              width: '100%'
            }}>
              <Spin size="large" />
            </div>
          )}

          {/* Ҳолати холӣ */}
          {!loading && comments.length === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100vh - 100px)',
              width: '100%'
            }}>
              <div style={{ color: '#666', fontSize: '1.25rem', fontWeight: 500 }}>
                {t('commentsPosted.noComments')}
              </div>
            </div>
          )}

          {/* Рӯйхати комментҳо */}
          {!loading && comments.map((comment, index) => {
            const commentId = comment.id;
            const commentText = comment.text || '';
            const postId = comment.post_id;
            const createdAt = comment.created_at;
            const isEdited = comment.is_edited || false;
            const parentCommentId = comment.parent_comment_id;
            const postType = comment.post_type;
            const commentUserId = comment.user_id;

            return (
              <div
                key={`${commentId}-${index}`}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  marginBottom: '12px',
                  borderBottom: '1px solid #e0e0e0'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <div className="message-text">
                    {convertTextToHtmlLinks(commentText, navigate)}
                  </div>

                  {isEdited && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {t('commentsPosted.edited')}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  {timeAgo(createdAt)}
                </div>

                {parentCommentId && comment.parent_username && (
                  <div 
                    style={{
                      fontSize: '12px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      marginBottom: '8px'
                    }}
                    onClick={() => navigate(`/@${comment.parent_username}`)}
                  >
                    {t('commentsPosted.replyTo', { username: comment.parent_username })}
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => handleViewComment(postId, commentId, postType)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {t('commentsPosted.viewComment')}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Тугмаи боркунии иловагӣ */}
          {!loading && !noMoreComments && comments.length > 0 && (
            <div style={{
              width: '100%',
              marginTop: '20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Button
                type="primary"
                onClick={loadMoreComments}
                loading={loadingMore}
                style={{
                  height: '44px',
                  width: '200px',
                  fontSize: '16px',
                  borderRadius: '8px'
                }}
              >
                {loadingMore ? t('commentsPosted.loadingMore') : t('commentsPosted.loadMore')}
              </Button>
            </div>
          )}

          {/* Паёми ба охир расидан */}
          {!loading && noMoreComments && comments.length > 0 && (
            <div style={{
              width: '100%',
              padding: '20px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              {t('commentsPosted.allLoaded', { count: comments.length })}
            </div>
          )}
        </div>
      </div>

      {/* Расмҳои кушодашуда */}
      {openedImages.map(image => (
        <div key={image.key} style={{ display: 'none' }}>
          <ImageLoader
            imageId={image.imageId}
            containerId={`comment-image-${image.imageId}`}
            backendUrl={backendUrl}
            userId={userId}
            avatarPath={avatar}
            myUsername={username}
            myDisplay={display}
            userIdOfImage={image.userIdOfImage}
            commentId={image.commentId}
            fullContainerRef={fullContainerRef}
          />
        </div>
      ))}

      {/* Видеоҳои кушодашуда */}
      {openedVideos.map(video => (
        <div key={video.key} style={{ display: 'none' }}>
          <VideoLoader
            typeVideo="home"
            videoId={video.videoId}
            containerId={`comment-video-${video.videoId}`}
            backendUrl={backendUrl}
            userId={userId}
            avatarPath={avatar}
            myUsername={username}
            myDisplay={display}
            userIdOfVideo={video.userIdOfVideo}
            commentId={video.commentId}
            fullContainerRef={fullContainerRef}
          />
        </div>
      ))}

      {/* Мақолаҳои кушодашуда */}
      {openedArticles.map(article => (
        <div key={article.key}>
          <ArticleItem 
            articleId={article.articleId} 
            backendUrl={backendUrl} 
            userId={userId}
            commentId={article.commentId}
            hidePreview={true}
          />
        </div>
      ))}

      {/* Маҳсулҳои кушодашуда */}
      {openedProducts.map(product => (
        <div key={product.key} style={{ display: 'none' }}>
          <ProductLoader
            productId={product.productId}
            containerId={`comment-product-${product.productId}`}
            backendUrl={backendUrl}
            userId={userId}
            avatarPath={avatar}
            myUsername={username}
            myDisplay={display}
            userIdOfProduct={product.userIdOfProduct}
            commentId={product.commentId}
            fullContainerRef={fullContainerRef}
          />
        </div>
      ))}

      {/* Назарияҳои кушодашуда */}
      {openedTheories.map(theory => (
        <div key={theory.key} style={{ display: 'none' }}>
          <TheoryLoader
            theoryId={theory.theoryId}
            containerId={`comment-theory-${theory.theoryId}`}
            backendUrl={backendUrl}
            userId={userId}
            avatarPath={avatar}
            myUsername={username}
            myDisplay={display}
            userIdOfTheory={theory.userIdOfTheory}
            commentId={theory.commentId}
            fullContainerRef={fullContainerRef}
          />
        </div>
      ))}

    </>
  );
};

export default CommentsPosted;