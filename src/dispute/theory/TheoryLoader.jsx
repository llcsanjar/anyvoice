import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './theory.css';
import CommentComponent from '../../explore/comment';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const TheoryLoader = ({
  theoryId,
  backendUrl,
  userId,
  avatarPath,
  myUsername,
  myDisplay,
  userIdOfTheory,
  commentId = null,
  fullContainerRef = null,
  isAd = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State-ҳо барои маълумотҳо
  const [theory, setTheory] = useState(null);
  const [hasFullData, setHasFullData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDebate, setShowDebate] = useState(false);
  const [editSectionInputs, setEditSectionInputs] = useState({});
  const [editTermsInputs, setEditTermsInputs] = useState([]);
  const [link, setLink] = useState(null);
  
  // State-ҳо барои омор
  const [countReadings, setCountReadings] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [confirmationsCount, setConfirmationsCount] = useState(0);
  const [rejectionsCount, setRejectionsCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  
  // State-ҳо барои амалҳо
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [AdvertisementCheckbox, setAdvertisementCheckbox] = useState(false);
  const [AdvertisementCount, setAdvertisementCount] = useState(0);
  
  // State-ҳо барои мунозира
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Ref-ҳо
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const shareContainerRef = useRef(null);
  const commentsContainerRef = useRef(null);

  // State-ҳои нав барои ҷустуҷӯ
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Илова кардани state барои ҳазф
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDeleted, setIsDeleted] = useState(false);

  // Маълумотҳои бахшҳо
  const sections = [
    { letter: 'A', title: t('theory.sections.principles'), key: 'principles', icon: 'architecture' },
    { letter: 'B', title: t('theory.sections.evidence'), key: 'evidence', icon: 'psychology' },
    { letter: 'C', title: t('theory.sections.conclusions'), key: 'conclusions', icon: 'insights' },
    { letter: 'D', title: t('theory.sections.rejections'), key: 'rejections', icon: 'block' },
    { letter: 'E', title: t('theory.sections.predictions'), key: 'predictions', icon: 'trending_up' },
    { letter: 'F', title: t('theory.sections.limitations'), key: 'limitations', icon: 'warning' }
  ];

  // Функсияи time_ago
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

    if (seconds < minute) return t('theory.timeAgo.secondsAgo');
    if (seconds < hour) {
      const minutes = Math.floor(seconds / minute);
      return minutes > 1 ? t('theory.timeAgo.minutesAgo', { count: minutes }) : t('theory.timeAgo.minuteAgo');
    }
    if (seconds < day) {
      const hours = Math.floor(seconds / hour);
      return hours > 1 ? t('theory.timeAgo.hoursAgo', { count: hours }) : t('theory.timeAgo.hourAgo');
    }
    if (seconds < week) {
      const days = Math.floor(seconds / day);
      return days > 1 ? t('theory.timeAgo.daysAgo', { count: days }) : t('theory.timeAgo.dayAgo');
    }
    if (seconds < month) {
      const weeks = Math.floor(seconds / week);
      return weeks > 1 ? t('theory.timeAgo.weeksAgo', { count: weeks }) : t('theory.timeAgo.weekAgo');
    }
    if (seconds < year) {
      const months = Math.floor(seconds / month);
      return months > 1 ? t('theory.timeAgo.monthsAgo', { count: months }) : t('theory.timeAgo.monthAgo');
    }
    const years = Math.floor(seconds / year);
    return years > 1 ? t('theory.timeAgo.yearsAgo', { count: years }) : t('theory.timeAgo.yearAgo');
  };

  // Боргирии маълумоти пурра
  const loadFullTheoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${backendUrl}/theories/${theoryId}/full`);
      if (response.ok) {
        const fullData = await response.json();
        
        setTheory(prev => ({ ...prev, ...fullData }));
        setLink(fullData.link);
        setAdvertisementCheckbox(fullData.advertisement_checkbox);
        setAdvertisementCount(fullData.advertisement_count);
        setCountReadings(fullData.count_readings || 0);
        setCommentCount(fullData.CountComment || 0);
        setConfirmationsCount(fullData.count_confirmations || 0);
        setRejectionsCount(fullData.count_rejections || 0);
        setShareCount(fullData.CountShare || 0);
        setSaveCount(fullData.CountSave || 0);
        setHasFullData(true);
        
        return fullData.link; // ← link-ро баргардонед
      }
    } catch (error) {
      console.error("Хатогӣ дар боргирии маълумоти пурра:", error);
    } finally {
      setIsLoading(false);
    }
  }, [theoryId, backendUrl]);

  // Санҷиши ҳолати корбар
  const checkUserStatus = async () => {
    try {
      // Санҷиши тасдиқ
      const confirmResponse = await fetch(
        `${backendUrl}/check-status-confirmation-theory?user_id=${userId}&theory_id=${theoryId}`
      );
      if (confirmResponse.ok) {
        const confirmData = await confirmResponse.json();
        setIsConfirmed(confirmData || false);
      }
      
      // Санҷиши рад
      const rejectResponse = await fetch(
        `${backendUrl}/check-status-rejection-theory?user_id=${userId}&theory_id=${theoryId}`
      );
      if (rejectResponse.ok) {
        const rejectData = await rejectResponse.json();
        setIsRejected(rejectData || false);
      }
      
      // Санҷиши ҳифз
      const saveResponse = await fetch(
        `${backendUrl}/check-save-theory-status?theory_id=${theoryId}&user_id=${userId}`
      );
      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        setIsSaved(saveData.saved || false);
      }
    } catch (error) {
      console.error("Хатогӣ дар санҷиши ҳолати корбар:", error);
    }
  };

  // Оғоз кардани WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsScheme = backendUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${wsScheme}://${backendUrl.replace('https://', '').replace('http://', '')}/ws/updates-theory/${theoryId}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Хатогӣ дар коркарди паёми WebSocket:', error);
          }
        };
        
        ws.onclose = (event) => {
          // Такроркунии пайвастшавӣ
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ Хатои WebSocket:', error);
        };
      } catch (error) {
        console.error('❌ Хатогӣ дар пайвастшавии WebSocket:', error);
      }
    };
    
    if (theoryId) {
      connectWebSocket();
      loadFullTheoryData();

      // Иловаи даъвати checkUserStatus
      checkUserStatus();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [theoryId, backendUrl, loadFullTheoryData]);

  // Коркарди паёмҳои WebSocket
  const handleWebSocketMessage = (data) => {
    const messageType = data.type;
    
    switch (messageType) {
      case 'count_readings_updated':
      case 'theory_updated':
        if (data.theory_id === theoryId) {
          setCountReadings(data.count_readings || data.value);
        }
        break;
      
      case 'share_count':
        if (data.theory_id === theoryId) {
          setShareCount(data.value);
        }
        break;
      
      case 'comment_count':
        setCommentCount(data.value);
        break;

      case 'save_count':
        if (data.user_id === userId) {
          setIsSaved(data.saved);
          setSaveCount(data.value);
        } else if (data.theory_id === theoryId) {
          setSaveCount(data.value);
        }
        break;
      
      case 'confirmation_count':
        if (data.theory_id === theoryId) {
          setConfirmationsCount(data.count_confirmations || 0);
          setRejectionsCount(data.count_rejections || 0);
        }
        break;
      
      case 'rejection_count':
        if (data.theory_id === theoryId) {
          setRejectionsCount(data.count_rejections || 0);
          setConfirmationsCount(data.count_confirmations || 0);
        }
        break;
      
      case 'theory_deleted':
        if (data.theory_id === theoryId) {
          setIsDeleted(true);
          setShowDetail(false);
          setShowDebate(false);
          setShowEdit(false);
          setShowShare(false);
          setShowDeleteConfirm(false);
        }
        break;
      
      default:
    }
  };

  // Намоиши тафсилоти назария
  const showTheoryDetail = async () => {
    try {
      let currentLink = link; // ← link-и ҷориро нигоҳ доред
      
      if (!hasFullData) {
        setIsLoading(true);
        const fullData = await fetch(`${backendUrl}/theories/${theoryId}/full`).then(r => r.json());
        setTheory(prev => ({ ...prev, ...fullData }));
        setLink(fullData.link);
        setAdvertisementCheckbox(fullData.advertisement_checkbox);
        setAdvertisementCount(fullData.advertisement_count);
        setHasFullData(true);
        
        currentLink = fullData.link; // ← link-и навро нигоҳ доред
      }

      // Сабти хондани назария
      await fetch(`${backendUrl}/theories/${theoryId}/read/${userId}`, {
        method: 'POST',
      });


      // Навсозии URL
      const theoryUrl = currentLink || theoryId; // ← Ҳамон link-и дурустро истифода баред
      window.history.pushState({ theoryId: theoryId }, '', `/theory/${theoryUrl}`);

      setShowDetail(true);

    } catch (error) {
      console.error('Хатогӣ дар намоиши тафсилот:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (commentId) {
      const openTheoryAndStartDebate = async () => {
        // 1. Аввал назарияро кушоед
        await showTheoryDetail();

        // 3. Баъд мунозираро оғоз кунед
        startDebate();
      };
      
      openTheoryAndStartDebate();
    }
  }, [commentId]);

  useEffect(() => {
    if (isAd) {
      showTheoryDetail();
    }
  }, [isAd]);

  // Таҳрири назария
  const handleEditTheory = () => {
    setShowEdit(true);
  };

  // Илова кардани вориди нави бахш
  const addEditSectionInput = (sectionLetter, title = '', description = '') => {
    setEditSectionInputs(prev => {
      const section = prev[sectionLetter] || { inputs: [] };
      const newInput = { title, description };
      return {
        ...prev,
        [sectionLetter]: {
          ...section,
          inputs: [...section.inputs, newInput]
        }
      };
    });
  };

  // Ҳазфи вориди бахш
  const deleteEditSectionInput = (sectionLetter, index) => {
    alert(index)
    setEditSectionInputs(prev => {
      const section = prev[sectionLetter];
      if (!section || section.inputs.length <= 1) return prev;
      
      const newInputs = section.inputs.filter((_, i) => i !== index);
      return {
        ...prev,
        [sectionLetter]: {
          ...section,
          inputs: newInputs
        }
      };
    });
  };

  // Илова кардани истилоҳи нав
  const addEditNewTerm = (term = '', definition = '') => {
    setEditTermsInputs(prev => [...prev, { term, definition }]);
  };

  // Ҳазфи истилоҳ
  const deleteEditTerm = (index) => {
    if (editTermsInputs.length <= 1) return;
    setEditTermsInputs(prev => prev.filter((_, i) => i !== index));
  };

  // Навсозии назария
  const updateTheory = async () => {
    try {
      const errors = [];
      
      // Санҷиши номи назария
      const theoryName = document.getElementById('edit-theory-name').value.trim();
      if (!theoryName) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-theory-name' });
      }
      
      // Санҷиши таърифи дақиқ
      const definition = document.getElementById('edit-definition').value.trim();
      if (!definition) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-definition' });
      }
      
      // Санҷиши муносибатҳо
      const compatible = document.getElementById('edit-compatible').value.trim();
      if (!compatible) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-compatible' });
      }
      
      const opposing = document.getElementById('edit-opposing').value.trim();
      if (!opposing) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-opposing' });
      }
      
      const stronger = document.getElementById('edit-stronger').value.trim();
      if (!stronger) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-stronger' });
      }
      
      // Санҷиши маълумоти иловагӣ
      const additionalInfo = document.getElementById('edit-additional-info').value.trim();
      if (!additionalInfo) {
        errors.push({ message: t('theory.errors.updateError'), field: 'edit-additional-info' });
      }
      
      // Санҷиши унвонҳои бахшҳо
      let sectionError = null;
      sections.forEach(section => {
        const sectionInputs = editSectionInputs[section.letter]?.inputs || [];
        
        sectionInputs.forEach((input, index) => {
          if (!input.title.trim() && !sectionError) {
            sectionError = { 
              message: t('theory.errors.updateError'), 
              section: section.letter,
              index: index 
            };
          }
        });
      });
      
      if (sectionError) {
        errors.push(sectionError);
      }
      
      // Санҷиши истилоҳҳо
      editTermsInputs.forEach((term, index) => {
        const termText = term.term.trim();
        const definitionText = term.definition.trim();
        
        if ((termText && !definitionText) || (!termText && definitionText)) {
          errors.push({ 
            message: t('theory.errors.updateError'), 
            type: 'term', 
            index: index 
          });
        } else if (!termText && !definitionText) {
          if (index === 0 && editTermsInputs.length === 1) {
            errors.push({ 
              message: t('theory.errors.updateError'), 
              type: 'term', 
              index: 0 
            });
          }
        }
      });
      
      // Агар хатогиҳо вуҷуд доранд
      if (errors.length > 0) {
        const firstError = errors[0];
        alert(firstError.message);
        
        // Фокуси ба майдони хатогӣ
        if (firstError.field) {
          const fieldElement = document.getElementById(firstError.field);
          if (fieldElement) {
            fieldElement.focus();
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (firstError.section) {
          const sectionLetter = firstError.section;
          const sectionIndex = firstError.index;
          
          setTimeout(() => {
            const titleInput = document.querySelector(`[data-input-id="${sectionLetter}-title-${sectionIndex}"]`);
            if (titleInput) {
              titleInput.focus();
              titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              titleInput.classList.add('error-input');
              
              setTimeout(() => {
                titleInput.classList.remove('error-input');
              }, 3000);
            }
          }, 100);
        } else if (firstError.type === 'term') {
          setTimeout(() => {
            const termContainer = document.querySelector(`[data-term-index="${firstError.index}"]`);
            if (termContainer) {
              const termInput = termContainer.querySelector('input[type="text"]');
              if (termInput) {
                termInput.focus();
                termContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 100);
        }
        
        return;
      }
      
      // Тайёр кардани маълумотҳо барои фиристодан
      const theoryData = {
        name: theoryName,
        definition: definition,
        principles: [],
        evidence: [],
        conclusions: [],
        rejections: [],
        predictions: [],
        limitations: [],
        terms: editTermsInputs.filter(
          term => term.term.trim() && term.definition.trim()
        ),
        relationships: {
          compatible: compatible,
          opposing: opposing,
          stronger_than: stronger
        },
        additional_info: additionalInfo,
        advertisement_count: AdvertisementCheckbox ? AdvertisementCount : 0,
        advertisement_checkbox: AdvertisementCheckbox,
        previous_advertisement_count: theory?.AdvertisementCount || 0,
        previous_advertisement_checkbox: theory?.AdvertisementCheckbox || false
      };

      sections.forEach(section => {
        const sectionInputs = editSectionInputs[section.letter]?.inputs || [];
        theoryData[section.key] = sectionInputs
          .filter(input => input.title.trim())
          .map(input => ({
            title: input.title,
            description: input.description
          }));
      });

      const response = await fetch(
        `${backendUrl}/theories/${theoryId}?user_id=${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(theoryData),
        }
      );

      if (response.status === 408) {
        alert(t('theory.errors.insufficientFunds'));
        return;
      }

      if (!response.ok) {
        throw new Error(t('theory.errors.updateError'));
      }

      setTheory(prev => ({ ...prev, ...theoryData }));
      setShowEdit(false);

      setEditSectionInputs({});
      setEditTermsInputs([]);

      await loadFullTheoryData();

    } catch (error) {
      console.error('Хатогӣ дар навсозии назария:', error);
      alert(t('theory.errors.updateError') + ': ' + error.message);
    }
  };

  // Баҳамдиҳии назария
  const handleShare = () => {
    setShowShare(true);
  };

  // Бекор кардани мубодила
  const handleCancelShare = async (accountId) => {
    try {
      const response = await fetch(`${backendUrl}/cancel-share-theory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: accountId,
          theory_id: theoryId,
        }),
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => prev.filter(id => id !== accountId));
        setSearchResults(prev => prev.map(account => 
          account.id === accountId ? { ...account, isShared: false } : account
        ));
      }
    } catch (error) {
      console.error('Хатогӣ дар бекор кардани мубодила:', error);
    }
  };

  // Ирсоли назария ба корбари дигар
  const shareToAccount = async (accountId) => {
    try {
      const response = await fetch(`${backendUrl}/share-theory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_user_id: userId,
          to_user_id: accountId,
          theory_id: theoryId,
        }),
      });
      
      if (response.ok) {
        setSelectedAccounts(prev => [...prev, accountId]);
        setSearchResults(prev => prev.map(account => 
          account.id === accountId ? { ...account, isShared: true } : account
        ));
      }
    } catch (error) {
      console.error('Хатогӣ дар баҳамдиҳии назария:', error);
    }
  };

  // Функсияи ҳазфи назария
  const handleDeleteTheory = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`${backendUrl}/delete-theory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          theory_id: theoryId,
        }),
      });
      
      if (response.ok) {
        setShowDeleteConfirm(false);
        setShowDetail(false);
        
        alert(t('theory.delete.success'));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || t('theory.errors.deleteError'));
      }
    } catch (error) {
      console.error('Хатогӣ дар ҳазфи назария:', error);
      alert(t('theory.errors.deleteError') + ': ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Модали тасдиқи ҳазф
  const renderDeleteConfirmationModal = () => {
    if (!showDeleteConfirm) return null;
    
    return (
      <div className="delete-confirmation-modal">
        <div className="delete-confirmation-content">
          <div className="warning-icon-container">
            <span className="material-icons warning-icon">
              warning
            </span>
          </div>
          
          <div className="warning-text">
            <h2 className="warning-title">
              {t('theory.delete.title')}
            </h2>
            <p className="warning-message">
              {t('theory.delete.confirmation')}
            </p>
            <p className="warning-danger">
              {t('theory.delete.warning')}
            </p>
          </div>
          
          <div className="warning-buttons">
            <button
              className="warning-cancel-button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              {t('theory.delete.cancel')}
            </button>
            
            <button
              className={`warning-delete-button ${isDeleting ? 'deleting' : ''}`}
              onClick={handleDeleteTheory}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="loading-spinner small-spinner"></span>
                  {t('theory.delete.deleting')}
                </>
              ) : t('theory.delete.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Тасдиқ кардани назария
  const handleConfirmation = async () => {
    try {
      const endpoint = isConfirmed ? 'theory-confirmation-delete' : 'theory-confirmation-save';
      const response = await fetch(
        `${backendUrl}/${endpoint}?user_id=${userId}&theory_id=${theoryId}`
      );
      
      if (response.ok) {
        setIsConfirmed(!isConfirmed);
        if (isRejected) {
          setIsRejected(false);
        }
      }
    } catch (error) {
      console.error('Хатогӣ дар тасдиқ кардани назария:', error);
    }
  };

  // Рад кардани назария
  const handleRejection = async () => {
    try {
      const endpoint = isRejected ? 'theory-rejection-delete' : 'theory-rejection-save';
      const response = await fetch(
        `${backendUrl}/${endpoint}?user_id=${userId}&theory_id=${theoryId}`
      );
      
      if (response.ok) {
        setIsRejected(!isRejected);
        if (isConfirmed) {
          setIsConfirmed(false);
        }
      }
    } catch (error) {
      console.error('Хатогӣ дар рад кардани назария:', error);
    }
  };

  // Оғози мунозира
  const startDebate = async () => {
    setShowDebate(true);
  };

  // Ҷустуҷӯи корбарон барои баҳамдиҳӣ
  const searchAccounts = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setAccountSearchLoading(false);
      return;
    }
    
    setAccountSearchLoading(true);
    
    try {
      const response = await fetch(
        `${backendUrl}/accounts?user_id=${userId}&search=${term}`
      );
      
      if (response.ok) {
        const accounts = await response.json();
        if (Array.isArray(accounts)) {
          let sharedAccounts = [];

          const results = accounts.map(account => ({
            ...account,
            isShared: sharedAccounts.includes(account.id) || selectedAccounts.includes(account.id)
          }));
          setSearchResults(results);
        } else if (accounts.message) {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Хатогӣ дар ҷустуҷӯи корбарон:', error);
      setSearchResults([]);
    } finally {
      setAccountSearchLoading(false);
    }
  };

  // Ҳифзи назария
  const handleSave = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/save-theory?user_id=${userId}&theory_id=${theoryId}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setIsSaved(result.saved || false);
      }
    } catch (error) {
      console.error('Хатогӣ дар ҳифзи назария:', error);
    }
  };

  // Pӯшидани модалҳо
  const closeModal = (modalName) => {
    switch (modalName) {
      case 'detail':
        setShowDetail(false);
        window.history.pushState(null, '', '/');
        break;
      case 'share':
        setShowShare(false);
        setSearchResults([]);
        setSearchTerm('');
        break;
      case 'debate':
        setShowDebate(false);
        break;
      case 'edit':
        setShowEdit(false);
        break;
    }
  };

  // Initialize edit inputs when theory loads
  useEffect(() => {
    if (theory && showEdit) {
      sections.forEach(section => {
        const items = theory[section.key] || [];
        items.forEach(item => {
          addEditSectionInput(section.letter, item.title, item.description);
        });
        
        if (items.length === 0) {
          addEditSectionInput(section.letter);
        }
      });
      
      const terms = theory.terms || [];
      terms.forEach(term => {
        addEditNewTerm(term.term, term.definition);
      });
      
      if (terms.length === 0) {
        addEditNewTerm();
      }
    }
  }, [theory, showEdit]);

  // Функсияи баргардонидани карди асосӣ
  const renderBasicCard = () => {
    if (!theory) return null;
    
    const timeAgoText = timeAgo(theory.created_at);
    const username = theory.display || theory.username;
    const theoryUpdated = theory.updated

    return (
      <div 
        id={`theory-card-${theory.id}`}
        className={`theory-card ${isDeleted ? 'theory-card--disabled' : ''}`}
        onClick={!isDeleted ? showTheoryDetail : undefined}
      >
        <div className='theory-thumbnail-container'>
          <div className='theory-info'>
            <div className='theory-title'>
              {theory.name?.length > 148 
                ? `${theory.name.substring(0, 148)}...`
                : theory.name}
            </div>
            <div className='theory-description'>
              {theory.definition?.length > 148 
                ? `${theory.definition.substring(0, 148)}...`
                : theory.definition}
            </div>
          </div>

          <div className="custom-divider" />
          
          <div className='theory-action'>
            <div className="action-box">
                <span className="material-icons action-icon action-icon--reading">
                    library_books
                </span>
                <span className="action-count">
                    {countReadings}
                </span>
                <span className="action-label">{t('theory.read')}</span>
            </div>

            <div className="action-box">
                <span className="material-icons action-icon action-icon--confirm">
                    task_alt
                </span>
                <span className="action-count">
                    {confirmationsCount}
                </span>
                <span className="action-label">{t('theory.confirm')}</span>
            </div>

            <div className="action-box">
                <span className="material-icons action-icon action-icon--reject">
                    highlight_off
                </span>
                <span className="action-count">
                    {rejectionsCount}
                </span>
                <span className="action-label">{t('theory.reject')}</span>
            </div>

            <div className="action-box">
                <span className="material-icons action-icon action-icon--comment">
                    forum
                </span>
                <span className="action-count">
                    {commentCount}
                </span>
                <span className="action-label">{t('theory.debate')}</span>
            </div>

          </div>
          
          <div className="custom-divider" /> 

          <div className="author-container">
            <img 
              src={theory.avatar ? `data:image/jpeg;base64,${theory.avatar}` : avatarPath}
              alt="Avatar"
              className="author-avatar"
            />
            <span className="author-name">
                {username}
            </span>
          </div>

          <div className="time-container">
            <span className="material-icons time-icon">
              schedule
            </span>
            <span className="time-text">
              {timeAgoText}
            </span>
          </div>

          {theoryUpdated && (
            <div className="edit-container">
              <span className="material-icons edit-icon">
                edit
              </span>
              <span className="edit-text">
                {t('theory.edited')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (theory?.link) {
      navigator.clipboard.writeText(`https://www.anyvoice.world/theory/${theory.link}`)
        .then(() => alert(t('theory.linkCopied')))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  const reportTheory = () => {
    const reason = prompt(t('theory.report.prompt'));
    if (!reason || !reason.trim()) return;

    fetch(`${backendUrl}/report-theory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        theory_id: theoryId,
        reason: reason.trim()
      })
    })
      .then(async response => {
        if (response.ok) {
          alert(t('theory.report.success'));
          return;
        }

        if (response.status === 401) {
          alert(t('theory.report.alreadyReported'));
          return;
        }

        const errorText = await response.text();
        console.error('Report error:', errorText);
        alert(t('theory.report.error'));
      })
      .catch(err => {
        console.error('Error reporting theory:', err);
        alert(t('theory.report.error'));
      });
  };

  // Рендери модали тафсилот
  const renderTheoryDetailModal = () => {
    if (!theory || !hasFullData) return null;

    const theoryUpdated = theory.updated

    return (
      <div className="theory-modal-overlay">
        <div className="theory-modal">
          <div className="full-content-container">
            <div className="theory-header gradient-blue-purple">
              <div className="header-content">
                <div className="header-info">
                  <h1 className='author-title'>{theory.name}</h1>
                  <div className="author-info">
                    <img 
                      src={theory.avatar ? `data:image/jpeg;base64,${theory.avatar}` : avatarPath}
                      alt="Avatar"
                      className="author-avatar large"
                    />
                    <div className="author-details">
                      <span 
                        className="text-link message-text"
                        onClick={() => navigate(`/@${theory.username}`)}
                      >
                        {theory.username}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="close-modal-button"
                  onClick={() => closeModal('detail')}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>
            
            <div className="section-card section-definition">
              <div className="section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    description
                  </span>
                  <h2 className="section-title">
                    {t('theory.definition')}
                  </h2>
                </div>
                <p className="definition-text">
                  {theory.definition}
                </p>
              </div>
            </div>
            
            {sections.map(section => {
              const items = theory[section.key];
              if (!items || items.length === 0) return null;

              return (
                <div key={section.key} className="section-card section-content-card">
                  <div className="section-content">
                    <div className="section-header">
                      <span className={`material-icons section-icon black`}>
                        {section.icon}
                      </span>
                      <h2 className="section-title">
                        {section.title}
                      </h2>
                    </div>
                    
                    <div className="items-container">
                      {items.map((item, index) => (
                        <div key={index} className="section-item">
                          <div className="item-content">
                            <div className="item-header">
                              <span className="item-number">
                                {section.letter}{index + 1}
                              </span>
                              <span className="item-title">
                                {item.title}
                              </span>
                            </div>
                            
                            {item.description && (
                              <p className="item-description">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {theory.terms && theory.terms.length > 0 && (
              <div className="section-card section-terms">
                <div className="section-content">
                  <div className="section-header">
                    <span className="material-icons section-icon black">
                      translate
                    </span>
                    <h2 className="section-title">
                      {t('theory.terms')}
                    </h2>
                  </div>
                  
                  <div className={`terms-grid ${theory.terms.length === 1 ? 'single-term' : 'multiple-terms'}`}>
                    {theory.terms.map((term, index) => (
                      <div key={index} className="term-card">
                        <div className="term-content">
                          <span className="term-title">
                            {term.term}
                          </span>
                          <span className="term-definition">
                            {term.definition}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {theory.relationships && (
              <div className="section-card section-relationships">
                <div className="section-content">
                  <div className="section-header">
                    <span className="material-icons section-icon black">
                      compare_arrows
                    </span>
                    <h2 className="section-title">
                      {t('theory.relationships.title')}
                    </h2>
                  </div>
                  
                  <div className="relationships-container">
                    {theory.relationships.compatible && (
                      <div className="relationship-card compatible">
                        <div className="relationship-content">
                          <div className="relationship-header">
                            <span className="material-icons relationship-icon green">
                              check_circle
                            </span>
                            <h3 className="relationship-type">
                              {t('theory.relationships.compatible')}
                            </h3>
                          </div>
                          <p className="relationship-text">
                            {theory.relationships.compatible}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {theory.relationships.opposing && (
                      <div className="relationship-card opposing">
                        <div className="relationship-content">
                          <div className="relationship-header">
                            <span className="material-icons relationship-icon red">
                              cancel
                            </span>
                            <h3 className="relationship-type">
                              {t('theory.relationships.opposing')}
                            </h3>
                          </div>
                          <p className="relationship-text">
                            {theory.relationships.opposing}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {theory.relationships.stronger_than && (
                      <div className="relationship-card stronger">
                        <div className="relationship-content">
                          <div className="relationship-header">
                            <span className="material-icons relationship-icon orange">
                              military_tech
                            </span>
                            <h3 className="relationship-type">
                              {t('theory.relationships.stronger')}
                            </h3>
                          </div>
                          <p className="relationship-text">
                            {theory.relationships.stronger_than}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {theory.additional_info && (
              <div className="section-card section-additional">
                <div className="section-content">
                  <div className="section-header">
                    <span className="material-icons section-icon black">
                      info
                    </span>
                    <h2 className="section-title">
                      {t('theory.additionalInfo')}
                    </h2>
                  </div>
                  <p className="additional-text">
                    {theory.additional_info}
                  </p>
                </div>
              </div>
            )}

            {theoryUpdated && (
              <div className="edit-container">
                <span className="material-icons edit-icon">
                  edit
                </span>
                <span className="edit-text" style={{ fontSize: "1rem" }}>
                  {t('theory.edited')}
                </span>
              </div>
            )}

            <div className="actions-footer">
              <div className="actions-decorative-line"></div>

              <div className="actions-container">

                {(
                  <div className="action-button-container">
                    <button 
                      className="action-button copy-button"
                      onClick={copyLinkToClipboard}
                    >
                      <div className="button-overlay"></div>
                      <span className="material-icons action-button-icon">
                        content_copy
                      </span>
                      <span className="action-button-text">
                        {t('theory.link')}
                      </span>
                    </button>
                  </div>
                )}

                {theory.user_id === userId && (
                  <div className="action-button-container">
                    <button 
                      className="action-button edit-button"
                      onClick={handleEditTheory}
                    >
                      <div className="button-overlay"></div>
                      <span className="material-icons action-button-icon">
                        edit
                      </span>
                      <span className="action-button-text">
                        {t('theory.editButton')}
                      </span>
                    </button>
                  </div>
                )}

                {theory.user_id !== userId && (
                  <div className="action-button-container">
                    <button 
                      className="action-button report-button"
                      onClick={reportTheory}
                    >
                      <div className="button-overlay"></div>
                      <span className="material-icons action-button-icon">
                        report
                      </span>
                      <span className="action-button-text">
                        {t('theory.report.title')}
                      </span>
                    </button>
                  </div>
                )}

                <div className="action-button-container">
                  <button 
                    className="action-button share-theory-button"
                    onClick={handleShare}
                  >
                    <div className="button-overlay"></div>
                    <div className="action-button-with-count">
                      <span className="material-icons action-button-icon">
                        share
                      </span>
                      <span className="action-count-value">
                        {shareCount}
                      </span>
                    </div>
                    <span className="action-button-text">
                      {t('theory.share.title')}
                    </span>
                  </button>
                </div>

                <div className="action-button-container">
                  <button 
                    className={`action-button confirm-button ${isConfirmed ? 'active' : ''}`}
                    onClick={handleConfirmation}
                  >
                    <div className={`button-overlay ${isConfirmed ? 'active' : ''}`}></div>
                    <div className="action-button-with-count">
                      <span className="material-icons action-button-icon">
                        task_alt
                      </span>
                      <span className="action-count-value">
                        {confirmationsCount}
                      </span>
                    </div>
                    <span className="action-button-text">
                      {t('theory.confirm')}
                    </span>
                  </button>
                </div>

                <div className="action-button-container">
                  <button 
                    className={`action-button reject-button ${isRejected ? 'active' : ''}`}
                    onClick={handleRejection}
                  >
                    <div className={`button-overlay ${isRejected ? 'active' : ''}`}></div>
                    <div className="action-button-with-count">
                      <span className="material-icons action-button-icon">
                        highlight_off
                      </span>
                      <span className="action-count-value">
                        {rejectionsCount}
                      </span>
                    </div>
                    <span className="action-button-text">
                      {t('theory.reject')}
                    </span>
                  </button>
                </div>

                <div className="action-button-container">
                  <button 
                    className="action-button debate-button"
                    onClick={startDebate}
                  >
                    <div className="button-overlay"></div>
                    <div className="action-button-with-count">
                      <span className="material-icons action-button-icon">
                        forum
                      </span>
                      <span className="action-count-value">
                        {commentCount}
                      </span>
                    </div>
                    <span className="action-button-text">
                      {t('theory.debate')}
                    </span>
                  </button>
                </div>

                <div className="action-button-container">
                  <button 
                    className={`action-button save-theory-button ${isSaved ? 'active' : ''}`}
                    onClick={handleSave}
                  >
                    <div className={`button-overlay ${isSaved ? 'active' : ''}`}></div>
                    <div className="action-button-with-count">
                      <span className="material-icons action-button-icon">
                        bookmark
                      </span>
                      <span className="action-count-value">
                        {saveCount}
                      </span>
                    </div>
                    <span className="action-button-text">
                      {t('theory.save')}
                    </span>
                  </button>
                </div>

                {theory.user_id === userId && (
                  <div className="action-button-container">
                    <button 
                      className="action-button delete-button"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <div className="button-overlay"></div>
                      <span className="material-icons action-button-icon">
                        delete
                      </span>
                      <span className="action-button-text">
                        {t('theory.deleteButton')}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="actions-bottom-line"></div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // Рендери модали баҳамдиҳӣ
  const renderShareModal = () => {
    if (!showShare) return null;
    
    return (
      <div className="image-modal-overlay">
        <div className="theory-modal">
          <div className="share-modal-container">
            <div className="share-modal-header">
              {t('theory.share.title')}
            </div>
            
            <div className="share-search-container">
              <div className="search-container">
                <input 
                  type="text"
                  placeholder={t('theory.share.searchPlaceholder')}
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    
                    if (searchTimeout) {
                      clearTimeout(searchTimeout);
                    }
                    
                    setAccountSearchLoading(true);
                    
                    const timeoutId = setTimeout(() => {
                      searchAccounts(value);
                    }, 500);
                    
                    setSearchTimeout(timeoutId);
                  }}
                />
                {accountSearchLoading && (
                  <div className="search-loading">
                    <span className="loading-spinner"></span>
                    <span>{t('theory.share.searching')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="search-results-container">
              {accountSearchLoading && searchResults.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>{t('theory.share.searching')}</p>
                </div>
              ) : searchResults.length === 0 && searchTerm.trim() ? (
                <div className="no-results">
                  <p>{t('theory.share.noResults')}</p>
                </div>
              ) : (
                <div className="accounts-list">
                  {searchResults.map(account => (
                    <div 
                      key={account.id}
                      className="account-item"
                    >
                      <div className="account-info">
                        <img 
                          src={account.avatar} 
                          alt="Avatar"
                          className="account-avatar"
                          onError={(e) => {
                            e.target.src = '/default-avatar.png';
                          }}
                        />
                        <div className="account-details">
                          <div className={`account-display-name ${!account.display_name ? 'primary' : 'secondary'}`}>
                            @{account.username}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className={`share-theory-action-button ${account.isShared ? 'cancel' : 'send'}`}
                        onClick={() => {
                          if (account.isShared) {
                            handleCancelShare(account.id);
                          } else {
                            shareToAccount(account.id);
                          }
                        }}
                      >
                        {account.isShared ? t('theory.share.cancel') : t('theory.share.send')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              className="close-modal-button"
              onClick={() => closeModal('share')}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендери модали мунозира
  const renderDebateModal = () => {
    if (!showDebate) return null;

    return (
      <div className="theory-modal-overlay">
        <div className="theory-modal">
          <div className="comments-modal" ref={commentsContainerRef}>
            <div className="modal-header">
              <button className="back-theory-button" onClick={() => closeModal('debate')}>←</button>
              <h3>{t('theory.comments')} (<span className="comment-count-value">{commentCount}</span>)</h3>
            </div>

            <CommentComponent
              backendUrl={backendUrl}
              userIdFromMe={userIdOfTheory}
              userId={userId}
              postId={theoryId}
              typePost="theory"
              selectedCommentId={commentId}
            />
          </div>
        </div>
      </div>
    );
  };

  // Рендери модали таҳрир
  const renderEditModal = () => {
    if (!theory || !showEdit) return null;

    return (
      <div className="theory-modal-overlay">
        <div className="theory-modal">
          <div className="edit-modal-container">
            <div className="edit-header">
              <span className="material-icons edit-header-icon">
                emoji_objects
              </span>
              <h1 className="edit-title">{t('theory.edit.title')}</h1>
              <p className="edit-subtitle">{t('theory.edit.subtitle')}</p>
            </div>
            
            <div className="section-card edit-section">
              <div className="edit-section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    title
                  </span>
                  <h2 className="section-title">{t('theory.edit.theoryName')}</h2>
                </div>
                <input 
                  id="edit-theory-name"
                  type="text"
                  placeholder={t('theory.edit.placeholder.theoryName')}
                  defaultValue={theory.name}
                  className="edit-input"
                />
              </div>
            </div>
            
            <div className="section-card edit-section">
              <div className="edit-section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    description
                  </span>
                  <h2 className="section-title">{t('theory.edit.definition')}</h2>
                </div>
                <textarea 
                  id="edit-definition"
                  placeholder={t('theory.edit.placeholder.definition')}
                  defaultValue={theory.definition}
                  className="edit-textarea large"
                />
              </div>
            </div>
            
            {sections.map(section => {
              const sectionInputs = editSectionInputs[section.letter]?.inputs || [];
              
              return (
                <div key={section.letter} className="section-card edit-section">
                  <div className="edit-section-content">
                    <div className="section-header edit-section-header">
                      <div className="section-title-container">
                        <span className="material-icons section-icon black">
                          {section.icon}
                        </span>
                        <h2 className="section-title">
                          {section.title}
                        </h2>
                      </div>
                    </div>
                    
                    <div className="edit-inputs-container">
                      {sectionInputs.map((input, index) => (
                        <div
                          key={index}
                          className="edit-input-card"
                          data-input-id={`${section.letter}-title-${index}`}
                        >
                          <div className="edit-input-content">
                            <div className="edit-input-header">
                              <span className="input-number">
                                {section.letter}{index + 1}
                              </span>

                              <button
                                type="button"
                                className="delete-input-button"
                                onClick={() => deleteEditSectionInput(section.letter, index)}
                              >
                                <span className="material-icons">
                                  delete
                                </span>
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder={t('theory.edit.placeholder.term')}
                              value={input.title}
                              className="edit-input"
                              onChange={(e) => {
                                setEditSectionInputs(prev => ({
                                  ...prev,
                                  [section.letter]: {
                                    inputs: prev[section.letter].inputs.map((item, i) =>
                                      i === index ? { ...item, title: e.target.value } : item
                                    )
                                  }
                                }));
                              }}
                            />

                            <textarea
                              placeholder={t('theory.edit.placeholder.definition')}
                              value={input.description}
                              className="edit-textarea"
                              onChange={(e) => {
                                setEditSectionInputs(prev => ({
                                  ...prev,
                                  [section.letter]: {
                                    inputs: prev[section.letter].inputs.map((item, i) =>
                                      i === index ? { ...item, description: e.target.value } : item
                                    )
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="add-input-button-container">
                      <button 
                        className="add-input-button"
                        onClick={() => addEditSectionInput(section.letter)}
                      >
                        <span className="material-icons">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="section-card edit-section">
              <div className="edit-section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    translate
                  </span>
                  <h2 className="section-title">{t('theory.edit.terms')}</h2>
                </div>
                
                <div className="edit-inputs-container">
                  {editTermsInputs.map((term, index) => (
                    <div
                      key={index}
                      className="edit-input-card"
                      data-term-index={index}
                    >
                      <div className="edit-input-content">
                        <div className="edit-input-header">
                          <span className="input-number">
                            {t('theory.edit.placeholder.term')} #{index + 1}
                          </span>

                          <button
                            type="button"
                            className="delete-input-button"
                            onClick={() => deleteEditTerm(index)}
                          >
                            <span className="material-icons">
                              delete
                            </span>
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder={t('theory.edit.placeholder.term')}
                          value={term.term}
                          className="edit-input"
                          onChange={(e) => {
                            setEditTermsInputs(prev =>
                              prev.map((item, i) =>
                                i === index ? { ...item, term: e.target.value } : item
                              )
                            );
                          }}
                        />

                        <textarea
                          placeholder={t('theory.edit.placeholder.definition')}
                          value={term.definition}
                          className="edit-textarea"
                          onChange={(e) => {
                            setEditTermsInputs(prev =>
                              prev.map((item, i) =>
                                i === index ? { ...item, definition: e.target.value } : item
                              )
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="add-input-button-container">
                  <button 
                    className="add-input-button"
                    onClick={() => addEditNewTerm()}
                  >
                    <span className="material-icons">add</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="section-card edit-section">
              <div className="edit-section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    compare_arrows
                  </span>
                  <h2 className="section-title">{t('theory.edit.relationships')}</h2>
                </div>
                
                <div className="relationships-edit-container">
                  <div className="relationship-edit-group">
                    <div className="relationship-edit-header">
                      <span className="material-icons relationship-edit-icon green">
                        check_circle
                      </span>
                      <h3 className="relationship-edit-title">{t('theory.relationships.compatible')}:</h3>
                    </div>
                    <textarea 
                      id="edit-compatible"
                      placeholder={t('theory.edit.placeholder.compatible')}
                      defaultValue={theory.relationships?.compatible || ''}
                      className="edit-textarea relationship-textarea"
                    />
                  </div>
                  
                  <div className="relationship-edit-group">
                    <div className="relationship-edit-header">
                      <span className="material-icons relationship-edit-icon red">
                        cancel
                      </span>
                      <h3 className="relationship-edit-title">{t('theory.relationships.opposing')}:</h3>
                    </div>
                    <textarea 
                      id="edit-opposing"
                      placeholder={t('theory.edit.placeholder.opposing')}
                      defaultValue={theory.relationships?.opposing || ''}
                      className="edit-textarea relationship-textarea"
                    />
                  </div>
                  
                  <div className="relationship-edit-group">
                    <div className="relationship-edit-header">
                      <span className="material-icons relationship-edit-icon orange">
                        military_tech
                      </span>
                      <h3 className="relationship-edit-title">{t('theory.relationships.stronger')}:</h3>
                    </div>
                    <textarea 
                      id="edit-stronger"
                      placeholder={t('theory.edit.placeholder.stronger')}
                      defaultValue={theory.relationships?.stronger_than || ''}
                      className="edit-textarea relationship-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section-card edit-section">
              <div className="edit-section-content">
                <div className="section-header">
                  <span className="material-icons section-icon black">
                    info
                  </span>
                  <h2 className="section-title">{t('theory.edit.additionalInfo')}</h2>
                </div>
                <textarea 
                  id="edit-additional-info"
                  placeholder={t('theory.edit.placeholder.additionalInfo')}
                  defaultValue={theory.additional_info || ''}
                  className="edit-textarea large"
                />
              </div>
            </div>
            
            <div className="advertisement-section">
              <div className="advertisement-checkbox">
                <input 
                  type="checkbox"
                  id="advertisement-checkbox"
                  checked={AdvertisementCheckbox}
                  onChange={(e) => setAdvertisementCheckbox(e.target.checked)}
                  className="advertisement-checkbox-input"
                />
                <label htmlFor="advertisement-checkbox" className="advertisement-checkbox-label">
                  {t('theory.edit.advertisement')}
                </label>
              </div>
              
              {AdvertisementCheckbox && (
                <>
                  <p className="advertisement-warning">
                    {t('theory.edit.advertisementWarning')}
                  </p>
                  
                  <input 
                    type="number"
                    placeholder={t('theory.edit.advertisementCount')}
                    value={AdvertisementCount}
                    onChange={(e) => setAdvertisementCount(parseInt(e.target.value) || 0)}
                    className="advertisement-input"
                  />
                </>
              )}
            </div>
            
            <div className="edit-buttons-container">
              <button 
                className="update-theory-button"
                onClick={updateTheory}
              >
                <span className="update-button-text">
                  {t('theory.edit.save')}
                </span>
              </button>
            </div>
            
            <button 
              className="close-modal-button"
              onClick={() => closeModal('edit')}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !theory) {
    return (
      <div ref={containerRef} className="loading-container">
        <div className="loading-spinner large"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {renderBasicCard()}
      
      {showDetail && fullContainerRef?.current &&
        createPortal(renderTheoryDetailModal(), fullContainerRef.current)
      }
      {showShare && fullContainerRef?.current &&
        createPortal(renderShareModal(), fullContainerRef.current)
      }
      {showDebate && fullContainerRef?.current &&
        createPortal(renderDebateModal(), fullContainerRef.current)
      }
      {showEdit && fullContainerRef?.current &&
        createPortal(renderEditModal(), fullContainerRef.current)
      }
      {showDeleteConfirm && fullContainerRef?.current &&
        createPortal(renderDeleteConfirmationModal(), fullContainerRef.current)
      }
    </div>
  );
};

export default TheoryLoader;