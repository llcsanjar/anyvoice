// CreateArticleModalComponent.jsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import './article.css';
import { useNavigate } from 'react-router-dom';

// Create/Edit Article Modal Component with Quill Editor
const CreateArticleModalComponent = ({ onSuccess, backendUrl, userId, editArticle = null, onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState(editArticle?.title || '');
  const [summary, setSummary] = useState(editArticle?.summary || '');
  const [content, setContent] = useState(editArticle?.content || '');
  const [images, setImages] = useState(editArticle?.images || []);
  const [authorFullName, setAuthorFullName] = useState(editArticle?.author_full_name || editArticle?.full_name || '');
  const [uploadingImages, setUploadingImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // State-ҳои нав барои таблиғ
  const [advertisementCheckbox, setAdvertisementCheckbox] = useState(editArticle?.advertisement_checkbox || false);
  const [advertisementCount, setAdvertisementCount] = useState(editArticle?.advertisement_count || 0);
  
  const fileInputRef = useRef(null);
  const quillRef = useRef(null);
  const isRtl = i18n.language === 'tg' || i18n.language === 'fa' || i18n.language === 'ar';
  
  // ✅ Иловаи useEffect барои навсозии маълумотҳо ҳангоми таҳрир
  useEffect(() => {
    if (editArticle) {
      setTitle(editArticle.title || '');
      setSummary(editArticle.summary || '');
      setContent(editArticle.content || '');
      setImages(editArticle.images || []);
      setAuthorFullName(editArticle.author_full_name || editArticle.full_name || '');
      setAdvertisementCheckbox(editArticle.advertisement_checkbox || false);
      setAdvertisementCount(editArticle.advertisement_count || 0);
    }
  }, [editArticle]);
  
  // Configure Quill modules with proper handlers
  const modules = useRef({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        'code-block': function() {
          const quill = this.quill;
          const range = quill.getSelection();
          
          if (range) {
            const selectedText = quill.getText(range.index, range.length);
            quill.deleteText(range.index, range.length);
            quill.insertEmbed(range.index, 'code-block', selectedText);
          } else {
            const cursorPosition = quill.getLength();
            quill.insertEmbed(cursorPosition, 'code-block', '// Your code here');
            quill.setSelection(cursorPosition + 1);
          }
        }
      }
    },
    syntax: {
      highlight: (text) => {
        try {
          const result = hljs.highlightAuto(text);
          return result.value;
        } catch (e) {
          return text;
        }
      }
    }
  }).current;

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'align',
    'blockquote', 'code-block', 'link', 'image'
  ];
  
  // Функсия барои пӯшидани modal
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/create');
    }
  };
  
  // Upload single image with progress
  const uploadImage = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error(t('article.errors.imageTooLarge')));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + uploadingImages.length + files.length > 10) {
      alert(t('article.errors.tooManyImages'));
      return;
    }
    
    const newUploading = files.map(file => ({ file, progress: 0, status: 'uploading' }));
    setUploadingImages(prev => [...prev, ...newUploading]);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await uploadImage(file);
        setImages(prev => [...prev, dataUrl]);
        setUploadingImages(prev => prev.filter((_, idx) => idx !== i));
      } catch (err) {
        console.error('Upload error:', err);
        alert(err.message);
        setUploadingImages(prev => prev.filter((_, idx) => idx !== i));
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));
  
  // Функсия барои нишон додани хатогиҳо ҳамчун alert
  const showError = (message) => {
    alert(message);
  };
  
  const handleSubmit = async () => {
    // Валидатсияи майдонҳои асосӣ
    if (!title.trim()) { 
      showError(t('article.errors.titleRequired')); 
      return; 
    }
    if (!summary.trim()) { 
      showError(t('article.errors.summaryRequired')); 
      return; 
    }
    if (!content.trim() || content === '<p><br></p>' || content === '<div><br></div>') { 
      showError(t('article.errors.contentRequired')); 
      return; 
    }
    if (!authorFullName.trim()) { 
      showError(t('article.errors.authorNameRequired')); 
      return; 
    }
    
    // Валидатсияи таблиғ
    if (advertisementCheckbox && advertisementCount <= 0) {
      showError(t('article.errors.advertisementCountRequired'));
      return;
    }

    setSubmitting(true);

    try {
      const url = editArticle ? `${backendUrl}/articles/${editArticle.id}` : `${backendUrl}/articles`;
      const method = editArticle ? 'PUT' : 'POST';

      const body = JSON.stringify({ 
        title: title.trim(), 
        summary: summary.trim(), 
        content, 
        images, 
        user_id: userId,
        author_full_name: authorFullName.trim(),
        advertisement_checkbox: advertisementCheckbox,
        advertisement_count: advertisementCheckbox ? advertisementCount : 0
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body
      });
      
      if (response.status === 408) {
        showError(t('article.errors.insufficientFunds'));
        setSubmitting(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || t('article.errors.createError'));
      }

      const data = await response.json();
      
      // Нишон додани паёми муваффақият
      const successMessage = editArticle ? t('article.success.updated') : t('article.success.created');
      alert(successMessage);
      
      if (onSuccess) {
        onSuccess(data.article || data);
      } else {
        const articleData = data.article || data;
        const link = articleData?.link || articleData?.id;
        navigate(`/article/${link}`);
      }
      
      // Пӯшидани modal пас аз муваффақият
      handleClose();

    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="article-components-modal-overlay" onClick={handleClose}>
      <div className="article-components-modal article-components-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="article-components-modal-header">
          <h2>{editArticle ? t('article.editArticle') : t('article.createArticle')}</h2>
          <button className="article-components-close-modal-btn" onClick={handleClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="article-components-modal-body">
          <div className="article-components-create-form">
            {/* Блоки нависанда */}
            <div className="article-components-form-group article-components-author-section">
              <label className="article-components-form-label">
                <span className="article-components-label-icon">
                  <span className="material-symbols-outlined">edit_note</span>
                </span>
                {t('article.authorName')} <span className="article-components-required-star">*</span>
              </label>
              <input 
                type="text" 
                className="article-components-author-name-input"
                value={authorFullName} 
                onChange={(e) => setAuthorFullName(e.target.value)} 
                placeholder={t('article.authorNamePlaceholder')}
                maxLength={100}
              />
              <div className="article-components-form-hint">{t('article.authorNameHint')}</div>
            </div>
            
            <div className="article-components-form-group">
              <label>{t('article.articleTitle')} *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder={t('article.articleTitlePlaceholder')} 
                maxLength={200} 
              />
            </div>
            
            <div className="article-components-form-group">
              <label>{t('article.articleSummary')} *</label>
              <textarea 
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
                placeholder={t('article.articleSummaryPlaceholder')} 
                rows={3} 
                maxLength={500} 
              />
            </div>
            
            <div className="article-components-form-group">
              <label>{t('article.articleContent')} *</label>
              <div className="article-components-quill-editor-container">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder={t('article.articleContentPlaceholder')}
                  style={{ height: '400px', marginBottom: '50px' }}
                />
              </div>
            </div>
            
            <div className="article-components-form-group">
              <label>{t('article.addImages')} ({images.length + uploadingImages.length}/10)</label>
              <div className="article-components-image-upload-area" onClick={() => fileInputRef.current?.click()}>
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>{uploadingImages.length > 0 ? t('article.uploadingImage') : t('article.addImages')}</span>
                <span className="article-components-form-hint">({images.length + uploadingImages.length}/10)</span>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </div>
              {uploadingImages.length > 0 && (
                <div className="article-components-image-upload-progress">
                  {uploadingImages.map((img, idx) => (
                    <div key={idx}>{t('article.uploading')} {img.file.name}...</div>
                  ))}
                </div>
              )}
              {images.length > 0 && (
                <div className="article-components-image-preview-container">
                  {images.map((img, idx) => (
                    <div key={idx} className="article-components-image-preview">
                      <img src={img} alt={t('article.imagePreview')} />
                      <button className="article-components-remove-image-btn" onClick={() => removeImage(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Қисмати таблиғ - НАВ */}
            <div className="article-components-advertisement-section">
              <div className="article-components-advertisement-checkbox">
                <input
                  type="checkbox"
                  id="advertisement-checkbox"
                  checked={advertisementCheckbox}
                  onChange={(e) => setAdvertisementCheckbox(e.target.checked)}
                  className="article-components-advertisement-checkbox-input"
                />
                <label htmlFor="advertisement-checkbox" className="article-components-advertisement-checkbox-label">
                  <span className="material-symbols-outlined">campaign</span>
                  {t('article.advertisement')}
                </label>
              </div>
              
              {advertisementCheckbox && (
                <>
                  <p className="article-components-advertisement-warning">
                    <span className="material-symbols-outlined">info</span>
                    {t('article.advertisementWarning')}
                  </p>
                  <div className="article-components-advertisement-input-group">
                    <label className="article-components-advertisement-input-label">
                      {t('article.advertisementCountLabel')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder={t('article.advertisementCountPlaceholder')}
                      value={advertisementCount}
                      onChange={(e) => setAdvertisementCount(parseInt(e.target.value) || 0)}
                      className="article-components-advertisement-input"
                    />
                    {advertisementCount > 0 && (
                      <div className="article-components-advertisement-cost">
                        {t('article.advertisementCost')}: <strong>{(advertisementCount / 100).toFixed(2)} TJS</strong>
                        <span className="advertisement-note"> ({advertisementCount} {t('article.impressions')})</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="article-components-modal-footer">
          <button 
            className="article-components-submit-article-btn" 
            onClick={handleSubmit} 
            disabled={submitting || uploadingImages.length > 0}
          >
            {submitting ? (
              <>
                <span className="article-components-loading-spinner-small"></span>
                {editArticle ? t('article.submitting') : t('article.creating')}
              </>
            ) : (
              editArticle ? t('article.edit') : t('article.submit')
            )}
          </button>
          <button className="article-components-toolbar-btn" onClick={handleClose}>
            {t('article.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArticleModalComponent;