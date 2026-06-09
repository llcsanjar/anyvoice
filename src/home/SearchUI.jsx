// SearchUI.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import qs from 'qs';
import VideoLoader from '../explore/VideoLoader';
import ImageLoader from '../explore/ImageLoader';
import ProductLoader from '../shoping/ProductLoader';
import ShopingLoader from '../shoping/ShopingLoader';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import ArticleItem from '../dispute/article/ArticleItem';

const SearchUI = ({
  backendUrl,
  userIdFromMe,
  avatarPath,
  myUsername,
  myDisplay,
  fullContainerRef,
  onClose
}) => {
  const { t } = useTranslation();
  const navigate = window?.navigate || (() => {});
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('accounts');
  const [searchResults, setSearchResults] = useState({
    accounts: [],
    images: [],
    videos: [],
    shopings: [],
    products: [],
    theories: [],
    articles: []
  });
  
  // Image states
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [imageSearchOffset, setImageSearchOffset] = useState(0);
  const [imageSearchNoMore, setImageSearchNoMore] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [loadTriggerRef, setLoadTriggerRef] = useState(null);
  
  // Video states
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [videoSearchOffset, setVideoSearchOffset] = useState(0);
  const [videoSearchNoMore, setVideoSearchNoMore] = useState(false);
  const [videoSearchResults, setVideoSearchResults] = useState([]);
  const [videoLoadTriggerRef, setVideoLoadTriggerRef] = useState(null);
  
  // Shoping states
  const [loadingMoreShopings, setLoadingMoreShopings] = useState(false);
  const [shopingSearchOffset, setShopingSearchOffset] = useState(0);
  const [shopingSearchNoMore, setShopingSearchNoMore] = useState(false);
  const [shopingLoadTriggerRef, setShopingLoadTriggerRef] = useState(null);
  
  // Product states
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [productSearchOffset, setProductSearchOffset] = useState(0);
  const [productSearchNoMore, setProductSearchNoMore] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productLoadTriggerRef, setProductLoadTriggerRef] = useState(null);
  
  // Theory states
  const [loadingMoreTheories, setLoadingMoreTheories] = useState(false);
  const [theorySearchOffset, setTheorySearchOffset] = useState(0);
  const [theorySearchNoMore, setTheorySearchNoMore] = useState(false);
  const [theorySearchResults, setTheorySearchResults] = useState([]);
  const [theoryLoadTriggerRef, setTheoryLoadTriggerRef] = useState(null);
  
  // Article states
  const [loadingMoreArticles, setLoadingMoreArticles] = useState(false);
  const [articleSearchOffset, setArticleSearchOffset] = useState(0);
  const [articleSearchNoMore, setArticleSearchNoMore] = useState(false);
  const [articleSearchResults, setArticleSearchResults] = useState([]);
  const [articleLoadTriggerRef, setArticleLoadTriggerRef] = useState(null);
  
  const limitSearchImage = 10;
  const limitSearchVideo = 10;
  const limitSearchTheory = 10;
  const limitSearchArticle = 10;

  // Search functionality
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    switch (selectedTab) {
      case 'accounts':
        await searchAccounts(searchTerm);
        break;
      case 'images':
        await searchImages(searchTerm, false);
        break;
      case 'videos':
        await searchVideos(searchTerm, false);
        break;
      case 'shopings':
        await searchShopings(searchTerm, false);
        break;
      case 'products':
        await searchProducts(searchTerm, false);
        break;
      case 'theories':
        await searchTheories(searchTerm, false);
        break;
      case 'articles':
        await searchArticles(searchTerm, false);
        break;
    }
  };

  const searchAccounts = async (term) => {
    try {
      const response = await axios.get(`${backendUrl}/accounts`, {
        params: { user_id: userIdFromMe, search: term }
      });
      
      const accounts = response.data;
      setSearchResults(prev => ({ ...prev, accounts }));
    } catch (error) {
      console.error('Error searching accounts:', error);
    }
  };

  const searchImages = async (term, loadMore = false) => {
    if (loadingMoreImages && loadMore) return;
    
    try {
      const currentOffset = loadMore ? imageSearchOffset : 0;
      
      if (!loadMore) {
        setImageSearchNoMore(false);
        setImageSearchOffset(0);
        setLoadingMoreImages(true);
      } else {
        setLoadingMoreImages(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-images`, {
        params: {
          limit: limitSearchImage,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newImages = response.data?.images || [];
      
      if (!loadMore) {
        setImageSearchResults(newImages);
        setSearchResults(prev => ({ ...prev, images: newImages }));
      } else {
        const combinedImages = [...imageSearchResults, ...newImages];
        setImageSearchResults(combinedImages);
        setSearchResults(prev => ({ ...prev, images: combinedImages }));
      }
      
      setImageSearchOffset(currentOffset + newImages.length);
      
      if (newImages.length < limitSearchImage) {
        setImageSearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching images:', error);
    } finally {
      setLoadingMoreImages(false);
    }
  };

  const searchVideos = async (term, loadMore = false) => {
    if (loadingMoreVideos) return;
    
    try {
      const currentOffset = loadMore ? videoSearchOffset : 0;
      
      if (!loadMore) {
        setVideoSearchNoMore(false);
        setVideoSearchOffset(0);
        setLoadingMoreVideos(true);
      } else {
        setLoadingMoreVideos(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-videos`, {
        params: {
          limit: limitSearchVideo,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newVideos = response.data?.videos || [];
      
      if (!loadMore) {
        setVideoSearchResults(newVideos);
        setSearchResults(prev => ({ ...prev, videos: newVideos }));
      } else {
        const combinedVideos = [...videoSearchResults, ...newVideos];
        setVideoSearchResults(combinedVideos);
        setSearchResults(prev => ({ ...prev, videos: combinedVideos }));
      }
      
      setVideoSearchOffset(currentOffset + newVideos.length);
      
      if (newVideos.length < limitSearchVideo) {
        setVideoSearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching videos:', error);
    } finally {
      setLoadingMoreVideos(false);
    }
  };

  const searchShopings = async (term, loadMore = false) => {
    if (loadingMoreShopings) return;
    
    try {
      const currentOffset = loadMore ? shopingSearchOffset : 0;
      
      if (!loadMore) {
        setShopingSearchNoMore(false);
        setShopingSearchOffset(0);
        setLoadingMoreShopings(true);
      } else {
        setLoadingMoreShopings(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-shopings`, {
        params: {
          limit: 10,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newShopings = response.data?.shopings || [];
      
      if (!loadMore) {
        setSearchResults(prev => ({ ...prev, shopings: newShopings }));
      } else {
        setSearchResults(prev => ({ 
          ...prev, 
          shopings: [...prev.shopings, ...newShopings] 
        }));
      }
      
      setShopingSearchOffset(currentOffset + newShopings.length);
      
      if (newShopings.length < 10) {
        setShopingSearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching shopings:', error);
    } finally {
      setLoadingMoreShopings(false);
    }
  };

  const searchProducts = async (term, loadMore = false) => {
    if (loadingMoreProducts) return;
    
    try {
      const currentOffset = loadMore ? productSearchOffset : 0;
      
      if (!loadMore) {
        setProductSearchNoMore(false);
        setProductSearchOffset(0);
        setLoadingMoreProducts(true);
      } else {
        setLoadingMoreProducts(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-products`, {
        params: {
          limit: 10,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newProducts = response.data?.products || [];
      
      if (!loadMore) {
        setProductSearchResults(newProducts);
        setSearchResults(prev => ({ ...prev, products: newProducts }));
      } else {
        const combinedProducts = [...productSearchResults, ...newProducts];
        setProductSearchResults(combinedProducts);
        setSearchResults(prev => ({ ...prev, products: combinedProducts }));
      }
      
      setProductSearchOffset(currentOffset + newProducts.length);
      
      if (newProducts.length < 10) {
        setProductSearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoadingMoreProducts(false);
    }
  };
  
  const searchTheories = async (term, loadMore = false) => {
    if (loadingMoreTheories) return;
    
    try {
      const currentOffset = loadMore ? theorySearchOffset : 0;
      
      if (!loadMore) {
        setTheorySearchNoMore(false);
        setTheorySearchOffset(0);
        setLoadingMoreTheories(true);
      } else {
        setLoadingMoreTheories(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-theories`, {
        params: {
          limit: limitSearchTheory,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newTheories = response.data?.theories || [];
      
      if (!loadMore) {
        setTheorySearchResults(newTheories);
        setSearchResults(prev => ({ ...prev, theories: newTheories }));
      } else {
        const combinedTheories = [...theorySearchResults, ...newTheories];
        setTheorySearchResults(combinedTheories);
        setSearchResults(prev => ({ ...prev, theories: combinedTheories }));
      }
      
      setTheorySearchOffset(currentOffset + newTheories.length);
      
      if (newTheories.length < limitSearchTheory) {
        setTheorySearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching theories:', error);
    } finally {
      setLoadingMoreTheories(false);
    }
  };

  const searchArticles = async (term, loadMore = false) => {
    if (loadingMoreArticles && loadMore) return;
    
    try {
      const currentOffset = loadMore ? articleSearchOffset : 0;
      
      if (!loadMore) {
        setArticleSearchNoMore(false);
        setArticleSearchOffset(0);
        setLoadingMoreArticles(true);
      } else {
        setLoadingMoreArticles(true);
      }
      
      const response = await axios.get(`${backendUrl}/search-articles`, {
        params: {
          limit: limitSearchArticle,
          offset: currentOffset,
          user_id: userIdFromMe,
          search_term: term
        }
      });
      
      const newArticles = response.data?.articles || [];
      
      if (!loadMore) {
        setArticleSearchResults(newArticles);
        setSearchResults(prev => ({ ...prev, articles: newArticles }));
      } else {
        const combinedArticles = [...articleSearchResults, ...newArticles];
        setArticleSearchResults(combinedArticles);
        setSearchResults(prev => ({ ...prev, articles: combinedArticles }));
      }
      
      setArticleSearchOffset(currentOffset + newArticles.length);
      
      if (newArticles.length < limitSearchArticle) {
        setArticleSearchNoMore(true);
      }
      
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setLoadingMoreArticles(false);
    }
  };

  // Image infinite scroll
  useEffect(() => {
    if (selectedTab !== 'images' || !searchTerm.trim() || imageSearchNoMore || loadingMoreImages) return;
    if (!loadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchImages(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(loadTriggerRef);
    
    return () => {
      if (loadTriggerRef) observer.unobserve(loadTriggerRef);
    };
  }, [loadTriggerRef, selectedTab, searchTerm, loadingMoreImages, imageSearchNoMore]);

  // Video infinite scroll
  useEffect(() => {
    if (selectedTab !== 'videos' || !searchTerm.trim() || videoSearchNoMore || loadingMoreVideos) return;
    if (!videoLoadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchVideos(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(videoLoadTriggerRef);
    
    return () => {
      if (videoLoadTriggerRef) observer.unobserve(videoLoadTriggerRef);
    };
  }, [videoLoadTriggerRef, selectedTab, searchTerm, loadingMoreVideos, videoSearchNoMore]);

  // Shoping infinite scroll
  useEffect(() => {
    if (selectedTab !== 'shopings' || !searchTerm.trim() || shopingSearchNoMore || loadingMoreShopings) return;
    if (!shopingLoadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchShopings(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(shopingLoadTriggerRef);
    
    return () => {
      if (shopingLoadTriggerRef) observer.unobserve(shopingLoadTriggerRef);
    };
  }, [shopingLoadTriggerRef, selectedTab, searchTerm, loadingMoreShopings, shopingSearchNoMore]);

  // Product infinite scroll
  useEffect(() => {
    if (selectedTab !== 'products' || !searchTerm.trim() || productSearchNoMore || loadingMoreProducts) return;
    if (!productLoadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchProducts(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(productLoadTriggerRef);
    
    return () => {
      if (productLoadTriggerRef) observer.unobserve(productLoadTriggerRef);
    };
  }, [productLoadTriggerRef, selectedTab, searchTerm, loadingMoreProducts, productSearchNoMore]);

  // Theory infinite scroll
  useEffect(() => {
    if (selectedTab !== 'theories' || !searchTerm.trim() || theorySearchNoMore || loadingMoreTheories) return;
    if (!theoryLoadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchTheories(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(theoryLoadTriggerRef);
    
    return () => {
      if (theoryLoadTriggerRef) observer.unobserve(theoryLoadTriggerRef);
    };
  }, [theoryLoadTriggerRef, selectedTab, searchTerm, loadingMoreTheories, theorySearchNoMore]);

  // Article infinite scroll
  useEffect(() => {
    if (selectedTab !== 'articles' || !searchTerm.trim() || articleSearchNoMore || loadingMoreArticles) return;
    if (!articleLoadTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          searchArticles(searchTerm, true);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    
    observer.observe(articleLoadTriggerRef);
    
    return () => {
      if (articleLoadTriggerRef) observer.unobserve(articleLoadTriggerRef);
    };
  }, [articleLoadTriggerRef, selectedTab, searchTerm, loadingMoreArticles, articleSearchNoMore]);

  return (
    <div className="search-ui-container">
      <div className="search-content">
        {/* Search Input */}
        <div className="search-input-container">
          <input
            type="text"
            placeholder={t('home.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>
            <span className="material-icons">search</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="search-tabs">
          <button 
            className={`tab ${selectedTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setSelectedTab('accounts')}
          >
            <span className="material-icons">person</span>
            {t('home.tabs.accounts')}
          </button>

          <button 
            className={`tab ${selectedTab === 'videos' ? 'active' : ''}`}
            onClick={() => setSelectedTab('videos')}
          >
            <span className="material-icons">videocam</span>
            {t('home.tabs.videos')}
          </button>

          <button 
            className={`tab ${selectedTab === 'images' ? 'active' : ''}`}
            onClick={() => setSelectedTab('images')}
          >
            <span className="material-icons">image</span>
            {t('home.tabs.images')}
          </button>

          <button 
            className={`tab ${selectedTab === 'articles' ? 'active' : ''}`}
            onClick={() => setSelectedTab('articles')}
          >
            <span className="material-icons">article</span>
            {t('home.tabs.articles')}
          </button>

          {/* <button 
            className={`tab ${selectedTab === 'shopings' ? 'active' : ''}`}
            onClick={() => setSelectedTab('shopings')}
          >
            <span className="material-icons">store</span>
            {t('home.tabs.shopings')}
          </button> */}

          {/* <button 
            className={`tab ${selectedTab === 'products' ? 'active' : ''}`}
            onClick={() => setSelectedTab('products')}
          >
            <span className="material-icons">inventory_2</span>
            {t('home.tabs.products')}
          </button> */}

          {/* <button 
            className={`tab ${selectedTab === 'theories' ? 'active' : ''}`}
            onClick={() => setSelectedTab('theories')}
          >
            <span className="material-icons">emoji_objects</span>
            {t('home.tabs.theories')}
          </button> */}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {selectedTab === 'accounts' && (
            <div className="accounts-results">
              {searchResults.accounts.length > 0 ? (
                searchResults.accounts.map(account => (
                  <div key={account.id} className="account-card" onClick={() => {
                    window.location.href = `/@${account.username}`;
                  }}>
                    <img src={account.avatar} alt={account.username} className="account-avatar" />
                    <div className="account-info">
                      <div className="account-display">@{account.username}</div>
                    </div>
                  </div>
                ))
              ) : (<></>)}
            </div>
          )}

          {selectedTab === 'images' && (
            <div className="images-results" style={{ width: '100%', height: 'auto', position: 'relative' }}>
              <div className="images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {searchResults.images.map((image, index) => (
                  <div key={`search-image-${image.id}-${index}`} style={{ transition: 'transform 0.2s ease' }} className="image-card-container">
                    <ImageLoader
                      imageId={image.id}
                      containerId={`search-image-${image.id}`}
                      backendUrl={backendUrl}
                      userId={userIdFromMe}
                      avatarPath={avatarPath}
                      myUsername={myUsername}
                      myDisplay={myDisplay}
                      userIdOfImage={image.user_id}
                      fullContainerRef={fullContainerRef}
                    />
                  </div>
                ))}
                
                {loadingMoreImages && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`placeholder-${i}`} className="image-placeholder">
                        <div className="image-thumbnail-placeholder"></div>
                        <div className="image-info-placeholder">
                          <div className="title-placeholder"></div>
                          <div className="description-placeholder"></div>
                          <div className="meta-placeholder"></div>
                          <div className="author-placeholder"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {!imageSearchNoMore && searchResults.images.length > 0 && (
                  <div ref={setLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreImages && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'videos' && (
            <div className="videos-results" style={{ width: '100%', height: 'auto', padding: '16px', position: 'relative' }}>
              <div className="videos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {searchResults.videos.map((video, index) => (
                  <div key={`search-video-${video.id}-${index}`} style={{ transition: 'transform 0.2s ease' }} className="video-card-container">
                    <VideoLoader
                      typeVideo="explore"
                      videoId={video.id}
                      containerId={`search-video-${video.id}`}
                      backendUrl={backendUrl}
                      userId={userIdFromMe}
                      avatarPath={avatarPath}
                      myUsername={myUsername}
                      myDisplay={myDisplay}
                      userIdOfVideo={video.user_id}
                      fullContainerRef={fullContainerRef}
                    />
                  </div>
                ))}
                
                {loadingMoreVideos && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`video-placeholder-${i}`} className="video-placeholder">
                        <div className="video-thumbnail-placeholder"></div>
                        <div className="video-info-placeholder">
                          <div className="title-placeholder"></div>
                          <div className="description-placeholder"></div>
                          <div className="meta-placeholder"></div>
                          <div className="author-placeholder"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {!videoSearchNoMore && searchResults.videos.length > 0 && (
                  <div ref={setVideoLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreVideos && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'shopings' && (
            <div className="shopings-results" style={{ width: '100%', height: 'auto', padding: '16px', position: 'relative' }}>
              <div className="shopings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {searchResults.shopings.length > 0 &&
                  searchResults.shopings.map((shoping, index) => (
                    <div key={`search-shoping-${shoping.id}-${index}`} style={{ transition: 'transform 0.2s ease', height: '100%' }} className="shoping-card-container">
                      <ShopingLoader
                        shopingId={shoping.id}
                        containerId={`search-shoping-${shoping.id}`}
                        backendUrl={backendUrl}
                        userId={userIdFromMe}
                        avatarPath={avatarPath}
                        myUsername={myUsername}
                        myDisplay={myDisplay}
                        userIdOfShoping={shoping.user_id}
                        fullContainerRef={fullContainerRef}
                      />
                    </div>
                  ))
                }

                {loadingMoreShopings && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`placeholder-card-shoping-${i}`} className="placeholder-card-shoping">
                        <div className="placeholder-shoping"></div>
                        <div className="placeholder-content-shoping">
                          <div className="placeholder-line-shoping short"></div>
                          <div className="placeholder-line-shoping medium"></div>
                          <div className="placeholder-line-shoping full"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!shopingSearchNoMore && searchResults.shopings.length > 0 && (
                  <div ref={setShopingLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreShopings && <Spin size="large" />}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'products' && (
            <div className="products-results" style={{ width: '100%', height: 'auto', padding: '16px', position: 'relative' }}>
              <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {searchResults.products.map((product, index) => (
                  <div key={`search-product-${product.id}-${index}`} style={{ transition: 'transform 0.2s ease', height: '100%' }} className="product-card-container">
                    <ProductLoader
                      productId={product.id}
                      containerId={`search-product-${product.id}`}
                      backendUrl={backendUrl}
                      userId={userIdFromMe}
                      avatarPath={avatarPath}
                      myUsername={myUsername}
                      myDisplay={myDisplay}
                      userIdOfProduct={product.user_id}
                      fullContainerRef={fullContainerRef}
                    />
                  </div>
                ))}
                
                {loadingMoreProducts && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`product-placeholder-${i}`} className="product-placeholder">
                        <div className="product-thumbnail-placeholder"></div>
                        <div className="product-info-placeholder">
                          <div className="title-placeholder"></div>
                          <div className="price-placeholder"></div>
                          <div className="description-placeholder"></div>
                          <div className="meta-placeholder"></div>
                          <div className="author-placeholder"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {!productSearchNoMore && searchResults.products.length > 0 && (
                  <div ref={setProductLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreProducts && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'theories' && (
            <div className="theories-results" style={{ width: '100%', height: 'auto', padding: '16px', position: 'relative' }}>
              <div style={{ display: 'grid', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', gridAutoRows: 'auto', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', alignItems: 'start' }}>
                {searchResults.theories.map((theory, index) => (
                  <div key={theory.key} className="theory-card" style={{ width: '100%' }}>
                    <TheoryLoader
                      key={theory.key}
                      theoryId={theory.id}
                      containerId={`search-theory-${theory.id}`}
                      backendUrl={backendUrl}
                      userId={userIdFromMe}
                      avatarPath={avatarPath}
                      myUsername={myUsername}
                      myDisplay={myDisplay}
                      userIdOfTheory={theory.user_id}
                      fullContainerRef={fullContainerRef}
                    />
                  </div>
                ))}
                
                {loadingMoreTheories && (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div className="theory-placeholder" key={`placeholder-${i}`}>
                        <div className="theory-info-placeholder">
                          <div className="text-theory-placeholder"></div>
                          <div className="text-theory-placeholder"></div>
                          <div className="text-theory-placeholder"></div>
                          <div className="title-placeholder"></div>
                          <div className="description-placeholder"></div>
                          <div className="meta-placeholder"></div>
                          <div className="author-placeholder"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!theorySearchNoMore && searchResults.theories.length > 0 && (
                  <div ref={setTheoryLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreTheories && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'articles' && (
            <div className="articles-results" style={{ width: '100%', height: 'auto', padding: '16px', position: 'relative' }}>
              <div className="articles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {searchResults.articles && searchResults.articles.map((article, index) => (
                  <div key={`search-article-${article.id}-${index}`} style={{ transition: 'transform 0.2s ease' }} className="article-card-container">
                    <ArticleItem
                      articleId={article.id} 
                      backendUrl={backendUrl}
                      userId={userIdFromMe}
                    />
                  </div>
                ))}
                
                {loadingMoreArticles && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`article-placeholder-${i}`} className="article-placeholder">
                        <div className="article-thumbnail-placeholder"></div>
                        <div className="article-info-placeholder">
                          <div className="title-placeholder"></div>
                          <div className="description-placeholder"></div>
                          <div className="meta-placeholder"></div>
                          <div className="author-placeholder"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {!articleSearchNoMore && searchResults.articles && searchResults.articles.length > 0 && (
                  <div ref={setArticleLoadTriggerRef} style={{ gridColumn: '1 / -1', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMoreArticles && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchUI;