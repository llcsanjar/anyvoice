// home.jsx
import React, { useState, useEffect, useRef } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import VideoLoader from '../explore/VideoLoader';
import ImageLoader from '../explore/ImageLoader';
import ProductLoader from '../shoping/ProductLoader';
import ShopingLoader from '../shoping/ShopingLoader';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import ArticleItem from '../dispute/article/ArticleItem';
import qs from 'qs';
import { Html5Qrcode } from 'html5-qrcode';
import i18n from "i18next";

const HomeUI = ({
  backendUrl,
  userIdFromMe,
  avatarPath,
  myUsername,
  myDisplay,

  fullContainerRef,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placeholders, setPlaceholders] = useState([]);
  const [openNotification, setOpenNotification] = useState(false);
  const [notificationOffset, setNotificationOffset] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Ad states
  const [ads, setAds] = useState([]);
  const [loadingAd, setLoadingAd] = useState(false);

  // Image states
  const [offsetImage, setOffsetImage] = useState(0);
  const [seenImageIds, setSeenImageIds] = useState(new Set());
  const [noMoreImages, setNoMoreImages] = useState(false);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [openedImages, setOpenedImages] = useState([]);

  // Video states
  const [offsetVideo, setOffsetVideo] = useState(0);
  const [seenVideoIds, setSeenVideoIds] = useState(new Set());
  const [noMoreVideos, setNoMoreVideos] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [openedVideos, setOpenedVideos] = useState([]);

  // Product states
  const [offsetProduct, setOffsetProduct] = useState(0);
  const [seenProductIds, setSeenProductIds] = useState(new Set());
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [openedProducts, setOpenedProducts] = useState([]);

  // Shopping states
  const [offsetShoping, setOffsetShoping] = useState(0);
  const [seenShopingIds, setSeenShopingIds] = useState(new Set());
  const [noMoreShopings, setNoMoreShopings] = useState(false);
  const [loadingMoreShopings, setLoadingMoreShopings] = useState(false);

  // Theory states
  const [loadingMoreTheories, setLoadingMoreTheories] = useState(false);
  const [openedTheories, setOpenedTheories] = useState([]);
  const [noMoreTheories, setNoMoreTheories] = useState(false);
  const [seenTheoryIds, setSeenTheoryIds] = useState(new Set());

  // Article states
  const [offsetArticle, setOffsetArticle] = useState(0);
  const [seenArticleIds, setSeenArticleIds] = useState(new Set());
  const [noMoreArticles, setNoMoreArticles] = useState(false);
  const [openedArticles, setOpenedArticles] = useState([]);
  
  // Refs
  const containerRef = useRef(null);
  const innerDivRef = useRef(null);
  const mainContainerRef = useRef(null);
  const mainContainerNotificationRef = useRef(null);
  const notificationContainerRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState({ chat: 0, notification: 0 });
  const [feedItems, setFeedItems] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  const limitForNotification = 10;
  
  // WebSocket connection
  const wsRef = useRef(null);

  // Scan states
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedPurchase, setScannedPurchase] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const mainContainerScanRef = useRef(null);

  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);

  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const lastProcessedQrRef = useRef(null);

  // Initialize
  useEffect(() => {
    // Load initial data
    handleReachedBottom();
    
    // Connect WebSocket
    connectWebSocket();
    
    // Load ad on initial render
    loadAd();
    
    // Get unread chat count
    loadUnreadChatCount();
    
    // Get unread notification count
    loadUnreadNotificationCount();
  }, []);

  // Load ad function
  const loadAd = async () => {
    if (loadingAd) return;
    
    setLoadingAd(true);
    
    try {
      const response = await axios.get(`${backendUrl}/ad/${userIdFromMe}`);
      
      const adData = response.data;
      
      if (adData && adData.DecryptedType === 'advertisement' && adData.isAdvertisement) {
        // Add ad to feed items at the beginning
        displayAdInTheThread(adData);
      }
    } catch (error) {
      console.error('Error loading ad:', error);
    } finally {
      setLoadingAd(false);
    }
  };

  // Display ad in the thread
  const displayAdInTheThread = (adData) => {
    const adType = adData.ad_type;
    const adId = adData.ad_id;

    // Create ad item based on type
    const adItem = {
      id: `ad-${adId}-${Date.now()}`,
      type: adType,
      ad: true,
      originalId: adId,
      data: adData,
      AdvertisementCheckbox: adData.AdvertisementCheckbox
    };
    
    // Insert at the beginning of feed items
    setFeedItems(prev => [adItem, ...prev]);
  };

  // Function to get unread chat count
  const loadUnreadChatCount = async () => {
    try {
      const response = await axios.get(`${backendUrl}/chats/unread_count/${userIdFromMe}`);
      
      const count = response.data?.unread_count || 0;
      setUnreadChatCount(count);
      setUnreadCount(prev => ({ ...prev, chat: count }));
      
    } catch (error) {
      console.error('Error loading unread chat count:', error);
      setUnreadChatCount(0);
      setUnreadCount(prev => ({ ...prev, chat: 0 }));
    }
  };

  // Handle scroll for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loading) return;
      
      const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        handleReachedBottom();
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading]);

  const handleReachedBottom = async () => {
    if (loading) return;
    
    // Load all types, including articles
    await loadFollowingVideos();
    await loadFollowingImages();
    await loadFollowingArticles();
    await loadFollowingProducts();
    await loadFollowingTheories();
    await loadFollowingShopings();
  };

  // Function loadFollowingArticles:
  const loadFollowingArticles = async () => {
    if (loading || noMoreArticles) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenArticleIds);

      const response = await axios.get(
        `${backendUrl}/get-following-articles`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const articles = response.data?.articles || [];

      if (!articles.length) {
        setNoMoreArticles(true);
        return;
      }

      const mappedArticles = articles.map(article => ({
        ...article,
        type: 'article',
      }));

      setFeedItems(prev => [...prev, ...mappedArticles]);

      setSeenArticleIds(prev => {
        const next = new Set(prev);
        articles.forEach(article => next.add(article.id));
        return next;
      });

      setOffsetArticle(prev => prev + articles.length);

    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };

  const createPlaceholders = (count) => {
    const newPlaceholders = Array.from({ length: count }, (_, i) => ({
      id: `placeholder-${Date.now()}-${i}`,
      type: 'placeholder'
    }));
    setPlaceholders(prev => [...prev, ...newPlaceholders]);
  };

  // Function loadFollowingImages
  const loadFollowingImages = async () => {
    if (loading || noMoreImages) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenImageIds);

      const response = await axios.get(
        `${backendUrl}/get-following-images`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const images = response.data?.images || [];

      if (!images.length) {
        setNoMoreImages(true);
        return;
      }

      const mappedImages = images.map(img => ({
        ...img,
        type: 'image',
      }));

      setFeedItems(prev => [...prev, ...mappedImages]);

      setSeenImageIds(prev => {
        const next = new Set(prev);
        images.forEach(img => next.add(img.id));
        return next;
      });

      setOffsetImage(prev => prev + images.length);

    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };

  // Function loadFollowingVideos
  const loadFollowingVideos = async () => {
    if (loading || noMoreVideos) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenVideoIds);

      const response = await axios.get(
        `${backendUrl}/get-following-videos`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const videos = response.data?.videos || [];

      if (!videos.length) {
        setNoMoreVideos(true);
        return;
      }

      const mappedVideos = videos.map(vid => ({
        ...vid,
        type: 'video',
      }));

      setFeedItems(prev => [...prev, ...mappedVideos]);

      setSeenVideoIds(prev => {
        const next = new Set(prev);
        videos.forEach(vid => next.add(vid.id));
        return next;
      });

      setOffsetVideo(prev => prev + videos.length);

    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };

  // Function loadFollowingProducts
  const loadFollowingProducts = async () => {
    if (loading || noMoreProducts) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenProductIds);

      const response = await axios.get(
        `${backendUrl}/get-following-products`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const products = response.data?.products || [];

      if (!products.length) {
        setNoMoreProducts(true);
        return;
      }

      const mappedProducts = products.map(prd => ({
        ...prd,
        type: 'product',
      }));

      setFeedItems(prev => [...prev, ...mappedProducts]);

      setSeenProductIds(prev => {
        const next = new Set(prev);
        products.forEach(prd => next.add(prd.id));
        return next;
      });

      setOffsetProduct(prev => prev + products.length);

    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };

  // Function loadFollowingTheories
  const loadFollowingTheories = async () => {
    if (loading || noMoreTheories) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenTheoryIds);

      const response = await axios.get(
        `${backendUrl}/get-following-theories`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const theories = response.data?.theories || [];

      if (!theories.length) {
        setNoMoreTheories(true);
        return;
      }

      const mappedTheories = theories.map(th => ({
        ...th,
        type: 'theory',
      }));

      setFeedItems(prev => [...prev, ...mappedTheories]);

      setSeenTheoryIds(prev => {
        const next = new Set(prev);
        theories.forEach(th => next.add(th.id));
        return next;
      });

    } catch (error) {
      console.error('Error loading theories:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };

  // Function loadFollowingShopings
  const loadFollowingShopings = async () => {
    if (loading || noMoreShopings) return;

    setLoading(true);
    createPlaceholders(5);

    try {
      const excludeIds = Array.from(seenShopingIds);

      const response = await axios.get(
        `${backendUrl}/get-following-shopings`,
        {
          params: {
            limit: 5,
            user_id: userIdFromMe,
            exclude_ids: excludeIds,
          },
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        }
      );

      const shopings = response.data?.shopings || [];

      if (!shopings.length) {
        setNoMoreShopings(true);
        return;
      }

      const mappedShopings = shopings.map(shoping => ({
        ...shoping,
        type: 'shoping',
      }));

      setFeedItems(prev => [...prev, ...mappedShopings]);

      setSeenShopingIds(prev => {
        const next = new Set(prev);
        shopings.forEach(shoping => next.add(shoping.id));
        return next;
      });

      setOffsetShoping(prev => prev + shopings.length);

    } catch (error) {
      console.error('Error loading shopings:', error);
    } finally {
      setLoading(false);
      setPlaceholders([]);
    }
  };
  
  // WebSocket connection
  const connectWebSocket = () => {
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const wsUri = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/notifications/${userIdFromMe}`;
    
    wsRef.current = new WebSocket(wsUri);
    
    wsRef.current.onopen = () => {
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    wsRef.current.onclose = (event) => {
      // Attempt reconnect
      setTimeout(connectWebSocket, 5000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };
  
  const handleWebSocketMessage = (data) => {
    const action = data.action || data.type;
    
    switch (action) {
      case 'new_messanger':
        handleNewMessage(data);
        break;
      case 'add':
        handleAddNotification(data);
        setUnreadNotificationCount(prev => prev + 1);
        setUnreadCount(prev => ({ ...prev, notification: prev.notification + 1 }));
        break;
      case 'delete':
        handleDeleteNotification(data);
        break;
      case 'error':
        handleErrorNotification(data);
        break;
      case 'ping':
        wsRef.current.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
    }
  };

  const handleNewMessage = (data) => {
    setUnreadChatCount(prev => prev + 1);
    setUnreadCount(prev => ({ ...prev, chat: prev.chat + 1 }));
  };

  const handleAddNotification = (data) => {
    const notification = data.notification;
    if (!notification) return;
    setNotifications(prev => [notification, ...prev]);
  };
  
  const handleDeleteNotification = (data) => {
    const notificationId = data.notification?._id;
    if (!notificationId) return;
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
  };
  
  const handleErrorNotification = (data) => {
    const errorMessage = data.message || t('home.errors.unknownError');
    console.error('Notification error:', errorMessage);
  };

  // Load notifications
  const loadNotifications = async (loadMore = false) => {
    if (!loadMore) {
      setLoadingNotifications(true);
    }

    const skip = loadMore ? notificationOffset : 0;

    try {
      const response = await axios.get(
        `${backendUrl}/notifications/${userIdFromMe}`,
        { params: { limit: limitForNotification, skip } }
      );
        
      const newData = response.data || [];
        
      setNotifications(prev =>
        loadMore ? [...prev, ...newData] : newData
      );
        
      if (!loadMore) {
        setNotificationOffset(newData.length);
      } else {
        setNotificationOffset(prev => prev + newData.length);
      }

      if (newData.length > 0) {
        const notificationIds = newData.map(notification => notification._id).filter(id => id);
        if (notificationIds.length > 0) {
          await markNotificationsAsRead(notificationIds);
        }
      }
        
      setLoadingNotifications(false);
      await loadUnreadNotificationCount();
      
      return newData;
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoadingNotifications(false);
      return [];
    }
  };

  const markNotificationsAsRead = async (notificationIds) => {
    try {
      await axios.post(
        `${backendUrl}/notifications/mark_as_read`,
        notificationIds,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Open notifications dialog
  const openNotificationsDialog = () => {
    setScanModalOpen(false);
    if (mainContainerScanRef.current) {
      mainContainerScanRef.current.style.display = 'none';
    }

    setOpenNotification(true);

    if (mainContainerRef.current) mainContainerRef.current.style.display = 'none';
    if (mainContainerNotificationRef.current) mainContainerNotificationRef.current.style.display = 'block';

    loadNotifications(false);
  };

  const loadUnreadNotificationCount = async () => {
    try {
      const response = await axios.get(`${backendUrl}/notifications/unread_count/${userIdFromMe}`);
      const count = response.data?.unread_count || 0;
      setUnreadNotificationCount(count);
      setUnreadCount(prev => ({ ...prev, notification: count }));
      return count;
    } catch (error) {
      console.error('Error loading unread notification count:', error);
      setUnreadNotificationCount(0);
      setUnreadCount(prev => ({ ...prev, notification: 0 }));
      return 0;
    }
  };

  // Back from dialog
  const backFromDialog = () => {
    setOpenNotification(false);
    
    if (mainContainerNotificationRef.current) {
      mainContainerNotificationRef.current.style.display = 'none';
    }

    if (mainContainerScanRef.current) {
      mainContainerScanRef.current.style.display = 'none';
    }

    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'block';
    }
  };

  // Open scan dialog
  const openScanDialog = () => {
    setScanModalOpen(true);
    setScanResult(null);
    setScanError(null);
    setScannedPurchase(null);
    setScanSuccess(false);
    
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
    
    if (mainContainerScanRef.current) {
      mainContainerScanRef.current.style.display = 'block';
      return;
    }
  };

  // Handle file upload for QR code
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      processQRCodeImage(imageData);
    };
    reader.readAsDataURL(file);

    event.target.value = null;
  };

  // Process QR code image
  const processQRCodeImage = async (imageData) => {
    setScanLoading(true);
    setScanError(null);
    setScanSuccess(false);
    setScanResult(null);
    setScannedPurchase(null);

    try {
      const response = await axios.post(`${backendUrl}/verify-physical-product-qr`, {
        qr_image: imageData,
        user_id: userIdFromMe
      });

      if (response.data.success) {
        setScanResult(response.data);
        setScannedPurchase(response.data.purchase_data);

        if (response.data.already_used) {
          setScanError(t('home.scan.alreadyUsed'));
          setScanSuccess(false);
        } 
        else if (response.data.verified) {
          setScanSuccess(true);
          setScanError(null);
        } 
        else {
          setScanError(t('home.scan.invalidQR'));
          setScanSuccess(false);
        }
      } else {
        setScanError(t('home.scan.invalidQR'));
        setScanSuccess(false);
      }

    } catch (error) {
      console.error('Error scanning QR code:', error);

      const status = error.response?.status;

      switch (status) {
        case 400:
          setScanError(t('home.scan.invalidQR'));
          break;
        case 401:
          setScanError(t('home.scan.purchaseNotFound'));
          break;
        case 402:
          setScanError(t('home.scan.insufficientFunds'));
          break;
        case 403:
          setScanError(t('home.scan.notAuthorized'));
          break;
        case 404:
          setScanError(t('home.scan.userNotFound'));
          break;
        default:
          setScanError(t('home.scan.error'));
      }

    } finally {
      setScanLoading(false);
    }
  };

  // Handle QR code verification
  const verifyQRCode = async (qrData) => {
    setScanError(null);
    setScanLoading(true);

    try {
      const response = await axios.post(`${backendUrl}/verify-physical-product-qr`, {
        qr_data: qrData,
        user_id: userIdFromMe
      });

      if (response.data.success) {
        setScanResult(response.data);
        setScannedPurchase(response.data.purchase_data);

        if (response.data.already_used) {
          setScanError(t('home.scan.alreadyUsed'));
          setScanSuccess(false);
        } else if (response.data.verified) {
          setScanSuccess(true);
          setScanError(null);
        } else {
          setScanError(t('home.scan.invalidQR'));
          setScanSuccess(false);
        }
      } else {
        setScanError(t('home.scan.invalidQR'));
        setScanSuccess(false);
      }

    } catch (error) {
      console.error('Error verifying QR code:', error);
      
      const status = error.response?.status;
      
      setScanLoading(false);
      
      switch (status) {
        case 400:
          setScanError(t('home.scan.invalidQR'));
          break;
        case 401:
          setScanError(t('home.scan.purchaseNotFound'));
          break;
        case 402:
          setScanError(t('home.scan.insufficientFunds'));
          break;
        case 403:
          setScanError(t('home.scan.notAuthorized'));
          break;
        case 404:
          setScanError(t('home.scan.userNotFound'));
          break;
        default:
          setScanError(t('home.scan.error'));
      }
      
      setScanSuccess(false);
      
    } finally {
      setScanLoading(false);
    }
  };

  // Function to start scanner
  const startHtml5Scanner = async () => {
    const container = document.getElementById("qr-video-container");
    if (!container) {
      setScanError('Video container not found');
      return;
    }

    if (html5QrCode && isScanning) {
      await stopHtml5Scanner();
    }

    setIsScanning(true);
    setScanLoading(true);
    setScanError(null);
    
    lastProcessedQrRef.current = null;
    setIsProcessingQr(false);

    try {
      const html5QrCodeInstance = new Html5Qrcode("qr-video-container");
      setHtml5QrCode(html5QrCodeInstance);

      const config = {
        fps: 10,
        qrbox: { width: 400, height: 400 },
        aspectRatio: 1.0,
      };

      let lastDecodedText = null;
      
      await html5QrCodeInstance.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          if (lastDecodedText === decodedText) {
            return;
          }
          lastDecodedText = decodedText;
          
          
          html5QrCodeInstance.stop().then(() => {
          }).catch(err => {
            console.error("Error stopping scanner:", err);
          });
          
          handleQrResult(decodedText);
        },
        (errorMessage) => {
          console.debug("Scanning...", errorMessage);
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      
      if (error === 'NotAllowedError') {
        setScanError(t('home.scan.cameraPermission') || 'Camera access denied');
      } else if (error === 'NotFoundError') {
        setScanError(t('home.scan.cameraNotFound') || 'Camera not found');
      } else if (error === 'NotSupportedError') {
        setScanError(t('home.scan.cameraNotSupported') || 'Camera not supported');
      } else {
        setScanError(t('home.scan.cameraError') || "Camera error: " + error.message);
      }
      
      setIsScanning(false);
      setTimeout(() => {
        closeScanner();
      }, 2000);
    } finally {
      setScanLoading(false);
    }
  };

  // Function to stop scanner
  const stopHtml5Scanner = async () => {
    if (html5QrCode) {
      try {
        if (isScanning) {
          await html5QrCode.stop();
        }
        await html5QrCode.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      setHtml5QrCode(null);
      setIsScanning(false);
    }
  };

  // Function to handle QR result
  const handleQrResult = async (qrText) => {
    
    if (isProcessingQr || lastProcessedQrRef.current === qrText) {
      return;
    }
    
    lastProcessedQrRef.current = qrText;
    setIsProcessingQr(true);
    
    await stopHtml5Scanner();

    setQrScannerOpen(false);
    setQrScanning(false);

    try {
      await verifyQRCode(qrText);
    } catch (error) {
      console.error("Error in handleQrResult:", error);
    } finally {
      setIsProcessingQr(false);
      setTimeout(() => {
        if (lastProcessedQrRef.current === qrText) {
          lastProcessedQrRef.current = null;
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (qrScannerOpen) {
      startHtml5Scanner();
    }
  }, [qrScannerOpen]);

  useEffect(() => {
    return () => {
      stopHtml5Scanner();
    };
  }, []);

  // Function to start camera scan
  const startCameraScan = () => {
    setScanError(null);
    setScanResult(null);
    setScannedPurchase(null);
    setScanSuccess(false);

    setQrScanning(true);
    setQrScannerOpen(true);
  };

  // Function to close scanner
  const closeScanner = () => {
    stopHtml5Scanner();
    setQrScanning(false);
    setQrScannerOpen(false);
    setScanError(null);
    setScanLoading(false);
  };

  // Render notification badge
  const renderBadge = (count, type = 'chat') => {
    if (count <= 0) return null;
    
    const badgeClass = count >= 10 ? 'badge-large' : 'badge-small';
    
    return (
      <div className={`unread-badge-container ${type}-badge`}>
        <div className={`unread-badge-home ${badgeClass}`}>
          <span className="unread-label">{count > 999 ? '999+' : count}</span>
        </div>
      </div>
    );
  };

  // View comment
  const handleViewComment = async (notification) => {
    if (!notification.PostId || !notification.status) {
      console.error('Comment data incomplete:', notification);
      return;
    }

    const commentPostId = notification.PostId;
    const postType = notification.status;

    try {
      const response = await axios.get(`${backendUrl}/get-${postType}-comment-by-id`, {
        params: { comment_id: commentPostId }
      });

      if (response.status === 200 && response.data.comment_data) {
        const commentData = response.data.comment_data;
        const postId = commentData.post_id;
        const commentId = commentData.id;
        const postLink = commentData.post_link;

        switch (postType) {
          case 'image':
            await openImageWithComment(postId, commentData.image_user_id, commentId, postLink);
            break;
          case 'video':
            await openVideoWithComment(postId, commentData.video_user_id, commentId, postLink);
            break;
          case 'product':
            await openProductWithComment(postId, commentData.product_user_id, commentId, postLink);
            break;
          case 'theory':
            await openTheoryWithComment(postId, commentData.theory_user_id, commentId, postLink);
            break;
          case 'article':
            await openArticleWithComment(postId, commentData.article_user_id, commentId, postLink);
            break;
          default:
            console.error('Unknown post type:', postType);
        }
      }
    } catch (err) {
      message.error(t('commentsPosted.errors.commentDataError'));
    }
  };

  const openImageWithComment = async (imageId, imageUserId, commentId, imageLink) => {
    const newImage = {
      imageId,
      userIdOfImage: imageUserId,
      commentId,
      imageLink,
      key: `${imageLink}-${Date.now()}`
    };
    setOpenedImages(prev => [...prev, newImage]);
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
  };

  const openVideoWithComment = async (videoId, videoUserId, commentId, videoLink) => {
    const newVideo = {
      videoId,
      userIdOfVideo: videoUserId,
      commentId,
      videoLink,
      key: `${videoLink}-${Date.now()}`
    };
    setOpenedVideos(prev => [...prev, newVideo]);
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
  };

  const openArticleWithComment = async (articleId, articleUserId, commentId, articleLink) => {
    const newArticle = {
      articleId,
      userIdOfArticle: articleUserId,
      commentId,
      articleLink,
      key: `${articleLink}-${Date.now()}`
    };
    setOpenedArticles(prev => [...prev, newArticle]);
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
  };

  const openProductWithComment = async (productId, productUserId, commentId, productLink) => {
    const newProduct = {
      productId,
      userIdOfProduct: productUserId,
      commentId,
      productLink,
      key: `${productLink}-${Date.now()}`
    };
    setOpenedProducts(prev => [...prev, newProduct]);
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
  };

  const openTheoryWithComment = async (theoryId, theoryUserId, commentId, theoryLink) => {
    const newTheory = {
      theoryId,
      userIdOfTheory: theoryUserId,
      commentId,
      theoryLink,
      key: `${theoryLink}-${Date.now()}`
    };
    setOpenedTheories(prev => [...prev, newTheory]);
    if (mainContainerRef.current) {
      mainContainerRef.current.style.display = 'none';
    }
  };
  
  const timeAgo = (timestamp) => {
    if (!timestamp) return t('video.timeAgo.unknown');
    
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

    if (seconds < minute) return t('video.timeAgo.secondsAgo');
    if (seconds < hour) {
      const minutes = Math.floor(seconds / minute);
      return minutes > 1 ? t('video.timeAgo.minutesAgo', { count: minutes }) : t('video.timeAgo.minuteAgo');
    }
    if (seconds < day) {
      const hours = Math.floor(seconds / hour);
      return hours > 1 ? t('video.timeAgo.hoursAgo', { count: hours }) : t('video.timeAgo.hourAgo');
    }
    if (seconds < week) {
      const days = Math.floor(seconds / day);
      return days > 1 ? t('video.timeAgo.daysAgo', { count: days }) : t('video.timeAgo.dayAgo');
    }
    if (seconds < month) {
      const weeks = Math.floor(seconds / week);
      return weeks > 1 ? t('video.timeAgo.weeksAgo', { count: weeks }) : t('video.timeAgo.weekAgo');
    }
    if (seconds < year) {
      const months = Math.floor(seconds / month);
      return months > 1 ? t('video.timeAgo.monthsAgo', { count: months }) : t('video.timeAgo.monthAgo');
    }
    const years = Math.floor(seconds / year);
    return years > 1 ? t('video.timeAgo.yearsAgo', { count: years }) : t('video.timeAgo.yearAgo');
  };

  return (
    <div className="home-ui">
      {/* QR Scanner Modal with html5-qrcode */}
      {qrScannerOpen && (
        <div className="qr-scanner-modal-fullscreen">
          <div className="qr-scanner-container-fullscreen">
            <button className="qr-scanner-close-fullscreen" onClick={closeScanner}>
              <span className="material-icons">close</span>
            </button>

            <div 
              id="qr-video-container" 
              className="qr-scanner-video-fullscreen"
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1
              }}
            ></div>
            
            {scanLoading && (
              <div className="qr-scanner-loading-fullscreen" style={{ zIndex: 10 }}>
                <Spin size="large" />
                <p>{t('home.scan.startingCamera') || 'Starting camera...'}</p>
              </div>
            )}
            
            {scanError && !scanLoading && (
              <div className="qr-scanner-error-fullscreen" style={{ zIndex: 10 }}>
                <span className="material-icons">error</span>
                <p>{scanError}</p>
                <button onClick={closeScanner}>
                  {t('home.scan.close') || 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div ref={mainContainerRef} className="main-container">
        <div ref={containerRef} className="masonry-grid-container" id="masonry-grid-container">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <img src="/logo.png" alt="logo" className="logo" />
              <label className="title-of-web-label">
                AnyVoice
              </label>
            </div>

            <div className="header-right">
              {/* Scan Icon */}
              {/* <div className="icon-wrapper" onClick={openScanDialog}>
                <span className="material-icons scan-icon">qr_code_scanner</span>
              </div> */}

              {/* Notification Icon */}
              <div className="icon-wrapper" onClick={openNotificationsDialog}>
                <span className="material-icons notification-icon">notifications</span>
                {renderBadge(unreadNotificationCount, 'notification')}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div ref={innerDivRef} className="masonry-grid-inner" id="masonry-grid-inner">
            {feedItems.map(item => (
              <div 
                key={`${item.type}-${item.id}`} 
                className="masonry-item relative"
              >

                {item.AdvertisementCheckbox && (
                  <div className="ad-badge">
                    {t('home.ad')}
                  </div>
                )}

                {item.type === 'video' && (
                  <VideoLoader
                    typeVideo={item.AdvertisementCheckbox ? "ad" : "home"}
                    videoId={item.originalId || item.id}
                    containerId={`home-video-${item.id}`}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    avatarPath={avatarPath}
                    myUsername={myUsername}
                    myDisplay={myDisplay}
                    userIdOfVideo={item.user_id}
                    fullContainerRef={fullContainerRef || mainContainerRef}
                    isAd={item.AdvertisementCheckbox}
                  />
                )}

                {item.type === 'image' && (
                  <ImageLoader
                    imageId={item.originalId || item.id}
                    containerId={`home-image-${item.id}`}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    avatarPath={avatarPath}
                    myUsername={myUsername}
                    myDisplay={myDisplay}
                    userIdOfImage={item.user_id}
                    fullContainerRef={fullContainerRef || mainContainerRef}
                    isAd={item.AdvertisementCheckbox}
                  />
                )}

                {item.type === 'article' && (
                  <ArticleItem
                    articleId={item.originalId || item.id}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    ad={item.ad}
                  />
                )}

                {item.type === 'product' && (
                  <ProductLoader
                    productId={item.originalId || item.id}
                    containerId={`home-product-${item.id}`}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    avatarPath={avatarPath}
                    myUsername={myUsername}
                    myDisplay={myDisplay}
                    userIdOfProduct={item.user_id}
                    fullContainerRef={fullContainerRef || mainContainerRef}
                    isAd={item.AdvertisementCheckbox}
                  />
                )}

                {item.type === 'theory' && (
                  <TheoryLoader
                    theoryId={item.originalId || item.id}
                    containerId={`home-theory-${item.id}`}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    avatarPath={avatarPath}
                    myUsername={myUsername}
                    myDisplay={myDisplay}
                    userIdOfTheory={item.user_id}
                    fullContainerRef={fullContainerRef || mainContainerRef}
                    isAd={item.AdvertisementCheckbox}
                  />
                )}

                {item.type === 'shoping' && (
                  <ShopingLoader
                    shopingId={item.originalId || item.id}
                    containerId={`home-shoping-${item.id}`}
                    backendUrl={backendUrl}
                    userId={userIdFromMe}
                    avatarPath={avatarPath}
                    myUsername={myUsername}
                    myDisplay={myDisplay}
                    userIdOfShoping={item.user_id}
                    fullContainerRef={fullContainerRef || mainContainerRef}
                    isAd={item.AdvertisementCheckbox}
                  />
                )}

              </div>
            ))}

            {placeholders.map(p => (
              <div key={p.id} className="masonry-item image-placeholder">
                <div className="image-thumbnail-placeholder"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scan Dialog */}
      <div ref={mainContainerScanRef} style={{ display: 'none' }}>
        <div className="scan-header">
          <button className="back-btn" onClick={() => {
            setScanModalOpen(false);
            backFromDialog();
          }}>
            <span className="material-icons">arrow_back</span>
          </button>
          <h2>{t('home.scan.title')}</h2>
        </div>

        <div className="scan-content">
          <div className="scan-options">
            {/* Option 1: Upload QR Code */}
            <div className="scan-option" onClick={() => document.getElementById('qr-file-input').click()}>
              <span className="material-icons upload-icon">upload_file</span>
              <h3>{t('home.scan.uploadQR')}</h3>
              <p>{t('home.scan.uploadDescription')}</p>
              <input
                id="qr-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            
            {/* Option 2: Scan with Camera */}
            <div className="scan-option" onClick={() => startCameraScan()}>
              <span className="material-icons camera-icon">camera_alt</span>
              <h3>{t('home.scan.scanQR')}</h3>
              <p>{t('home.scan.scanDescription')}</p>
            </div>
          </div>
          
          {/* Scan Result */}
          {(scanLoading || scanResult || scanError) && (
            <div className="scan-result-container">
              {scanLoading && (
                <div className="scan-loading">
                  <Spin size="large" />
                  <p>{t('home.scan.processing')}</p>
                </div>
              )}
              
              {scanError && !scanLoading && (
                <div className="scan-error">
                  <span className="material-icons error-icon">error</span>
                  <p>{scanError}</p>
                </div>
              )}

              {scanSuccess && !scanLoading && scanResult && (
                <div className="scan-success">
                  <span className="material-icons success-icon">check_circle</span>
                  <h3>{t('home.scan.success')}</h3>

                  {scannedPurchase && (
                    <div className="purchase-details">
                      <p><strong>{t('home.scan.productName')}:</strong> {scannedPurchase.product_name}</p>
                      <p><strong>{t('home.scan.physicalName')}:</strong> {scannedPurchase.physical_product_name}</p>
                      <p><strong>{t('home.scan.purchaseDate')}:</strong> {new Date(scannedPurchase.purchase_date).toLocaleString()}</p>
                      <p><strong>{t('home.scan.buyer')}:</strong> @{scannedPurchase.buyer_username}</p>

                      {scanResult.commission !== undefined && scanResult.seller_amount !== undefined && (
                        <div className="commission-details">
                          <p><strong>{t('home.scan.commissionReceived')}:</strong> {scanResult.commission.toFixed(2)} {t('home.scan.somoni')}</p>
                          <p><strong>{t('home.scan.sellerAmount')}:</strong> {scanResult.seller_amount.toFixed(2)} {t('home.scan.somoni')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Notifications Dialog */}
      <div ref={mainContainerNotificationRef} style={{ display: 'none' }}>
        <div className="notification-header">
          <button className="back-btn" onClick={backFromDialog}>
            <span className="material-icons">arrow_back</span>
          </button>
          <h2>{t('home.notifications')}</h2>
          <button 
            className="refresh-btn" 
            onClick={() => loadNotifications(false)}
          >
            <span className="material-icons">replay</span>
          </button>
        </div>
        
        <div ref={notificationContainerRef} className="notification-container">
          {loadingNotifications ? (
            <div className="notifications-loading">
              <Spin size="large" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(notification => (
              <div key={notification._id} className="notification-card">
                <div className="notification-content">
                  <div className="notification-message">
                    {convertTextToHtmlLinks(notification.Message, navigate, t)}
                  </div>
                </div>

                {(notification.DecryptedType === 'new_comment' || notification.DecryptedType === 'new_replay') && (
                  <div className="notification-actions">
                    <button 
                      className="view-comment-btn"
                      onClick={() => handleViewComment(notification)}
                    >
                      {t('home.viewComment')}
                    </button>
                  </div>
                )}
                
                {notification.DecryptedType === 'collaboration' && (
                  <div className="notification-actions">
                    <button className="accept-btn" onClick={() => acceptNotification(backendUrl, notification._id, t)}>
                      {t('home.accept')}
                    </button>
                    <button className="reject-btn" onClick={() => rejectNotification(backendUrl, notification._id, t)}>
                      {t('home.reject')}
                    </button>
                  </div>
                )}

                <div className="notification-time">
                  <span className="material-icons time-icon">schedule</span>
                  {timeAgo(notification.UploadAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="no-notifications">
              {t('home.noNotifications')}
            </div>
          )}
            
          {!loadingNotifications && notifications.length >= limitForNotification && (
            <button
              className="load-more-btn"
              onClick={() => loadNotifications(true)}
              disabled={loadingNotifications}
            >
              {loadingNotifications ? t('home.loading') : t('home.loadMore')}
            </button>
          )}
        </div>
      </div>

      {/* Opened Theories */}
      {openedTheories.map(theory => (
        <div key={theory.key} className="theory-modal-overlay" style={{ display: 'none' }}>
          <TheoryLoader
            key={theory.key}
            theoryId={theory.theoryId}
            containerId={`${theory.theoryLink}`}
            backendUrl={backendUrl}
            userId={userIdFromMe}
            avatarPath={avatarPath}
            myUsername={myUsername}
            myDisplay={myDisplay}
            userIdOfTheory={theory.userIdOfTheory}
            commentId={theory.commentId}
            fullContainerRef={fullContainerRef || mainContainerRef}
          />
        </div>
      ))}

      {/* Opened Products */}
      {openedProducts.map(product => (
        <div key={product.key} className="product-modal-overlay" style={{ display: 'none' }}>
          <ProductLoader
            key={product.key}
            productId={product.productId}
            containerId={`${product.productLink}`}
            backendUrl={backendUrl}
            userId={userIdFromMe}
            avatarPath={avatarPath}
            myUsername={myUsername}
            myDisplay={myDisplay}
            userIdOfProduct={product.userIdOfProduct}
            commentId={product.commentId}
            fullContainerRef={fullContainerRef || mainContainerRef}
          />
        </div>
      ))}

      {/* Opened Videos */}
      {openedVideos.map(video => (
        <div key={video.key} className="video-modal-overlay" style={{ display: 'none' }}>
          <VideoLoader
            key={video.key}
            videoId={video.videoId}
            containerId={`${video.videoLink}`}
            backendUrl={backendUrl}
            userId={userIdFromMe}
            avatarPath={avatarPath}
            myUsername={myUsername}
            myDisplay={myDisplay}
            userIdOfVideo={video.userIdOfVideo}
            commentId={video.commentId}
            fullContainerRef={fullContainerRef || mainContainerRef}
          />
        </div>
      ))}

      {/* Opened Images */}
      {openedImages.map(image => (
        <div key={image.key} className="image-modal-overlay" style={{ display: 'none' }}>
          <ImageLoader
            key={image.key}
            imageId={image.imageId}
            containerId={`${image.ImageLink}`}
            backendUrl={backendUrl}
            userId={userIdFromMe}
            avatarPath={avatarPath}
            myUsername={myUsername}
            myDisplay={myDisplay}
            userIdOfImage={image.userIdOfImage}
            commentId={image.commentId}
            fullContainerRef={fullContainerRef || mainContainerRef}
          />
        </div>
      ))}

      {/* Opened Articles */}
      {openedArticles.map(article => (
        <div key={article.key}>
          <ArticleItem 
            articleId={article.articleId} 
            backendUrl={backendUrl} 
            userId={userIdFromMe}
            commentId={article.commentId}
            hidePreview={true}
          />
        </div>
      ))}
    </div>
  );
};

const normalizeNotificationText = (text) => {
  let updatedText = text;

  const replacements = [
    { target: "added a new post. View post:", key: "home.TabOfNotifications.newPostText" },
    { target: "invited you to a new collaboration. View post:", key: "home.TabOfNotifications.collabrationPost" },
    { target: "followed you", key: "home.TabOfNotifications.followedYou" },
    { target: "Successfully sent", key: "home.TabOfNotifications.successfullySent" },
    { target: "Successfully received", key: "home.TabOfNotifications.successfullyReceived" },
    { target: "wants to collaborate their product in shop", key: "home.TabOfNotifications.wantsToCollaborate" },
    { target: "View product:", key: "home.TabOfNotifications.viewProduct" },
    { target: "created a new shop. View shop:", key: "home.TabOfNotifications.createdShop" },
    { target: "added a new theory. View theory:", key: "home.TabOfNotifications.newTheory" },
    { target: "added a new article. View article:", key: "home.TabOfNotifications.newArticle" },
    { target: "started a new collaboration. View post:", key: "home.TabOfNotifications.startedCollaboration" },
    { target: "accepted your collaboration request.", key: "home.TabOfNotifications.acceptedRequest" },
    { target: "View post:", key: "home.TabOfNotifications.viewPost" },
    { target: "added a new product in shop", key: "home.TabOfNotifications.newProductInShop" },
    { target: "added your product in shop", key: "home.TabOfNotifications.addedYourProduct" },
    { target: "rejected your collaboration request.", key: "home.TabOfNotifications.rejectedRequest" },
    { target: "Your advertisement", key: "home.TabOfNotifications.yourAd" },
    { target: "has been displayed the requested number of times. Thank you for advertising🥰", key: "home.TabOfNotifications.adCompleted" },
    { target: "Your product was purchased by", key: "home.TabOfNotifications.productPurchasedBy" },
    { target: "Product in shop", key: "home.TabOfNotifications.productInShop" },
    { target: "was purchased by", key: "home.TabOfNotifications.wasPurchasedBy" },
    { target: "updated the address:", key: "home.TabOfNotifications.updatedAddress" },
    { target: "Product:", key: "home.TabOfNotifications.productLabel" },
    { target: "rejected your request to add your product in shop", key: "home.TabOfNotifications.rejectedProductShopRequest" },
  ];

  replacements.forEach(({ target, key }) => {
    if (updatedText.includes(target)) {
      updatedText = updatedText.replace(target, i18n.t(key));
    }
  });

  return updatedText;
};

// Helper function to convert text to HTML links
const convertTextToHtmlLinks = (text, navigate, t) => {
  if (!text) return '';

  const normalizedText = normalizeNotificationText(text);

  const linkRegex = /(https?:\/\/[^\s]+)|(@[^\s$]+)|(\$[^\s$]+)/g;
  
  return normalizedText.split('\n').map((line, lineIndex) => {
    let processedLine = line;

    if (line.startsWith('Time:')) {
      const timePart = line.replace('Time:', '').trim();
      const dateObj = new Date(timePart);
      const formattedTime = dateObj.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      processedLine = `Time: ${formattedTime}`;
    }

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
            if (/^https:\/\/(www\.)?sanjar\./.test(word)) {
              const relativePath = word.replace(/^https:\/\/(www\.)?sanjar\.[^/]+/, '');

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

// Helper functions for notifications
const acceptNotification = async (backendUrl, notificationId, t) => {
  try {
    await axios.post(`${backendUrl}/notifications/${notificationId}/accept`);
  } catch (error) {
    console.error('Error accepting notification:', error);
  }
};

const rejectNotification = async (backendUrl, notificationId, t) => {
  try {
    await axios.post(`${backendUrl}/notifications/${notificationId}/reject`);
  } catch (error) {
    console.error('Error rejecting notification:', error);
  }
};

export default HomeUI;