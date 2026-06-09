import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ProductUploader.css';

const ProductUploader = ({ backendUrl, userId, productId = null, link = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { link: urlLink } = useParams();
  const actualLink = link || urlLink;

  const fileInputRef = useRef(null);
  const productFileInputRef = useRef(null);
  
  // State ҳо барои маҳсулот
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [productName, setProductName] = useState('');
  const [productData, setProductData] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productType, setProductType] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [personalProductSales, setPersonalProductSales] = useState(false);
  
  const [advertisementEnabled, setAdvertisementEnabled] = useState(false);
  const [advertisementCount, setAdvertisementCount] = useState(0);
  const [originalAdvertisementCount, setOriginalAdvertisementCount] = useState(0);
  
  const [selectedShopings, setSelectedShopings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State барои файли маҳсулот
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState(null);
  const [fileType, setFileType] = useState('');
  const [originalProduct, setOriginalProduct] = useState(null);
  
  // State барои аккаунт (барои навъи 'account')
  const [showAccountVerification, setShowAccountVerification] = useState(false);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountUserId, setAccountUserId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [accountErrors, setAccountErrors] = useState({
    username: '',
    password: '',
    email: ''
  });
  
  // State барои постҳои кӯҳна
  const [oldImages, setOldImages] = useState([]);
  const [productLink, setProductLink] = useState('');
  const [postId, setPostId] = useState(productId);
  const [uploadId, setUploadId] = useState('');
  const [websocket, setWebsocket] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  

  // State барои маълумоти пост
  const [postInfo, setPostInfo] = useState(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [ifHasNote, setIfHasNote] = useState(false);
  const [deletedImageIds, setDeletedImageIds] = useState([]); // Барои нигоҳ доштани ID-и расмҳои ҳазфшуда
  const [oldImagesId, setOldImagesId] = useState([]);

  // Дар қисми state ҳо
  const [physicalProductName, setPhysicalProductName] = useState(''); // Барои маҳсулоти физикӣ
  const [originalPhysicalProductName, setOriginalPhysicalProductName] = useState(''); // Барои нигоҳ доштани номи аслӣ

  const [physicalDeliveryMethod, setPhysicalDeliveryMethod] = useState('pickup'); // 'pickup' ё 'courier'
  const [physicalPickupAddress, setPhysicalPickupAddress] = useState('');
  const [physicalCourierAvailable, setPhysicalCourierAvailable] = useState(false);

  // Хатогиҳо
  const addError = (message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type: 'error' }]);

    // Барои тоза кардани автоматии хатогӣ пас аз 3 сония
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Эффект барои боркунии маълумоти пост агар productId ё link дода шуда бошад
  useEffect(() => {
    if (productId) {
      loadProductData(productId);
    } else if (actualLink) {
      checkLinkAndLoadPost(actualLink);
    }
  }, [productId, actualLink]);

  // Эффект барои тоза кардани WebSocket
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  // Санҷиши link ва боркунии пост
  const checkLinkAndLoadPost = async (link) => {
    setIsLoading(true);
    try {
      // Аввал link-ро санҷед
      const checkResponse = await fetch(`${backendUrl}/check-link-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, user_id: userId })
      });

      if (!checkResponse.ok) {
        if (checkResponse.status === 403) {
          addError(t('productUploader.errors.accessDenied'));
        } else if (checkResponse.status === 404) {
          addError(t('productUploader.errors.invalidLink'));
        } else {
          addError(t('productUploader.errors.linkCheckError'));
        }
        setIsLoading(false);
        return;
      }

      const linkInfo = await checkResponse.json();
      
      // Санҷидани он ки оё корбари ҷорӣ соҳиби пост аст
      setIsPostOwner(linkInfo.user_id === userId);
      
      // Боркунии маълумоти пурраи пост
      await loadProductData(linkInfo.product_id);
      
    } catch (err) {
      addError(t('productUploader.errors.connectionError'));
      console.error('Error checking link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductData = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/post-product/${id}`);
      if (!response.ok) throw new Error(t('productUploader.errors.postLoadError'));
      
      const data = await response.json();
      
      const productLinkServer = data.link;
      setProductLink(productLinkServer.split('/product/').pop());
      setProductName(data.title);
      setProductData(data.data_of_product);
      setProductPrice(data.price_product);
      setProductType(data.product_type);
      // Барои маҳсулоти физикӣ
      if (data.product_type === 'physical') {
        setPhysicalProductName(data.physical_product_name || '');
        setPhysicalDeliveryMethod(data.physical_delivery_method || 'pickup');
        setPhysicalPickupAddress(data.physical_pickup_address || '');
        setPhysicalCourierAvailable(data.physical_courier_available || false);
      }
      setAllowComments(data.allow_comments);
      setPersonalProductSales(data.personal_product_sales || false);
      setOldImagesId(data.images_id || []);
      setAdvertisementEnabled(data.advertisement_checkbox || false);
      setAdvertisementCount(data.advertisement_count || 0);
      setOriginalAdvertisementCount(data.advertisement_count || 0);
      
      setAccountUserId(data.user_id_for_sell || null);
      
      // Агар аккаунт бошад, номи корбарро низ нигоҳ доред
      if (data.user_id_for_sell) {
        // Агар дар посух маълумоти иловагӣ барои аккаунт бошад
        // Масалан, агар сервер номи корбарро низ баргардонад
        if (data.username_for_sell) {
          setAccountUsername(data.username_for_sell);
        }
      }
      
      // Боркунии расмҳо
      const imageUrls = data.images || [];
      setOldImages(imageUrls);
      
      const imageMetadata = imageUrls.map((img, index) => ({
        id: `old-${index}`,
        url: img,
        isLoaded: false,
        isOld: true
      }));
      setImages(imageMetadata);
      
      // Боркурии файли маҳсулот
      if (data.filename) {
        setFileName(data.filename);
        setOriginalProduct(data.filename);
        setProductType(data.product_type);
        
        // Агар навъи маҳсулот 'account' бошад
        if (data.product_type === 'account') {
          setAccountUserId(data.user_id_for_sell);
          // Агар filename худи номи корбар бошад
          setAccountUsername(data.filename);
        }
      }
      
      setPostId(id);
      
      if (data.collaboration_shopings?.length > 0) {
        fetchShopingsByIds(data.collaboration_shopings);
      }
      
      // Боркурии расми аввал
      if (imageMetadata.length > 0) {
        loadImageAtIndex(0, imageMetadata);
      }

    } catch (err) {
      addError(t('productUploader.errors.connectionError'));
      console.error('Error loading product:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Боркурии расм аз рӯи индекс
  const loadImageAtIndex = async (index, imagesList = images) => {
    if (!imagesList[index] || imagesList[index].isLoaded) return;
    
    try {
      const imageUrl = imagesList[index].url;
      
      if (imageUrl.startsWith('data:')) {
        const updatedImages = [...imagesList];
        updatedImages[index] = {
          ...updatedImages[index],
          isLoaded: true
        };
        
        // Андозаи расмро муайян кунем ва нигоҳ дорем
        const img = new Image();
        img.onload = () => {
          updatedImages[index] = {
            ...updatedImages[index],
            originalWidth: img.width,
            originalHeight: img.height
          };
          setImages(updatedImages);
        };
        img.src = imageUrl;
      } else {
        // Боркурии расм аз сервер
        const response = await fetch(`${backendUrl}/get-product-image/${postId}?index=${index}`);
        if (!response.ok) throw new Error(t('productUploader.errors.imageLoadError'));
        
        const data = await response.json();
        const imageBase64 = `data:image/jpeg;base64,${data.image}`;
        
        // Андозаи расмро муайян кунем ва нигоҳ дорем
        const img = new Image();
        img.onload = () => {
          const updatedImages = [...imagesList];
          updatedImages[index] = {
            ...updatedImages[index],
            url: imageBase64,
            originalWidth: img.width,
            originalHeight: img.height,
            isLoaded: true
          };
          setImages(updatedImages);
        };
        img.src = imageBase64;
      }
    } catch (err) {
      console.error('Error loading image:', err);
    }
  };

  useEffect(() => {
    if (images.length > 0 && currentImageIndex < images.length) {
      loadImageAtIndex(currentImageIndex);
    }
  }, [currentImageIndex, images.length]);

  const fetchShopingsByIds = async (ids) => {
    try {
      const response = await fetch(`${backendUrl}/shoping/by_ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!response.ok) throw new Error(t('productUploader.errors.storeLoadError'));
      const shopings = await response.json();
      setSelectedShopings(shopings);
    } catch (err) {
      console.error('Error fetching shopings:', err);
    }
  };

  // Функсияи боркунии расм
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      addError(t('productUploader.errors.maxFileSize', { size: MAX_SIZE_MB }));
      e.target.value = null;
      return;
    }

    if (images.length >= 10) {
      addError(t('productUploader.errors.maxImages'));
      e.target.value = null;
      return;
    }

    setIsProcessingFile(true);
    setProcessingProgress(0);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProcessingProgress(percent);
      }
    };

    reader.onloadend = () => {
      // ТАНҲО барои муайян кардани андозаи расм барои нигоҳ доштан
      const img = new Image();
      img.onload = () => {
        const newImageId = `new-${Date.now()}-${Math.random()}`;
        const newImage = {
          id: newImageId,
          file: file,
          url: reader.result,
          originalWidth: img.width,
          originalHeight: img.height,
          isLoaded: true,
          isNew: true
        };

        setImages(prev => [...prev, newImage]);
        setCurrentImageIndex(images.length);
        
        setIsProcessingFile(false);
        setProcessingProgress(0);
      };
      
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // Функсияи боркурии файли маҳсулот
  const handleProductFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileContent(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(file);
    
    setFileType(file.type || 'application/octet-stream');
    setOriginalProduct(file.name);
    
    // Пинҳон кардани инпут баъди боркунӣ
    e.target.value = null;
  };

  const removeUploadedFile = (isAccount = false) => {
    setUploadedFile(null);
    setFileName('');
    setFileContent(null);
    setOriginalProduct(null);
    
    if (!isAccount) {
      setProductType('');
    }
    
    if (isAccount) {
      setAccountUserId(null);
    }
  };

  const slideLeft = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const slideRight = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const deleteCurrentImage = () => {
    const deletedImage = images[currentImageIndex];

    // Агар расм кӯҳна бошад (аз сервер), ID-и онро ба deletedImageIds илова кунем
    if (!deletedImage.isNew && deletedImage.id) {
      // Барои расмҳои кӯҳна, ID-и аслии онро аз oldImagesId мегирем
      const imageIdToDelete = oldImagesId[currentImageIndex];
      if (imageIdToDelete) {
        setDeletedImageIds(prev => [...prev, imageIdToDelete]);
      }
    }

    // Агар расм кӯҳна бошад ва мо онро ҳазф мекунем, 
    // онро аз oldImages ва oldImagesId низ бояд нест кунем
    if (!deletedImage.isNew) {
      // Индексро барои ҳазф аз oldImagesId ва oldImages истифода мебарем
      setOldImages(prev => prev.filter((_, index) => index !== currentImageIndex));
      setOldImagesId(prev => prev.filter((_, index) => index !== currentImageIndex));
    }

    setImages(prev => prev.filter((_, index) => index !== currentImageIndex));
    setCurrentImageIndex(prev => Math.max(0, Math.min(prev, images.length - 2)));
  };

  const getAllDeletedImageIds = () => {
    // ID-ҳои расмҳое, ки дар images нестанд, вале дар oldImagesId ҳастанд
    const deletedIds = [];

    oldImagesId.forEach((id, index) => {
      // Агар дар images расми кӯҳна бо ин мавқеъ вуҷуд надошта бошад
      const imageExists = images.some(img => 
        img.isOld && img.id === `old-${index}`
      );

      if (!imageExists && id) {
        deletedIds.push(id);
      }
    });

    return deletedIds;
  };

  const handleProductTypeChange = (e) => {
    const selectedType = e.target.value;
    const previousType = productType;
    
    setProductType(selectedType);

    // Танзими ёддошт барои навъҳои махсус
    if (selectedType === 'software' || selectedType === 'program') {
      setIfHasNote(true);
    } else {
      setIfHasNote(false);
    }
    
    // Агар навъи маҳсулот тағйир ёбад, файли қаблиро тоза кунем
    if (previousType && previousType !== selectedType) {
      clearProductFile();
    }
    
    // Барои навъи 'account' - танҳо омодагӣ барои версификатсия
    if (selectedType === 'account') {
      setPersonalProductSales(false);
      setAccountUserId(null);
    } else if (selectedType === 'physical') {
      // Барои маҳсулоти физикӣ
      setPhysicalProductName(originalPhysicalProductName || '');
    } else {
      setShowAccountVerification(false);
      setAccountUserId(null);
    }
  };

  // Функсия барои тоза кардани файл ҳангоми тағйири навъ
  const clearProductFile = () => {
    setUploadedFile(null);
    setFileName('');
    setFileContent(null);
    setOriginalProduct(null);
    
    // Агар дар инпут файл интихоб шуда бошад, онро тоза кунем
    if (productFileInputRef.current) {
      productFileInputRef.current.value = '';
    }
    
    // Барои маҳсулоти физикӣ
    setPhysicalProductName('');
    
    // Агар навъи 'account' бошад, маълумоти аккаунтро низ тоза кунем
    if (productType === 'account') {
      setAccountUserId(null);
      setAccountUsername('');
      setAccountPassword('');
      setAccountEmail('');
      setShowAccountVerification(false);
      setAccountErrors({ username: '', password: '', email: '' });
    }
  };

  const handleAdvertisementToggle = (e) => {
    setAdvertisementEnabled(e.target.checked);
    if (!e.target.checked) {
      setAdvertisementCount(0);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `${backendUrl}/search-shoping?search=${encodeURIComponent(searchTerm)}`,
        { timeout: 30000 }
      );
      
      if (!response.ok) {
        if (response.status === 400) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }
        throw new Error(t('productUploader.errors.searchError'));
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.message) {
        setSearchResults([]);
      }
      
    } catch (err) {
      addError(t('productUploader.errors.connectionError'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleShopingSelection = (shoping) => {
    const existingIndex = selectedShopings.findIndex(s => s.id === shoping.id);
    
    if (existingIndex >= 0) {
      setSelectedShopings(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      if (selectedShopings.length >= 10) {
        addError(t('productUploader.errors.maxImages'));
        return;
      }
      setSelectedShopings(prev => [...prev, shoping]);
    }
  };

  // Функсия барои аккаунт
  const handleAccountVerification = async () => {
    const username = accountUsername.trim();
    const password = accountPassword.trim();
    const email = accountEmail.trim();

    setAccountErrors({ username: '', password: '', email: '' });

    if (!username) {
      setAccountErrors(prev => ({ ...prev, username: t('productUploader.account.errors.usernameRequired') }));
      return;
    }

    if (!password) {
      setAccountErrors(prev => ({ ...prev, password: t('productUploader.account.errors.passwordRequired') }));
      return;
    }

    if (!email) {
      setAccountErrors(prev => ({ ...prev, email: t('productUploader.account.errors.emailRequired') }));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/account-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });

      const data = await response.json();

      if (response.status === 401) {
        setAccountErrors(prev => ({ ...prev, username: t('productUploader.account.errors.invalidUsername') }));
      } else if (response.status === 402) {
        setAccountErrors(prev => ({ ...prev, password: t('productUploader.account.errors.invalidPassword') }));
      } else if (response.status === 403) {
        setAccountErrors(prev => ({ ...prev, email: t('productUploader.account.errors.noEmail') }));
      } else if (response.status === 404) {
        setAccountErrors(prev => ({ ...prev, email: t('productUploader.account.errors.invalidEmail') }));
      } else if (response.status === 200) {
        // Танҳо дар ин ҷо диалогро кушоед, пас аз он ки код ба email фиристода шуд
        setShowAccountVerification(true);
        setVerificationCode('');
        // Код ба email фиристода шуд
      }

    } catch (err) {
      addError(t('productUploader.errors.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Функсияи пайвастшавӣ ба WebSocket
  const connectWebSocket = async (uploadId) => {
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const wsUrl = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/upload-progress-for-product/${uploadId}`;
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(t('productUploader.errors.webSocketError')));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        setWebsocket(ws);
        resolve();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    ws.onmessage = (event) => {
      if (event.data === 'ping') return;
      
      const progress = parseFloat(event.data);
      setUploadProgress(progress);
      
      if (progress >= 100) {
        setTimeout(() => ws.close(), 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const isValidPrice = (price) => {
    if (!price) return false;
    const priceStr = String(price);
    try {
      const val = parseFloat(priceStr);
      if (isNaN(val)) return false;
      if (priceStr.includes('.')) {
        const decimals = priceStr.split('.')[1];
        if (decimals.length > 2) return false;
      }
      return val > 0;
    } catch {
      return false;
    }
  };

  // Функсияи сохтани маҳсулот
  const handleCreateProduct = async () => {
    // Валидация
    if (images.length < 3) {
      addError(t('productUploader.errors.minImages'));
      return;
    }

    if (!productName.trim()) {
      addError(t('productUploader.errors.titleRequired'));
      return;
    }

    if (!productData.trim()) {
      addError(t('productUploader.errors.descriptionRequired'));
      return;
    }

    if (!productPrice) {
      addError(t('productUploader.errors.priceRequired'));
      return;
    }

    if (!isValidPrice(productPrice)) {
      addError(t('productUploader.errors.invalidPrice'));
      return;
    }

    if (!productType) {
      addError(t('productUploader.errors.typeRequired'));
      return;
    }

    if (productType === 'physical' && !physicalProductName.trim()) {
      addError(t('productUploader.errors.physicalProductNameRequired'));
      return;
    }

    if (productType !== 'physical' && !originalProduct && !accountUserId) {
      addError(t('productUploader.errors.fileRequired'));
      return;
    }

    if (selectedShopings.length === 0) {
      addError(t('productUploader.errors.storeRequired'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    // Пайвастшавӣ ба WebSocket
    try {
      await connectWebSocket(uploadIdGenerated);
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }

    const formData = new FormData();
    
    // Маълумоти асосӣ
    formData.append('user_id', userId);
    formData.append('title', productName);
    formData.append('data_of_product', productData);
    formData.append('price_product', productPrice);
    formData.append('allow_comments', allowComments);
    formData.append('advertisement_checkbox', advertisementEnabled);
    formData.append('advertisement_count', advertisementEnabled ? advertisementCount : '0');
    formData.append('personal_product_sales', personalProductSales);
    formData.append('upload_id', uploadIdGenerated);
    formData.append('product_type', productType);

    // Барои маҳсулоти физикӣ
    if (productType === 'physical') {
      formData.append('physical_product_name', physicalProductName);
      formData.append('physical_delivery_method', physicalDeliveryMethod);
      
      if (physicalDeliveryMethod === 'pickup') {
        if (!physicalPickupAddress.trim()) {
          addError(t('productUploader.errors.pickupAddressRequired'));
          return;
        }
        formData.append('physical_pickup_address', physicalPickupAddress);
        formData.append('physical_courier_available', 'false');
      } else if (physicalDeliveryMethod === 'courier') {
        formData.append('physical_courier_available', physicalCourierAvailable);
        formData.append('physical_pickup_address', '');
      }
    }

    // Илова кардани расмҳо
    const imagesToUpload = images.filter(img => img.isNew && img.file);
    imagesToUpload.forEach(img => {
      if (img.file) {
        formData.append('images', img.file);
      }
    });
    
    // Расмҳои кӯҳна (барои навсозӣ)
    if (oldImages.length > 0) {
      formData.append('old_images', JSON.stringify(oldImages));
    }
    
    // Мағозаҳои интихобшуда
    selectedShopings.forEach(shoping => {
      if (shoping?.id) {
        formData.append('collaboration_shopings', shoping.id);
      }
    });
    
    // Файли маҳсулот
    if (fileContent && fileName) {
      const blob = new Blob([fileContent], { type: fileType });
      formData.append('file', blob, fileName);
    }
    
    // ID-и корбар барои фурӯши аккаунт
    if (accountUserId) {
      formData.append('user_id_for_sell', accountUserId);
    }

    try {
      const response = await fetch(`${backendUrl}/create-product`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.status === 200) {
        setUploadProgress(100);
        navigate(`/product/${data.post_link}`);
      } else if (response.status === 408) {
        addError(t('productUploader.errors.insufficientFunds'));
      } else {
        addError(data.detail || t('productUploader.errors.uploadFailed'));
      }

    } catch (err) {
      console.error('Upload error:', err);
      addError(t('productUploader.errors.connectionError'));
      if (websocket) websocket.close();
    } finally {
      setIsUploading(false);
    }
  };

  // Функсияи навсозии маҳсулот
  const handleUpdateProduct = async () => {
    // Валидация
    if (images.length < 3) {
      addError(t('productUploader.errors.minImages'));
      return;
    }

    if (!productName.trim()) {
      addError(t('productUploader.errors.titleRequired'));
      return;
    }

    if (!productData.trim()) {
      addError(t('productUploader.errors.descriptionRequired'));
      return;
    }

    if (!productPrice) {
      addError(t('productUploader.errors.priceRequired'));
      return;
    }

    if (!isValidPrice(productPrice)) {
      addError(t('productUploader.errors.invalidPrice'));
      return;
    }

    if (!productType) {
      addError(t('productUploader.errors.typeRequired'));
      return;
    }

    if (productType === 'physical' && !physicalProductName.trim()) {
      addError(t('productUploader.errors.physicalProductNameRequired'));
      return;
    }

    if (productType !== 'physical' && !originalProduct && !accountUserId) {
      addError(t('productUploader.errors.fileRequired'));
      return;
    }

    if (selectedShopings.length === 0) {
      addError(t('productUploader.errors.storeRequired'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadIdGenerated = Math.random().toString(36).substring(2, 12);
    setUploadId(uploadIdGenerated);

    // Пайвастшавӣ ба WebSocket барои прогресс
    const wsScheme = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const wsUrl = `${wsScheme}${backendUrl.replace('https://', '').replace('http://', '')}/ws/upload-progress-for-product/${uploadIdGenerated}`;
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(t('productUploader.errors.webSocketError')));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        setWebsocket(ws);
        resolve();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    ws.onmessage = (event) => {
      if (event.data === 'ping') return;
      
      const progress = parseFloat(event.data);
      setUploadProgress(progress);
      
      if (progress >= 100) {
        setTimeout(() => ws.close(), 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    const formData = new FormData();
    
    formData.append('product_id', postId);
    formData.append('user_id', userId);
    formData.append('title', productName);
    formData.append('data_of_product', productData);
    formData.append('price_product', productPrice);
    formData.append('allow_comments', allowComments);
    formData.append('upload_id', uploadIdGenerated);
    
    // Барои таблиғ
    if (advertisementEnabled) {
      formData.append("advertisement_checkbox", "true");
      formData.append("advertisement_count", advertisementCount);
    } else {
      formData.append("advertisement_checkbox", "false");
      formData.append("advertisement_count", "0");
    }

    formData.append('personal_product_sales', personalProductSales);

    formData.append('product_type', productType);

    // Барои маҳсулоти физикӣ
    if (productType === 'physical') {
      formData.append('physical_product_name', physicalProductName);
      formData.append('physical_delivery_method', physicalDeliveryMethod);
      
      if (physicalDeliveryMethod === 'pickup') {
        if (!physicalPickupAddress.trim()) {
          addError(t('productUploader.errors.pickupAddressRequired'));
          return;
        }
        formData.append('physical_pickup_address', physicalPickupAddress);
        formData.append('physical_courier_available', 'false');
      } else if (physicalDeliveryMethod === 'courier') {
        formData.append('physical_courier_available', physicalCourierAvailable);
        formData.append('physical_pickup_address', '');
      }
    }

    // Гирифтани ҳамаи ID-ҳои расмҳои ҳазфшуда
    const allDeletedIds = [...deletedImageIds, ...getAllDeletedImageIds()];

    if (allDeletedIds.length > 0) {
      formData.append("deleted_images", JSON.stringify(allDeletedIds));
    }
    
    // ================ Илова кардани collaboration_shopings ================
    selectedShopings.forEach(shoping => {
      if (shoping?.id) {
        formData.append('collaboration_shopings', shoping.id);
      }
    });
    
    // ================ Файли маҳсулот ================
    if (fileContent && fileName && uploadedFile) {
      const blob = new Blob([fileContent], { type: fileType });
      formData.append('file', blob, fileName);
    }
    
    // ================ Барои аккаунт ================
    if (accountUserId) {
      formData.append('user_id_for_sell', accountUserId);
    }
    
    // ================ Расмҳои нав ================
    const imagesToUpload = images.filter(img => img.isNew && img.file);
    
    for (const img of imagesToUpload) {
      if (img.file) {
        formData.append('images', img.file);
      }
    }
    
    // ================ Фиристодани дархост ================
    try {
      const response = await fetch(`${backendUrl}/update-product`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 408) {
          addError(t('productUploader.errors.insufficientFunds'));
        } else {
          addError(errorData.detail || t('productUploader.errors.updateFailed'));
        }
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      setUploadProgress(100);
      navigate(`/product/${productLink}`);

    } catch (err) {
      console.error('Update error:', err);
      addError(err.message || t('productUploader.errors.connectionError'));
      if (ws) ws.close();
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/verify-email-for-account-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          code: verificationCode,
          username: accountUsername
        })
      });

      if (response.status === 200) {
        const data = await response.json();
        setAccountUserId(data.user_id);
        setShowAccountVerification(false);
        
        // Илова кардани файл - нигоҳ доштани номи корбар
        setFileName(accountUsername);
        setOriginalProduct(accountUsername);
        
        // Ин сатр муҳим аст: нигоҳ доштани номи корбар барои намоиш
        setAccountUsername(accountUsername); // Аллакай дорад, аммо боварӣ ҳосил кунем
        
      } else if (response.status === 400) {
        addError(t('productUploader.account.errors.noRequest'));
      } else if (response.status === 401) {
        addError(t('productUploader.account.errors.codeExpired'));
      } else if (response.status === 402) {
        addError(t('productUploader.account.errors.userNotFound'));
      }

    } catch (err) {
      addError(t('productUploader.errors.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Рендери компонент
  return (
    <div className="product-uploader-container">
      {/* Loading overlay */}
      {isLoading && (
        <div className="product-uploader-loading-overlay">
          <div className="product-uploader-loading-spinner" />
        </div>
      )}

      {/* Back button */}
      <button
        className="product-uploader-back-button"
        onClick={() => navigate(productId || actualLink ? `/product/${productLink || actualLink}` : `/create`)}
      >
        ←
      </button>

      <div className="notifications-error-container">
        {notifications.map(notification => (
          <div key={notification.id} className="notification-error error">
            {notification.message}
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>×</button>
          </div>
        ))}
      </div>

      <div className="product-uploader-main-card">
        <div className="product-uploader-content-wrapper">
          {/* Left column - Images section */}
          <div className="product-uploader-image-section">
            <div className="product-uploader-image-container">
              <div className={`product-uploader-image-wrapper`}>
                {images.length > 0 && images[currentImageIndex] && (
                  <>
                    {images[currentImageIndex].isLoaded ? (
                      <img
                        src={images[currentImageIndex].url}
                        alt="Product"
                        className="product-uploader-product-image"
                        style={{
                          width: images[currentImageIndex].originalWidth ? 'auto' : '100%',
                          height: images[currentImageIndex].originalHeight ? 'auto' : '100%',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div className="product-uploader-loading-placeholder">
                        <div className="product-uploader-loading-spinner-small" />
                        <p>{t('productUploader.loadingImage')}</p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Тугмаҳои навигатсия ва ҳазф ҳамон тавр боқӣ мемонанд */}
                {images.length > 1 && currentImageIndex > 0 && (
                  <button
                    className="product-uploader-nav-button product-uploader-left-button"
                    onClick={slideLeft}
                  >
                    ‹
                  </button>
                )}
                
                {images.length > 1 && currentImageIndex < images.length - 1 && (
                  <button
                    className="product-uploader-nav-button product-uploader-right-button"
                    onClick={slideRight}
                  >
                    ›
                  </button>
                )}
                
                {images.length > 0 && (isPostOwner || !actualLink) && (
                  <button
                    className="product-uploader-delete-button"
                    onClick={deleteCurrentImage}
                  >
                    ×
                  </button>
                )}
              </div>

              <p className="product-uploader-image-counter">
                {images.length > 0 
                  ? t('productUploader.imageCounter', { current: currentImageIndex + 1, total: images.length }) 
                  : t('productUploader.imageCounter', { current: 0, total: 0 })}
              </p>

              {/* Progress bar барои коркарди файл */}
              {isProcessingFile && (
                <div className="product-uploader-processing-progress">
                  <p className="product-uploader-progress-label">
                    {t('productUploader.processingProgress', { progress: processingProgress })}
                  </p>
                  <div className="product-uploader-progress-bar">
                    <div
                      className="product-uploader-progress-fill"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {(isPostOwner || !actualLink) && (
                <div className="product-uploader-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="product-uploader-file-upload"
                    disabled={isProcessingFile}
                  />
                  <label 
                    htmlFor="product-uploader-file-upload" 
                    className={`product-uploader-upload-label ${isProcessingFile ? 'disabled' : ''}`}
                  >
                    {isProcessingFile ? t('productUploader.processing') : t('productUploader.selectImages')}
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Right column - Product form section */}
          {(isPostOwner || !actualLink) && (
            <div className="product-uploader-form-section">
              <div className="product-uploader-form-group">
                <label>{t('productUploader.form.title')}</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t('productUploader.form.titlePlaceholder')}
                  maxLength={100}
                  className="product-uploader-form-input"
                />
              </div>
              
              <div className="product-uploader-form-group">
                <label>{t('productUploader.form.description')}</label>
                <textarea
                  value={productData}
                  onChange={(e) => setProductData(e.target.value)}
                  placeholder={t('productUploader.form.descriptionPlaceholder')}
                  maxLength={5000}
                  rows={4}
                  className="product-uploader-form-textarea"
                />
              </div>
              
              <div className="product-uploader-form-group">
                <label>{t('productUploader.form.price')}</label>
                <input
                  type="number"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder={t('productUploader.form.pricePlaceholder')}
                  min="0"
                  step="0.01"
                  className="product-uploader-form-input"
                />
                <p className="product-uploader-commission-note">{t('productUploader.form.commission')}</p>
              </div>
              
              <div className="product-uploader-form-group">
                <label>{t('productUploader.form.productType')}</label>
                <select
                  value={productType}
                  onChange={handleProductTypeChange}
                  className="product-uploader-form-select"
                >
                  <option value="">{t('productUploader.form.selectType')}</option>
                  <option value="book">{t('productUploader.form.types.book')}</option>
                  <option value="audio">{t('productUploader.form.types.audio')}</option>
                  <option value="video">{t('productUploader.form.types.video')}</option>
                  <option value="image">{t('productUploader.form.types.image')}</option>
                  <option value="software">{t('productUploader.form.types.software')}</option>
                  <option value="account">{t('productUploader.form.types.account')}</option>
                  <option value="program">{t('productUploader.form.types.program')}</option>
                  <option value="physical">{t('productUploader.form.types.physical')}</option>
                </select>
              </div>
              
              {/* Файл боркунӣ барои маҳсулот */}
              {productType && productType !== 'account' && productType !== 'physical' && (
                <div className="product-uploader-file-upload-container">
                  <input
                    ref={productFileInputRef}
                    type="file"
                    onChange={handleProductFileUpload}
                    style={{ display: 'none' }}
                    id="product-file-upload"
                    accept={
                      productType === 'book' ? '.zip,.pdf,.epub,.mobi' :
                      productType === 'audio' ? '.mp3,.wav,.ogg,.m4a,.aac' :
                      productType === 'video' ? '.mp4,.webm,.mov,.avi,.mkv' :
                      productType === 'image' ? '.png,.jpg,.jpeg,.gif,.bmp,.webp' :
                      productType === 'software' ? '.py,.js,.ts,.html,.css,.cpp,.c,.java,.cs,.php,.go,.rb,.swift,.rs,.sh,.json,.yaml,.yml,.xml,.ini,.env,.sql,.ipynb,.zip,.rar,.tar.gz,.7z' :
                      productType === 'program' ? '.exe,.msi,.dmg,.pkg,.deb,.rpm,.apk,.ipa,.app,.appimage,.jar,.zip,.rar,.7z,.tar.gz,.iso' : ''
                    }
                  />
                  <label 
                    htmlFor="product-file-upload" 
                    className="product-uploader-upload-label"
                  >
                    {productType === 'book' ? t('productUploader.form.fileUpload.book') :
                     productType === 'audio' ? t('productUploader.form.fileUpload.audio') :
                     productType === 'video' ? t('productUploader.form.fileUpload.video') :
                     productType === 'image' ? t('productUploader.form.fileUpload.image') :
                     productType === 'software' ? t('productUploader.form.fileUpload.software') :
                     productType === 'program' ? t('productUploader.form.fileUpload.program') :
                     t('productUploader.form.fileUpload.select')}
                  </label>
                  
                  {ifHasNote && (
                    <p className="product-uploader-note">
                      {productType === 'software' 
                        ? t('productUploader.form.softwareNote')
                        : t('productUploader.form.programNote')}
                    </p>
                  )}
                  
                  {fileName && (
                    <div className="product-uploader-uploaded-file">
                      <span className="product-uploader-file-name">
                        {t('productUploader.form.uploadedFile', { filename: fileName })}
                      </span>
                      <button
                        className="product-uploader-file-delete"
                        onClick={() => removeUploadedFile()}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Аккаунт версификатсия - Формаи дохил кардани маълумот */}
              {productType === 'account' && !accountUserId && !showAccountVerification && (
                <div className="product-uploader-account-form">
                  <div className="product-uploader-form-group">
                    <label>{t('productUploader.account.username')}</label>
                    <input
                      type="text"
                      value={accountUsername}
                      onChange={(e) => setAccountUsername(e.target.value)}
                      className="product-uploader-form-input"
                    />
                    {accountErrors.username && (
                      <p className="product-uploader-error-message">{accountErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="product-uploader-form-group">
                    <label>{t('productUploader.account.password')}</label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="product-uploader-form-input"
                    />
                    {accountErrors.password && (
                      <p className="product-uploader-error-message">{accountErrors.password}</p>
                    )}
                  </div>
                  
                  <div className="product-uploader-form-group">
                    <label>{t('productUploader.account.email')}</label>
                    <input
                      type="email"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      className="product-uploader-form-input"
                    />
                    {accountErrors.email && (
                      <p className="product-uploader-error-message">{accountErrors.email}</p>
                    )}
                  </div>
                  
                  <button
                    className="product-uploader-submit-button"
                    onClick={handleAccountVerification}
                  >
                    {t('productUploader.account.verify')}
                  </button>
                </div>
              )}

              {/* Барои маҳсулоти физикӣ */}
              {productType === 'physical' && (
                <div className="product-uploader-file-upload-container">
                  <div className="product-uploader-form-group">
                    <label>{t('productUploader.form.physicalProductName')}</label>
                    <input
                      type="text"
                      value={physicalProductName}
                      onChange={(e) => setPhysicalProductName(e.target.value)}
                      placeholder={t('productUploader.form.physicalProductPlaceholder')}
                      maxLength={50}
                      className="product-uploader-form-input"
                    />
                  </div>
                  
                  <div className="product-uploader-form-group">
                    <label>{t('productUploader.form.deliveryMethod')}</label>
                    <select
                      value={physicalDeliveryMethod}
                      onChange={(e) => setPhysicalDeliveryMethod(e.target.value)}
                      className="product-uploader-form-select"
                    >
                      <option value="pickup">{t('productUploader.form.pickup')}</option>
                      <option value="courier">{t('productUploader.form.courier')}</option>
                    </select>
                  </div>
                  
                  {physicalDeliveryMethod === 'pickup' && (
                    <div className="product-uploader-form-group">
                      <label>{t('productUploader.form.pickupAddress')}</label>
                      <textarea
                        value={physicalPickupAddress}
                        onChange={(e) => setPhysicalPickupAddress(e.target.value)}
                        placeholder={t('productUploader.form.pickupAddressPlaceholder')}
                        rows={3}
                        className="product-uploader-form-textarea"
                      />
                      <p className="product-uploader-note">
                        {t('productUploader.form.pickupAddressNote')}
                      </p>
                    </div>
                  )}
                  
                  {physicalDeliveryMethod === 'courier' && (
                    <div className="product-uploader-checkbox-group">
                      <label className="product-uploader-checkbox-label">
                        <input
                          type="checkbox"
                          checked={physicalCourierAvailable}
                          onChange={(e) => setPhysicalCourierAvailable(e.target.checked)}
                        />
                        {t('productUploader.form.courierAvailable')}
                      </label>
                      <p className="product-uploader-note">
                        {t('productUploader.form.courierNote')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Файли аккаунти интихобшуда */}
              {accountUserId && (
                <div className="product-uploader-file-upload-container">
                  <div className="product-uploader-uploaded-file">
                    <span className="product-uploader-file-name">
                      {t('productUploader.account.selectedAccount', { username: accountUsername || t('productUploader.account.selectedAccount') })}
                    </span>
                    <button
                      className="product-uploader-file-delete"
                      onClick={() => {
                        setAccountUserId(null);
                        setAccountUsername('');
                        setAccountPassword('');
                        setAccountEmail('');
                        setFileName('');
                        setOriginalProduct(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Чекбоксҳо */}
              <div className="product-uploader-checkbox-group">
                <label className="product-uploader-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                  />
                  {t('productUploader.form.allowComments')}
                </label>
              </div>
              
              <div className="product-uploader-checkbox-group">
                <label className="product-uploader-checkbox-label">
                  <input
                    type="checkbox"
                    checked={personalProductSales}
                    onChange={(e) => setPersonalProductSales(e.target.checked)}
                    disabled={productType === 'account'}
                  />
                  {t('productUploader.form.personalSales')}
                </label>
              </div>
              
              {/* Таблиғ */}
              <div className="product-uploader-checkbox-group">
                <label className="product-uploader-checkbox-label">
                  <input
                    type="checkbox"
                    checked={advertisementEnabled}
                    onChange={handleAdvertisementToggle}
                  />
                  {t('productUploader.form.advertise')}
                </label>
              </div>
              
              {advertisementEnabled && (
                <>
                  <p className="product-uploader-note">
                    {t('productUploader.form.advertisementNote')}
                  </p>
                  
                  <div className="product-uploader-form-group">
                    <input
                      type="number"
                      value={advertisementCount}
                      onChange={(e) => setAdvertisementCount(e.target.value)}
                      placeholder={t('productUploader.form.advertisementCount')}
                      min="0"
                      className="product-uploader-form-input"
                    />
                  </div>
                </>
              )}
              
              <p className="product-uploader-note">
                {t('productUploader.form.storeNote')}
              </p>
              
              {/* Мағозаҳои интихобшуда */}
              <div className="product-uploader-collaboration-section">
                <button
                  className="product-uploader-collaboration-button"
                  onClick={() => setShowPopup(true)}
                >
                  {t('productUploader.form.selectStore')}
                </button>
                
                {selectedShopings.length > 0 && (
                  <div className="product-uploader-selected-shopings">
                    <p>{t('productUploader.form.selectedStores', { count: selectedShopings.length })}</p>
                    {selectedShopings.map(shoping => (
                      <div key={shoping.id} className="product-uploader-shoping-card">
                        <img 
                          src={shoping.avatar} 
                          alt={shoping.shoping_name} 
                          className="product-uploader-shoping-avatar"
                        />
                        <div className="product-uploader-shoping-info">
                          <div className="product-uploader-shoping-display">
                            {shoping.display_name || `@${shoping.shoping_name}`}
                          </div>
                          <div className="product-uploader-shoping-name">
                            ${shoping.shoping_name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="product-uploader-action-buttons">
                <button
                  className="product-uploader-submit-button"
                  onClick={productId || actualLink ? handleUpdateProduct : handleCreateProduct}
                  disabled={isUploading || images.length < 3 || isProcessingFile}
                >
                  {isUploading ? t('productUploader.form.uploading') : (productId || actualLink ? t('productUploader.form.update') : t('productUploader.form.submit'))}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Popup барои интихоби мағозаҳо */}
        {showPopup && (
          <div className="product-uploader-popup-overlay" onClick={() => setShowPopup(false)}>
            <div className="product-uploader-popup-content" onClick={e => e.stopPropagation()}>
              <div className="product-uploader-search-container">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('productUploader.form.selectStore')}
                  className="product-uploader-search-input"
                />
                <button
                  className="product-uploader-search-button"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  🔍
                </button>
              </div>

              <div className="product-uploader-search-results">
                {isSearching ? (
                  <p className="product-uploader-text-center">{t('productUploader.form.uploading')}</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(shoping => {
                    const isSelected = selectedShopings.some(s => s.id === shoping.id);
                    return (
                      <div key={shoping.id} className="product-uploader-shoping-search-item">
                        <img 
                          src={shoping.avatar} 
                          alt={shoping.shoping_name} 
                          className="product-uploader-shoping-avatar"
                        />
                        <div className="product-uploader-shoping-info">
                          <div className="product-uploader-shoping-display">
                            ${shoping.shoping_name}
                          </div>
                        </div>
                        <button
                          className={`product-uploader-select-button ${isSelected ? 'product-uploader-selected' : ''}`}
                          onClick={() => handleShopingSelection(shoping)}
                        >
                          {isSelected ? t('productUploader.collaboration.cancel') : t('productUploader.collaboration.send')}
                        </button>
                      </div>
                    );
                  })
                ) : null }
              </div>

              <button
                className="product-uploader-close-popup-button"
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Диалоги тасдиқи аккаунт */}
        {showAccountVerification && productType === 'account' && (
          <div className="product-uploader-account-verification-overlay">
            <button
              className="product-uploader-back-button"
              onClick={() => setShowAccountVerification(false)}
            >
              ←
            </button>
            
            <div className="product-uploader-account-verification-content">
              <div className="product-uploader-account-card">
                <div className="product-uploader-account-card-inner">
                  <div className="product-uploader-account-title">
                    {t('productUploader.account.title')}
                  </div>
                  
                  <div className="product-uploader-account-email">
                    {t('productUploader.account.verificationNote', { email: accountEmail })}
                  </div>
                  
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={t('productUploader.account.verificationCode')}
                    className="product-uploader-account-input"
                  />
                  
                  <button
                    className="product-uploader-account-verify-button"
                    onClick={handleVerifyCode}
                  >
                    {t('productUploader.account.verifyCode')}
                  </button>
                  
                  <div className="product-uploader-account-info-note">
                    {t('productUploader.account.infoNote')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="product-uploader-upload-progress-overlay">
            <div className="product-uploader-progress-content">
              <p className="product-uploader-progress-label">
                {t('productUploader.uploadProgress', { progress: uploadProgress })}
              </p>
              <p className="product-uploader-note">{t('productUploader.uploadProgress', { progress: uploadProgress })}</p>
              <div className="product-uploader-progress-bar">
                <div
                  className="product-uploader-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductUploader;