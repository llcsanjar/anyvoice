// authentication/Privacy.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Privacy.css';

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="privacy-container">
      <div className="privacy-paper">
        <div className="privacy-header">
          <div className="privacy-header-decoration"></div>
          <h1 className="privacy-title">{t('privacy.title')}</h1>
          <p className="privacy-subtitle">{t('privacy.subtitle')}</p>
        </div>

        <div className="privacy-body">
          {/* Бахши 1: Қабули шартҳо */}
          <div className="privacy-section">
            <div className="section-icon">📜</div>
            <div className="section-content">
              <h2>{t('privacy.section1.title')}</h2>
              <p>{t('privacy.section1.content')}</p>
            </div>
          </div>

          {/* Бахши 2: Махфияти пурраи маълумот */}
          <div className="privacy-section">
            <div className="section-icon">🔒</div>
            <div className="section-content">
              <h2>{t('privacy.section2.title')}</h2>
              <p>{t('privacy.section2.content')}</p>
              <ul className="privacy-list">
                <li>{t('privacy.section2.list1')}</li>
                <li>{t('privacy.section2.list2')}</li>
                <li>{t('privacy.section2.list3')}</li>
                <li>{t('privacy.section2.list4')}</li>
                <li>{t('privacy.section2.list5')}</li>
              </ul>
              <div className="security-box">
                <span className="security-icon">🛡️</span>
                <span>{t('privacy.section2.security')}</span>
              </div>
            </div>
          </div>

          {/* Бахши 3: Масъулият ва рафтори корбар */}
          <div className="privacy-section">
            <div className="section-icon">⚖️</div>
            <div className="section-content">
              <h2>{t('privacy.section3.title')}</h2>
              <p>{t('privacy.section3.content')}</p>
              <ul className="privacy-list">
                <li>{t('privacy.section3.list1')}</li>
                <li>{t('privacy.section3.list2')}</li>
                <li>{t('privacy.section3.list3')}</li>
                <li>{t('privacy.section3.list4')}</li>
                <li>{t('privacy.section3.list5')}</li>
                <li>{t('privacy.section3.list6')}</li>
                <li>{t('privacy.section3.list7')}</li>
              </ul>
              <div className="warning-box">
                <span className="warning-icon">⚠️</span>
                <span>{t('privacy.section3.warning')}</span>
              </div>
            </div>
          </div>

          {/* Бахши 4: Ҳеҷ гоҳ фош нашавии маълумот */}
          <div className="privacy-section">
            <div className="section-icon">🔐</div>
            <div className="section-content">
              <h2>{t('privacy.section4.title')}</h2>
              <p>{t('privacy.section4.content')}</p>
              <div className="strong-warning-box">
                <span className="strong-warning-icon">⚡</span>
                <span>{t('privacy.section4.strongWarning')}</span>
              </div>
            </div>
          </div>

          {/* Бахши 5: Назорати маълумот - Рейдҳо */}
          <div className="privacy-section">
            <div className="section-icon">👁️</div>
            <div className="section-content">
              <h2>{t('privacy.section5.title')}</h2>
              <p>{t('privacy.section5.content')}</p>
              <div className="raid-box">
                <span className="raid-icon">🔍</span>
                <span>{t('privacy.section5.raidInfo')}</span>
              </div>
              <div className="info-box">
                <span className="info-icon">ℹ️</span>
                <span>{t('privacy.section5.info')}</span>
              </div>
            </div>
          </div>

          {/* Бахши 6: Тағйироти шартҳо */}
          <div className="privacy-section">
            <div className="section-icon">🔄</div>
            <div className="section-content">
              <h2>{t('privacy.section6.title')}</h2>
              <p>{t('privacy.section6.content')}</p>
            </div>
          </div>

          {/* Бахши 7: Тамос */}
          <div className="privacy-section">
            <div className="section-icon">📧</div>
            <div className="section-content">
              <h2>{t('privacy.section7.title')}</h2>
              <p>{t('privacy.section7.content')}</p>
              <div className="contact-info">
                <a href="mailto:llcsanjar@gmail.com" className="contact-email">
                  llcsanjar@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="privacy-footer">
          <div className="footer-separator"></div>
          <p className="footer-text">{t('privacy.footer')}</p>
          <p className="privacy-date">{t('privacy.lastUpdated')}</p>
          <div className="footer-stamp">
            <span>✓ {t('privacy.effective')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;