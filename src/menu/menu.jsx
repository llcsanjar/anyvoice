// menu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './menu.css';
import HomeUI from '../home/home';
import ChatUI from '../home/chat';
import UserAccount from '../account/acount';
import ExploreContentUI from '../dispute/ExploreContentUI';
import SearchUI from '../home/SearchUI';

const Menu = ({ backendUrl, userId, username, display, avatar }) => {
  const { t } = useTranslation();

  const [activeMenu, setActiveMenu] = useState('home');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatScreenActive, setChatScreenActive] = useState(false);

  // Реф барои дастрасӣ ба функсияҳои ChatUI
  const chatUIRef = useRef(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Refs
  const contentHomeRef = useRef(null);
  const contentChatRef = useRef(null);
  const contentSearchRef = useRef(null);
  const contentProfileRef = useRef(null);
  const contentExploreRef = useRef(null);

  const fullContainerRef = useRef(null);

  // Components
  const [homeComponent, setHomeComponent] = useState(null);
  const [chatComponent, setChatComponent] = useState(null);
  const [searchComponent, setSearchComponent] = useState(null);
  const [profileComponent, setProfileComponent] = useState(null);
  const [exploreComponent, setExploreComponent] = useState(null);

  // Loaded states
  const [clickedHome, setClickedHome] = useState(false);
  const [clickedChat, setClickedChat] = useState(false);
  const [clickedSearch, setClickedSearch] = useState(false);
  const [clickedProfile, setClickedProfile] = useState(false);
  const [clickedExplore, setClickedExplore] = useState(false);

  // Функсия барои хориҷ шудан аз чати фаъол
  const leaveCurrentChatIfNeeded = () => {
    if (chatUIRef.current && typeof chatUIRef.current.leaveChat === 'function') {
      console.log('Leaving current chat because user switched to:', activeMenu);
      chatUIRef.current.leaveChat();
    }
  };

  // Load unread count
  const loadUnreadChatCount = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/chats/unread_count/${userId}`
      );

      const count = response.data?.unread_count || 0;
      setUnreadChatCount(count);
    } catch (error) {
      console.error('Error loading unread chat count:', error);
      setUnreadChatCount(0);
    }
  };

  // WebSocket
  const connectWebSocket = () => {
    try {
      const wsScheme = backendUrl.startsWith('https://')
        ? 'wss://'
        : 'ws://';

      const wsUri = `${wsScheme}${backendUrl
        .replace('https://', '')
        .replace('http://', '')}/ws/notifications/${userId}`;

      wsRef.current = new WebSocket(wsUri);

      wsRef.current.onopen = () => {
        console.log('Menu websocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const action = data.action || data.type;

        switch (action) {
          case 'new_messanger':
            // Санҷиш: Оё корбар дар чат ҳаст ва оё чати фаъол бо фиристандаи паём як аст?
            const isInSameChat = chatUIRef.current && 
                                 typeof chatUIRef.current.getActiveChatId === 'function' &&
                                 chatUIRef.current.getActiveChatId() === data.value?.from_user_id;
            
            // Агар корбар дар чат набошад ё дар чати дигар бошад, unread зиёд шавад
            if (!chatScreenActive || !isInSameChat) {
              setUnreadChatCount((prev) => prev + 1);
            }
            break;

          case 'ping':
            wsRef.current?.send(
              JSON.stringify({ type: 'pong' })
            );
            break;

          default:
            break;
        }
      };

      wsRef.current.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connect error:', error);
    }
  };

  // Render badge
  const renderChatBadge = () => {
    if (activeMenu === 'chat') return null;
    if (unreadChatCount <= 0) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          minWidth: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'red',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          zIndex: 10
        }}
      >
        {unreadChatCount > 99 ? '99+' : unreadChatCount}
      </div>
    );
  };

  const handleMenuClick = (menuName) => {
    if (activeMenu === menuName) return;

    // МУҲИМ: Вақте ки корбар ба дигар бахш меравад, чатро тарк мекунем
    if (activeMenu === 'chat') {
      leaveCurrentChatIfNeeded();
    }

    // Танзими chatScreenActive
    setChatScreenActive(menuName === 'chat');
    setActiveMenu(menuName);

    switch (menuName) {
      case 'home':
        showHome();
        break;
      case 'chat':
        showChat();
        break;
      case 'search':
        showSearch();
        break;
      case 'profile':
        showProfile();
        break;
      case 'explore':
        showExplore();
        break;
      default:
        showHome();
    }
  };

  const showHome = () => {
    if (!hasLoaded) setHasLoaded(true);

    hideContentAll();

    if (contentHomeRef.current) {
      contentHomeRef.current.style.display = 'flex';
    }

    if (!clickedHome) {
      setHomeComponent(
        <HomeUI
          backendUrl={backendUrl}
          userIdFromMe={userId}
          contentArea={null}
          myUsername={username}
          myDisplay={display}
          avatarPath={avatar}
          fullContainerRef={fullContainerRef}
        />
      );
      setClickedHome(true);
    }
  };

  const showChat = () => {
    // reset unread count when open chat
    setUnreadChatCount(0);

    if (!clickedChat) {
      setChatComponent(
        <ChatUI
          ref={chatUIRef}
          backendUrl={backendUrl}
          userId={userId}
          username={username}
          display={display}
          avatar={avatar}
          forMainMenu={true}
          isChatScreenActive={true}
        />
      );
      setClickedChat(true);
    } else {
      // Агар component аллакай load шуда бошад, онро бо реф нав мекунем
      setChatComponent(
        <ChatUI
          ref={chatUIRef}
          backendUrl={backendUrl}
          userId={userId}
          username={username}
          display={display}
          avatar={avatar}
          forMainMenu={true}
          isChatScreenActive={true}
        />
      );
    }

    hideContentAll();

    if (contentChatRef.current) {
      contentChatRef.current.style.display = 'flex';
    }
  };

  const showSearch = () => {
    if (!clickedSearch) {
      setSearchComponent(
        <SearchUI
          backendUrl={backendUrl}
          userIdFromMe={userId}
          avatarPath={avatar}
          myUsername={username}
          myDisplay={display}
          fullContainerRef={fullContainerRef}
          onClose={() => handleMenuClick('home')}
        />
      );
      setClickedSearch(true);
    }

    hideContentAll();

    if (contentSearchRef.current) {
      contentSearchRef.current.style.display = 'flex';
    }
  };

  const showProfile = () => {
    if (!clickedProfile) {
      setProfileComponent(
        <UserAccount
          key={username}
          profileUsername={username}
          backendUrl={backendUrl}
          userIdFromMe={userId}
        />
      );
      setClickedProfile(true);
    }

    hideContentAll();

    if (contentProfileRef.current) {
      contentProfileRef.current.style.display = 'flex';
    }
  };

  const showExplore = () => {
    if (!clickedExplore) {
      setExploreComponent(
        <ExploreContentUI
          backendUrl={backendUrl}
          userId={userId}
          username={username}
          display={display}
          avatar={avatar}
          fullContainerRef={fullContainerRef}
        />
      );
      setClickedExplore(true);
    }

    hideContentAll();

    if (contentExploreRef.current) {
      contentExploreRef.current.style.display = 'flex';
    }
  };

  const hideContentAll = () => {
    const containers = [
      contentHomeRef,
      contentChatRef,
      contentSearchRef,
      contentProfileRef,
      contentExploreRef
    ];

    containers.forEach((ref) => {
      if (ref.current) {
        ref.current.style.display = 'none';
      }
    });
  };

  useEffect(() => {
    showHome();
    loadUnreadChatCount();
    connectWebSocket();

    return () => {
      // Вақте ки компонент мебандад, агар дар чат бошем, онро тарк мекунем
      leaveCurrentChatIfNeeded();
      
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Муҳим: Вақте activeMenu тағйир ёбад, агар аз чат ба дигар бахш равад, чатро тарк мекунем
  useEffect(() => {
    if (activeMenu !== 'chat') {
      leaveCurrentChatIfNeeded();
    }
    setChatScreenActive(activeMenu === 'chat');
  }, [activeMenu]);

  const getDisplayName = () => {
    return display || username || t('menu.user');
  };

  return (
    <div className="main-menu-container" ref={fullContainerRef}>
      <div className="menu-wrapper">
        {/* Desktop */}
        <div className="desktop-menu">
          <nav className="desktop-nav">
            <button
              className={`nav-button ${activeMenu === 'home' ? 'active' : ''}`}
              onClick={() => handleMenuClick('home')}
            >
              <span className="nav-icon">home</span>
              <span className="nav-text">{t('menu.nav.home')}</span>
            </button>

            <button
              className={`nav-button ${activeMenu === 'search' ? 'active' : ''}`}
              onClick={() => handleMenuClick('search')}
            >
              <span className="nav-icon">search</span>
              <span className="nav-text">{t('menu.nav.search')}</span>
            </button>

            <button
              className={`nav-button ${activeMenu === 'chat' ? 'active' : ''}`}
              onClick={() => handleMenuClick('chat')}
            >
              <span
                className="nav-icon"
                style={{ position: 'relative', display: 'inline-block' }}
              >
                chat
                <span
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    transform: 'translate(50%, -50%)',
                    zIndex: 2,
                  }}
                >
                  {renderChatBadge()}
                </span>
              </span>

              <span className="nav-text">{t('menu.nav.chat')}</span>
            </button>

            <button
              className={`nav-button ${activeMenu === 'explore' ? 'active' : ''}`}
              onClick={() => handleMenuClick('explore')}
            >
              <span className="nav-icon">explore</span>
              <span className="nav-text">{t('menu.nav.explore')}</span>
            </button>

            <button
              className={`nav-button ${activeMenu === 'profile' ? 'active' : ''}`}
              onClick={() => handleMenuClick('profile')}
            >
              <span className="nav-icon">account_circle</span>
              <span className="nav-text">
                {username.charAt(0).toUpperCase() + username.slice(1)}
              </span>
            </button>
          </nav>
        </div>

        {/* Mobile */}
        <div className="mobile-menu">
          <button
            className={`mobile-nav-button ${activeMenu === 'home' ? 'active' : ''}`}
            onClick={() => handleMenuClick('home')}
          >
            <span className="mobile-nav-icon">home</span>
          </button>

          <button
            className={`mobile-nav-button ${activeMenu === 'search' ? 'active' : ''}`}
            onClick={() => handleMenuClick('search')}
          >
            <span className="mobile-nav-icon">search</span>
          </button>

          <button
            className={`mobile-nav-button ${activeMenu === 'chat' ? 'active' : ''}`}
            onClick={() => handleMenuClick('chat')}
          >
            <span
              className="mobile-nav-icon"
              style={{ position: 'relative', display: 'inline-block' }}
            >
              chat
              <span
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  transform: 'translate(50%, -50%)',
                  zIndex: 2,
                }}
              >
                {renderChatBadge()}
              </span>
            </span>
          </button>

          <button
            className={`mobile-nav-button ${activeMenu === 'explore' ? 'active' : ''}`}
            onClick={() => handleMenuClick('explore')}
          >
            <span className="mobile-nav-icon">explore</span>
          </button>

          <button
            className={`mobile-nav-button ${activeMenu === 'profile' ? 'active' : ''}`}
            onClick={() => handleMenuClick('profile')}
          >
            <span className="mobile-nav-icon">account_circle</span>
          </button>
        </div>

        <div className="content-wrapper">
          <div ref={contentHomeRef} className="content-section">
            {homeComponent}
          </div>

          <div
            ref={contentChatRef}
            className="content-section"
            style={{ display: 'none' }}
          >
            {chatComponent}
          </div>

          <div
            ref={contentSearchRef}
            className="content-section"
            style={{ display: 'none' }}
          >
            {searchComponent}
          </div>

          <div
            ref={contentProfileRef}
            className="content-section"
            style={{ display: 'none' }}
          >
            {profileComponent}
          </div>

          <div
            ref={contentExploreRef}
            className="content-section"
            style={{ display: 'none' }}
          >
            {exploreComponent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
