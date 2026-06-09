// src/supported/ReactionToTheories.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message, Tabs } from 'antd';
import TheoryLoader from '../dispute/theory/TheoryLoader';
import '../dispute/theory/theory.css';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const ReactionToTheories = ({
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
  const [activeTab, setActiveTab] = useState('confirmed');
  
  // ==================== Ҳолат барои назарияҳои тасдиқшуда ====================
  const [confirmedTheories, setConfirmedTheories] = useState([]);
  const [confirmedPlaceholders, setConfirmedPlaceholders] = useState([]);
  const [confirmedLoading, setConfirmedLoading] = useState(false);
  const [noMoreConfirmed, setNoMoreConfirmed] = useState(false);
  const seenConfirmedIdsRef = useRef(new Set());
  const hasConfirmedEndedRef = useRef(false);
  const isFetchingConfirmedRef = useRef(false);

  // ==================== Ҳолат барои назарияҳои радшуда ====================
  const [rejectedTheories, setRejectedTheories] = useState([]);
  const [rejectedPlaceholders, setRejectedPlaceholders] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [noMoreRejected, setNoMoreRejected] = useState(false);
  const seenRejectedIdsRef = useRef(new Set());
  const hasRejectedEndedRef = useRef(false);
  const isFetchingRejectedRef = useRef(false);

  const isMountedRef = useRef(true);
  const internalContainerRef = useRef(null);
  
  // Истифодаи ref аз берун агар мавҷуд бошад, вагарна ref дохилӣ
  const containerRef = fullContainerRef || internalContainerRef;
  
  const limit = 10;

  // =========================
  // Placeholders барои назарияҳо
  // =========================
  const createTheoryPlaceholders = (count, type) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div className="theory-placeholder" key={`${type}-placeholder-${i}`}>
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
      );
    }
    
    if (type === 'confirmed') {
      setConfirmedPlaceholders(items);
    } else {
      setRejectedPlaceholders(items);
    }
  };

  const clearPlaceholders = (type) => {
    if (type === 'confirmed') {
      setConfirmedPlaceholders([]);
    } else {
      setRejectedPlaceholders([]);
    }
  };

  // =========================
  // Боргирии назарияҳои тасдиқшуда
  // =========================
  const loadMoreConfirmed = useCallback(async () => {
    if (
      isFetchingConfirmedRef.current ||
      confirmedLoading ||
      hasConfirmedEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'confirmed'
    ) {
      return;
    }

    isFetchingConfirmedRef.current = true;
    setConfirmedLoading(true);
    createTheoryPlaceholders(limit, 'confirmed');

    try {
      const excludeIds = Array.from(seenConfirmedIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-confirmed-theory`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const theoriesData = response.data.theories || [];

      if (!theoriesData.length) {
        hasConfirmedEndedRef.current = true;
        setNoMoreConfirmed(true);
        clearPlaceholders('confirmed');
        return;
      }

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validTheoriesData = theoriesData.filter(t => t && t.id);
      
      validTheoriesData.forEach(v => seenConfirmedIdsRef.current.add(v.id));

      setConfirmedTheories(prev => [
        ...prev,
        ...validTheoriesData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearPlaceholders('confirmed');
    } catch (err) {
      message.error(t('reactionToTheories.error'));
      clearPlaceholders('confirmed');
    } finally {
      setConfirmedLoading(false);
      isFetchingConfirmedRef.current = false;
    }
  }, [backendUrl, userId, confirmedLoading, activeTab, t]);

  // =========================
  // Боргирии назарияҳои радшуда
  // =========================
  const loadMoreRejected = useCallback(async () => {
    if (
      isFetchingRejectedRef.current ||
      rejectedLoading ||
      hasRejectedEndedRef.current ||
      !isMountedRef.current ||
      activeTab !== 'rejected'
    ) {
      return;
    }

    isFetchingRejectedRef.current = true;
    setRejectedLoading(true);
    createTheoryPlaceholders(limit, 'rejected');

    try {
      const excludeIds = Array.from(seenRejectedIdsRef.current);

      const response = await axios.get(`${backendUrl}/get-user-rejected-theory`, {
        params: {
          limit,
          user_id: userId,
          requester_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const theoriesData = response.data.theories || [];

      if (!theoriesData.length) {
        hasRejectedEndedRef.current = true;
        setNoMoreRejected(true);
        clearPlaceholders('rejected');
        return;
      }

      // Санҷидани мавҷудияти id дар ҳар элемент
      const validTheoriesData = theoriesData.filter(t => t && t.id);
      
      validTheoriesData.forEach(v => seenRejectedIdsRef.current.add(v.id));

      setRejectedTheories(prev => [
        ...prev,
        ...validTheoriesData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearPlaceholders('rejected');
    } catch (err) {
      message.error(t('reactionToTheories.error'));
      clearPlaceholders('rejected');
    } finally {
      setRejectedLoading(false);
      isFetchingRejectedRef.current = false;
    }
  }, [backendUrl, userId, rejectedLoading, activeTab, t]);

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
          if (activeTab === 'confirmed') {
            loadMoreConfirmed();
          } else if (activeTab === 'rejected') {
            loadMoreRejected();
          }
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreConfirmed, loadMoreRejected, activeTab, containerRef]);

  // =========================
  // Боргирии аввал вобаста ба tab
  // =========================
  useEffect(() => {
    if (activeTab === 'confirmed' && confirmedTheories.length === 0 && !hasConfirmedEndedRef.current) {
      loadMoreConfirmed();
    } else if (activeTab === 'rejected' && rejectedTheories.length === 0 && !hasRejectedEndedRef.current) {
      loadMoreRejected();
    }
  }, [activeTab, confirmedTheories.length, rejectedTheories.length, loadMoreConfirmed, loadMoreRejected]);

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
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#303030'
      }}
    >
      <button 
          className="back-from-account-button"
          onClick={() => navigate(`/@${username}`)}
        >
          ← {t('reactionToTheories.back')}
      </button>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        centered
        size="large"
        style={{ marginBottom: 24 }}
        tabBarStyle={{ color: '#fff' }}
      >
        <TabPane tab={t('reactionToTheories.tabs.confirmed')} key="confirmed" />
        <TabPane tab={t('reactionToTheories.tabs.rejected')} key="rejected" />
      </Tabs>

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
        {/* Назарияҳои тасдиқшуда */}
        {activeTab === 'confirmed' && (
          <>
            {confirmedTheories.length > 0 ? (
              confirmedTheories.map(theory => {
                // Санҷидани мавҷудияти id
                if (!theory || !theory.id) {
                  return null;
                }
                
                return (
                  <div
                    key={theory.key || theory.id}
                    style={{
                      transition: 'transform 0.2s ease',
                      height: 'auto',
                      display: 'flex'
                    }}
                    className="theory-card"
                  >
                    <TheoryLoader
                      theoryId={theory.id}
                      containerId={`confirmed-theory-${theory.id}`}
                      backendUrl={backendUrl}
                      userId={userId}
                      avatarPath={avatar}
                      myUsername={username}
                      myDisplay={display}
                      userIdOfTheory={theory.user_id}
                      fullContainerRef={containerRef}
                    />
                  </div>
                );
              }).filter(Boolean)
            ) : (
              !confirmedLoading && !noMoreConfirmed && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('reactionToTheories.noConfirmed')}
                </div>
              )
            )}

            {confirmedPlaceholders}

            {confirmedLoading && !noMoreConfirmed && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}
          </>
        )}

        {/* Назарияҳои радшуда */}
        {activeTab === 'rejected' && (
          <>
            {rejectedTheories.length > 0 ? (
              rejectedTheories.map(theory => {
                // Санҷидани мавҷудияти id
                if (!theory || !theory.id) {
                  return null;
                }
                
                return (
                  <div
                    key={theory.key || theory.id}
                    style={{
                      transition: 'transform 0.2s ease',
                      height: 'auto',
                      display: 'flex'
                    }}
                    className="theory-card"
                  >
                    <TheoryLoader
                      theoryId={theory.id}
                      containerId={`rejected-theory-${theory.id}`}
                      backendUrl={backendUrl}
                      userId={userId}
                      avatarPath={avatar}
                      myUsername={username}
                      myDisplay={display}
                      userIdOfTheory={theory.user_id}
                      fullContainerRef={containerRef}
                    />
                  </div>
                );
              }).filter(Boolean)
            ) : (
              !rejectedLoading && !noMoreRejected && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#fff' }}>
                  {t('reactionToTheories.noRejected')}
                </div>
              )
            )}

            {rejectedPlaceholders}

            {rejectedLoading && !noMoreRejected && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}

          </>
        )}

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
          
          .theory-card {
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  );
};

export default ReactionToTheories;