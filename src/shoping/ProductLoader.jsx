import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../explore/image.css';
import './product.css';
import { createPortal } from 'react-dom';
import CommentComponent from '../explore/comment';
import { useNavigate } from 'react-router-dom';

const ProductLoader = ({
  productId,
  containerId,
  backendUrl,
  userId,
  avatarPath,
  myUsername,
  myDisplay,
  userIdOfProduct,
  commentId = null,
  placeholders = [],
  fullContainerRef = null,
  isAd = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allProductData, setAllProductData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [collaborators, setCollaborators] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);

  // State-ҳои нав барои харид
  const [isBought, setIsBought] = useState(false);
  const [buyCount, setBuyCount] = useState(0);
  const [isBuying, setIsBuying] = useState(false);
  const [productPrice, setProductPrice] = useState(0);
  const [usernameForSell, setUsernameForSell] = useState('');
  const [userIdForSell, setUserIdForSell] = useState('');
  const [metadataFileId, setMetadataFileId] = useState('');
  const [productType, setProductType] = useState('');
  const [physicalProductName, setPhysicalProductName] = useState('');
  const [personalProductSales, setPersonalProductSales] = useState(false);
  
  // State-ҳои нав барои CommentComponent
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const productRef = useRef(null);
  const commentInputRef = useRef(null);
  const shareSearchRef = useRef(null);
  const blockSearchRef = useRef(null);
  
  // Refs барои CommentComponent
  const commentsContainerRef = useRef(null);
  const pinnedContainerRef = useRef(null);
  const commentCountRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  const wsRef = useRef(null);

  const [physicalDeliveryMethod, setPhysicalDeliveryMethod] = useState('pickup');
  const [physicalPickupAddress, setPhysicalPickupAddress] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load initial product data
  useEffect(() => {
    const loadProductData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/get-product-preview/${productId}?user_id=${userId}`
        );

        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            setError(t('product.error'));
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        setProductData(data);

        setBuyCount(data.buy_count || 0);
        setCommentCount(data.comment_count || 0);
        setShareCount(data.share_count || 0);
        setSaveCount(data.save_count || 0);
        setViewCount(data.count_view || 0);
        setProductPrice(data.price || 0);
        setProductType(data.product_type || '');
        setPhysicalProductName(data.physical_product_name || '');
        setPersonalProductSales(data.personal_product_sales || false);

        setPhysicalDeliveryMethod(data.physical_delivery_method || 'pickup');
        setPhysicalPickupAddress(data.physical_pickup_address || '');

        // Дарёфти рӯйхати басташудагон
        if (data.BlockUsersList && Array.isArray(data.BlockUsersList)) {
          setBlockedUsers(data.BlockUsersList);
        }

        // Дарёфти мағозаҳо
        if (data.collaborator_ids) {
          try {
            const collabIds =
              [...data.collaborator_ids.matchAll(/ObjectId\('([^']+)'\)/g)]
                .map(match => match[1]);

            const collaboratorsPromises = collabIds.map(async (collabId) => {
              const collabResponse = await fetch(
                `${backendUrl}/get-shoping-info/${collabId}`
              );
              if (collabResponse.ok) {
                return await collabResponse.json();
              }
              return null;
            });

            const collaboratorsData = await Promise.all(collaboratorsPromises);
            setCollaborators(collaboratorsData.filter(Boolean));
          } catch (err) {
            console.error('Error loading collaborators:', err);
          }
        }
        
        setError(null);
        
        const productCount = data.product_count || 1;
        setAllProductData(Array(productCount).fill(''));

      } catch (err) {
        console.error('Error loading product data:', err);
        setError(err.message || t('product.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId, backendUrl, userId, t]);

  // Пас аз боргирии маълумот аз /get-product-preview
  useEffect(() => {
    if (productData && productData.allow_comments !== undefined) {
      setAllowComments(productData.allow_comments); // true ё false аз сервер
    }
  }, [productData]);

  // Ҷустуҷӯи аккаунтҳо барои бастан - такмил дода шуд
  const handleSearchAccounts = async (searchTerm, forBlock = false) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setAccountSearchLoading(false);
      return;
    }
    
    setAccountSearchLoading(true);
    
    try {
      const endpoint = forBlock ? 'accounts-block' : 'accounts';
      const params = new URLSearchParams({
        user_id: userId,
        search: searchTerm
      });
      
      // Илова кардани рӯйхати басташудагон барои ҷустуҷӯи бастан
      if (forBlock) {
        if (collaborators.length > 0) {
          params.append('exclude_ids', collaborators.map(c => c.id).join(','));
        }
        // Фиристодани рӯйхати басташудагон ба сервер
        if (blockedUsers.length > 0) {
          params.append('blocked_users', blockedUsers.join(','));
        }
      }
      
      const response = await fetch(`${backendUrl}/${endpoint}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          if (forBlock) {
            // Баррасӣ ки оё аккаунт аллакай баста шудааст
            const results = data.map(account => ({
              ...account,
              isBlocked: blockedUsers.includes(account.id)
            }));
            setSearchResults(results);
          } else {
            const results = data.map(account => ({
              ...account,
              isShared: selectedAccounts.some(a => a.id === account.id)
            }));
            setSearchResults(results);
          }
        } else {
          setSearchResults([]);
        }
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

  // Бастан ё боз кардани корбар - такмил дода шуд
  const handleBlockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/block-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          product_id: productId
        })
      });
      
      if (response.ok) {
        // Илова кардани корбари басташуда ба рӯйхат
        setBlockedUsers(prev => [...prev, account.id]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: true } : a
        ));
        alert(t('product.block.blockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      alert(t('product.block.blockError'));
    }
  };

  const handleUnblockUser = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-block-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          block_user: account.id,
          product_id: productId
        })
      });
      
      if (response.ok) {
        // Дур кардани корбар аз рӯйхати басташудагон
        setBlockedUsers(prev => prev.filter(id => id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isBlocked: false } : a
        ));
        alert(t('product.block.unblockSuccess', { username: account.username }));
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert(t('product.block.unblockError'));
    }
  };

  // Initialize WebSocket connection when modal opens
  useEffect(() => {
    if (!modalOpen || !backendUrl || !productId) return;
    
    const initWebSocket = () => {
      const wsScheme = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const wsUrl = `${wsScheme}://${backendUrl.replace('https://', '').replace('http://', '')}/ws/updates-product/${productId}`;
      
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;
      
      websocket.onopen = () => {
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      websocket.onclose = () => {
      };
    };
    
    initWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [modalOpen, backendUrl, productId]);

  const [isSmallScreen, setIsSmallScreen] = useState(
    window.innerWidth < 1359
  );

  useEffect(() => {
    if (modalOpen) {
      reloadAllProductStats();
      loadBuyStatus();
      loadSaveStatus();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen && !isSmallScreen) {
      if (allowComments) {
        setShowComments(true);
      } else {
        setShowShareModal(true);
      }
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1359);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleWebSocketMessage = (data) => {
    const messageType = data.type;

    switch (messageType) {
      case 'buy_count':
        setBuyCount(data.value);
        break;

      case 'comment_count':
        setCommentCount(data.value);
        if (commentCountRef.current) {
          commentCountRef.current.textContent = data.value;
        }
        break;
        
      case 'share_count':
        setShareCount(data.value);
        break;
        
      case 'save_count':
        setSaveCount(data.value);
        if (data.user_id === userId) {
          setIsSaved(data.saved);
        }
        break;
        
      case 'view_count':
        setViewCount(data.value);
        break;
        
      case 'delete_product':
        if (data.product_id === productId) {
          handleDeleteProduct('deleted');
        }
        break;
    }
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return t('product.timeAgo.unknown');
    
    const past = new Date(timestamp);
    const now = new Date();
    const diff = now - past;
    const seconds = Math.floor(diff / 1000);
    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (seconds < minute) return t('product.timeAgo.secondsAgo');
    if (seconds < hour) {
      const minutes = Math.floor(seconds / minute);
      return minutes > 1 ? t('product.timeAgo.minutesAgo', { count: minutes }) : t('product.timeAgo.minuteAgo');
    }
    if (seconds < day) {
      const hours = Math.floor(seconds / hour);
      return hours > 1 ? t('product.timeAgo.hoursAgo', { count: hours }) : t('product.timeAgo.hourAgo');
    }
    if (seconds < week) {
      const days = Math.floor(seconds / day);
      return days > 1 ? t('product.timeAgo.daysAgo', { count: days }) : t('product.timeAgo.dayAgo');
    }
    if (seconds < month) {
      const weeks = Math.floor(seconds / week);
      return weeks > 1 ? t('product.timeAgo.weeksAgo', { count: weeks }) : t('product.timeAgo.weekAgo');
    }
    if (seconds < year) {
      const months = Math.floor(seconds / month);
      return months > 1 ? t('product.timeAgo.monthsAgo', { count: months }) : t('product.timeAgo.monthAgo');
    }
    const years = Math.floor(seconds / year);
    return years > 1 ? t('product.timeAgo.yearsAgo', { count: years }) : t('product.timeAgo.yearAgo');
  };

  const reloadAllProductStats = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/get-product-preview/${productId}?user_id=${userId}`,
        { cache: 'no-store' }
      );

      if (!response.ok) return;

      const data = await response.json();

      setBuyCount(data.buy_count || 0);
      setCommentCount(data.comment_count || 0);
      setShareCount(data.share_count || 0);
      setSaveCount(data.save_count || 0);
      setViewCount(data.count_view || 0);
      setProductPrice(data.price || 0);

    } catch (err) {
      console.error('reload stats error', err);
    }
  };

  const handleProductClick = () => {
    if (!productData?.Link) return;

    setModalOpen(true);

    const productIdFromUrl = productData.Link.split("/product/")[1];
    window.history.pushState(null, '', `/product/${productIdFromUrl}`);

    loadFullProductData();
    loadBuyStatus();
    loadSaveStatus();
    reloadAllProductStats();
    trackView();
  };

  useEffect(() => {
    if (commentId && productData) {

      // 1. Аввал назарияро кушоед
      handleProductClick();

      // 2. Баъд коментро оғоз кунед
      setShowComments(true);
    }
  }, [commentId, productData]);

  useEffect(() => {
    if (isAd) {
      handleProductClick();
    }
  }, [isAd, productData]);

  const loadFullProductData = async () => {
    try {
        const response = await fetch(
        `${backendUrl}/get-product-by-id/${productId}?user_id=${userId}`
        );
        
        if (!response.ok) {
        if (response.status === 403) {
            console.error('Access forbidden');
            return;
        }
        throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        const productData = data.images_data || [];
        const imageCount = data.total_images || 1;
        
        // Инициализатсияи массиви расмҳо
        const newAllProductData = Array(imageCount).fill('');
        
        // Пур кардани расмҳои боршуда
        productData.forEach((img, index) => {
        if (img) {
            newAllProductData[index] = img;
        }
        });
        
        setAllProductData(newAllProductData);
        
        // Фақат расми аввалро нишон диҳед
        setCurrentImageIndex(0);
        
        // Боргирии маълумотҳои иловагӣ
        await processProductData(data);
        
    } catch (err) {
        console.error('Error loading full product data:', err);
    }
  };

  const loadProductImageByIndex = async (index) => {
    if (index < 0 || index >= allProductData.length) return;

    // Агар аллакай бор шуда бошад
    if (allProductData[index]) {
      setCurrentImageIndex(index);
      return;
    }

    try {
      setImageLoading(true); // 👈 загрузка сар шуд

      const response = await fetch(
        `${backendUrl}/get-product-image-by-index/${productId}/${index}?user_id=${userId}`
      );

      if (response.ok) {
        const data = await response.json();
        const newImageData = data.image_id;

        if (newImageData) {
          setAllProductData(prev => {
            const copy = [...prev];
            copy[index] = newImageData;
            return copy;
          });
          setCurrentImageIndex(index);
        }
      } else {
        console.error('Failed to load product image by index');
      }
    } catch (err) {
      console.error('Error loading product image by index:', err);
    } finally {
      setImageLoading(false); // 👈 загрузка тамом
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
        loadProductImageByIndex(currentImageIndex - 1);
    }
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex < allProductData.length - 1) {
        loadProductImageByIndex(currentImageIndex + 1);
    }
  };

  const processProductData = async (data) => {
    // Коркарди маълумотҳои умумӣ
    setBuyCount(data.buy_count || 0);
    setCommentCount(data.comment_count || 0);
    setShareCount(data.share_count || 0);
    setSaveCount(data.save_count || 0);
    setViewCount(data.count_view || 0);
    setProductPrice(data.price || 0);
    setMetadataFileId(data.metadata_file_id || '');
    setUsernameForSell(data.username_for_sell || '');
    setUserIdForSell(data.user_id_for_sell || '');
    
    // Коркарди мағозаҳо
    if (data.collaborator_ids) {
      try {
        const collabIds =
          [...data.collaborator_ids.matchAll(/ObjectId\('([^']+)'\)/g)]
            .map(match => match[1]);

        const collaboratorsPromises = collabIds.map(async (collabId) => {
          const collabResponse = await fetch(
            `${backendUrl}/get-shoping-info/${collabId}`
          );
          if (collabResponse.ok) {
            return await collabResponse.json();
          }
          return null;
        });

        Promise.all(collaboratorsPromises).then(collaboratorsData => {
          setCollaborators(collaboratorsData.filter(Boolean));
        });
      } catch (err) {
        console.error('Error processing collaborators:', err);
      }
    }
  };

  const loadBuyStatus = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/check-buy-product?user_id=${userId}&product_id=${productId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsBought(data || false);
      }
    } catch (err) {
      console.error('Error loading buy status:', err);
    }
  };

  const loadSaveStatus = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/check-save-product-status?user_id=${userId}&product_id=${productId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved || false);
      }
    } catch (err) {
      console.error('Error loading save status:', err);
    }
  };

  const trackView = async () => {
    try {
      await fetch(`${backendUrl}/track-view-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId
        })
      });
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setShowShareModal(false);
    setShowBlockModal(false);
    setShowComments(false);

    if (productRef.current) {
      productRef.current.currentTime = 0;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    window.history.pushState(null, '', '/');
  };

  const handleDeleteProduct = (status) => {
    setModalOpen(false);
    if (containerRef.current) {
      containerRef.current.remove();
    }
    if (status === 'deleted') {
      alert(t('product.delete.success'));
    }
    if (status === 'removed_from_collaborators') {
      alert(t('product.delete.removedFromCollaborators'));
    }
    window.history.pushState(null, '', '/');
  };

  // Buy functionality - аз Python коди дуруст копия шудааст
  const handleBuy = async () => {
    if (isBuying) return;

    // Аввал аз корбар пурсакӣ кунед, ки оё мутмаин аст
    const confirmBuy = window.confirm(t('product.buy.confirm'));
    if (!confirmBuy) {
      return;
    }

    setIsBuying(true);
    
    try {
      // Агар корбар соҳиби маҳсул бошад, харидан имконнопазир аст
      if (userId === userIdOfProduct) {
        alert(t('product.buy.ownerCannotBuy'));
        setIsBuying(false);
        return;
      }
      
      // Санҷиш барои баланс
      if (isBought !== true) {
        const balanceCheck = await fetch(
          `${backendUrl}/check-balance-for-product/${productId}-${userId}`
        );

        if (balanceCheck.status === 403) {
          alert(t('product.buy.alreadySold'));
          setIsBuying(false);
          return;
        }

        if (balanceCheck.status === 402) {
          alert(t('product.buy.insufficientFunds'));
          setIsBuying(false);
          return;
        }
      }

      // Агар маҳсули аккаунт бошад
      if (usernameForSell && usernameForSell !== 'None') {
        showChangePasswordModal();
        setIsBuying(false);
        return;
      }
      
      // Агар маҳсули файл бошад
      if (metadataFileId && metadataFileId !== 'None') {
        await downloadProductFile();
        return;
      }
      
      // КОРКАРДИ МАХСУС БАРОИ МАХСУЛОТИ ФИЗИКЙ
      if (productType === 'physical') {
        await handlePhysicalProductPurchase();
        return;
      }
      
      // Дигар намудҳои маҳсул
      if (isBought !== true) {
        const response = await fetch(
          `${backendUrl}/check-balance-for-product/${productId}-${userId}`
        );

        if (response.status === 402) {
          alert(t('product.buy.insufficientFunds'));
          setIsBuying(false);
          return;
        }

        if (response.ok) {
          const result = await response.json();
          if (result.status === "ok") {
            setIsBought(true);
            alert(t('product.buy.success'));
          }
        } else {
          alert(t('product.buy.error'));
        }
      }
    } catch (err) {
      console.error('Error buying product:', err);
      alert(t('product.buy.error'));
    } finally {
      setIsBuying(false);
    }
  };

  // Функсияи нав барои хариди маҳсулоти физикӣ
  const handlePhysicalProductPurchase = async () => {
    const isCourier = physicalDeliveryMethod === 'courier';

    let buyerAddress = null;

    // Агар courier бошад → аз корбар суроға мехоҳем
    if (isCourier) {
      buyerAddress = await showAddressInputModal();
      if (!buyerAddress) {
        // корбар бекор кард → ҳеҷ чиз накунем
        return;
      }
    }

    try {
      const res = await fetch(`${backendUrl}/purchase-physical-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          user_id_of_product: userIdOfProduct,
          price: productPrice,
          address: buyerAddress   // фақат агар courier бошад мефиристем
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || t('product.buy.error'));
        return;
      }

      // ────────────────────────────────────────────────
      //        Чӣ суроғаро нишон диҳем дар модали QR
      // ────────────────────────────────────────────────
      let addressToShow = "";

      if (data.delivery_method === "courier") {
        // Агар нав харида бошад → адреси нав
        // Агар такрорӣ бошад → адреси қаблӣ аз DB
        addressToShow = data.buyer_address || buyerAddress || t('product.buy.addressLabel');
      } else {
        // pickup
        addressToShow = data.pickup_address || physicalPickupAddress || t('product.buy.addressLabel');
      }

      const modalMessage = data.already_purchased
        ? t('product.buy.alreadySold')
        : t('product.buy.success');

      showQRCodeModal(data.qr_code_data, modalMessage, addressToShow);

    } catch (err) {
      console.error(err);
      alert(t('product.buy.error'));
    }
  };

  // Функсия барои дохил кардани адрес
  const showAddressInputModal = () => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;justify-content:center;align-items:center;`;
      modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;max-width:500px;width:90%;text-align:center;">
          <h3 style="margin-bottom:20px;">${t('product.buy.enterAddressTitle')}</h3>
          <textarea id="addressInput" placeholder="${t('product.buy.enterAddressPlaceholder')}" style="width:100%;height:120px;padding:15px;border:1px solid #ccc;border-radius:8px;margin-bottom:15px;"></textarea>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button id="cancelBtn" style="padding:12px 24px;background:#ccc;border:none;border-radius:8px;cursor:pointer;">${t('product.buy.cancel')}</button>
            <button id="confirmBtn" style="padding:12px 24px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;">${t('product.buy.confirmAddress')}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        const addr = document.getElementById('addressInput').value.trim();
        if (addr) {
          document.body.removeChild(modal);
          resolve(addr);
        } else {
          alert(t('product.buy.addressRequired'));
        }
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(null);
      };
    });
  };

  // Функсия барои нишон додани QR-код дар модал
  const showQRCodeModal = (qrCodeData, message, address) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px; width: 90%; text-align: center;">
        
        <h3 style="margin-bottom: 20px; color: #333;">${message}</h3>

        ${
          address
            ? `<div style="margin-bottom:15px; padding:10px; background:#f1f1f1; border-radius:10px;">
                <strong>${t('product.buy.addressLabel')}</strong><br/>
                ${address}
              </div>`
            : ""
        }

        <img src="${qrCodeData}" alt="QR Code" style="max-width: 300px; width: 100%; margin-bottom: 20px;">
        
        <p style="color: #666; margin-bottom: 20px;">
          ${t('product.buy.showQRToSeller')}
        </p>

        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="downloadQRBtn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">${t('product.buy.downloadQR')}</button>
          <button id="closeQRBtn" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">${t('product.buy.close')}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    document.getElementById('downloadQRBtn').onclick = () => {
      const link = document.createElement('a');
      link.href = qrCodeData;
      link.download = `${productData.title || 'product'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    document.getElementById('closeQRBtn').onclick = () => {
      document.body.removeChild(modal);
    };
  };

  const downloadProductFile = async () => {
    try {
      const adminResponse = await fetch(
        `${backendUrl}/get-user-by-username?username=sanjar`
      );

      let adminId = 'admin_id_here';
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        adminId = adminData.user_id;
      }

      const downloadUrl = `${backendUrl}/download-file-of-product-save/${metadataFileId}-${productId}-${userId}-${userIdOfProduct}-${adminId}`;

      const a = document.createElement('a');
      a.href = downloadUrl;

      // МУҲИМ: download-ро холӣ мон
      a.setAttribute('download', '');

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsBought(true);
      // setBuyCount(prev => prev + 1);
      alert(t('product.buy.fileDownloaded'));
    } catch (err) {
      console.error(err);
      alert(t('product.buy.downloadError'));
    }
  };

  const showChangePasswordModal = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0px;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 20px; max-width: 400px; width: 100%;">
        <h3 style="margin-bottom: 15px; color: #333;">${t('product.buy.passwordChangeRequired')}</h3>
        <p style="color: red; margin-bottom: 15px;">${t('product.buy.enterPassword')}</p>
        <input type="password" id="password1" placeholder="${t('product.buy.enterPassword')}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <p style="color: red; margin-bottom: 15px;">${t('product.buy.confirmPassword')}</p>
        <input type="password" id="password2" placeholder="${t('product.buy.confirmPassword')}" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancelBtn" style="padding: 10px 20px; background: #ccc; border: none; border-radius: 5px; cursor: pointer;">${t('product.buy.cancel')}</button>
          <button id="submitBtn" style="padding: 10px 20px; background: #1877F2; color: white; border: none; border-radius: 5px; cursor: pointer;">${t('product.buy.submit')}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('cancelBtn').onclick = () => {
      document.body.removeChild(modal);
    };
    
    document.getElementById('submitBtn').onclick = async () => {
      const password1 = document.getElementById('password1').value;
      const password2 = document.getElementById('password2').value;
      
      // Валидатсия
      if (!password1 || !password2) {
        alert(t('product.buy.bothPasswordsRequired'));
        return;
      }
      
      if (password1 !== password2) {
        alert(t('product.buy.passwordsDoNotMatch'));
        return;
      }
      
      if (password1.length < 8 || password1.length > 30) {
        alert(t('product.buy.passwordLength'));
        return;
      }
      
      // Ирсоли рамз ба сервер
      try {
        // Гирифтани ID-и админ (sanjar)
        const adminResponse = await fetch(
          `${backendUrl}/get-user-by-username?username=sanjar`
        );
        
        let adminId = 'admin_id_here';
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          adminId = adminData.user_id;
        }
        
        const response = await fetch(`${backendUrl}/update_password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameForSell,
            new_password: password1,
            buy_account: true,
            is_buyed: isBought,
            user_id: userId,
            user_id_of_product: userIdOfProduct,
            product_id: productId,
            user_id_for_sell: userIdForSell,
            admin_id: adminId
          })
        });
        
        if (response.ok) {
          alert(t('product.buy.accountPasswordChange'));
          setIsBought(true);
          document.body.removeChild(modal);
        } else if (response.status === 403) {
          alert(t('product.buy.alreadySold'));
          document.body.removeChild(modal);
        } else {
          const errorData = await response.json();
          alert(errorData.detail || t('product.buy.passwordUpdateError'));
        }
      } catch (err) {
        console.error('Error updating password:', err);
        alert(t('product.buy.passwordUpdateError'));
      }
    };
  };

  // Save functionality
  const handleSave = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/save-product?user_id=${userId}&product_id=${productId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved || false);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      alert(t('product.errors.saveError'));
    }
  };

  // Share functionality
  const handleShare = () => {
    setShowShareModal(true);
    setShowComments(false);
    setShowBlockModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setAccountSearchLoading(false);
  };

  const handleSearchWithDebounce = (searchValue, forBlock = false) => {
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
    
    const timeoutId = setTimeout(() => {
      handleSearchAccounts(searchValue, forBlock);
    }, 500);
    
    setSearchTimeout(timeoutId);
  };

  const handleSendShare = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/share-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          product_id: productId
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => [...prev, account]);
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: true } : a
        ));
      }
    } catch (err) {
      console.error('Error sharing product:', err);
    }
  };

  const handleCancelShare = async (account) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-share-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: account.id,
          product_id: productId
        })
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => prev.filter(a => a.id !== account.id));
        setSearchResults(prev => prev.map(a => 
          a.id === account.id ? { ...a, isShared: false } : a
        ));
      }
    } catch (err) {
      console.error('Error canceling share:', err);
    }
  };

  // Block functionality
  const handleBlock = () => {
    setShowBlockModal(true);
    setShowComments(false);
    setShowShareModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setAccountSearchLoading(false);
  };

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (productData?.Link) {
      navigator.clipboard.writeText(productData.Link)
        .then(() => alert(t('product.copyLink.success')))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  // Report product
  const reportProduct = () => {
    const reason = prompt(t('product.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('product.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('product.report.alreadyReported'));
          return;
        }

        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('product.report.error'));
      })
      .catch(err => {
        console.error('Error reporting product:', err);
        alert(t('product.report.error'));
      });
  };

  // Delete product
  const deleteProduct = () => {
    if (window.confirm(t('product.delete.confirm'))) {
      fetch(`${backendUrl}/delete-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          user_id: userId,
          collaborator_ids: collaborators.map(c => c.user_id)
        })
      })
      .then(response => {
        if (response.ok) {
          handleDeleteProduct('deleted');
        } else {
          alert(t('product.delete.error'));
        }
      })
      .catch(err => {
        console.error('Error deleting product:', err);
        alert(t('product.delete.error'));
      });
    }
  };

  // Edit product
  const editProduct = () => {
    const productIdFromUrl = productData.Link.split("/product/")[1];
    window.location.href = `/update/product/${productIdFromUrl}`;
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    setShowShareModal(false);
    setShowBlockModal(false);
  };

  const getProductTypeBadge = (productType) => {
    const productTypeConfig = {
      'book': {
        'text': t('product.productType.book'),
        'color': '#8B4513'
      },
      'audio': {
        'text': t('product.productType.audio'),
        'color': '#9C27B0'
      },
      'video': {
        'text': t('product.productType.video'),
        'color': '#2196F3'
      },
      'image': {
        'text': t('product.productType.image'),
        'color': '#FF5722'
      },
      'software': {
        'text': t('product.productType.software'),
        'color': '#FF9800'
      },
      'account': {
        'text': t('product.productType.account'),
        'color': '#4CAF50'
      },
      'program': {
        'text': t('product.productType.program'),
        'color': '#E91E63'
      },
      'physical': {
        'text': `${t('product.productType.physical')}: ${physicalProductName}`,
        'color': '#bfff00'
      },
    };

    return productTypeConfig[productType?.toLowerCase()];
  };

  if (loading) {
    return (
      <div className="image-placeholder" ref={containerRef}>
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

  if (error || !productData) {
    return null;
  }

  const username = productData.display || productData.username || '';
  const timeAgoText = productData.UploadAt ? timeAgo(productData.UploadAt) : t('product.timeAgo.unknown');
  const isOwner = userId === userIdOfProduct;

  const price = Number(productData.price) || 0;
  const priceText = price === 0 ? t('product.free') : t('product.price', { price });

  const productTypeBadge = getProductTypeBadge(productType);

  const isPrivate = productData.user_is_blocked;

  // Main product card
  const ImageCard = (
    <div 
      className={`image-card ${isPrivate ? 'image-card--disabled' : ''}`}
      ref={containerRef}
      onClick={handleProductClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="image-thumbnail-container">
        {productData.thumbnail_url ? (
          <img 
            src={productData.thumbnail_url}
            alt={productData.title}
            className="image-thumbnail"
          />
        ) : productData.images_data ? (
          <img 
            src={`data:image/jpeg;base64,${productData.images_data}`}
            alt={productData.title}
            className="image-thumbnail"
          />
        ) : (
          <div className="no-thumbnail">
            <span>{t('product.noThumbnail')}</span>
          </div>
        )}

        {productData.visibility?.toLowerCase() === 'private' && (
          <div className="visibility-badge private">
            {t('product.visibility.private')}
          </div>
        )}
        {productData.visibility?.toLowerCase() === 'with_link' && (
          <div className="visibility-badge with-link">
            {t('product.visibility.withLink')}
          </div>
        )}

        {productTypeBadge && (
          <div className="product-type-badge" style={{ backgroundColor: productTypeBadge.color }}>
            {productTypeBadge.text}
          </div>
        )}

        {personalProductSales && (
          <div className="personal-sales-badge">
            {t('product.personalSales')}
          </div>
        )}

        <div className="play-icon-overlay">
          <span className="play-icon">▶</span>
        </div>

        {productData.duration && (
          <div className="image-duration">
            {productData.duration}
          </div>
        )}

        {productData.image_count > 1 && (
          <div className="image-counter">
            {1}/{productData.image_count}
          </div>
        )}
      </div>

      <div className="image-info">
        <h3 className="image-title">
          {productData.title || t('product.untitled')}
        </h3>

        <p className="image-description">
          {productData.data_of_product || ''}
        </p>

        <p className="image-price">
          {priceText}
        </p>

        <div className="image-stats">
          <div className="views">
            <span>👁</span>
            <span>{productData.count_view || 0}</span>
          </div>
          
          <div className="upload-time">
            <span>🕒</span>
            <span>{timeAgoText}</span>
          </div>
        </div>

        <div className="image-author">
          {productData.avatar ? (
            <img 
              src={`data:image/jpeg;base64,${productData.avatar}`}
              alt={username}
              className="author-avatar"
            />
          ) : (
            <div className="avatar-placeholder"></div>
          )}
          
          <span className="author-name">
            {username}
          </span>
          {collaborators.length > 0 && (
            <span className="collaborator-count">
              +{collaborators.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Helper function to convert text to HTML links - вазъияти дуруст
  const convertTextToHtmlLinks = (text, navigate, t) => {
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

  // Modal content
  const modalContent = modalOpen && (
    <div className="image-modal-overlay">
      <button
        onClick={handleCloseModal}
        className="modal-close-button"
      >
        ×
      </button>

      <div className="image-modal-content" ref={modalRef}>
        <div className="image-modal-main">
          {/* Image player section */}
          <div className="image-container" onClick={(e) => e.stopPropagation()}>
            {allProductData.length > 0 && (
              <div className="image-display-container">
                {imageLoading ? (
                  <div className="image-loading-placeholder">
                    <div className="loading-spinner"></div>
                    <p>{t('product.loadingImage')}</p>
                  </div>
                ) : allProductData[currentImageIndex] ? (
                  <img
                    key={`image-${currentImageIndex}`}
                    src={`data:image/jpeg;base64,${allProductData[currentImageIndex]}`}
                    alt={`Image ${currentImageIndex + 1}`}
                    className="modal-image-display"
                  />
                ) : (
                  <div className="image-loading-placeholder">
                  <div className="loading-spinner"></div>
                  <p>{t('product.loadingImage')}</p>
                  </div>
              )}
              </div>
            )}
            {allProductData.length > 1 && (
              <>
              <div className="modal-image-counter">
                  {currentImageIndex + 1}/{allProductData.length}
              </div>
              
              {/* Тугмаҳои навигатсия */}
              <div className="image-navigation">
                  {currentImageIndex > 0 && (
                  <button
                      onClick={handlePrevImage}
                      className="slider-button prev"
                  >
                      ‹
                  </button>
                  )}
                  
                  {currentImageIndex < allProductData.length - 1 && (
                  <button
                      onClick={handleNextImage}
                      className="slider-button next"
                  >
                      ›
                  </button>
                  )}
              </div>
              </>
            )}
          </div>

          {/* Image info section - always visible */}
          <div className="modal-image-info">
            {/* Price display in modal */}
            <div className="modal-price-display">
              <h3>{priceText}</h3>
            </div>

            {usernameForSell && usernameForSell !== 'None' && (
              <div className="username-for-sell-info">
                <p>
                  {t('product.accountForSale', { username: usernameForSell })}{' '}
                  <a
                    href={`/@${usernameForSell}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/@${usernameForSell}`);
                    }}
                    className="text-link"
                  >
                    @{usernameForSell}
                  </a>
                </p>
              </div>
            )}

            <h3 className="modal-image-title">
              {productData.title || t('product.untitled')}
            </h3>

            {productData.data_of_product && (
              <p className="modal-image-description">
                {productData.data_of_product}
              </p>
            )}

            <div className="modal-author-info">
              <div className="author-avatar-container">
                {productData.avatar ? (
                  <img 
                    src={`data:image/jpeg;base64,${productData.avatar}`}
                    alt={username}
                    className="author-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder"></div>
                )}
                {collaborators.length > 0 && (
                  <div className="collaborators-badge" title={`${collaborators.length} шарик`}>
                    +{collaborators.length}
                  </div>
                )}
              </div>

              <div className="author-details">
                {productData.display ? (
                  <>
                    <div className="author-display">
                      {productData.display}
                    </div>
                    <div className="message-text">
                      {convertTextToHtmlLinks(`@${productData.username}`, navigate)}
                    </div>
                  </>
                ) : (
                  <div className="message-text">
                    {convertTextToHtmlLinks(`@${productData.username}`, navigate)}
                  </div>
                )}

                {/* Намоиши мағозаҳо */}
                {collaborators.length > 0 && (
                  <div className="collaborators-list">
                    <span className="collaborators-label">{t('product.shops')} </span>
                    {collaborators.slice(0).map((collab, index) => (
                      <React.Fragment key={collab.id}>
                        <a
                          href={`/$${collab.shoping_name}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/$${collab.shoping_name}`);
                          }}
                          className="collaborator-link"
                        >
                          ${collab.shoping_name}
                        </a>
                        {index < collaborators.length - 0 && ', '}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-image-stats">
              <div className="views">
                <span>👁</span>
                <span>{viewCount} {t('product.views')}</span>
              </div>
              <div className="upload-time">
                <span>🕒</span>
                <span>{timeAgoText}</span>
              </div>
              <div className="comment-count" ref={commentCountRef}>
                <span>💬</span>
                <span>{commentCount}</span>
              </div>
            </div>

            {/* Actions bar */}
            <div className="modal-actions">
              {/* Гурӯҳи тугмаҳои асосӣ дар чап */}
              <div className="action-buttons-left">
                {/* Тугмаи харид */}
                <button
                  className={`buy-button ${isBought ? 'is-bought' : ''} ${isOwner ? 'disabled' : ''}`}
                  onClick={isOwner ? null : handleBuy}
                  disabled={isOwner}
                  title={isOwner ? t('product.buy.ownerCannotBuy') : ""}
                >
                  <span className="material-icons">
                    shopping_cart
                  </span>
                  <span className="comment-count">{buyCount}</span>
                </button>

                {/* comment */}
                {allowComments && (
                  <button
                    className="comment-button"
                    onClick={toggleComments}
                  >
                    <span className="material-icons">chat_bubble</span>
                    <span className="comment-count">{commentCount}</span>
                  </button>
                )}

                {/* share */}
                <button
                  className={`share-action-button`}
                  onClick={handleShare}
                >
                  <span className="material-icons">
                    send
                  </span>
                  <span>{shareCount}</span>
                </button>

                {/* save */}
                <button 
                  className={`save-button ${isSaved ? 'saved' : ''}`}
                  onClick={handleSave}
                >
                  <span className={`material-icons ${isSaved ? 'saved-icon' : ''}`}>
                    {'bookmark'}
                  </span>
                  <span>{saveCount}</span>
                </button>
              </div>

              {/* Тугмаи action-menu дар рост */}
              <div className="action-menu" ref={menuRef}>
                <button
                  title={t('product.more')}
                  onClick={() => setMenuOpen(prev => !prev)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span
                    className="material-icons"
                    style={{
                      fontSize: "20px",
                      color: "#6b7280"
                    }}
                  >
                    more_vert
                  </span>
                </button>

                <div className={`menu-dropdown ${menuOpen ? "open" : ""}`}>
                  <button onClick={copyLinkToClipboard}>{t('product.copyLinkButton')}</button>
                  {!isOwner && <button onClick={reportProduct}>{t('product.reportButton')}</button>}
                  {isOwner && <button onClick={handleBlock}>{t('product.blockButton')}</button>}
                  {isOwner && <button onClick={editProduct}>{t('product.edit')}</button>}
                  {(isOwner || collaborators.some(c => c.user_id === userId)) && (
                    <button onClick={deleteProduct}>{t('product.deleteButton')}</button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="additional-info">
              <div className="info-row">
                <span>{t('product.stats.postTime')}</span>
                <span>{timeAgoText}</span>
              </div>
              <div className="info-row">
                <span>{t('product.stats.saves')}</span>
                <span>{saveCount}</span>
              </div>
              <div className="info-row">
                <span>{t('product.stats.views')}</span>
                <span>{viewCount}</span>
              </div>
              <div className="info-row">
                <span>{t('product.stats.buys')}</span>
                <span>{buyCount}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Comments Section - appears on the right */}
        {allowComments && showComments && (
          <div className="comments-modal" ref={commentsContainerRef}>
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowComments(false)}>←</button>
              )}
              <h3>{t('product.comments')} (<span ref={commentCountRef}>{commentCount}</span>)</h3>
            </div>

            {/* 100% CommentComponent барои намоиши комментҳо */}
            <CommentComponent
              backendUrl={backendUrl}
              userIdFromMe={userIdOfProduct}
              userId={userId}
              collaboratorIds={collaborators.map(c => c.user_id)}
              postId={productId}
              typePost="product"
              selectedCommentId={commentId}
            />
          </div>
        )}

        {/* Share Modal - appears on the right */}
        {showShareModal && (
          <div className="share-modal">
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowShareModal(false)}>←</button>
              )}
              <h3>{t('product.share.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={shareSearchRef}
                type="text"
                placeholder={t('product.share.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, false)}
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('product.share.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('product.share.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('product.share.noResults')}</p>
                </div>
              ) : (
                searchResults.map(account => (
                  <div key={account.id} className="account-item">
                    <img src={account.avatar} alt={account.username} />
                    <div className="account-info">
                      <div className="account-display">@{account.username}</div>
                    </div>
                    <button
                      className={`share-button ${account.isShared ? 'shared' : ''}`}
                      onClick={() => account.isShared ? handleCancelShare(account) : handleSendShare(account)}
                    >
                      {account.isShared ? t('product.share.cancel') : t('product.share.send')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Block Modal */}
        {showBlockModal && (
          <div className="block-modal">
            <div className="modal-header">
              {isSmallScreen && (
                <button onClick={() => setShowBlockModal(false)}>←</button>
              )}
              <h3>{t('product.block.title')}</h3>
            </div>
            <div className="search-container">
              <input
                ref={blockSearchRef}
                type="text"
                placeholder={t('product.block.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearchWithDebounce(e.target.value, true)}
                autoFocus
              />
              {accountSearchLoading && (
                <div className="search-loading">
                  <span className="loading-spinner"></span>
                  <span>{t('product.block.searching')}</span>
                </div>
              )}
            </div>
            <div className="accounts-list">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('product.block.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('product.block.noResults')}</p>
                </div>
              ) : (
                <>
                  {searchResults.map(account => (
                    <div key={account.id} className="account-item">
                      <img 
                        src={account.avatar || '/default-avatar.png'} 
                        alt={account.username} 
                        className="account-avatar"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="account-info">
                        <div className="account-display">
                          {account.display_name || account.username}
                          {account.isBlocked && (
                            <span className="blocked-badge">{t('product.block.blockedBadge')}</span>
                          )}
                        </div>
                        <div className="account-username">@{account.username}</div>
                      </div>
                      <button
                        className={`block-button ${account.isBlocked ? 'blocked' : ''}`}
                        onClick={() => account.isBlocked ? handleUnblockUser(account) : handleBlockUser(account)}
                        title={account.isBlocked ? t('product.unblock') : t('product.block')}
                      >
                        {account.isBlocked ? t('product.block.unblock') : t('product.block.block')}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <>
      {ImageCard}
      {modalOpen && fullContainerRef?.current &&
        createPortal(modalContent, fullContainerRef.current)
      }
    </>
  );
};

export default ProductLoader;