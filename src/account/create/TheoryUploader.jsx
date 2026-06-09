import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './TheoryUploader.css';

const TheoryUploader = ({ backendUrl, userId }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { username } = useParams();

    // State барои нигох доштани квитантсия (масалан, агар дар оянда барои рафтан ба профил лозим шавад)
    const [theoryLink, setTheoryLink] = useState(null);

    // Ref барои дастрасӣ ба элементҳо
    const uploadContainerRef = useRef(null);

    // State барои майдонҳои асосӣ
    const [theoryName, setTheoryName] = useState('');
    const [definition, setDefinition] = useState('');
    const [compatible, setCompatible] = useState('');
    const [opposing, setOpposing] = useState('');
    const [stronger, setStronger] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');

    // State барои бахшҳои A - F (принсипҳо, далелҳо, ...)
    const [sections, setSections] = useState({
        A: { inputs: [] }, // Принсипҳои асосӣ
        B: { inputs: [] }, // Далелҳо
        C: { inputs: [] }, // Хулосаҳо
        D: { inputs: [] }, // Чизҳои радшаванда
        E: { inputs: [] }, // Пешгӯиҳо
        F: { inputs: [] }, // Ҳаддҳо ва заъфҳо
    });

    // State барои истилоҳҳо
    const [terms, setTerms] = useState([]);

    // State барои таблиғ
    const [advertisementEnabled, setAdvertisementEnabled] = useState(false);
    const [advertisementCount, setAdvertisementCount] = useState(0);
    const [advertisementError, setAdvertisementError] = useState('');

    // State барои ҳолати боркунӣ ва пешрафт
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [progressStatus, setProgressStatus] = useState(''); // 'loading', 'completed', 'error'

    // Илова кардани вориди аввал барои ҳар як бахш ва истилоҳ
    useEffect(() => {
        // Агар sections холӣ бошад, барои ҳар як бахш як ворид илова кун
        const initialSections = { ...sections };
        let needsUpdate = false;

        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
            if (!initialSections[letter] || initialSections[letter].inputs.length === 0) {
                initialSections[letter] = { inputs: [{ title: '', description: '' }] };
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            setSections(initialSections);
        }

        // Барои истилоҳҳо як вориди аввал илова кун
        if (terms.length === 0) {
            setTerms([{ term: '', definition: '' }]);
        }
    }, []);

    // Функсия барои иваз кардани арзиши майдонҳои асосӣ
    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
    };

    // Функсия барои иваз кардани арзиши майдонҳои бахшҳо (A - F)
    const handleSectionInputChange = (letter, index, field, value) => {
        setSections(prev => {
            const newSections = { ...prev };
            newSections[letter].inputs[index] = {
                ...newSections[letter].inputs[index],
                [field]: value
            };
            return newSections;
        });
    };

    // Илова кардани вориди нав ба бахш
    const addSectionInput = (letter) => {
        setSections(prev => ({
            ...prev,
            [letter]: {
                inputs: [...prev[letter].inputs, { title: '', description: '' }]
            }
        }));
    };

    // Тоза кардани ворид аз бахш (агар зиёда аз 1 бошад)
    const removeSectionInput = (letter, index) => {
        setSections(prev => {
            if (prev[letter].inputs.length <= 1) return prev;
            const newInputs = prev[letter].inputs.filter((_, i) => i !== index);
            return {
                ...prev,
                [letter]: { inputs: newInputs }
            };
        });
    };

    // Функсия барои иваз кардани арзиши истилоҳҳо
    const handleTermChange = (index, field, value) => {
        setTerms(prev => {
            const newTerms = [...prev];
            newTerms[index] = { ...newTerms[index], [field]: value };
            return newTerms;
        });
    };

    // Илова кардани истилоҳи нав
    const addTerm = () => {
        setTerms(prev => [...prev, { term: '', definition: '' }]);
    };

    // Тоза кардани истилоҳ (агар зиёда аз 1 бошад)
    const removeTerm = (index) => {
        setTerms(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    // Функсия барои идоракуни таблиғ
    const handleAdvertisementToggle = (e) => {
        setAdvertisementEnabled(e.target.checked);
        if (!e.target.checked) {
            setAdvertisementCount(0);
            setAdvertisementError('');
        }
    };

    // Функсия барои санҷиши хатогиҳо пеш аз фиристодан
    const validateFields = () => {
        const errors = [];
        
        // Массив барои нигоҳ доштани номҳои бахшҳо
        const sectionNames = {
            'A': t('theoryUploader.sections.A.title'),
            'B': t('theoryUploader.sections.B.title'),
            'C': t('theoryUploader.sections.C.title'),
            'D': t('theoryUploader.sections.D.title'),
            'E': t('theoryUploader.sections.E.title'),
            'F': t('theoryUploader.sections.F.title')
        };

        // Бахши 0: Номи назария
        if (!theoryName.trim()) {
            errors.push({ message: t('theoryUploader.errors.theoryNameRequired'), field: 'theory-name' });
            return errors;
        }

        // Бахши 1: Таърифи дақиқ
        if (!definition.trim()) {
            errors.push({ message: t('theoryUploader.errors.definitionRequired'), field: 'definition' });
            return errors;
        }

        // Бахши 9: Муносибатҳо
        if (!compatible.trim()) {
            errors.push({ message: t('theoryUploader.errors.compatibleRequired'), field: 'compatible' });
            return errors;
        }
        if (!opposing.trim()) {
            errors.push({ message: t('theoryUploader.errors.opposingRequired'), field: 'opposing' });
            return errors;
        }
        if (!stronger.trim()) {
            errors.push({ message: t('theoryUploader.errors.strongerRequired'), field: 'stronger' });
            return errors;
        }

        // Бахши 10: Маълумоти иловагӣ
        if (!additionalInfo.trim()) {
            errors.push({ message: t('theoryUploader.errors.additionalInfoRequired'), field: 'additional-info' });
            return errors;
        }

        // Санҷиши унвонҳои бахшҳои A то F
        const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

        for (const letter of sectionLetters) {
            const sectionInputs = sections[letter]?.inputs || [];
            for (let i = 0; i < sectionInputs.length; i++) {
                if (!sectionInputs[i].title.trim()) {
                    errors.push({
                        message: t('theoryUploader.errors.sectionTitleRequired', {
                            section: letter,
                            number: i + 1,
                            sectionName: sectionNames[letter]
                        }),
                        section: letter,
                        index: i
                    });
                    return errors;
                }
            }
        }

        // Санҷиши истилоҳҳо
        for (let i = 0; i < terms.length; i++) {
            const term = terms[i].term.trim();
            const def = terms[i].definition.trim();

            // Агар яке пур ва дигаре холӣ бошад
            if ((term && !def) || (!term && def)) {
                errors.push({
                    message: t('theoryUploader.errors.termBothRequired', { number: i + 1 }),
                    type: 'term',
                    index: i
                });
                return errors;
            }

            // Агар ҳарду холӣ бошанд ва ин ягона истилоҳ бошад
            if (!term && !def && i === 0 && terms.length === 1) {
                errors.push({
                    message: t('theoryUploader.errors.termFirstRequired'),
                    type: 'term',
                    index: i
                });
                return errors;
            }
        }

        return errors;
    };

    // Фокуси ба майдони хатогӣ
    const focusOnErrorField = (error) => {
        if (error.field) {
            const element = document.getElementById(error.field);
            if (element) {
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else if (error.section) {
            // Барои бахшҳо, мо ба унвони аввал фокус мекунем
            setTimeout(() => {
                const titleInput = document.querySelector(`[data-section="${error.section}"][data-index="${error.index}"]`);
                if (titleInput) {
                    titleInput.focus();
                    titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        } else if (error.type === 'term') {
            setTimeout(() => {
                const termContainer = document.querySelector(`[data-term-index="${error.index}"]`);
                if (termContainer) {
                    const input = termContainer.querySelector('input[type="text"]');
                    if (input) {
                        input.focus();
                        termContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        }
    };

    // Фиристодани маълумот ба бекенд
    const handleSubmit = async () => {
        // Тоза кардани хатогии таблиғ
        setAdvertisementError('');

        // Санҷиши майдонҳо
        const errors = validateFields();
        if (errors.length > 0) {
            alert(errors[0].message);
            focusOnErrorField(errors[0]);
            return;
        }

        // Тайёр кардани маълумот
        const theoryData = {
            name: theoryName.trim(),
            definition: definition,
            principles: sections.A.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            evidence: sections.B.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            conclusions: sections.C.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            rejections: sections.D.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            predictions: sections.E.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            limitations: sections.F.inputs.filter(inp => inp.title.trim()).map(inp => ({
                title: inp.title,
                description: inp.description
            })),
            terms: terms.filter(t => t.term.trim() && t.definition.trim()).map(t => ({
                term: t.term,
                definition: t.definition
            })),
            relationships: {
                compatible: compatible,
                opposing: opposing,
                stronger_than: stronger
            },
            additional_info: additionalInfo,
            advertisement_checkbox: advertisementEnabled,
            advertisement_count: advertisementEnabled ? advertisementCount : 0
        };

        setIsSubmitting(true);
        setShowProgress(true);
        setProgressValue(0);
        setProgressMessage(t('theoryUploader.progress.starting'));
        setProgressStatus('loading');

        try {
            // 1. Оғози прогресс
            const progressStartResponse = await fetch(`${backendUrl}/theories/progress/${userId}`, {
                method: 'POST',
            });

            if (!progressStartResponse.ok) {
                throw new Error(t('theoryUploader.errors.progressError'));
            }

            // 2. Фиристодани маълумот
            const submitResponse = await fetch(`${backendUrl}/theories/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(theoryData),
            });

            if (submitResponse.status === 408) {
                // Маблағ кофӣ нест
                setAdvertisementError(t('theoryUploader.errors.insufficientFunds'));
                setShowProgress(false);
                setIsSubmitting(false);
                setProgressStatus('error');
                return;
            }

            if (!submitResponse.ok) {
                const errorText = await submitResponse.text();
                throw new Error(t('theoryUploader.errors.submitError', { 
                    message: `${submitResponse.status} - ${errorText}` 
                }));
            }

            const responseData = await submitResponse.json();
            if (responseData.success) {
                // Оғози санҷиши прогресс
                await checkProgress();
            } else {
                throw new Error(responseData.message || t('theoryUploader.errors.unknownError'));
            }

        } catch (error) {
            console.error('Хатогӣ дар фиристодани назария:', error);
            alert(t('theoryUploader.errors.submitError', { message: error.message }));
            setShowProgress(false);
            setIsSubmitting(false);
            setProgressStatus('error');
        }
    };

    // Санҷиши прогресс
    const checkProgress = async () => {
        let isChecking = true;
        let theoryLinkFromProgress = null;

        while (isChecking) {
            try {
                const response = await fetch(`${backendUrl}/theories/progress/${userId}`);
                if (response.ok) {
                    const progressData = await response.json();

                    // Навсозии UI
                    setProgressValue(progressData.progress);
                    setProgressMessage(progressData.message);

                    if (progressData.status === 'completed') {
                        setProgressStatus('completed');
                        theoryLinkFromProgress = progressData.theory_link;
                        // Интизории 1 сония барои дидани 100%
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        isChecking = false;
                    } else if (progressData.status === 'error') {
                        setProgressStatus('error');
                        alert(t('theoryUploader.progress.error'));
                        isChecking = false;
                    }
                } else {
                    // Агар прогресс гирифта нашавад, санҷишро қатъ кун
                    isChecking = false;
                }
            } catch (error) {
                console.error('Хатогӣ дар санҷиши прогресс:', error);
                isChecking = false;
            }

            if (isChecking) {
                // Интизории 0.5 сония то санҷиши навбатӣ
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Пас аз анҷом ёфтан
        setShowProgress(false);
        setIsSubmitting(false);

        navigate(`/theory/${theoryLinkFromProgress}`);
    };

    // Пок кардани ҳамаи воридҳо
    const clearAllInputs = () => {
        setTheoryName('');
        setDefinition('');
        setCompatible('');
        setOpposing('');
        setStronger('');
        setAdditionalInfo('');

        // Пок кардани бахшҳо
        setSections({
            A: { inputs: [{ title: '', description: '' }] },
            B: { inputs: [{ title: '', description: '' }] },
            C: { inputs: [{ title: '', description: '' }] },
            D: { inputs: [{ title: '', description: '' }] },
            E: { inputs: [{ title: '', description: '' }] },
            F: { inputs: [{ title: '', description: '' }] },
        });

        // Пок кардани истилоҳҳо
        setTerms([{ term: '', definition: '' }]);

        // Пок кардани таблиғ
        setAdvertisementEnabled(false);
        setAdvertisementCount(0);
        setAdvertisementError('');
    };

    // Баргаштан ба саҳифаи қаблӣ
    const handleClose = () => {
        if (username) {
            navigate(`/@${username}`);
        } else {
            navigate(-1);
        }
    };

    // Диалоги прогресс
    const renderProgressDialog = () => {
        if (!showProgress) return null;

        return (
            <div className="theory-uploader-progress-overlay">
                <div className="theory-uploader-progress-dialog">
                    <div className="theory-uploader-progress-icon">
                        <span className="material-icons">hourglass_empty</span>
                    </div>
                    <h3 className="theory-uploader-progress-title">
                        {t('theoryUploader.progress.title')}
                    </h3>
                    <div className="theory-uploader-progress-bar-container">
                        <div
                            className="theory-uploader-progress-bar-fill"
                            style={{ width: `${progressValue}%` }}
                        ></div>
                    </div>
                    <div className="theory-uploader-progress-percentage">
                        {progressValue}%
                    </div>
                    <div className="theory-uploader-progress-message">
                        {progressMessage}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            ref={uploadContainerRef}
            className="theory-uploader-container"
        >
            {/* Тугмаи бастан */}
            <button
                className="theory-uploader-close-button"
                onClick={handleClose}
                disabled={isSubmitting}
                title={t('theoryUploader.close')}
            >
                <span className="material-icons">close</span>
            </button>

            <div className="theory-uploader-content">
                {/* Сарлавҳа */}
                <div className="theory-uploader-header">
                    <span className="material-icons theory-uploader-header-icon">
                        emoji_objects
                    </span>
                    <h1 className="theory-uploader-title">
                        {t('theoryUploader.title')}
                    </h1>
                    <p className="theory-uploader-subtitle">
                        {t('theoryUploader.subtitle')}
                    </p>
                </div>

                {/* Бахши 0: Номи Назария */}
                <div className="theory-uploader-section">
                    <div className="theory-uploader-section-header">
                        <span className="material-icons theory-uploader-section-icon">
                            title
                        </span>
                        <h2 className="theory-uploader-section-title">
                            {t('theoryUploader.sections.0.title')}
                        </h2>
                    </div>
                    <input
                        id="theory-name"
                        type="text"
                        placeholder={t('theoryUploader.sections.0.placeholder')}
                        value={theoryName}
                        onChange={handleInputChange(setTheoryName)}
                        className="theory-uploader-input"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Бахши 1: Таърифи дақиқ */}
                <div className="theory-uploader-section">
                    <div className="theory-uploader-section-header">
                        <span className="material-icons theory-uploader-section-icon">
                            description
                        </span>
                        <h2 className="theory-uploader-section-title">
                            {t('theoryUploader.sections.1.title')}
                        </h2>
                    </div>
                    <textarea
                        id="definition"
                        placeholder={t('theoryUploader.sections.1.placeholder')}
                        value={definition}
                        onChange={handleInputChange(setDefinition)}
                        className="theory-uploader-textarea"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Бахшҳои A - F */}
                {[
                    { letter: 'A', title: t('theoryUploader.sections.A.title'), icon: t('theoryUploader.sections.A.icon') },
                    { letter: 'B', title: t('theoryUploader.sections.B.title'), icon: t('theoryUploader.sections.B.icon') },
                    { letter: 'C', title: t('theoryUploader.sections.C.title'), icon: t('theoryUploader.sections.C.icon') },
                    { letter: 'D', title: t('theoryUploader.sections.D.title'), icon: t('theoryUploader.sections.D.icon') },
                    { letter: 'E', title: t('theoryUploader.sections.E.title'), icon: t('theoryUploader.sections.E.icon') },
                    { letter: 'F', title: t('theoryUploader.sections.F.title'), icon: t('theoryUploader.sections.F.icon') }
                ].map(section => (
                    <div key={section.letter} className="theory-uploader-section">
                        <div className="theory-uploader-section-header">
                            <span className="material-icons theory-uploader-section-icon">
                                {section.icon}
                            </span>
                            <h2 className="theory-uploader-section-title">
                                {section.title}
                            </h2>
                        </div>

                        <div className="theory-uploader-inputs-container">
                            {sections[section.letter]?.inputs.map((input, index) => (
                                <div
                                    key={index}
                                    className="theory-uploader-input-card"
                                    data-section={section.letter}
                                    data-index={index}
                                >
                                    <div className="theory-uploader-input-card-header">
                                        <span className="theory-uploader-input-number">
                                            {section.letter}{index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            className="theory-uploader-remove-button"
                                            onClick={() => removeSectionInput(section.letter, index)}
                                            disabled={isSubmitting || sections[section.letter]?.inputs.length <= 1}
                                        >
                                            <span className="material-icons">delete</span>
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('theoryUploader.sections.A.titlePlaceholder')}
                                        value={input.title}
                                        onChange={(e) => handleSectionInputChange(section.letter, index, 'title', e.target.value)}
                                        className="theory-uploader-input"
                                        disabled={isSubmitting}
                                    />
                                    <textarea
                                        placeholder={t('theoryUploader.sections.A.descriptionPlaceholder')}
                                        value={input.description}
                                        onChange={(e) => handleSectionInputChange(section.letter, index, 'description', e.target.value)}
                                        className="theory-uploader-textarea"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="theory-uploader-add-button"
                            onClick={() => addSectionInput(section.letter)}
                            disabled={isSubmitting}
                        >
                            <span className="material-icons">add</span>
                            {t('theoryUploader.sections.A.addButton')}
                        </button>
                    </div>
                ))}

                {/* Бахши 8: Истилоҳҳо */}
                <div className="theory-uploader-section">
                    <div className="theory-uploader-section-header">
                        <span className="material-icons theory-uploader-section-icon">
                            translate
                        </span>
                        <h2 className="theory-uploader-section-title">
                            {t('theoryUploader.sections.terms.title')}
                        </h2>
                    </div>

                    <div className="theory-uploader-inputs-container">
                        {terms.map((term, index) => (
                            <div
                                key={index}
                                className="theory-uploader-input-card"
                                data-term-index={index}
                            >
                                <div className="theory-uploader-input-card-header">
                                    <span className="theory-uploader-input-number">
                                        {t('theoryUploader.sections.terms.termNumber', { number: index + 1 })}
                                    </span>
                                    <button
                                        type="button"
                                        className="theory-uploader-remove-button"
                                        onClick={() => removeTerm(index)}
                                        disabled={isSubmitting || terms.length <= 1}
                                    >
                                        <span className="material-icons">delete</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('theoryUploader.sections.terms.termPlaceholder')}
                                    value={term.term}
                                    onChange={(e) => handleTermChange(index, 'term', e.target.value)}
                                    className="theory-uploader-input"
                                    disabled={isSubmitting}
                                />
                                <textarea
                                    placeholder={t('theoryUploader.sections.terms.definitionPlaceholder')}
                                    value={term.definition}
                                    onChange={(e) => handleTermChange(index, 'definition', e.target.value)}
                                    className="theory-uploader-textarea"
                                    disabled={isSubmitting}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="theory-uploader-add-button"
                        onClick={addTerm}
                        disabled={isSubmitting}
                    >
                        <span className="material-icons">add</span>
                        {t('theoryUploader.sections.terms.addButton')}
                    </button>
                </div>

                {/* Бахши 9: Муносибатҳо */}
                <div className="theory-uploader-section">
                    <div className="theory-uploader-section-header">
                        <span className="material-icons theory-uploader-section-icon">
                            compare_arrows
                        </span>
                        <h2 className="theory-uploader-section-title">
                            {t('theoryUploader.sections.relationships.title')}
                        </h2>
                    </div>

                    <div className="theory-uploader-relationships-container">
                        <div className="theory-uploader-relationship-group">
                            <div className="theory-uploader-relationship-header">
                                <span className="material-icons theory-uploader-relationship-icon green">
                                    check_circle
                                </span>
                                <h3 className="theory-uploader-relationship-title">{t('theoryUploader.sections.relationships.compatible')}</h3>
                            </div>
                            <textarea
                                id="compatible"
                                placeholder={t('theoryUploader.sections.relationships.compatiblePlaceholder')}
                                value={compatible}
                                onChange={handleInputChange(setCompatible)}
                                className="theory-uploader-textarea"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="theory-uploader-relationship-group">
                            <div className="theory-uploader-relationship-header">
                                <span className="material-icons theory-uploader-relationship-icon red">
                                    cancel
                                </span>
                                <h3 className="theory-uploader-relationship-title">{t('theoryUploader.sections.relationships.opposing')}</h3>
                            </div>
                            <textarea
                                id="opposing"
                                placeholder={t('theoryUploader.sections.relationships.opposingPlaceholder')}
                                value={opposing}
                                onChange={handleInputChange(setOpposing)}
                                className="theory-uploader-textarea"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="theory-uploader-relationship-group">
                            <div className="theory-uploader-relationship-header">
                                <span className="material-icons theory-uploader-relationship-icon orange">
                                    military_tech
                                </span>
                                <h3 className="theory-uploader-relationship-title">{t('theoryUploader.sections.relationships.stronger')}</h3>
                            </div>
                            <textarea
                                id="stronger"
                                placeholder={t('theoryUploader.sections.relationships.strongerPlaceholder')}
                                value={stronger}
                                onChange={handleInputChange(setStronger)}
                                className="theory-uploader-textarea"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                {/* Бахши 10: Маълумоти иловагӣ */}
                <div className="theory-uploader-section">
                    <div className="theory-uploader-section-header">
                        <span className="material-icons theory-uploader-section-icon">
                            info
                        </span>
                        <h2 className="theory-uploader-section-title">
                            {t('theoryUploader.sections.additional.title')}
                        </h2>
                    </div>
                    <textarea
                        id="additional-info"
                        placeholder={t('theoryUploader.sections.additional.placeholder')}
                        value={additionalInfo}
                        onChange={handleInputChange(setAdditionalInfo)}
                        className="theory-uploader-textarea"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Бахши таблиғ */}
                <div className="theory-uploader-advertisement-section">
                    <div className="theory-uploader-advertisement-checkbox">
                        <input
                            type="checkbox"
                            id="advertisement-checkbox"
                            checked={advertisementEnabled}
                            onChange={handleAdvertisementToggle}
                            disabled={isSubmitting}
                            className="theory-uploader-advertisement-checkbox-input"
                        />
                        <label
                            htmlFor="advertisement-checkbox"
                            className="theory-uploader-advertisement-checkbox-label"
                        >
                            {t('theoryUploader.sections.advertisement.checkbox')}
                        </label>
                    </div>

                    {advertisementEnabled && (
                        <>
                            <p className="theory-uploader-advertisement-warning">
                                {t('theoryUploader.sections.advertisement.note')}
                            </p>
                            <input
                                type="number"
                                placeholder={t('theoryUploader.sections.advertisement.countPlaceholder')}
                                value={advertisementCount}
                                onChange={(e) => setAdvertisementCount(parseInt(e.target.value) || 0)}
                                className="theory-uploader-advertisement-input"
                                disabled={isSubmitting}
                                min="0"
                            />
                            {advertisementError && (
                                <p className="theory-uploader-advertisement-error">
                                    {advertisementError}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Тугмаи фиристодан */}
                <button
                    className="theory-uploader-submit-button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    <span className="material-icons">check</span>
                    {t('theoryUploader.submit')}
                </button>
            </div>

            {/* Диалоги прогресс */}
            {renderProgressDialog()}
        </div>
    );
};

export default TheoryUploader;