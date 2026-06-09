import React, { useState } from 'react';
import ExploreVideoUI from '../explore/ExploreVideoUI';
import ExploreImageUI from '../explore/ExploreImageUI';
import ExploreArticleUI from './article/ArticlesList';
import { useTranslation } from 'react-i18next';

const ExploreContentUI = (props) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('video');
  const [loadedTabs, setLoadedTabs] = useState({ video: true });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoadedTabs((prev) => ({
      ...prev,
      [tab]: true,
    }));
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#303030' }}>
      
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          padding: '12px',
          background: '#1f1f1f',
          borderBottom: '1px solid #444'
        }}
      >
        <button
          onClick={() => handleTabChange('video')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'video' ? '#1890ff' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {t('explore.video')}
        </button>

        <button
          onClick={() => handleTabChange('image')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'image' ? '#1890ff' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {t('explore.image')}
        </button>

        <button
          onClick={() => handleTabChange('article')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'article' ? '#1890ff' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {t('explore.article')}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        
        {loadedTabs.video && (
          <div style={{ display: activeTab === 'video' ? 'block' : 'none', height: '100%' }}>
            <ExploreVideoUI {...props} />
          </div>
        )}

        {loadedTabs.image && (
          <div style={{ display: activeTab === 'image' ? 'block' : 'none', height: '100%' }}>
            <ExploreImageUI {...props} />
          </div>
        )}

        {loadedTabs.article && (
          <div style={{ display: activeTab === 'article' ? 'block' : 'none', height: '100%' }}>
            <ExploreArticleUI {...props} />
          </div>
        )}

      </div>
    </div>
  );
};

export default ExploreContentUI;