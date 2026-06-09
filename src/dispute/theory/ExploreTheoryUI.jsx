// src/ExploreTheoryUI.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Spin, message } from 'antd';
import TheoryLoader from './TheoryLoader';
import './theory.css';

const ExploreTheoryUI = ({
  userId,
  backendUrl,
  avatarPath,
  myUsername,
  myDisplay,
  fullContainerRef, // Гирифтани ref аз menu.js
}) => {
  const { t } = useTranslation();
  const limit = 20;

  const [theories, setTheories] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noMoreTheories, setNoMoreTheories] = useState(false);

  const containerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 🔒 request lock
  const isFetchingRef = useRef(false);

  // 🛑 флаг ниҳоӣ – дигар ҳеҷ гоҳ боргирӣ нашавад
  const hasEndedRef = useRef(false);

  // 👀 seen ids
  const seenTheoryIdsRef = useRef(new Set());

  // =========================
  // Placeholders
  // =========================
  const createPlaceholders = (count) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
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
      );
    }
    setPlaceholders(items);
  };

  const clearPlaceholders = () => setPlaceholders([]);

  // =========================
  // Load Theories
  // =========================
  const loadMoreTheories = useCallback(async () => {
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
      const excludeIds = Array.from(seenTheoryIdsRef.current);

      const res = await axios.get(`${backendUrl}/get-random-theories`, {
        params: {
          limit,
          user_id: userId,
          exclude_ids: excludeIds
        },
        paramsSerializer: { indexes: null }
      });

      const theoriesData = res.data.theories || [];

      // ❌ дигар расм нест → қатъи абадӣ
      if (!theoriesData.length) {
        hasEndedRef.current = true;
        setNoMoreTheories(true);
        clearPlaceholders();
        return;
      }

      theoriesData.forEach(v => seenTheoryIdsRef.current.add(v.id));

      setTheories(prev => [
        ...prev,
        ...theoriesData.map(v => ({
          ...v,
          key: `${v.id}-${Date.now()}`
        }))
      ]);

      clearPlaceholders();
    } catch (err) {
      message.error(t('theory.error'));
      clearPlaceholders();
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [backendUrl, userId, loading, t]);

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
          loadMoreTheories();
        }
      }, 100);
    };

    el.addEventListener('scroll', onScroll);

    // боргирии аввал
    if (theories.length === 0) {
      loadMoreTheories();
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [loadMoreTheories, theories.length]);

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto',
          gridAutoRows: 'auto', // Муҳим: Бояд 'auto' бошад
          alignItems: 'start'   // Муҳим: Ба боло align кардан
        }}
      >
        {theories.map(theory => (
          <div
            key={theory.key}
            style={{
              transition: 'transform 0.2s ease',
              height: 'auto', // Муҳим: Худкор андозагирӣ
              display: 'flex' // Барои пурра кардани баландии кард
            }}
            className="theory-card"
          >
            <TheoryLoader
              theoryId={theory.id}
              containerId={`theory-${theory.id}`}
              backendUrl={backendUrl}
              userId={userId}
              avatarPath={avatarPath}
              myUsername={myUsername}
              myDisplay={myDisplay}
              userIdOfTheory={theory.user_id}
              fullContainerRef={fullContainerRef}
            />
          </div>
        ))}

        {placeholders}

        {loading && !noMoreTheories && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          /* Барои кардҳо */
          .theory-card {
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  );
};

export default ExploreTheoryUI;