// Account.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './account.css';
import VideoLoader from '../explore/VideoLoader';
import ImageLoader from '../explore/ImageLoader';
import ArticleItem from '../dispute/article/ArticleItem';
import ProductLoader from '../shoping/ProductLoader';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import ShopingLoader from '../shoping/ShopingLoader';

const UserAccount = ({ profileUsername, backendUrl, userIdFromMe }) => {
  const username = profileUsername;
  const navigate = useNavigate();
  // const { t } = useTranslation();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [user, setUser] = useState(null);
  
  // Сохти ҳисобҳо
  const [countPosts, setCountPosts] = useState(0);
  const [countBalance, setCountBalance] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Ҳисобҳо барои ҳар як навъи пост
  const [countImages, setCountImages] = useState(0);
  const [countVideos, setCountVideos] = useState(0);
  const [countArticles, setCountArticles] = useState(0);
  const [countProducts, setCountProducts] = useState(0);
  const [countShopings, setCountShopings] = useState(0);
  const [countTheories, setCountTheories] = useState(0);
  
  // Сабтҳои алоҳида барои ҳар як таб
  const [videoPosts, setVideoPosts] = useState([]);
  const [imagePosts, setImagePosts] = useState([]);
  const [articlePosts, setArticlePosts] = useState([]);
  const [productPosts, setProductPosts] = useState([]);
  const [shopPosts, setShopPosts] = useState([]);
  const [theoryPosts, setTheoryPosts] = useState([]);
  
  // Ҳолатҳои боргирии алоҳида барои ҳар як таб
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingTheories, setLoadingTheories] = useState(false);
  
  // HasMore алоҳида барои ҳар як навъи пост
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [hasMoreShops, setHasMoreShops] = useState(true);
  const [hasMoreTheories, setHasMoreTheories] = useState(true);
  
  // Offsets алоҳида барои ҳар як навъи пост
  const [videoOffset, setVideoOffset] = useState(0);
  const [imageOffset, setImageOffset] = useState(0);
  const [articleOffset, setArticleOffset] = useState(0);
  const [productOffset, setProductOffset] = useState(0);
  const [shopOffset, setShopOffset] = useState(0);
  const [theoryOffset, setTheoryOffset] = useState(0);

  const limit = 10;

  const postsContainerRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [myDisplay, setMyDisplay] = useState(null);
  const [avatarPath, setAvatarPath] = useState(null);

  const fullContainerRef = useRef(null);

  const [hasAnyPosts, setHasAnyPosts] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  let initialTab = null;

  const socketRef = useRef(null);

  // ================ STATE БАРОИ МОДАЛҲО ================
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);

  // ================ STATE ҲОИ МУСТАҚИЛ БАРОИ ПАЙРАВОН ================
  const [followers, setFollowers] = useState([]);
  const [followersOffset, setFollowersOffset] = useState(0); // offset барои пайравон
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [countFollowers, setCountFollowers] = useState(0);
  const followersModalContentRef = useRef(null);

  // ================ STATE ҲОИ МУСТАҚИЛ БАРОИ ПАЙГИРОН ================
  const [following, setFollowing] = useState([]);
  const [followingOffset, setFollowingOffset] = useState(0); // offset барои пайгирон
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [countFollowing, setCountFollowing] = useState(0);
  const followingModalContentRef = useRef(null);

  // ================ STATE БАРОИ ҶУСТУҶӮ ДАР МОДАЛИ ПАЙРАВОН ================
  const [followersSearchQuery, setFollowersSearchQuery] = useState('');
  const [followersSearchResults, setFollowersSearchResults] = useState([]);
  const [loadingFollowersSearch, setLoadingFollowersSearch] = useState(false);
  const [followersSearchOffset, setFollowersSearchOffset] = useState(0);
  const [hasMoreFollowersSearch, setHasMoreFollowersSearch] = useState(true);
  const [isSearchingFollowers, setIsSearchingFollowers] = useState(false);
  const followersSearchInputRef = useRef(null);
  const followersSearchContentRef = useRef(null);

  // ================ STATE БАРОИ ҶУСТУҶӮ ДАР МОДАЛИ ПАЙГИРОН ================
  const [followingSearchQuery, setFollowingSearchQuery] = useState('');
  const [followingSearchResults, setFollowingSearchResults] = useState([]);
  const [loadingFollowingSearch, setLoadingFollowingSearch] = useState(false);
  const [followingSearchOffset, setFollowingSearchOffset] = useState(0);
  const [hasMoreFollowingSearch, setHasMoreFollowingSearch] = useState(true);
  const [isSearchingFollowing, setIsSearchingFollowing] = useState(false);
  const followingSearchInputRef = useRef(null);
  const followingSearchContentRef = useRef(null);

  // Menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("language") || i18n.language || "en"
  );

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setSelectedLanguage(lang);
  };

  // Transfer Money
  const [isTransferring, setIsTransferring] = useState(false);

  // Add Balance Modal
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [phoneOrCard, setPhoneOrCard] = useState('');
  const [isSendingAddBalance, setIsSendingAddBalance] = useState(false);

  // Get Money Moadl
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');

  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const articleIdsRef = useRef([]);

  // Референсҳо барои пешгирӣ аз боргирии такрорӣ
  const tabLoadStatus = useRef({
    video: false,
    image: false,
    article: false,
    product: false,
    shoping: false,
    theory: false
  });

  useEffect(() => {
    // RESET ҲАМА ЧИЗ
    setVideoPosts([]);
    setImagePosts([]);
    setArticlePosts([]);
    setProductPosts([]);
    setShopPosts([]);
    setTheoryPosts([]);

    setVideoOffset(0);
    setImageOffset(0);
    setArticleOffset(0);
    setProductOffset(0);
    setShopOffset(0);
    setTheoryOffset(0);

    tabLoadStatus.current = {
      video: false,
      image: false,
      article: false,
      product: false,
      shoping: false,
      theory: false
    };

    setHasMoreVideos(true);
    setHasMoreImages(true);
    setHasMoreArticles(true);
    setHasMoreProducts(true);
    setHasMoreShops(true);
    setHasMoreTheories(true);

    setActiveTab(null);

    loadUser();
  }, [username]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".account-menu")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Пайвастшавӣ ба WebSocket барои обунаҳо
  useEffect(() => {
    if (!userId) return;

    // Socket барои огоҳиҳои умумӣ
    const ws = new WebSocket(`${backendUrl.replace('http', 'ws')}/ws/account_updates/${userId}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleAccountWebSocket(data);
    };

    return () => {
      ws.close();
    };
  }, [userId, backendUrl]);

  const handleAccountWebSocket = (data) => {
    switch (data.type) {
      case 'follow':
        handleFollowWebSocket(data);
        break;
      case 'unfollow':
        handleUnfollowWebSocket(data);
        break;
    }
  };

  // Коркарди обунашавӣ
  const handleFollowWebSocket = (data) => {
    if (data.follower_id === userId) {
      setFollowingOffset(prev => Math.max(prev + 1, 0));
      setCountFollowing(data.count_following);
    }

    // 2. Агар касе ба мо обуна шавад -> ба followers илова мекунем
    if (data.target_user_id === userId) {
      setFollowersOffset(prev => Math.max(prev + 1, 0));
      setCountFollowers(data.count_followers);
      setIsFollowing(true);
    }
  };

  // Коркарди бекор кардани обуна
  const handleUnfollowWebSocket = (data) => {
    if (data.follower_id === userId) {
      setFollowingOffset(prev => Math.max(prev - 1, 0));
      setCountFollowing(data.count_following);
    }

    // 2. Агар касе моро аз обуна хориҷ кунад (аз пайравон хориҷ мешавад)
    if (data.target_user_id === userId) {
      setFollowersOffset(prev => Math.max(prev - 1, 0));
      setCountFollowers(data.count_followers);
      setIsFollowing(false)
    }
  };

  // Боргирии иттилооти корбар
  useEffect(() => {

    if (username) {
      loadUser();
    }
  }, [username, backendUrl]);

  const loadUser = async () => {
    try {
      // 1️⃣ username → user_id
      const idRes = await fetch(
        `${backendUrl}/get-user-by-username?username=${username}`
      );

      if (!idRes.ok) throw new Error(t('account.errors.userNotFound'));

      const { user_id } = await idRes.json();

      // 2️⃣ user_id → user info
      const infoRes = await fetch(
        `${backendUrl}/get-user-info/${user_id}`
      );

      if (!infoRes.ok) throw new Error('User info error');

      const userInfo = await infoRes.json();

      if (userInfo.is_banned) {
        setUser({ is_banned: true });
        setLoading(false);
        return;
      }

      setUserId(userInfo.user_id);
      setMyUsername(userInfo.username);
      setMyDisplay(userInfo.display);
      setAvatarPath(userInfo.avatar);

      setUser(userInfo);
      setLoading(false);

      // Боргирии иттилооти ҳисоб ва пайгирии аввалӣ
      loadAccountInfo(userInfo.user_id);
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  };

  // Боргирии иттилооти ҳисоб (ҳисобҳо, пайгиронӣ ва ғ.)
  const loadAccountInfo = async (userId) => {
    try {
      const response = await axios.get(
        `${backendUrl}/get-account-info/${userId}`,
        { params: { requester_id: userIdFromMe } }
      );
      
      const userInfo = response.data;
      setCountPosts(userInfo.count_posts || 0);
      setCountFollowers(userInfo.count_followers || 0);
      setCountFollowing(userInfo.count_following || 0);
      setCountBalance(userInfo.balance || 0);
      setIsFollowing(userInfo.is_following);
      
      // Боргирии ҳисобҳо барои ҳар як навъ
      setCountVideos(userInfo.count_videos || 0);
      setCountImages(userInfo.count_images || 0);
      setCountArticles(userInfo.count_articles || 0);
      setCountProducts(userInfo.count_products || 0);
      setCountShopings(userInfo.count_shopings || 0);
      setCountTheories(userInfo.count_theories || 0);
      
      // Муайян кардани ин ки оё корбар ҳеҷ пост дорад ё не
      const totalUserPosts = 
        (userInfo.count_videos || 0) +
        (userInfo.count_images || 0) +
        (userInfo.count_articles || 0) +
        (userInfo.count_products || 0) +
        (userInfo.count_shopings || 0) +
        (userInfo.count_theories || 0);
      
      setHasAnyPosts(totalUserPosts > 0);

      // Муайян кардани таби аввал вобаста ба миқдор
      if (userInfo.count_videos > 0) {
        initialTab = 'video';
      } else if (userInfo.count_images > 0) {
        initialTab = 'image';
      } else if (userInfo.count_articles > 0) {
        initialTab = 'article';
      } else if (userInfo.count_products > 0) {
        initialTab = 'product';
      } else if (userInfo.count_shopings > 0) {
        initialTab = 'shoping';
      } else if (userInfo.count_theories > 0) {
        initialTab = 'theory';
      }

      setActiveTab(initialTab);

    } catch (error) {

    }
  };

  // Боргирии видеоҳои корбар
  const loadUserVideos = useCallback(async (initialLoad = false) => {
    if ((loadingVideos && !initialLoad) || !hasMoreVideos || !user) return;
    
    setLoadingVideos(true);
    
    try {
      const excludeIds = videoPosts.map(post => post.id);
      
      const res = await axios.get(`${backendUrl}/get-user-videos`, {
        params: {
          limit,
          offset: initialLoad ? 0 : videoOffset,
          user_id: user.user_id,
          requester_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const videosData = res.data.videos || [];
      
      if (videosData.length === 0) {
        setHasMoreVideos(false);
      } else {
        if (initialLoad) {
          setVideoPosts(videosData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          })));
          setVideoOffset(limit);
        } else {
          setVideoPosts(prev => [
            ...prev,
            ...videosData.map(v => ({
              ...v,
              key: `${v.id}-${Date.now()}`
            }))
          ]);
          setVideoOffset(prev => prev + limit);
        }
        tabLoadStatus.current.video = true;
      }
    } catch (err) {

    } finally {
      setLoadingVideos(false);
    }
  }, [user, loadingVideos, hasMoreVideos, backendUrl, userId, videoPosts, videoOffset, limit]);

  // Боргирии расмҳои корбар
  const loadUserImages = useCallback(async (initialLoad = false) => {
    if ((loadingImages && !initialLoad) || !hasMoreImages || !user) return;
    
    setLoadingImages(true);
    
    try {
      const excludeIds = imagePosts.map(post => post.id);
      
      const res = await axios.get(`${backendUrl}/get-user-images`, {
        params: {
          limit,
          offset: initialLoad ? 0 : imageOffset,
          user_id: user.user_id,
          requester_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const imagesData = res.data.images || [];
      
      if (imagesData.length === 0) {
        setHasMoreImages(false);
      } else {
        if (initialLoad) {
          setImagePosts(imagesData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          })));
          setImageOffset(limit);
        } else {
          setImagePosts(prev => [
            ...prev,
            ...imagesData.map(v => ({
              ...v,
              key: `${v.id}-${Date.now()}`
            }))
          ]);
          setImageOffset(prev => prev + limit);
        }
        tabLoadStatus.current.image = true;
      }
    } catch (err) {
    } finally {
      setLoadingImages(false);
    }
  }, [user, loadingImages, hasMoreImages, backendUrl, userId, imagePosts, imageOffset, limit]);

  // Боргирии мақолаҳои корбар
  const loadUserArticles = useCallback(async (initialLoad = false) => {
    if ((loadingArticles && !initialLoad) || !hasMoreArticles || !user) return;
    
    setLoadingArticles(true);
    
    try {
      // Истифодаи useRef барои нигоҳ доштани ID-ҳои боргирифташуда
      const currentExcludeIds = articleIdsRef.current;
      
      const res = await axios.get(`${backendUrl}/get-user-articles`, {
        params: {
          user_id: user.user_id,
          requester_id: userId,
          limit,
          offset: initialLoad ? 0 : articleOffset,
          exclude_ids: currentExcludeIds.length > 0 ? currentExcludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const articlesData = res.data.articles || [];

      if (articlesData.length === 0) {
        setHasMoreArticles(false);
      } else {
        if (initialLoad) {
          // Навсозии массив бо ID-ҳои нав
          const newPosts = articlesData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          }));
          setArticlePosts(newPosts);
          // Навсозии ref бо ID-ҳои нав
          articleIdsRef.current = newPosts.map(post => post.id);
          setArticleOffset(limit);
        } else {
          setArticlePosts(prev => {
            const newPosts = [
              ...prev,
              ...articlesData.map(v => ({
                ...v,
                key: `${v.id}-${Date.now()}`
              }))
            ];
            // Навсозии ref бо ID-ҳои нав
            articleIdsRef.current = newPosts.map(post => post.id);
            return newPosts;
          });
          setArticleOffset(prev => prev + limit);
        }
        tabLoadStatus.current.article = true;
      }
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  }, [user, loadingArticles, hasMoreArticles, backendUrl, userId, articleOffset, limit]); // articlePosts-ро хориҷ кардем

  // Боргирии маҳсулҳои корбар
  const loadUserProducts = useCallback(async (initialLoad = false) => {
    if ((loadingProducts && !initialLoad) || !hasMoreProducts || !user) return;
    
    setLoadingProducts(true);
    
    try {
      const excludeIds = productPosts.map(post => post.id);
      
      const res = await axios.get(`${backendUrl}/get-user-products`, {
        params: {
          limit,
          offset: initialLoad ? 0 : productOffset,
          user_id: user.user_id,
          requester_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const productsData = res.data.products || [];
      
      if (productsData.length === 0) {
        setHasMoreProducts(false);
      } else {
        if (initialLoad) {
          setProductPosts(productsData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          })));
          setProductOffset(limit);
        } else {
          setProductPosts(prev => [
            ...prev,
            ...productsData.map(v => ({
              ...v,
              key: `${v.id}-${Date.now()}`
            }))
          ]);
          setProductOffset(prev => prev + limit);
        }
        tabLoadStatus.current.product = true;
      }
    } catch (err) {
    } finally {
      setLoadingProducts(false);
    }
  }, [user, loadingProducts, hasMoreProducts, backendUrl, userId, productPosts, productOffset, limit]);

  // Боргирии мағозаҳои корбар
  const loadUserShops = useCallback(async (initialLoad = false) => {
    if ((loadingShops && !initialLoad) || !hasMoreShops || !user) return;
    
    setLoadingShops(true);
    
    try {
      const excludeIds = shopPosts.map(post => post.id);
      
      const res = await axios.get(`${backendUrl}/get-user-shopings`, {
        params: {
          limit,
          user_id: user.user_id,
          requester_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const shopsData = res.data.shopings  || [];
      
      if (shopsData.length === 0) {
        setHasMoreShops(false);
      } else {
        if (initialLoad) {
          setShopPosts(shopsData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          })));
          setShopOffset(limit);
        } else {
          setShopPosts(prev => [
            ...prev,
            ...shopsData.map(v => ({
              ...v,
              key: `${v.id}-${Date.now()}`
            }))
          ]);
          setShopOffset(prev => prev + limit);
        }
        tabLoadStatus.current.shoping = true;
      }
    } catch (err) {
    } finally {
      setLoadingShops(false);
    }
  }, [user, loadingShops, hasMoreShops, backendUrl, userId, shopPosts, shopOffset, limit]);

  // Боргирии назарияҳои корбар
  const loadUserTheories = useCallback(async (initialLoad = false) => {
    if ((loadingTheories && !initialLoad) || !hasMoreTheories || !user) return;
    
    setLoadingTheories(true);
    
    try {
      const excludeIds = theoryPosts.map(post => post.id);
      
      const res = await axios.get(`${backendUrl}/get-user-theories`, {
        params: {
          limit,
          offset: initialLoad ? 0 : theoryOffset,
          user_id: user.user_id,
          requester_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined
        },
        paramsSerializer: { indexes: null }
      });

      const theoriesData = res.data.theories || [];
      
      if (theoriesData.length === 0) {
        setHasMoreTheories(false);
      } else {
        if (initialLoad) {
          setTheoryPosts(theoriesData.map(v => ({
            ...v,
            key: `${v.id}-${Date.now()}`
          })));
          setTheoryOffset(limit);
        } else {
          setTheoryPosts(prev => [
            ...prev,
            ...theoriesData.map(v => ({
              ...v,
              key: `${v.id}-${Date.now()}`
            }))
          ]);
          setTheoryOffset(prev => prev + limit);
        }
        tabLoadStatus.current.theory = true;
      }
    } catch (err) {
    } finally {
      setLoadingTheories(false);
    }
  }, [user, loadingTheories, hasMoreTheories, backendUrl, userId, theoryPosts, theoryOffset, limit]);

  useEffect(() => {
    if (!user || !activeTab) return;
    if (tabLoadStatus.current[activeTab]) return;

    switch (activeTab) {
      case 'video':
        loadUserVideos(true);
        break;
      case 'image':
        loadUserImages(true);
        break;
      case 'article':
        loadUserArticles(true);
        break;
      case 'product':
        loadUserProducts(true);
        break;
      case 'shoping':
        loadUserShops(true);
        break;
      case 'theory':
        loadUserTheories(true);
        break;
    }
  }, [activeTab, user]);

  // ================ БОРГИРИИ ПАЙРАВОН БО OFFSET ================
  const loadFollowers = useCallback(async (currentOffset = 0, reset = false) => {
    if (!user || !userIdFromMe) return;
    
    // Агар reset = false бошад ва hasMoreFollowers = false ё loadingFollowers = true, бозгашт
    if (!reset && (!hasMoreFollowers || loadingFollowers)) return;

    setLoadingFollowers(true);

    try {
      const response = await axios.get(`${backendUrl}/get-followers/${user.user_id}`, {
        params: {
          offset: currentOffset,
          limit: 10,
          requester_id: userIdFromMe
        }
      });

      const followersData = response.data.followers || [];
      const hasMore = response.data.has_more || false;
      const totalCount = response.data.total_count || 0;
      const nextOffset = response.data.next_offset;

      if (reset) {
        // Агар reset = true, тамоми маълумотро тоза кун ва аз нав бор кун
        setFollowers(followersData);
        setCountFollowers(totalCount);
      } else {
        // Агар reset = false, маълумоти навро ба маълумоти кӯҳна илова кун
        setFollowers(prev => {
          // Пешгирӣ аз такроршавӣ
          const existingIds = new Set(prev.map(f => f.user_id));
          const newFollowers = followersData.filter(f => !existingIds.has(f.user_id));
          return [...prev, ...newFollowers];
        });
      }

      // Нигоҳ доштани nextOffset барои боргирии навбатӣ
      // Агар nextOffset вуҷуд дошта бошад, онро истифода кун, вагарна currentOffset + followersData.length
      const newOffset = nextOffset !== null && nextOffset !== undefined 
        ? nextOffset 
        : currentOffset + followersData.length;
      
      setFollowersOffset(newOffset);
      setHasMoreFollowers(hasMore);

    } catch (error) {
    } finally {
      setLoadingFollowers(false);
    }
  }, [user, userIdFromMe, backendUrl]);

  // ================ БОРГИРИИ ПАЙГИРОН БО OFFSET ================
  const loadFollowing = useCallback(async (currentOffset = 0, reset = false) => {
    if (!user || !userIdFromMe) return;
    
    // Агар reset = false бошад ва hasMoreFollowing = false ё loadingFollowing = true, бозгашт
    if (!reset && (!hasMoreFollowing || loadingFollowing)) return;

    setLoadingFollowing(true);

    try {
      const response = await axios.get(`${backendUrl}/get-following/${user.user_id}`, {
        params: {
          offset: currentOffset,
          limit: 10,
          requester_id: userIdFromMe
        }
      });

      const followingData = response.data.following || [];
      const hasMore = response.data.has_more || false;
      const totalCount = response.data.total_count || 0;
      const nextOffset = response.data.next_offset;

      if (reset) {
        // Агар reset = true, тамоми маълумотро тоза кун ва аз нав бор кун
        setFollowing(followingData);
        setCountFollowing(totalCount);
      } else {
        // Агар reset = false, маълумоти навро ба маълумоти кӯҳна илова кун
        setFollowing(prev => {
          // Пешгирӣ аз такроршавӣ
          const existingIds = new Set(prev.map(f => f.user_id));
          const newFollowing = followingData.filter(f => !existingIds.has(f.user_id));
          return [...prev, ...newFollowing];
        });
      }

      // Нигоҳ доштани nextOffset барои боргирии навбатӣ
      // Агар nextOffset вуҷуд дошта бошад, онро истифода кун, вагарна currentOffset + followingData.length
      const newOffset = nextOffset !== null && nextOffset !== undefined 
        ? nextOffset 
        : currentOffset + followingData.length;
      
      setFollowingOffset(newOffset);
      setHasMoreFollowing(hasMore);

    } catch (error) {
    } finally {
      setLoadingFollowing(false);
    }
  }, [user, userIdFromMe, backendUrl]);

  // ================ КУШОДАНИ МОДАЛИ ПАЙРАВОН ================
  const openFollowersModal = () => {
    setIsFollowersModalOpen(true);
    // Reset ҳамаи state-ҳо
    setFollowers([]);
    setFollowersOffset(0);
    setHasMoreFollowers(true);
    setIsSearchingFollowers(false);
    setFollowersSearchQuery('');
    setFollowersSearchResults([]);
    setCountFollowers(0);
    // Боргирии аввалия
    setTimeout(() => {
      loadFollowers(0, true);
    }, 50);
  };

  // ================ КУШОДАНИ МОДАЛИ ПАЙГИРОН ================
  const openFollowingModal = () => {
    setIsFollowingModalOpen(true);
    // Reset ҳамаи state-ҳо
    setFollowing([]);
    setFollowingOffset(0);
    setHasMoreFollowing(true);
    setIsSearchingFollowing(false);
    setFollowingSearchQuery('');
    setFollowingSearchResults([]);
    setCountFollowing(0);
    // Боргирии аввалия
    setTimeout(() => {
      loadFollowing(0, true);
    }, 50);
  };

  // ================ ПӮШИДАНИ МОДАЛҲО ================
  const closeFollowersModal = () => {
    setIsFollowersModalOpen(false);
  };

  const closeFollowingModal = () => {
    setIsFollowingModalOpen(false);
  };

  // **ФУНКСИЯИ FOLLOW/UNFOLLOW ДАР МОДАЛ**
  const handleFollowUser = async (targetUserId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        // Дархости бекор кардани обуна
        await axios.post(`${backendUrl}/unfollow`, {
          follower_id: userIdFromMe,
          target_user_id: targetUserId
        });

        // ТАҒЙИРОТ: ФАВРАН ТУГМАРО ТАҒЙИР ДИҲЕД
        // Барои Following Modal
        if (isFollowingModalOpen) {
          setFollowing(prev => 
            prev.map(user => 
              user.user_id === targetUserId 
                ? { ...user, is_following: false } 
                : user
            )
          );
        }
        
        // Барои Followers Modal (агар лозим бошад)
        if (isFollowersModalOpen) {
          setFollowers(prev => 
            prev.map(user => 
              user.user_id === targetUserId 
                ? { ...user, is_following: false } 
                : user
            )
          );
        }
        
        // Барои профили асосӣ
        if (targetUserId === user?.user_id) {
          setIsFollowing(false);
        }
        
      } else {
        // Дархости обуна шудан
        await axios.post(`${backendUrl}/follow`, {
          follower_id: userIdFromMe,
          target_user_id: targetUserId
        });

        // Барои Following Modal
        if (isFollowingModalOpen) {
          setFollowing(prev => 
            prev.map(user => 
              user.user_id === targetUserId 
                ? { ...user, is_following: true } 
                : user
            )
          );
        }
        
        // Барои Followers Modal (агар лозим бошад)
        if (isFollowersModalOpen) {
          setFollowers(prev => 
            prev.map(user => 
              user.user_id === targetUserId 
                ? { ...user, is_following: true } 
                : user
            )
          );
        }
        
        // Барои профили асосӣ
        if (targetUserId === user?.user_id) {
          setIsFollowing(true);
        }
      }

      // Барои Followers Search
      if (isSearchingFollowers) {
        setFollowersSearchResults(prev =>
          prev.map(user =>
            user.user_id === targetUserId
              ? { ...user, is_following: !isCurrentlyFollowing }
              : user
          )
        );
      }

      // Барои Following Search
      if (isSearchingFollowing) {
        setFollowingSearchResults(prev =>
          prev.map(user =>
            user.user_id === targetUserId
              ? { ...user, is_following: !isCurrentlyFollowing }
              : user
          )
        );
      }

    } catch (error) {
    }
  };

  // ================ СКРОЛЛ БАРОИ ПАЙРАВОН ================
  useEffect(() => {
    const handleFollowersScroll = () => {
      if (!followersModalContentRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = followersModalContentRef.current;
      const threshold = 100; // 100px то охир

      // Агар ба охир наздик шавем ва hasMoreFollowers = true ва loadingFollowers = false
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (hasMoreFollowers && !loadingFollowers) {
        }
      }
    };

    const modalContent = followersModalContentRef.current;
    if (modalContent && isFollowersModalOpen) {
      modalContent.addEventListener('scroll', handleFollowersScroll);
      // Санҷиши аввалия барои боргирӣ дар ҳолати пур набудани контейнер
      setTimeout(() => {
        if (modalContent && modalContent.scrollHeight <= modalContent.clientHeight + 50) {
          if (hasMoreFollowers && !loadingFollowers && followers.length === 0) {
            loadFollowers(0, true);
          }
        }
      }, 100);
    }

    return () => {
      if (modalContent) {
        modalContent.removeEventListener('scroll', handleFollowersScroll);
      }
    };
  }, [isFollowersModalOpen, hasMoreFollowers, loadingFollowers, followersOffset, followers.length, loadFollowers]);

  // ================ СКРОЛЛ БАРОИ ПАЙГИРОН ================
  useEffect(() => {
    const handleFollowingScroll = () => {
      if (!followingModalContentRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = followingModalContentRef.current;
      const threshold = 100; // 100px то охир

      // Агар ба охир наздик шавем ва hasMoreFollowing = true ва loadingFollowing = false
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (hasMoreFollowing && !loadingFollowing) {
        }
      }
    };

    const modalContent = followingModalContentRef.current;
    if (modalContent && isFollowingModalOpen) {
      modalContent.addEventListener('scroll', handleFollowingScroll);
      // Санҷиши аввалия барои боргирӣ дар ҳолати пур набудани контейнер
      setTimeout(() => {
        if (modalContent && modalContent.scrollHeight <= modalContent.clientHeight + 50) {
          if (hasMoreFollowing && !loadingFollowing && following.length === 0) {
            loadFollowing(0, true);
          }
        }
      }, 100);
    }

    return () => {
      if (modalContent) {
        modalContent.removeEventListener('scroll', handleFollowingScroll);
      }
    };
  }, [isFollowingModalOpen, hasMoreFollowing, loadingFollowing, followingOffset, following.length, loadFollowing]);

  // Функсияи ҷустуҷӯ барои пайравон (бо requester_id)
  const searchFollowers = useCallback(async (reset = true) => {
    if (!user || !userIdFromMe || !followersSearchQuery.trim()) {
      if (reset) {
        setIsSearchingFollowers(false);
        setFollowersSearchResults([]);
      }
      return;
    }

    const currentOffset = reset ? 0 : followersSearchOffset;
    
    if (!reset && (!hasMoreFollowersSearch || loadingFollowersSearch)) return;

    setLoadingFollowersSearch(true);

    try {
      const response = await axios.get(`${backendUrl}/search-followers`, {
        params: {
          user_id: user.user_id,
          search: followersSearchQuery,
          skip: currentOffset,
          limit: 10,
          requester_id: userIdFromMe  // ✅ Илова кардани requester_id
        }
      });

      const results = response.data || [];
      if (reset) {
        setFollowersSearchResults(results);
        setIsSearchingFollowers(true);
      } else {
        setFollowersSearchResults(prev => {
          const existingIds = new Set(prev.map(r => r.user_id));
          const newResults = results.filter(r => !existingIds.has(r.user_id));
          return [...prev, ...newResults];
        });
      }

      const newOffset = currentOffset + results.length;
      setFollowersSearchOffset(newOffset);
      setHasMoreFollowersSearch(results.length === 10);

    } catch (error) {
    } finally {
      setLoadingFollowersSearch(false);
    }
  }, [user, userIdFromMe, followersSearchQuery, followersSearchOffset, hasMoreFollowersSearch, loadingFollowersSearch, backendUrl]);

  // Функсияи ҷустуҷӯ барои пайгирон (бо requester_id)
  const searchFollowing = useCallback(async (reset = true) => {
    if (!user || !userIdFromMe || !followingSearchQuery.trim()) {
      if (reset) {
        setIsSearchingFollowing(false);
        setFollowingSearchResults([]);
      }
      return;
    }

    const currentOffset = reset ? 0 : followingSearchOffset;
    
    if (!reset && (!hasMoreFollowingSearch || loadingFollowingSearch)) return;

    setLoadingFollowingSearch(true);

    try {
      const response = await axios.get(`${backendUrl}/search-following`, {
        params: {
          user_id: user.user_id,
          search: followingSearchQuery,
          skip: currentOffset,
          limit: 10,
          requester_id: userIdFromMe  // ✅ Илова кардани requester_id
        }
      });

      const results = response.data || [];
      if (reset) {
        setFollowingSearchResults(results);
        setIsSearchingFollowing(true);
      } else {
        setFollowingSearchResults(prev => {
          const existingIds = new Set(prev.map(r => r.user_id));
          const newResults = results.filter(r => !existingIds.has(r.user_id));
          return [...prev, ...newResults];
        });
      }

      const newOffset = currentOffset + results.length;
      setFollowingSearchOffset(newOffset);
      setHasMoreFollowingSearch(results.length === 10);

    } catch (error) {
    } finally {
      setLoadingFollowingSearch(false);
    }
  }, [user, userIdFromMe, followingSearchQuery, followingSearchOffset, hasMoreFollowingSearch, loadingFollowingSearch, backendUrl]);

  // Функсия барои бекор кардани ҷустуҷӯ
  const cancelFollowersSearch = () => {
    setIsSearchingFollowers(false);
    setFollowersSearchQuery('');
    setFollowersSearchResults([]);
    setFollowersSearchOffset(0);
    setHasMoreFollowersSearch(true);
  };

  const cancelFollowingSearch = () => {
    setIsSearchingFollowing(false);
    setFollowingSearchQuery('');
    setFollowingSearchResults([]);
    setFollowingSearchOffset(0);
    setHasMoreFollowingSearch(true);
  };

  // Эффект барои скролли беохир дар натиҷаҳои ҷустуҷӯи пайравон
  useEffect(() => {
    const handleSearchScroll = () => {
      if (!followersSearchContentRef.current || !isSearchingFollowers) return;

      const { scrollTop, scrollHeight, clientHeight } = followersSearchContentRef.current;
      const threshold = 100;

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (hasMoreFollowersSearch && !loadingFollowersSearch) {
          searchFollowers(false);
        }
      }
    };

    const content = followersSearchContentRef.current;
    if (content) {
      content.addEventListener('scroll', handleSearchScroll);
    }

    return () => {
      if (content) {
        content.removeEventListener('scroll', handleSearchScroll);
      }
    };
  }, [isSearchingFollowers, hasMoreFollowersSearch, loadingFollowersSearch, searchFollowers]);

  // Эффект барои скролли беохир дар натиҷаҳои ҷустуҷӯи пайгирон
  useEffect(() => {
    const handleSearchScroll = () => {
      if (!followingSearchContentRef.current || !isSearchingFollowing) return;

      const { scrollTop, scrollHeight, clientHeight } = followingSearchContentRef.current;
      const threshold = 100;

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (hasMoreFollowingSearch && !loadingFollowingSearch) {
          searchFollowing(false);
        }
      }
    };

    const content = followingSearchContentRef.current;
    if (content) {
      content.addEventListener('scroll', handleSearchScroll);
    }

    return () => {
      if (content) {
        content.removeEventListener('scroll', handleSearchScroll);
      }
    };
  }, [isSearchingFollowing, hasMoreFollowingSearch, loadingFollowingSearch, searchFollowing]);

  // Обработчик скролла для бесконечной загрузки
  useEffect(() => {
    const container = postsContainerRef.current;
    if (!container) return;
    
    let timeout;
    
    const onScroll = () => {
      if (loadingVideos || loadingImages || loadingArticles || loadingProducts || loadingShops || loadingTheories) return;
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { scrollTop, clientHeight, scrollHeight } = container;
        
        // Определяем, когда достигли низа (100px от конца)
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          switch(activeTab) {
            case 'video':
              if (hasMoreVideos) loadUserVideos();
              break;
            case 'image':
              if (hasMoreImages) loadUserImages();
              break;
            case 'article':
              if (hasMoreArticles) loadUserArticles();
              break;
            case 'product':
              if (hasMoreProducts) loadUserProducts();
              break;
            case 'shoping':
              if (hasMoreShops) loadUserShops();
              break;
            case 'theory':
              if (hasMoreTheories) loadUserTheories();
              break;
          }
        }
      }, 200);
    };
    
    container.addEventListener('scroll', onScroll);
    
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [
    activeTab, 
    hasMoreVideos, hasMoreImages, hasMoreArticles, hasMoreProducts, hasMoreShops, hasMoreTheories,
    loadingVideos, loadingImages, hasMoreArticles, loadingProducts, loadingShops, loadingTheories,
  ]);

  // Табро иваз кардан
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  // Функсия барои тоза кардани маҳсул дар ҳолати клики такрорӣ
  const getCurrentPosts = () => {
    switch(activeTab) {
      case 'video': return videoPosts;
      case 'image': return imagePosts;
      case 'article': return articlePosts;
      case 'product': return productPosts;
      case 'shoping': return shopPosts;
      case 'theory': return theoryPosts;
      default: return [];
    }
  };

  const getLoadingState = () => {
    switch(activeTab) {
      case 'video': return loadingVideos;
      case 'image': return loadingImages;
      case 'article': return loadingArticles;
      case 'product': return loadingProducts;
      case 'shoping': return loadingShops;
      case 'theory': return loadingTheories;
      default: return false;
    }
  };

  const getNoPostsMessage = () => {
    switch(activeTab) {
      case 'video': return t('account.noPosts.videos');
      case 'image': return t('account.noPosts.images');
      case 'article': return t('account.noPosts.articles');
      case 'product': return t('account.noPosts.products');
      case 'shoping': return t('account.noPosts.stores');
      case 'theory': return t('account.noPosts.theories');
      default: return t('account.noPosts.default');
    }
  };

  // Convert text to HTML links
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

  // Transfer money
  const handleTransferMoney = async (amount) => {
    try {
      const numericAmount = Number(amount);

      if (!numericAmount || numericAmount <= 0) {
        alert(t('account.balance.transfer.invalidAmount'));
        return;
      }

      if (!user.user_id || !userIdFromMe) {
        alert(t('account.errors.userNotFound'));
        return;
      }

      const commission = +(numericAmount * 0.01).toFixed(2);
      const total = numericAmount + commission;

      const isConfirmed = window.confirm(
        t('account.balance.transfer.confirm', {
          amount: numericAmount,
          commission,
          total
        })
      );

      if (!isConfirmed) return;

      setIsTransferring(true);

      const response = await axios.post(`${backendUrl}/transfer-money`, {
        from_user_id: userIdFromMe,
        to_user_id: user.user_id,
        amount: numericAmount
      });

      if (response.data.status === "success") {
        setUser(prev => ({
          ...prev,
          Balance: response.data.from_user_new_balance
        }));

        alert(
          t('account.balance.transfer.successFull', {
            amount: numericAmount,
            commission: response.data.commission,
            username: response.data.to_username
          })
        );
      }

    } catch (error) {
      if (error.response?.status === 403) {
        alert(t('account.balance.transfer.insufficientFunds'));
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(t('account.balance.transfer.error'));
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAddBalanceRequest = async () => {
    if (!phoneOrCard.trim()) {
      alert(t('account.balance.addModal.phoneOrCard'));
      return;
    }

    // ✅ Иҷзатнома пеш аз фиристодани дархост
    const isConfirmed = window.confirm(t('account.balance.addModal.confirmMessage'));

    if (!isConfirmed) {
      return; // агар корбар рад кард, раванд қатъ мешавад
    }

    try {
      setIsSendingAddBalance(true);

      const response = await axios.post(
        `${backendUrl}/create-withdrawal-request-for-add-balance`,
        {
          user_id: userIdFromMe,
          phone_or_card: phoneOrCard,
        }
      );

      if (response.status === 200) {
        alert(t('account.balance.addModal.success'));
        setIsAddBalanceOpen(false);
        setPhoneOrCard('');
      }

    } catch (error) {
      if (error.response?.status === 403) {
        alert(t('account.balance.addModal.duplicateError'));
      } else {
        alert(t('account.balance.transfer.error'));
      }

    } finally {
      setIsSendingAddBalance(false);
    }
  };

  // Get Money
  const validPrice = (value) => {
    if (!value) return false;

    const regex = /^\d+(\.\d{1,2})?$/;
    return regex.test(value);
  };

  const handleWithdrawSubmit = () => {
    if (!withdrawAmount || !withdrawPhone) {
      alert(t('account.balance.withdrawModal.fillAllFields'));
      return;
    }

    if (!validPrice(withdrawAmount)) {
      alert(t('account.balance.withdrawModal.invalidAmount'));
      return;
    }

    if (parseFloat(withdrawAmount) > countBalance) {
      alert(t('account.balance.withdrawModal.insufficientFunds'));
      return;
    }

    const cleanPhone = withdrawPhone.replace(/\D/g, '');

    if (cleanPhone.length < 8) {
      alert(t('account.balance.withdrawModal.invalidPhone'));
      return;
    }

    setConfirmWithdrawOpen(true);
  };

  const sendWithdrawRequest = async () => {
    setWithdrawLoading(true);

    try {
      const response = await axios.post(
        `${backendUrl}/create-withdrawal-request`,
        {
          user_id: userId,
          phone_or_card: withdrawPhone,
          amount: withdrawAmount
        }
      );

      alert(t('account.balance.withdrawModal.success', { amount: withdrawAmount }));

      setConfirmWithdrawOpen(false);
      setWithdrawModalOpen(false);

      setWithdrawAmount('');
      setWithdrawPhone('');

    } catch (error) {
      if (error.response?.status === 403) {
        alert(t('account.balance.withdrawModal.insufficientFunds'));
      } else if (
        error.response?.data?.detail?.includes("ду дархости гирифтани пул")
      ) {
        alert(t('account.balance.withdrawModal.duplicateError'));
      } else {
        alert(error.response?.data?.detail || t('account.balance.transfer.error'));
      }
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Report account
  const reportAccount = () => {
    const reason = prompt(t('account.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userIdFromMe,
        account_id: userId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('account.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('account.report.alreadyReported'));
          return;
        }

        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('account.report.error'));
      })
      .catch(err => {
        console.error('Error reporting account:', err);
        alert(t('account.report.error'));
      });
  };

  if (loading) return <div className="loading">{t('account.loading')}</div>;

  if (error || !user) {
    return (
      <div 
        className="error"
      >
        {t('account.userNotFound')}

        <button 
          className="back-from-account-button"
          onClick={() => navigate('/')}
        >
          ←
        </button>
      </div>
    );
  }

  const isOwnProfile = userIdFromMe === user.user_id;

  if (user?.is_banned) {
    return (
      <div className="account-banned-overlay">
        <div className="account-banned-content">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "100px" }}
          >
            block
          </span>
          <p className="account-banned-text">
            This account has been blocked
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={fullContainerRef}
    >
      <div
        ref={postsContainerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#303030'
        }}
      >
        {/* Main Content */}
        <div className="account-content">
          {/* Header with back button and menu */}
          <div className="account-header">
            <div className="header-actions">
              {!isOwnProfile && (
                <button 
                  className="create-post-button"
                  onClick={reportAccount}
                >
                  🚩
                </button>
              )}

              {isOwnProfile && (
                <button 
                  className="create-post-button"
                  onClick={() => navigate('/create')}
                  title={t('account.createPost')}
                >
                  +
                </button>
              )}

              {isOwnProfile && (
                <div className={`account-menu ${isMenuOpen ? "open" : ""}`}>
                  <button
                    className="menu-account-button"
                    onClick={() => setIsMenuOpen(prev => !prev)}
                  >
                    ⋮
                  </button>
                  <div className="dropdown-menu">
                    <button onClick={() => navigate(`/saved-posts`)}>
                      <span className="menu-icon">📚</span>
                      <span>{t('account.menu.saved')}</span>
                    </button>
                    <button onClick={() => navigate(`/supported-posts`)}>
                      <span className="menu-icon">🤝</span>
                      <span>{t('account.menu.supported')}</span>
                    </button>
                    <button onClick={() => navigate(`/comments-posted`)}>
                      <span className="menu-icon">💬</span>
                      <span>{t('account.menu.comments')}</span>
                    </button>
                    {/* <button onClick={() => navigate(`/purchased-products`)}>
                      <span className="menu-icon">🛒</span>
                      <span>{t('account.menu.purchased')}</span>
                    </button> */}
                    {/* <button onClick={() => navigate(`/liked-stores`)}>
                      <span className="menu-icon">👍</span>
                      <span>{t('account.menu.likedStores')}</span>
                    </button> */}
                    {/* <button onClick={() => navigate(`/reaction-to-theories`)}>
                      <span className="menu-icon">🧩</span>
                      <span>{t('account.menu.reactions')}</span>
                    </button> */}
                    <button onClick={() => navigate(`/saved-liked-articles`)}>
                      <span className="menu-icon">📰</span>
                      <span>{t('account.menu.articles')}</span>
                    </button>
                    <button
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "6px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="menu-icon">🌐</span>
                        <span>{t('account.menu.language')}</span>
                      </div>

                      <select
                        value={selectedLanguage}
                        onChange={(e) => changeLanguage(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "6px",
                          background: "#222",
                          color: "white",
                          border: "1px solid #555",
                          cursor: "pointer"
                        }}
                      >
                        <option value="en">English</option>
                        <option value="ru">Русский</option>
                        <option value="tj">Тоҷикӣ</option>
                        <option value="fa">فارسی</option>
                      </select>
                    </button>
                    {isOwnProfile && (
                      <>
                        <div className="divider"></div>
                        <button onClick={() => navigate('/login')}>
                          <span>{t('account.menu.switchAccount')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Profile Section */}
          <div className="profile-section">
            <div className="profile-header">
              {/* Left Column (Avatar + Buttons) */}
              <div className="profile-left">
                <img 
                  src={user.avatar ? `data:image/jpeg;base64,${user.avatar}` : '/default-avatar.png'} 
                  alt="avatar" 
                  className="profile-avatar"
                />
                
                <div className="profile-actions">
                  {!isOwnProfile ? (
                  <>
                    <button 
                      className={`follow-button ${isFollowing ? 'following' : ''}`}
                      onClick={() => handleFollowUser(userId, isFollowing)}
                    >
                      {isFollowing ? t('account.profile.unfollow') : t('account.profile.follow')}
                    </button>

                      <button 
                        className="message-button"
                        onClick={() => navigate(`/chats/@${user.username}`)}
                      >
                        {t('account.profile.message')}
                      </button>

                      {/* <button 
                        className="donate-button"
                        onClick={() => {
                          const amount = prompt(t('account.profile.donatePrompt'));
                          if (amount && !isNaN(parseFloat(amount))) {
                            // Call transfer money API
                            handleTransferMoney(amount);
                          }
                        }}
                      >
                        {t('account.profile.donate')}
                      </button> */}

                    </>
                  ) : (
                    <button 
                      className="edit-profile-button"
                      onClick={() => navigate('/edit-profile')}
                    >
                      <span>{t('account.profile.editProfile')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column (Info) */}
              <div className="profile-right">
                <div className="username-section">
                  <h1 className="username-account">{user.username}</h1>
                  {user.display && (
                    <div className="message-text">
                      {convertTextToHtmlLinks(user.display, navigate)}
                    </div>
                  )}
                </div>

                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number">{countPosts}</span>
                    <span className="stat-label">{t('account.profile.posts')}</span>
                  </div>

                  <div 
                    className="stat-item clickable"
                    onClick={openFollowersModal}
                  >
                    <span className="stat-number">{countFollowers}</span>
                    <span className="stat-label">{t('account.profile.followers')}</span>
                  </div>

                  <div 
                    className="stat-item clickable"
                    onClick={openFollowingModal}
                  >
                    <span className="stat-number">{countFollowing}</span>
                    <span className="stat-label">{t('account.profile.following')}</span>
                  </div>

                  {/* {isOwnProfile && (
                    <div className="stat-item">
                      <div className="balance-section">
                        <span className="stat-number">{parseFloat(countBalance).toFixed(2)}</span>
                        <div className="balance-actions">
                          <button
                            className="balance-action-btn"
                            onClick={() => setIsAddBalanceOpen(true)}
                          >
                            ✚
                          </button>

                          <button
                            className="balance-action-btn"
                            onClick={() => setWithdrawModalOpen(true)}
                          >
                            📤
                          </button>

                        </div>
                        <span className="stat-label">{t('account.profile.balance')}</span>
                      </div>
                    </div>
                  )} */}

                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          {hasAnyPosts ? (
            <div className="tabs-container">
              {countVideos > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => handleTabChange('video')}
                >
                  {t('account.tabs.videos', { count: countVideos })}
                </button>
              )}
              {countImages > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'image' ? 'active image' : ''}`}
                  onClick={() => handleTabChange('image')}
                >
                  {t('account.tabs.images', { count: countImages })}
                </button>
              )}
              {countArticles > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'article' ? 'active' : ''}`}
                  onClick={() => handleTabChange('article')}
                >
                  {t('account.tabs.articles', { count: countArticles })}
                </button>
              )}
              {countProducts > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
                  onClick={() => handleTabChange('product')}
                >
                  {t('account.tabs.products', { count: countProducts })}
                </button>
              )}
              {countShopings > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'shoping' ? 'active' : ''}`}
                  onClick={() => handleTabChange('shoping')}
                >
                  {t('account.tabs.stores', { count: countShopings })}
                </button>
              )}
              {countTheories > 0 && (
                <button 
                  className={`tab-button ${activeTab === 'theory' ? 'active' : ''}`}
                  onClick={() => handleTabChange('theory')}
                >
                  {t('account.tabs.theories', { count: countTheories })}
                </button>
              )}
            </div>
          ) : (<div></div>)}

          {/* Posts Grid */}
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
            {/* Video Posts */}
            {activeTab === 'video' && videoPosts.map((post) => (
              <div
                key={post.key || post.id}
                className="card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <VideoLoader
                  typeVideo="explore"
                  videoId={post.id}
                  containerId={`video-${post.id}`}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfVideo={post.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Image Posts */}
            {activeTab === 'image' && imagePosts.map((post) => (
              <div
                key={post.key || post.id}
                className="card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <ImageLoader
                  typeImage="explore"
                  imageId={post.id}
                  containerId={`image-${post.id}`}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfImage={post.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Article Posts */}
            {activeTab === 'article' && articlePosts.map((post) => (
              <div
                key={post.key || post.id}
                className="card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <ArticleItem
                  articleId={post.id}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                />
              </div>
            ))}

            {/* Product Posts */}
            {activeTab === 'product' && productPosts.map((post) => (
              <div
                key={post.key || post.id}
                className="card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <ProductLoader
                  typeProduct="explore"
                  productId={post.id}
                  containerId={`product-${post.id}`}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfProduct={post.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Shop Posts */}
            {activeTab === 'shoping' && shopPosts.map((post) => (
              <div
                key={post.key || post.id}
                className="card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <ShopingLoader
                  shopingId={post.id}
                  containerId={`shoping-${post.id}`}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfShoping={post.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Theory Posts */}
            {activeTab === 'theory' && theoryPosts.map((post) => (
              <div
                key={post.key || post.id}
                className="theory-card"
                style={{
                  transition: 'transform 0.2s ease',
                }}
              >
                <TheoryLoader
                  typeTheory="explore"
                  theoryId={post.id}
                  containerId={`theory-${post.id}`}
                  backendUrl={backendUrl}
                  userId={userIdFromMe}
                  avatarPath={avatarPath}
                  myUsername={myUsername}
                  myDisplay={myDisplay}
                  userIdOfTheory={post.user_id}
                  fullContainerRef={fullContainerRef}
                />
              </div>
            ))}

            {/* Loading Placeholders */}
            {getLoadingState() && (
              Array.from({ length: 6 }).map((_, p) => (
                <div key={p.id} className="masonry-item image-placeholder">
                  <div className="image-thumbnail-placeholder"></div>
                </div>
              ))
            )}

            {/* No Posts Message */}
            {getCurrentPosts().length === 0 && !getLoadingState() && (
              <div className="no-posts">
                {getNoPostsMessage()}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ================ МОДАЛИ ПАЙРАВОН (МУСТАҚИЛ) ================ */}
      {isFollowersModalOpen && (
        <div className="modal-overlay" onClick={closeFollowersModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-account-header">
              <h2>{t('account.modals.followers', { count: countFollowers })}</h2>
              <button 
                onClick={closeFollowersModal}
                style={{ color: "red" }}
              >
                ✕
              </button>
            </div>
            
            {/* БЛОКИ ҶУСТУҶӮ */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  ref={followersSearchInputRef}
                  type="text"
                  placeholder={t('account.modals.search.followers')}
                  value={followersSearchQuery}
                  onChange={(e) => setFollowersSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchFollowers(true);
                    }
                  }}
                  className="search-input"
                />
                <button 
                  className="search-btn"
                  onClick={() => searchFollowers(true)}
                  disabled={!followersSearchQuery.trim() || loadingFollowersSearch}
                >
                  {loadingFollowersSearch ? '...' : '🔍'}
                </button>
                {isSearchingFollowers && (
                  <button 
                    className="cancel-search-btn"
                    onClick={cancelFollowersSearch}
                    title={t('account.modals.search.cancel')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div 
              className="followers-list" 
              ref={isSearchingFollowers ? followersSearchContentRef : followersModalContentRef}
            >
              {isSearchingFollowers ? (
                // Намоиши натиҷаҳои ҷустуҷӯ
                <>
                  {followersSearchResults.length > 0 ? (
                    followersSearchResults.map((result) => (
                      <div key={result.user_id} className="follower-item">
                        <div 
                          className="follower-info"
                          onClick={() => {
                            if (!result.is_banned) {
                              navigate(`/@${result.username}`);
                            }
                            closeFollowersModal()
                          }}
                        >
                          <img 
                            src={result.avatar || '/default-avatar.png'} 
                            alt={result.username} 
                            className="follower-avatar"
                          />
                          <div className="follower-details">
                            <span className="follower-username">@{result.username}</span>
                            {result.display_name && (
                              <span className="follower-display">{result.display_name}</span>
                            )}
                          </div>
                        </div>

                        {userIdFromMe !== result.user_id && !result.is_banned && (
                          <button 
                            className={`follow-small-btn ${result.is_following ? 'following' : ''}`}
                            onClick={() => handleFollowUser(result.user_id, result.is_following)}
                          >
                            {result.is_following ? t('account.profile.unfollow') : t('account.profile.follow')}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    !loadingFollowersSearch && (
                      <div className="no-followers">
                        {followersSearchQuery 
                          ? t('account.modals.search.noResults', { type: t('account.profile.followers').toLowerCase() })
                          : t('account.modals.search.enterText')}
                      </div>
                    )
                  )}
                  
                  {loadingFollowersSearch && (
                    <div className="loading-indicator">{t('account.modals.loading')}</div>
                  )}
                  
                  {!hasMoreFollowersSearch && followersSearchResults.length > 0 && (
                    <div className="end-message">{t('account.modals.endMessage', { type: t('account.profile.followers').toLowerCase() })}</div>
                  )}
                </>
              ) : (
                // Намоиши рӯйхати муқаррарии пайравон
                <>
                  {followers.length > 0 ? (
                    followers.map((follower) => (
                      <div key={follower.user_id} className="follower-item">
                        <div 
                          className="follower-info"
                          onClick={() => {
                            if (!follower.is_banned) {
                              navigate(`/@${follower.username}`);
                            }
                            closeFollowersModal()
                          }}
                        >
                          <img 
                            src={follower.avatar ? `data:image/jpeg;base64,${follower.avatar}` : '/default-avatar.png'} 
                            alt={follower.username} 
                            className="follower-avatar"
                          />
                          <div className="follower-details">
                            <span className="follower-username">@{follower.username}</span>
                            {follower.display && (
                              <span className="follower-display">{follower.display}</span>
                            )}
                          </div>
                        </div>

                        {userIdFromMe !== follower.user_id && !follower.is_banned && (
                          <button 
                            className={`follow-small-btn ${follower.is_following ? 'following' : ''}`}
                            onClick={() => handleFollowUser(follower.user_id, follower.is_following)}
                          >
                            {follower.is_following ? t('account.profile.unfollow') : t('account.profile.follow')}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    !loadingFollowers && (
                      <div className="no-followers">
                        {t('account.modals.noFollowers')}
                      </div>
                    )
                  )}
                  
                  {loadingFollowers && (
                    <div className="loading-indicator">{t('account.modals.loading')}</div>
                  )}
                  
                  {!hasMoreFollowers && followers.length > 0 && (
                    <div className="end-message">{t('account.modals.endMessage', { type: t('account.profile.followers').toLowerCase() })}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================ МОДАЛИ ПАЙГИРОН (МУСТАҚИЛ) ================ */}
      {isFollowingModalOpen && (
        <div className="modal-overlay" onClick={closeFollowingModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-account-header">
              <h2>{t('account.modals.following', { count: countFollowing })}</h2>
              <button 
                onClick={closeFollowingModal}
                style={{ color: "red" }}
              >
                ✕
              </button>
            </div>
            
            {/* БЛОКИ ҶУСТУҶӮ */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  ref={followingSearchInputRef}
                  type="text"
                  placeholder={t('account.modals.search.following')}
                  value={followingSearchQuery}
                  onChange={(e) => setFollowingSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchFollowing(true);
                    }
                  }}
                  className="search-input"
                />
                <button 
                  className="search-btn"
                  onClick={() => searchFollowing(true)}
                  disabled={!followingSearchQuery.trim() || loadingFollowingSearch}
                >
                  {loadingFollowingSearch ? '...' : '🔍'}
                </button>
                {isSearchingFollowing && (
                  <button 
                    className="cancel-search-btn"
                    onClick={cancelFollowingSearch}
                    title={t('account.modals.search.cancel')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div 
              className="followers-list" 
              ref={isSearchingFollowing ? followingSearchContentRef : followingModalContentRef}
            >
              {isSearchingFollowing ? (
                // Намоиши натиҷаҳои ҷустуҷӯ
                <>
                  {followingSearchResults.length > 0 ? (
                    followingSearchResults.map((result) => (
                      <div key={result.user_id} className="follower-item">
                        <div 
                          className="follower-info"
                          onClick={() => {
                            if (!result.is_banned) {
                              navigate(`/@${result.username}`);
                            }
                            closeFollowingModal();
                          }}
                        >
                          <img 
                            src={result.avatar || '/default-avatar.png'} 
                            alt={result.username} 
                            className="follower-avatar"
                          />
                          <div className="follower-details">
                            <span className="follower-username">@{result.username}</span>
                            {result.display_name && (
                              <span className="follower-display">{result.display_name}</span>
                            )}
                          </div>
                        </div>

                        {userIdFromMe !== result.user_id && !result.is_banned && (
                          <button 
                            className={`follow-small-btn ${result.is_following ? 'following' : ''}`}
                            onClick={() => handleFollowUser(result.user_id, result.is_following)}
                          >
                            {result.is_following ? t('account.profile.unfollow') : t('account.profile.follow')}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    !loadingFollowingSearch && (
                      <div className="no-followers">
                        {followingSearchQuery 
                          ? t('account.modals.search.noResults', { type: t('account.profile.following').toLowerCase() })
                          : t('account.modals.search.enterText')}
                      </div>
                    )
                  )}
                  
                  {loadingFollowingSearch && (
                    <div className="loading-indicator">{t('account.modals.loading')}</div>
                  )}
                  
                  {!hasMoreFollowingSearch && followingSearchResults.length > 0 && (
                    <div className="end-message">{t('account.modals.endMessage', { type: t('account.profile.following').toLowerCase() })}</div>
                  )}
                </>
              ) : (
                // Намоиши рӯйхати муқаррарии пайгирон
                <>
                  {following.length > 0 ? (
                    following.map((follow) => (
                      <div key={follow.user_id} className="follower-item">
                        <div 
                          className="follower-info"
                          onClick={() => {
                            if (!follow.is_banned) {
                              navigate(`/@${follow.username}`);
                            }
                            closeFollowingModal()
                          }}
                        >
                          <img 
                            src={follow.avatar ? `data:image/jpeg;base64,${follow.avatar}` : '/default-avatar.png'} 
                            alt={follow.username} 
                            className="follower-avatar"
                          />
                          <div className="follower-details">
                            <span className="follower-username">@{follow.username}</span>
                            {follow.display && (
                              <span className="follower-display">{follow.display}</span>
                            )}
                          </div>
                        </div>
                        
                        {userIdFromMe !== follow.user_id && !follow.is_banned && (
                          <button 
                            className={`follow-small-btn ${follow.is_following ? 'following' : ''}`}
                            onClick={() => handleFollowUser(follow.user_id, follow.is_following)}
                          >
                            {follow.is_following ? t('account.profile.unfollow') : t('account.profile.follow')}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    !loadingFollowing && (
                      <div className="no-followers">
                        {t('account.modals.noFollowing')}
                      </div>
                    )
                  )}
                  
                  {loadingFollowing && (
                    <div className="loading-indicator">{t('account.modals.loading')}</div>
                  )}
                  
                  {!hasMoreFollowing && following.length > 0 && (
                    <div className="end-message">{t('account.modals.endMessage', { type: t('account.profile.following').toLowerCase() })}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Balance Modal*/}
      {isAddBalanceOpen && (
        <div className="modal-overlay">
          <div className="modal-card">

            <button
              className="modal-close"
              onClick={() => setIsAddBalanceOpen(false)}
            >
              ✕
            </button>

            <h2>{t('account.balance.addModal.title')}</h2>

            <p className="transfer-number">
              {t('account.balance.addModal.walletNumber')}
              <br />
              <strong>+992 888 851 403</strong>
            </p>

            <input
              className='number-input'
              type="text"
              placeholder={t('account.balance.addModal.phoneOrCard')}
              value={phoneOrCard}
              onChange={(e) => setPhoneOrCard(e.target.value)}
            />

            <div className="instruction-box">
              <h4>{t('account.balance.addModal.instructions')}</h4>
              <ol>
                <li>{t('account.balance.addModal.instruction1')}</li>
                <li>{t('account.balance.addModal.instruction2')}</li>
                <li>{t('account.balance.addModal.instruction3')}</li>
                <li>{t('account.balance.addModal.instruction4')}</li>
                <li>{t('account.balance.addModal.instruction5')}</li>
              </ol>
            </div>

            <button
              onClick={handleAddBalanceRequest}
              disabled={isSendingAddBalance}
              className="submit-add-balance"
            >
              {isSendingAddBalance ? t('account.modals.loading') : t('account.balance.addModal.submit')}
            </button>

          </div>
        </div>
      )}

      {/* Get Money Modal */}
      {withdrawModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">

            <button
              onClick={() => setWithdrawModalOpen(false)}
              className="modal-close"
            >
              ✕
            </button>

            <h2 className="modal-title">
              {t('account.balance.withdrawModal.title')}
            </h2>

            <input
              type="text"
              placeholder={t('account.balance.withdrawModal.amountPlaceholder')}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="modal-input"
            />

            <input
              type="text"
              placeholder={t('account.balance.withdrawModal.cardPlaceholder')}
              value={withdrawPhone}
              onChange={(e) => setWithdrawPhone(e.target.value)}
              className="modal-input"
            />

            <button
              onClick={handleWithdrawSubmit}
              disabled={withdrawLoading}
              className="modal-btn-primary"
            >
              {withdrawLoading ? t('account.modals.loading') : t('account.balance.withdrawModal.submit')}
            </button>

          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmWithdrawOpen && (
        <div className="modal-overlay">
          <div className="modal-box">

            <p style={{ marginBottom: "16px" }}>
              {t('account.balance.withdrawModal.confirm', { amount: withdrawAmount })}
            </p>

            <p style={{ color: "#666", marginBottom: "16px" }}>
              {t('account.balance.withdrawModal.phone', { phone: withdrawPhone })}
            </p>

            <div className="modal-actions">
              <button
                onClick={() => setConfirmWithdrawOpen(false)}
                className="modal-btn-danger"
              >
                {t('account.balance.withdrawModal.no')}
              </button>

              <button
                onClick={sendWithdrawRequest}
                disabled={withdrawLoading}
                className="modal-btn-success"
              >
                {withdrawLoading ? t('account.modals.loading') : t('account.balance.withdrawModal.yes')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default UserAccount;