// frontend/src/components/chat.jsx

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmojiPicker from 'emoji-picker-react';
import './chat.css';

// бояд ки бахши чати махфи низ вуҷуд дошта бошад



// бояд ки чат барои freelancer-ҳо низ вуҷуд дошта бошад бо тамоми имконот
// Имконоте ки бояд бошад:
// на фақат барои фрилансер балки барои кор
// бояд ки шартнома ҳам дошта бошад ва дар он имзо монда шавад
// ягон паёмро дар он ҳазф ё тағйир дода нашавад 
// дар он бояд ки иттилоти шахси монанди паспорт пурсида шавад то дар профил ҳамроҳ шавад
// резюма ҳам ба профил ҳамроҳ карда шавад ҳамчун CV шояд бо pdf 
// бояд ки барои кор кардан резюма пур карда шавад ва ба номи фрофил сабт шавад ва ҳар вақте ки корбар мехоҳад тағйир дода шавад:
// дар резюма сину сол вазъияти оиладори ва кор таҳсилоти ҷойи зист ва тамоми иттилоти шахси пурсида ва пур карда шавад
// пул равон карда шавад 


// ҳал кардани мушкили код равон накардан ба email

// бояд ки корбар файл ҳамроҳ карда тавонад дар чат.

// сохтани печатает ...

// мушкили инҷсот ки вақте ки корбар аз як аккаунт хориҷ мешавад ва вориди дигари мешавад онгоҳ ҳардуро в сети нишон медиҳад ки нодуруст аст бояд ки фақат навашро в сети нишон диҳад на пешинаҳояшро

// бояд огоҳиномаҳои дохили бошад дар ҳамма ҷо ҳам намоиш дода шавад ва ба вебсокет пайваст бошад

// бояд ки ба паёми корбар смайлик монда шавад

// бояд ки вақте ки ягон паём равон мекунам аз инпут фокусаш канда нашавад
// вақте ки номи аслии корбар дар комент клик мешавад вориди аккаунт намешавад чаро?

// бояд ки дар барнома ҳам маҳсулро харида шавад
// дар барномаи мобили иҷозат додан ба голос
// бояд ки дар барномаи мобили ҳам ҳамма чиз иҷозат дода шавад яъне корбар ба барнома дастраси ба ҳамма чизро дода тавонад

// бояд ки дизайн оптимизатсия шавад

const ChatUI = forwardRef(({ backendUrl, userId, username, display, avatar, username_of_interlocutor, forMainMenu = false, isChatScreenActive = false }, ref) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [contacts, setContacts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 999);
    const [editingMessage, setEditingMessage] = useState(null);
    const [deletingMessage, setDeletingMessage] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editText, setEditText] = useState('');
    const [messageInput, setMessageInput] = useState('');
    
    // Барои статуси корбарон
    const [userStatuses, setUserStatuses] = useState({});
    const statusWsRef = useRef(null);
    const statusCheckIntervalRef = useRef(null);
    
    // State for search results
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    
    // Контейнери алоҳида барои ҳар як чат
    const [chatsData, setChatsData] = useState({});
    const [activeChatId, setActiveChatId] = useState(null);
    
    // Барои смайлик
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);
    
    // Барои ҷавоб ба паём
    const [replyToMessage, setReplyToMessage] = useState(null);
    const replyContainerRef = useRef(null);
    
    // Барои овоз
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const audioRefs = useRef({});
    
    const chatContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const wsRef = useRef(null);
    const messageInputRef = useRef(null);
    const initialScrollDoneRef = useRef(false);
    const shouldScrollToBottomRef = useRef(true);

    const [contactsPage, setContactsPage] = useState(0);
    const [hasMoreContacts, setHasMoreContacts] = useState(true);
    const CONTACTS_LIMIT = 10;

    const markMessagesAsReadIntervalRef = useRef(null);
    const contactsLoadedRef = useRef(false);
    const selectedAccountLoadedRef = useRef(false);

    const openedChatsRef = useRef(new Set());

    const chatsDataRef = useRef({});

    const [editingLoading, setEditingLoading] = useState(false);
    const [deletingLoading, setDeletingLoading] = useState(false);

    const [chatMenuOpen, setChatMenuOpen] = useState(false);
    const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
    const [deletingChat, setDeletingChat] = useState(false);
    const chatMenuRef = useRef(null);

    const abortControllerRef = useRef(null);

    // Барои пӯшидани меню ҳангоми клик дар берун
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
                setChatMenuOpen(false);
            }
            // Барои пӯшидани emoji picker
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Функсия барои форматировать вақти охирин дида шуд
    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return t('chat.status.longTimeAgo');
        
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffSeconds = Math.floor((now - lastSeenDate) / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSeconds < 60) {
            return t('chat.status.justNow');
        } else if (diffMinutes < 60) {
            return t('chat.status.minutesAgo', { count: diffMinutes });
        } else if (diffHours < 24) {
            return t('chat.status.hoursAgo', { count: diffHours });
        } else if (diffDays < 7) {
            return t('chat.status.daysAgo', { count: diffDays });
        } else {
            return lastSeenDate.toLocaleDateString();
        }
    };

    // Танҳо як бор контактҳоро боргирӣ кун
    useEffect(() => {
        if (userId && !contactsLoadedRef.current) {
            contactsLoadedRef.current = true;
            setContacts([]);
            setContactsPage(0);
            setHasMoreContacts(true);
            loadContacts(0);
            setupWebSocket();
            setupStatusWebSocket();
        }
        
        return () => {
            if (statusWsRef.current) {
                statusWsRef.current.close();
            }
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
            }
            // Тоза кардани аудио
            Object.values(audioRefs.current).forEach(audio => {
                if (audio) {
                    audio.pause();
                    URL.revokeObjectURL(audio.src);
                }
            });
        };
    }, [userId]);

    useEffect(() => {
        chatsDataRef.current = chatsData;
    }, [chatsData]);

    // Функсия барои дохил шудан ба чат (корбар чатро мекушад)
    const enterChat = (chatId) => {
        openedChatsRef.current.add(chatId);
    };

    // Функсия барои хориҷ шудан аз чат (корбар чатро мепӯшад)
    const leaveChat = (chatId) => {
        openedChatsRef.current.delete(chatId);
    };

    useImperativeHandle(ref, () => ({
        leaveChat: () => {
            // Истифодаи activeChatId, на chatId
            if (activeChatId) {
                // Бояд функсияи leaveChat-и воқеиро даъват кунем
                // Ва ҳолатҳои компонентро пок кунем
                openedChatsRef.current.delete(activeChatId);
                
                // Тоза кардани интервалҳо
                if (markMessagesAsReadIntervalRef.current) {
                    clearInterval(markMessagesAsReadIntervalRef.current);
                    markMessagesAsReadIntervalRef.current = null;
                }
                
                // Қатъ кардани дархостҳои fetch
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                }
                
                // Тоза кардани ҳолатҳои компонент
                setSelectedAccount(null);
                setActiveChatId(null);
                initialScrollDoneRef.current = false;
                shouldScrollToBottomRef.current = true;
                
                // Барои тоза кардани URL дар мобил
                if (isMobile) {
                    window.history.pushState(null, '', '/chats');
                }
            }
        },
        getActiveChatId: () => activeChatId,
        isInChat: () => activeChatId !== null
    }));

    useEffect(() => {
        if (!activeChatId) return;

        const chat = chatsData[activeChatId];
        if (!chat || !chat.messageGroups) return;

        markMessagesAsRead(activeChatId, 10);
    }, [activeChatId, chatsData[activeChatId]?.messageGroups]);

    useEffect(() => {
        if (!userId || !activeChatId) {
            // Агар activeChatId мавҷуд набошад, интервалро тоза кун
            if (markMessagesAsReadIntervalRef.current) {
                clearInterval(markMessagesAsReadIntervalRef.current);
                markMessagesAsReadIntervalRef.current = null;
            }
            return;
        }

        // Интервали нав соз
        markMessagesAsReadIntervalRef.current = setInterval(() => {
            // Дар дохили интервал низ санҷиш кун, ки activeChatId ҳанӯз ҳамон аст
            if (activeChatId) {
                markMessagesAsRead(activeChatId);
            }
        }, 1000);

        // Тозакунанда
        return () => {
            if (markMessagesAsReadIntervalRef.current) {
                clearInterval(markMessagesAsReadIntervalRef.current);
                markMessagesAsReadIntervalRef.current = null;
            }
        };
    }, [userId, activeChatId]); // Вобастагӣ ба activeChatId

    // Навсозии статуси контактҳо ҳар 30 сония
    useEffect(() => {
        if (contacts.length > 0) {
            fetchMultipleUsersStatus();
            
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
            }
            
            statusCheckIntervalRef.current = setInterval(() => {
                fetchMultipleUsersStatus();
            }, 30000);
        }
        
        return () => {
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
            }
        };
    }, [contacts]);

    // Гирифтани статуси якчанд корбар
    const fetchMultipleUsersStatus = async () => {
        if (contacts.length === 0) return;
        
        try {
            const userIds = contacts.map(c => c.user_id || c.id);
            const response = await fetch(`${backendUrl}/user-status/multiple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userIds)
            });
            
            if (response.ok) {
                const data = await response.json();
                setUserStatuses(prev => ({...prev, ...data}));
            }
        } catch (error) {
            console.error('Error fetching users status:', error);
        }
    };

    // Setup WebSocket барои статус
    const setupStatusWebSocket = () => {
        const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const backendHost = backendUrl.replace('http://', '').replace('https://', '');
        const wsUrl = `${wsScheme}${backendHost}/ws/status/${userId}`;

        statusWsRef.current = new WebSocket(wsUrl);

        statusWsRef.current.onopen = () => {
            const pingInterval = setInterval(() => {
                if (statusWsRef.current && statusWsRef.current.readyState === WebSocket.OPEN) {
                    statusWsRef.current.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
            
            statusWsRef.current.pingInterval = pingInterval;
        };

        statusWsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleStatusWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing status WebSocket message:', error);
            }
        };

        statusWsRef.current.onclose = () => {
            if (statusWsRef.current && statusWsRef.current.pingInterval) {
                clearInterval(statusWsRef.current.pingInterval);
            }
            setTimeout(() => {
                if (userId) {
                    setupStatusWebSocket();
                }
            }, 5000);
        };
        
        statusWsRef.current.onerror = (error) => {
            console.error('Status WebSocket error:', error);
        };
    };

    // Коркарди паёмҳои WebSocket барои статус
    const handleStatusWebSocketMessage = (data) => {
        if (data.type === 'user_status_change') {
            setUserStatuses(prev => ({
                ...prev,
                [data.user_id]: {
                    ...prev[data.user_id],
                    is_online: data.is_online,
                    last_seen: data.last_seen
                }
            }));
            
            setContacts(prev => prev.map(contact => {
                const contactId = contact.user_id || contact.id;
                if (contactId === data.user_id) {
                    return {
                        ...contact,
                        is_online: data.is_online,
                        last_seen: data.last_seen
                    };
                }
                return contact;
            }));
        } else if (data.type === 'user_status_response') {
            setUserStatuses(prev => ({
                ...prev,
                [data.user_id]: data.status
            }));
        }
    };

    // Detect screen size changes
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 999);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle URL parameter for preselected chat
    useEffect(() => {
        if (!username_of_interlocutor) return;
        
        if (loadingContacts) return;
        
        if (contacts.length === 0) {
            loadSingleAccount(username_of_interlocutor);
            return;
        }
        
        const contact = contacts.find(c => c.username === username_of_interlocutor);
        
        if (contact) {
            const contactId = contact.user_id || contact.id;
            if (activeChatId !== contactId) {
                selectAccount(contact);
            }
        } else {
            loadSingleAccount(username_of_interlocutor);
        }
    }, [username_of_interlocutor, loadingContacts]);

    // Handle search changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.trim() === '') {
                setShowSearchResults(false);
                setSearchResults([]);
            } else {
                performSearch(searchTerm);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Setup WebSocket connection
    const setupWebSocket = () => {
        const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const backendHost = backendUrl.replace('http://', '').replace('https://', '');
        const wsUrl = `${wsScheme}${backendHost}/ws/chat-updates/${userId}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            checkForMissedMessages();
            checkForDeletedMessages();
        };

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        wsRef.current.onclose = () => {
            setTimeout(() => {
                if (userId) {
                    setupWebSocket();
                }
            }, 5000);
        };
        
        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    };

    // Функсия барои санҷидани паёмҳои нагирифта
    const checkForMissedMessages = async () => {
        if (!userId) return;
        
        try {
            let lastMessageTime = null;
            
            let latestTimestamp = 0;
            Object.values(chatsData).forEach(chat => {
                if (chat && chat.messageGroups) {
                    Object.values(chat.messageGroups).forEach(messages => {
                        messages.forEach(msg => {
                            const msgTime = new Date(msg.created_at).getTime();
                            if (msgTime > latestTimestamp) {
                                latestTimestamp = msgTime;
                            }
                        });
                    });
                }
            });
            
            if (latestTimestamp > 0) {
                lastMessageTime = new Date(latestTimestamp).toISOString();
            }
            
            let url = `${backendUrl}/get-messages?user_id=${userId}`;
            
            if (lastMessageTime) {
                url += `&last_sync_time=${encodeURIComponent(lastMessageTime)}`;
            } else {
                url += `&only_unread=true`;
            }
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.messages && data.messages.length > 0) {
                    const messagesByChat = {};
                    
                    data.messages.forEach(message => {
                        if (message.is_deleted) {
                            return;
                        }
                        
                        const chatId = message.from_user_id === userId 
                            ? message.to_user_id 
                            : message.from_user_id;
                        
                        if (!messagesByChat[chatId]) {
                            messagesByChat[chatId] = [];
                        }
                        messagesByChat[chatId].push(message);
                    });
                    
                    Object.keys(messagesByChat).forEach(chatId => {
                        const chatMessages = messagesByChat[chatId];
                        
                        chatMessages.sort((a, b) => 
                            new Date(a.created_at) - new Date(b.created_at)
                        );
                        
                        chatMessages.forEach(message => {
                            const formattedMessage = {
                                message_id: message.id,
                                text: message.text,
                                from_user_id: message.from_user_id,
                                to_user_id: message.to_user_id,
                                created_at: message.created_at,
                                is_edited: message.is_edited,
                                is_read: message.is_read,
                                is_deleted: message.is_deleted || false,
                                from_username: message.from_username,
                                from_display_name: message.from_display_name,
                                from_user_avatar: message.from_user_avatar,
                                message_type: message.message_type || 'text',
                                voice_data: message.voice_data,
                                voice_duration: message.voice_duration,
                                reply_to: message.reply_to
                            };
                            
                            addSingleMessageToChat(chatId, formattedMessage);
                        });
                    });
                    
                    if (activeChatId) {
                        setTimeout(() => {
                            loadMessages(activeChatId, 0);
                        }, 500);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for missed messages:', error);
        }
    };

    // Функсия барои гирифтани паёмҳои ҳазфшуда пас аз пайвастшавӣ
    const checkForDeletedMessages = async () => {
        if (!userId) return;
        
        try {
            let lastDeletedTime = null;
            let latestDeletedTimestamp = 0;
            
            Object.values(chatsData).forEach(chat => {
                if (chat && chat.messageGroups) {
                    Object.values(chat.messageGroups).forEach(messages => {
                        messages.forEach(msg => {
                            if (msg.is_deleted && msg.deleted_at) {
                                const deletedTime = new Date(msg.deleted_at).getTime();
                                if (deletedTime > latestDeletedTimestamp) {
                                    latestDeletedTimestamp = deletedTime;
                                }
                            }
                        });
                    });
                }
            });
            
            if (latestDeletedTimestamp > 0) {
                lastDeletedTime = new Date(latestDeletedTimestamp).toISOString();
            }
            
            let url = `${backendUrl}/get-deleted-messages?user_id=${userId}`;
            if (lastDeletedTime) {
                url += `&last_sync_time=${encodeURIComponent(lastDeletedTime)}`;
            }
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.deleted_messages && data.deleted_messages.length > 0) {
                    // Аввал маълумоти паёмҳои ҳазфшударо барои навсозии ҷавобҳо ҷамъ мекунем
                    const deletedMessageIds = data.deleted_messages.map(msg => msg.message_id);
                    
                    // Агар паёмҳои ҳазфшуда мавҷуд бошанд, маълумоти иловагӣ мегирем, ки ба онҳо ҷавоб дода шудааст
                    if (deletedMessageIds.length > 0) {
                        try {
                            const repliesResponse = await fetch(`${backendUrl}/get-message-replies`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    message_ids: deletedMessageIds
                                })
                            });
                            
                            if (repliesResponse.ok) {
                                const repliesData = await repliesResponse.json();
                                
                                // Агар паёмҳое ҳастанд, ки ба паёмҳои ҳазфшуда ҷавоб додаанд, онҳоро навсозӣ мекунем
                                if (repliesData.success && repliesData.replies && repliesData.replies.length > 0) {
                                    setChatsData(prev => {
                                        const newChatsData = { ...prev };
                                        
                                        Object.keys(newChatsData).forEach(chatId => {
                                            const chat = newChatsData[chatId];
                                            if (!chat.messageGroups) return;
                                            
                                            const newGroups = { ...chat.messageGroups };
                                            let updated = false;
                                            
                                            Object.keys(newGroups).forEach(date => {
                                                newGroups[date] = newGroups[date].map(msg => {
                                                    // Агар ин паём ба паёми ҳазфшуда ҷавоб бошад
                                                    if (msg.reply_to && msg.reply_to.message_id && 
                                                        deletedMessageIds.includes(msg.reply_to.message_id)) {
                                                        updated = true;
                                                        return {
                                                            ...msg,
                                                            reply_to: {
                                                                ...msg.reply_to,
                                                                is_deleted: true,
                                                                text: null
                                                            }
                                                        };
                                                    }
                                                    return msg;
                                                });
                                            });
                                            
                                            if (updated) {
                                                newChatsData[chatId] = {
                                                    ...chat,
                                                    messageGroups: newGroups
                                                };
                                            }
                                        });
                                        
                                        return newChatsData;
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching message replies:', error);
                        }
                    }
                    
                    // Пас аз навсозии ҷавобҳо, худи паёмҳои ҳазфшударо нест мекунем
                    data.deleted_messages.forEach(deletedMsg => {
                        handleDeleteMessage({
                            message_id: deletedMsg.message_id,
                            from_user_id: deletedMsg.from_user_id,
                            to_user_id: deletedMsg.to_user_id,
                            is_deleted: true,
                            deleted_at: deletedMsg.deleted_at
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error checking for deleted messages:', error);
        }
    };

    const getVisibleUnreadMessages = (targetUserId, limit = 10) => {
        const chat = chatsData[targetUserId];
        if (!chat || !chat.messageGroups) return [];

        const unread = [];

        Object.keys(chat.messageGroups).forEach(date => {
            chat.messageGroups[date].forEach(msg => {
                if (
                    msg.from_user_id === targetUserId &&
                    !msg.is_read &&
                    !msg.is_deleted &&
                    (msg.message_id || msg.id)
                ) {
                    unread.push(msg);
                }
            });
        });

        return unread.slice(0, limit);
    };

    // Handle WebSocket messages
    const handleWebSocketMessage = (data) => {
        const messageType = data.type;
        const value = data.value || {};
        
        switch (messageType) {
            case 'new_messanger':
                handleNewMessage(value);
                notifyNewMessage(value);
                break;
            case 'delete_messanger':
                handleDeleteMessage(value);
                break;
            case 'edit_messanger':
                handleEditMessage(value);
                break;
            case 'message_read':
                handleMessageRead(value);
                break;
            case 'chat_deleted':
                handleChatDeleted(value);
                break;
            case 'update_reply_info': // Ҳолати нав
                handleUpdateReplyInfo(value);
                break;
            default:
        }
    };

    // Функсия барои навсозии маълумоти ҷавоб
    const handleUpdateReplyInfo = (data) => {
        const { message_id, reply_to } = data;
        
        setChatsData(prev => {
            const newChatsData = { ...prev };
            
            Object.keys(newChatsData).forEach(chatId => {
                const chat = newChatsData[chatId];
                if (!chat.messageGroups) return;
                
                const newGroups = { ...chat.messageGroups };
                let updated = false;
                
                Object.keys(newGroups).forEach(date => {
                    newGroups[date] = newGroups[date].map(msg => {
                        if ((msg.message_id || msg.id) === message_id) {
                            updated = true;
                            return {
                                ...msg,
                                reply_to: reply_to
                            };
                        }
                        return msg;
                    });
                });
                
                if (updated) {
                    newChatsData[chatId] = {
                        ...chat,
                        messageGroups: newGroups
                    };
                }
            });
            
            return newChatsData;
        });
    };

    // Функсия барои коркарди ҳазфи пурраи чат:
    const handleChatDeleted = (data) => {
        const { chat_with, message_ids } = data;
        
        setChatsData(prev => {
            const newChatsData = { ...prev };
            
            if (newChatsData[chat_with]) {
                const newGroups = {};
                
                Object.keys(newChatsData[chat_with].messageGroups || {}).forEach(date => {
                    newGroups[date] = newChatsData[chat_with].messageGroups[date].filter(msg => {
                        return !message_ids.includes(msg.message_id || msg.id);
                    });
                    
                    if (newGroups[date].length === 0) {
                        delete newGroups[date];
                    }
                });
                
                newChatsData[chat_with] = {
                    ...newChatsData[chat_with],
                    messageGroups: newGroups,
                    hasMoreMessages: false,
                    offset: 0
                };
            }
            
            return newChatsData;
        });
        
        setContacts(prev => prev.map(contact => {
            const contactId = contact.user_id || contact.id;
            if (contactId === chat_with) {
                return {
                    ...contact,
                    count_unread: 0
                };
            }
            return contact;
        }));
    };

    // Функсия барои огоҳии паёми нав
    const notifyNewMessage = async (messageData) => {
        const isSelf = messageData.from_user_id === userId;
        const targetUserId = isSelf ? messageData.to_user_id : messageData.from_user_id;

        if (!isSelf) {
            try {
                const response = await fetch(
                    `${backendUrl}/number-of-unread-messages?from_user_id=${targetUserId}&to_user_id=${userId}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const actualUnreadCount = data.unread_count || 0;
                    
                    setContacts(prev => prev.map(contact => {
                        const contactId = contact.user_id || contact.id;
                        if (contactId === targetUserId) {
                            return {
                                ...contact,
                                count_unread: actualUnreadCount
                            };
                        }
                        return contact;
                    }));
                } else {
                    setContacts(prev => prev.map(contact => {
                        const contactId = contact.user_id || contact.id;
                        if (contactId === targetUserId) {
                            const currentUnread = contact.count_unread || 0;
                            return {
                                ...contact,
                                count_unread: currentUnread + 1
                            };
                        }
                        return contact;
                    }));
                }
            } catch (error) {
                console.error('Error getting unread count:', error);
                setContacts(prev => prev.map(contact => {
                    const contactId = contact.user_id || contact.id;
                    if (contactId === targetUserId) {
                        const currentUnread = contact.count_unread || 0;
                        return {
                            ...contact,
                            count_unread: currentUnread + 1
                        };
                    }
                    return contact;
                }));
            }
        }
    };

    // Функсия барои боргирии аккаунти ягона
    const loadSingleAccount = async (username) => {
        try {
            const response = await fetch(
                `${backendUrl}/accounts?user_id=${userId}&search=${encodeURIComponent(username)}&limit=1`
            );

            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    const account = data[0];
                    
                    setContacts(prev => {
                        const exists = prev.some(c => c.username === username);
                        if (exists) return prev;
                        
                        return [account, ...prev];
                    });
                    
                    if (account.username === username_of_interlocutor) {
                        selectAccount(account);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading single account:', error);
        }
    };

    // Load chat contacts
    const loadContacts = async (page = 0) => {
        if (page === 0) {
            setLoadingContacts(true);
        }

        try {
            const skip = page * CONTACTS_LIMIT;

            const response = await fetch(
                `${backendUrl}/chat-accounts?user_id=${userId}&skip=${skip}&limit=${CONTACTS_LIMIT}`
            );

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    const newContacts = data.contacts || [];

                    setContacts(prev => {
                        if (page === 0) {
                            return newContacts;
                        } else {
                            const existingIds = new Set(prev.map(c => c.user_id || c.id));
                            const filteredNewContacts = newContacts.filter(
                                contact => !existingIds.has(contact.user_id || contact.id)
                            );
                            return [...prev, ...filteredNewContacts];
                        }
                    });

                    setHasMoreContacts(newContacts.length === CONTACTS_LIMIT);
                    setContactsPage(page);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Perform search for accounts
    const performSearch = async (term) => {
        if (!term.trim()) {
            setShowSearchResults(false);
            setSearchResults([]);
            return;
        }

        setLoadingSearch(true);
        setShowSearchResults(true);

        try {
            const response = await fetch(
                `${backendUrl}/accounts?user_id=${userId}&search=${encodeURIComponent(term)}`
            );

            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    setSearchResults(data);
                } else if (data.message === 'No accounts found for your search.') {
                    setSearchResults([]);
                } else {
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setLoadingSearch(false);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
        setShowSearchResults(false);
        setSearchResults([]);
    };

    // Функсия барои ҳамроҳ кардани як паём ба контейнери паёмҳо
    const addSingleMessageToChat = useCallback((chatId, message) => {
        if (!chatId || !message) return;
        
        if (message.is_deleted) {
            return;
        }
        
        let date;
        try {
            date = new Date(message.created_at).toISOString().split('T')[0];
        } catch (e) {
            date = new Date().toISOString().split('T')[0];
        }
        
        const formattedMessage = {
            ...message,
            isSelf: message.from_user_id === userId,
            is_read: message.from_user_id === userId ? false : (message.is_read || false)
        };
        
        setChatsData(prev => {
            const currentChat = prev[chatId] || {};
            const existingGroups = currentChat.messageGroups || {};
            
            const newGroups = { ...existingGroups };
            
            if (!newGroups[date]) {
                newGroups[date] = [];
            }
            
            const exists = newGroups[date].some(
                msg => (msg.message_id || msg.id) === (message.message_id || message.id)
            );
            
            if (!exists) {
                newGroups[date] = [...newGroups[date], formattedMessage];
            }
            
            return {
                ...prev,
                [chatId]: {
                    ...currentChat,
                    messageGroups: newGroups,
                    lastUpdated: new Date().toISOString(),
                }
            };
        });
        
        if (chatId === activeChatId && shouldScrollToBottomRef.current) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [userId, activeChatId]);

    const loadMessages = async (targetUserId, offset = 0) => {
        if (!targetUserId) return;

        // Қатъ кардани дархости қаблӣ
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const chatId = targetUserId;
        const isFirstPage = offset === 0;

        setChatsData(prev => ({
            ...prev,
            [chatId]: {
                ...prev[chatId],
                loadingMessages: true
            }
        }));
        
        try {
            const response = await fetch(
                `${backendUrl}/get-messages?user_id=${userId}&target_user_id=${targetUserId}&offset=${offset}&limit=20`,
                { signal: abortControllerRef.current.signal }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const newMessages = data.messages || [];
                    
                    setChatsData(prev => {
                        const currentChat = prev[chatId] || {};
                        
                        let newMessageGroups = { ...currentChat.messageGroups };
                        
                        newMessages.forEach(message => {
                            if (message.is_deleted) {
                                return;
                            }
                            
                            const date = new Date(message.created_at).toISOString().split('T')[0];
                            if (!newMessageGroups[date]) {
                                newMessageGroups[date] = [];
                            }
                            
                            const formattedMessage = {
                                ...message,
                                isSelf: message.from_user_id === userId
                            };
                            
                            const exists = newMessageGroups[date].some(
                                msg => (msg.message_id || msg.id) === (message.message_id || message.id)
                            );
                            
                            if (!exists) {
                                if (isFirstPage) {
                                    newMessageGroups[date].push(formattedMessage);
                                } else {
                                    newMessageGroups[date].unshift(formattedMessage);
                                }
                            }
                        });
                        
                        Object.keys(newMessageGroups).forEach(date => {
                            newMessageGroups[date].sort((a, b) => 
                                new Date(a.created_at) - new Date(b.created_at)
                            );
                        });
                        
                        return {
                            ...prev,
                            [chatId]: {
                                ...currentChat,
                                messageGroups: newMessageGroups,
                                offset: offset,
                                hasMoreMessages: data.has_more,
                                loadingMessages: false,
                                lastUpdated: new Date().toISOString()
                            }
                        };
                    });
                    
                    if (isFirstPage) {
                        setTimeout(() => {
                            scrollToBottom();
                            initialScrollDoneRef.current = true;
                        }, 100);
                    } else {
                        shouldScrollToBottomRef.current = false;
                    }
                    
                    await markMessagesAsRead(targetUserId);
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            setChatsData(prev => ({
                ...prev,
                [chatId]: {
                    ...prev[chatId],
                    loadingMessages: false
                }
            }));
        }
        
        await markMessagesAsRead(targetUserId);
    };

    const selectAccount = async (account) => {
        // 🚫 Агар аккаунт banned бошад, чатро накушо
        if (account?.is_banned) {
            return;
        }

        const accountId = account.user_id || account.id;

        if (activeChatId === accountId) return;

        if (activeChatId) leaveChat(activeChatId);

        enterChat(accountId);

        if (account.username) {
            window.history.pushState(
                null,
                '',
                `/chats/@${encodeURIComponent(account.username)}`
            );
        }

        // Қатъ кардани дархостҳои қаблӣ
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setSelectedAccount(account);
        setActiveChatId(accountId);

        setContacts(prev => {
            const exists = prev.some(
                c => (c.user_id || c.id) === accountId
            );

            if (!exists) {
                return [
                    { ...account, count_unread: 0 },
                    ...prev
                ];
            }

            return prev.map(contact => {
                const contactId = contact.user_id || contact.id;

                if (contactId === accountId) {
                    return {
                        ...contact,
                        count_unread: 0
                    };
                }

                return contact;
            });
        });

        initialScrollDoneRef.current = false;
        shouldScrollToBottomRef.current = true;

        await loadMessages(accountId, 0);
    };

    // Send a message
    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedAccount || sendingMessage || !activeChatId) return;
        
        const messageText = messageInput.trim();
        setSendingMessage(true);
        
        try {
            const response = await fetch(`${backendUrl}/messanger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from_user_id: userId,
                    to_user_id: selectedAccount.user_id || selectedAccount.id,
                    text: messageText,
                    reply_to_message_id: replyToMessage?.message_id || replyToMessage?.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();

                if (data.message_id) {
                    const newMessage = {
                        message_id: data.message_id,
                        text: messageText,
                        from_user_id: userId,
                        to_user_id: selectedAccount.user_id || selectedAccount.id,
                        created_at: new Date().toISOString(),
                        is_edited: false,
                        is_deleted: false,
                        from_user_avatar: avatar,
                        from_username: username, // Ин ҷо бояд username-и корбари ҷорӣ бошад
                        is_read: false,
                        message_type: 'text',
                        reply_to: replyToMessage ? {
                            message_id: replyToMessage.message_id || replyToMessage.id,
                            text: replyToMessage.text,
                            from_username: replyToMessage.from_username, // Ин ҷо from_username-и паёми аслӣ
                            from_user_id: replyToMessage.from_user_id,
                            message_type: replyToMessage.message_type
                        } : null
                    };
                    
                    addSingleMessageToChat(activeChatId, newMessage);
                }
                
                setMessageInput('');
                setReplyToMessage(null);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    // Функсия барои фиристодани паёми овозӣ
    const sendVoiceMessage = async () => {
        if (!audioBlob || !selectedAccount || sendingMessage || !activeChatId) return;
        
        setSendingMessage(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            
            try {
                const response = await fetch(`${backendUrl}/voice-message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from_user_id: userId,
                        to_user_id: selectedAccount.user_id || selectedAccount.id,
                        voice_data: base64data,
                        duration: recordingTime,
                        reply_to_message_id: replyToMessage?.message_id || replyToMessage?.id
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.message_id) {
                        const newMessage = {
                            message_id: data.message_id,
                            from_user_id: userId,
                            to_user_id: selectedAccount.user_id || selectedAccount.id,
                            created_at: new Date().toISOString(),
                            is_edited: false,
                            is_deleted: false,
                            from_user_avatar: avatar,
                            from_username: username,
                            is_read: false,
                            message_type: 'voice',
                            voice_data: base64data,
                            voice_duration: recordingTime,
                            reply_to: replyToMessage ? {
                                message_id: replyToMessage.message_id || replyToMessage.id,
                                text: replyToMessage.text,
                                from_username: replyToMessage.from_username,
                                from_user_id: replyToMessage.from_user_id,
                                message_type: replyToMessage.message_type
                            } : null
                        };
                        
                        addSingleMessageToChat(activeChatId, newMessage);
                    }
                    
                    setAudioBlob(null);
                    setAudioUrl(null);
                    setReplyToMessage(null);
                    scrollToBottom();
                }
            } catch (error) {
                console.error('Error sending voice message:', error);
            } finally {
                setSendingMessage(false);
            }
        };
    };

    // Функсия барои сабти овоз
    const startRecording = async () => {
        try {
            setMessageInput("");
            setIsRecording(true);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioBlob(audioBlob);
                setAudioUrl(audioUrl);
                
                // Тоза кардани stream
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
            
            // Таймер барои вақти сабт
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert(t('chat.voice.microphoneError'));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            setIsRecording(false);
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            setIsRecording(false);
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
            setAudioBlob(null);
            setAudioUrl(null);
        }
    };

    // Функсия барои бозӣ кардани овоз
    const playVoiceMessage = (messageId, audioData) => {
        if (playingAudioId === messageId) {
            // Агар ҳозир бозӣ мешавад, бозӣро боздоред
            if (audioRefs.current[messageId]) {
                audioRefs.current[messageId].pause();
                audioRefs.current[messageId].currentTime = 0;
            }
            setPlayingAudioId(null);
        } else {
            // Агар дигар овоз бозӣ мешавад, онро боздоред
            if (playingAudioId && audioRefs.current[playingAudioId]) {
                audioRefs.current[playingAudioId].pause();
                audioRefs.current[playingAudioId].currentTime = 0;
            }
            
            // Сохтани Audio element барои ин паём
            const audio = new Audio(`data:audio/webm;base64,${audioData}`);
            audioRefs.current[messageId] = audio;
            
            audio.onended = () => {
                setPlayingAudioId(null);
            };
            
            audio.play();
            setPlayingAudioId(messageId);
        }
    };

    // Функсия барои ҷавоб ба паём
    const handleReplyToMessage = (message) => {
        setReplyToMessage(message);
        messageInputRef.current?.focus();
    };

    const cancelReply = () => {
        setReplyToMessage(null);
    };

    // Функсия барои иловаи смайлик
    const handleEmojiClick = (emojiObject) => {
        setMessageInput(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
        messageInputRef.current?.focus();
    };

    const markMessagesAsRead = async (targetUserId, limit = 10) => {
        if (!targetUserId || !userId || targetUserId !== activeChatId) return;

        const unreadMessages = getVisibleUnreadMessages(targetUserId, limit);
        if (unreadMessages.length === 0) return;

        const unreadMessageIds = unreadMessages.map(
            msg => msg.message_id || msg.id
        );

        try {
            const response = await fetch(
                `${backendUrl}/messages/mark_as_read`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(unreadMessageIds)
                }
            );

            if (!response.ok) return;

            setChatsData(prev => {
                const newChatsData = { ...prev };
                const chat = newChatsData[targetUserId];
                if (!chat) return prev;

                const newGroups = { ...chat.messageGroups };
                let unreadCount = chat.unreadCount || 0;

                Object.keys(newGroups).forEach(date => {
                    newGroups[date] = newGroups[date].map(msg => {
                        if (
                            unreadMessageIds.includes(msg.message_id || msg.id) &&
                            !msg.is_read &&
                            !msg.is_deleted
                        ) {
                            unreadCount = Math.max(0, unreadCount - 1);
                            return { ...msg, is_read: true };
                        }
                        return msg;
                    });
                });

                newChatsData[targetUserId] = {
                    ...chat,
                    messageGroups: newGroups,
                    unreadCount
                };

                return newChatsData;
            });

        } catch (e) {
            console.error('markMessagesAsRead error:', e);
        }
    };

    // Edit a message
    const editMessage = async () => {
        if (!editingMessage || !editText.trim()) return;

        setEditingLoading(true);

        try {
            const response = await fetch(`${backendUrl}/edit-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    message_id: editingMessage.message_id || editingMessage.id,
                    text: editText
                })
            });

            if (response.ok) {
                setEditDialogOpen(false);
                setEditingMessage(null);
                setEditText('');
            }
        } catch (error) {
            console.error('Error editing message:', error);
        } finally {
            setEditingLoading(false);
        }
    };

    // Delete a message
    const deleteMessage = async () => {
        if (!deletingMessage) return;

        setDeletingLoading(true);

        try {
            const isOwnMessage = deletingMessage.from_user_id === userId;
            const url = `${backendUrl}/delete-message`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    message_id: deletingMessage.message_id || deletingMessage.id,
                    ...(!isOwnMessage && { target_user_id: deletingMessage.from_user_id })
                })
            });

            if (response.ok) {
                setDeleteDialogOpen(false);
                setDeletingMessage(null);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        } finally {
            setDeletingLoading(false);
        }
    };

    // Handle new message from WebSocket
    const handleNewMessage = (messageData) => {
        if (messageData.is_deleted) {
            return;
        }
        
        if (messageData.from_user_id === userId || messageData.to_user_id === userId) {
            const isSelf = messageData.from_user_id === userId;
            const targetUserId = isSelf ? messageData.to_user_id : messageData.from_user_id;
            
            let createdAt = messageData.created_at;
            if (!createdAt) {
                createdAt = new Date().toISOString();
            } else {
                try {
                    new Date(createdAt).toISOString();
                } catch (e) {
                    createdAt = new Date().toISOString();
                }
            }
            
            const formattedMessage = {
                message_id: messageData.message_id || messageData.id,
                text: messageData.message || messageData.text,
                from_user_id: messageData.from_user_id,
                to_user_id: messageData.to_user_id,
                created_at: createdAt,
                is_edited: messageData.is_edited || false,
                edited_at: messageData.edited_at,
                from_user_avatar: messageData.from_user_avatar || avatar,
                from_username: messageData.from_username || username, // Ин ҷо бояд дуруст бошад
                is_read: messageData.is_read || false,
                is_deleted: messageData.is_deleted || false,
                message_type: messageData.message_type || 'text',
                voice_data: messageData.voice_data,
                voice_duration: messageData.voice_duration,
                reply_to: messageData.reply_to
            };
            
            addSingleMessageToChat(targetUserId, formattedMessage);
        }
    };

    // Handle delete message from WebSocket
    const handleDeleteMessage = (messageData) => {
        setChatsData(prev => {
            const newChatsData = { ...prev };

            Object.keys(newChatsData).forEach(chatId => {
                const chat = newChatsData[chatId];
                if (!chat.messageGroups) return;

                const newGroups = { ...chat.messageGroups };
                let messagesRemoved = false;
                
                Object.keys(newGroups).forEach(date => {
                    const originalLength = newGroups[date].length;
                    newGroups[date] = newGroups[date].filter(
                        msg => (msg.message_id || msg.id) !== (messageData.message_id || messageData.id)
                    );
                    if (newGroups[date].length < originalLength) {
                        messagesRemoved = true;
                    }
                    
                    if (newGroups[date].length === 0) {
                        delete newGroups[date];
                    }
                });

                if (messagesRemoved) {
                    newChatsData[chatId] = {
                        ...chat,
                        messageGroups: newGroups
                    };
                }
            });

            return newChatsData;
        });
    };

    // Handle edit message from WebSocket
    const handleEditMessage = (messageData) => {
        setChatsData(prev => {
            const newChatsData = { ...prev };
            
            Object.keys(newChatsData).forEach(chatId => {
                const chat = newChatsData[chatId];
                if (!chat.messageGroups) return;
                
                const newGroups = { ...chat.messageGroups };
                Object.keys(newGroups).forEach(date => {
                    newGroups[date] = newGroups[date].map(msg => {
                        if ((msg.message_id || msg.id) === (messageData.message_id || messageData.id)) {
                            return {
                                ...msg,
                                text: messageData.message,
                                is_edited: messageData.is_edited || true,
                                edited_at: messageData.edited_at
                            };
                        }
                        return msg;
                    });
                });
                
                newChatsData[chatId] = {
                    ...chat,
                    messageGroups: newGroups
                };
            });
            
            return newChatsData;
        });
    };

    // Handle message read status from WebSocket
    const handleMessageRead = (messageData) => {
        setChatsData(prev => {
            const newChatsData = { ...prev };
            
            Object.keys(newChatsData).forEach(chatId => {
                const chat = newChatsData[chatId];
                if (!chat.messageGroups) return;
                
                const newGroups = { ...chat.messageGroups };
                let unreadCountUpdated = chat.unreadCount || 0;
                
                Object.keys(newGroups).forEach(date => {
                    newGroups[date] = newGroups[date].map(msg => {
                        if ((msg.message_id || msg.id) === (messageData.message_id || messageData.id)) {
                            if (msg.from_user_id === userId && !msg.is_read) {
                                unreadCountUpdated = Math.max(0, unreadCountUpdated - 1);
                            }
                            
                            return {
                                ...msg,
                                is_read: true
                            };
                        }
                        return msg;
                    });
                });
                
                newChatsData[chatId] = {
                    ...chat,
                    messageGroups: newGroups,
                    unreadCount: unreadCountUpdated
                };
            });
            
            return newChatsData;
        });
    };

    // Функсия барои ҳазфи пурраи чат (барои ҳарду корбар)
    const deleteFullChat = async () => {
        if (!selectedAccount || !activeChatId || deletingChat) return;
        
        setDeletingChat(true);
        
        try {
            const response = await fetch(`${backendUrl}/delete-full-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    target_user_id: selectedAccount.user_id || selectedAccount.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    setChatsData(prev => {
                        const newChatsData = { ...prev };
                        if (newChatsData[activeChatId]) {
                            newChatsData[activeChatId] = {
                                ...newChatsData[activeChatId],
                                messageGroups: {},
                                hasMoreMessages: false,
                                offset: 0
                            };
                        }
                        return newChatsData;
                    });
                    
                    setContacts(prev => prev.map(contact => {
                        const contactId = contact.user_id || contact.id;
                        if (contactId === activeChatId) {
                            return {
                                ...contact,
                                count_unread: 0,
                                last_message: null,
                                last_message_time: null
                            };
                        }
                        return contact;
                    }));
                    
                    setDeleteChatDialogOpen(false);
                    setChatMenuOpen(false);
                }
            }
        } catch (error) {
            console.error('Error deleting full chat:', error);
        } finally {
            setDeletingChat(false);
        }
    };

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        if (messagesEndRef.current && shouldScrollToBottomRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Format message text with links
    const convertTextToHtmlLinks = (text, navigate) => {
      if (!text) return '';
    
      const normalizedText = text;
    
      const linkRegex = /(https?:\/\/[^\s]+)|(@[^\s$]+)|(\$[^\s$]+)/g;
      
      return normalizedText.split('\n').map((line, lineIndex) => {
        let processedLine = line;
  
        return (
          <React.Fragment key={lineIndex}>
            {processedLine.split(' ').map((word, wordIndex) => {
              let content = word;
              
              if (word.match(/^@[^\s$]+$/)) {
                const username = word.substring(1);
                return (
                  <a 
                    key={`${lineIndex}-${wordIndex}`}
                    href={`/@${username}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/@${username}`);
                    }}
                    className="text-link"
                  >
                    {word + ' '}
                  </a>
                );
              } else if (word.match(/^\$[^\s$]+$/)) {
                const shopingName = word.substring(1);
                return (
                  <a 
                    key={`${lineIndex}-${wordIndex}`}
                    href={`/$${shopingName}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/$${shopingName}`);
                    }}
                    className="text-link"
                  >
                    {word + ' '}
                  </a>
                );
              } else if (word.match(/^https?:\/\/[^\s]+$/)) {
                if (/^https:\/\/(www\.)?anyvoice\./.test(word)) {
                  const relativePath = word.replace(/^https:\/\/(www\.)?anyvoice\.[^/]+/, '');
    
                  return (
                    <a
                      key={`${lineIndex}-${wordIndex}`}
                      href={relativePath || '/'}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(relativePath || '/');
                      }}
                      className="text-link"
                    >
                      {word + ' '}
                    </a>
                  );
                } else {
                  return (
                    <a 
                      key={`${lineIndex}-${wordIndex}`}
                      href={`/${word}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      {word + ' '}
                    </a>
                  );
                }
              }
              
              return <span key={`${lineIndex}-${wordIndex}`}>{word + ' '}</span>;
            })}
            <br />
          </React.Fragment>
        );
      });
    };

    // Format date in Tajik (Cyrillic) with i18n support
    const formatDateTajik = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return t('chat.dates.today');
        }
        
        if (date.toDateString() === yesterday.toDateString()) {
            return t('chat.dates.yesterday');
        }
        
        const monthNames = [
            t('chat.dates.january'),
            t('chat.dates.february'),
            t('chat.dates.march'),
            t('chat.dates.april'),
            t('chat.dates.may'),
            t('chat.dates.june'),
            t('chat.dates.july'),
            t('chat.dates.august'),
            t('chat.dates.september'),
            t('chat.dates.october'),
            t('chat.dates.november'),
            t('chat.dates.december')
        ];
        
        const day = date.getDate();
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
    };

    // Format time in Tajik format
    const formatTimeTajik = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Format voice duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Load more messages for active chat
    const loadMoreMessages = async () => {
        if (!activeChatId) return;

        const chat = chatsData[activeChatId];
        if (!chat || !chat.hasMoreMessages || chat.loadingMessages) return;

        shouldScrollToBottomRef.current = false;

        const container = chatContainerRef.current;
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;

        const newOffset = (chat.offset || 0) + 20;
        await loadMessages(activeChatId, newOffset);

        setTimeout(() => {
            markMessagesAsRead(activeChatId, 10);
        }, 300);

        setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        }, 50);
    };

    // Refresh contacts
    const refreshContacts = async () => {
        contactsLoadedRef.current = false;
        setContacts([]);
        setContactsPage(0);
        setHasMoreContacts(true);
        await loadContacts(0);
    };

    const backToContacts = () => {
        if (activeChatId) {
            leaveChat(activeChatId);
        }

        // Тоза кардани интервал
        if (markMessagesAsReadIntervalRef.current) {
            clearInterval(markMessagesAsReadIntervalRef.current);
            markMessagesAsReadIntervalRef.current = null;
        }

        // Қатъ кардани ҳамаи дархостҳои fetch
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setSelectedAccount(null);
        setActiveChatId(null);
        initialScrollDoneRef.current = false;
        shouldScrollToBottomRef.current = true;
        
        clearSearch();
        
        if (isMobile) {
            window.history.pushState(null, '', '/chats');
        }
    };

    // Keyboard event handler for sending message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const activeChatData = chatsData[activeChatId];
    const sortedDates = activeChatData?.messageGroups ? 
        Object.keys(activeChatData.messageGroups).sort((a, b) => new Date(a) - new Date(b)) : [];

    // Гирифтани статуси корбари интихобшуда
    const selectedUserStatus = selectedAccount ? 
        userStatuses[selectedAccount.user_id || selectedAccount.id] : null;

    // Компонент барои намоиши паёми ҷавоб
    const ReplyPreview = ({ replyTo, onCancel }) => {
        if (!replyTo) return null;
        
        return (
            <div className="reply-preview" ref={replyContainerRef}>
                <div className="reply-preview-content">
                    <span className="reply-preview-label">
                        {t('chat.reply.replyingTo')} 
                        @{replyTo.from_username || t('chat.reply.unknownUser')}
                    </span>
                    <span className="reply-preview-text">
                        {replyTo.message_type === 'voice' 
                            ? '🎤 ' + t('chat.voice.voiceMessage') 
                            : replyTo.text}
                    </span>
                </div>
                <button className="reply-preview-cancel" onClick={onCancel}>×</button>
            </div>
        );
    };

    return (
        <div className={`chat-container ${forMainMenu ? 'for-main-menu' : 'default-chat'}`}>
            {/* Edit Message Dialog */}
            {editDialogOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h3 className="dialog-title">{t('chat.dialogs.edit.title')}</h3>
                        <textarea
                            className="edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                            rows={4}
                        />
                        <div className="dialog-buttons">
                            <button
                                className="btn-save"
                                onClick={editMessage}
                                disabled={!editText.trim() || editingLoading}
                            >
                                {editingLoading ? "..." : t('chat.dialogs.edit.save')}
                            </button>

                            <button
                                className="btn-cancel"
                                disabled={editingLoading}
                                onClick={() => {
                                    setEditDialogOpen(false);
                                    setEditingMessage(null);
                                    setEditText('');
                                }}
                            >
                                {t('chat.dialogs.edit.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Message Dialog */}
            {deleteDialogOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h3 className="dialog-title">
                            {t('chat.dialogs.delete.title')}
                        </h3>
                        <div className="dialog-buttons">
                            <button
                                className="btn-delete"
                                onClick={deleteMessage}
                                disabled={deletingLoading}
                            >
                                {deletingLoading ? "..." : t('chat.dialogs.delete.delete')}
                            </button>
                            <button
                                className="btn-cancel"
                                disabled={deletingLoading}
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setDeletingMessage(null);
                                }}
                            >
                                {t('chat.dialogs.delete.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Full Chat Dialog */}
            {deleteChatDialogOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h3 className="dialog-title">
                            {t('chat.dialogs.deleteFullChat.title')}
                        </h3>
                        <p className="dialog-message">
                            {t('chat.dialogs.deleteFullChat.message', { 
                                name: selectedAccount?.display_name || `@${selectedAccount?.username}` 
                            })}
                        </p>
                        <div className="dialog-buttons">
                            <button
                                className="btn-delete"
                                onClick={deleteFullChat}
                                disabled={deletingChat}
                            >
                                {deletingChat ? "..." : t('chat.dialogs.deleteFullChat.delete')}
                            </button>
                            <button
                                className="btn-cancel"
                                disabled={deletingChat}
                                onClick={() => setDeleteChatDialogOpen(false)}
                            >
                                {t('chat.dialogs.deleteFullChat.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-layout">
                {/* Left sidebar - Contact List */}
                <div className={`contacts-sidebar ${isMobile && selectedAccount ? 'hidden' : ''}`}>
                    <div className="sidebar-header">
                        <button 
                            className="refresh-button" 
                            onClick={() => navigate('/')}
                            style={{ opacity: forMainMenu ? 0 : 1, pointerEvents: forMainMenu ? 'none' : 'auto' }}
                            disabled={forMainMenu}
                        >
                            <span className="material-icons">arrow_back</span>
                        </button>

                        <h2 className="sidebar-title">{t('chat.title')}</h2>

                        <button className="refresh-button" onClick={refreshContacts}>
                            <span className="material-icons">replay</span>
                        </button>
                    </div>

                    <div className="search-container">
                                            <div className={`search-box ${searchTerm ? "active" : ""}`}>
                                                <span className="search-icon">🔍</span>

                                                <input
                                                    type="text"
                                                    placeholder={t('chat.searchPlaceholder')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />

                                                {searchTerm && (
                                                    <button className="clear-btn" onClick={clearSearch}>
                                                        ×
                                                    </button>
                                                )}

                                                {loadingSearch && <div className="loader"></div>}
                                            </div>
                                        </div>

                    <div className="contacts-list">
                        {showSearchResults ? (
                            <>
                                <div className="search-results-section">
                                    <div className="search-results-title">
                                        {t('chat.searchResults')}
                                    </div>
                                    {loadingSearch ? (
                                        <div className="loading-contacts">
                                            <div className="spinner"></div>
                                            <p>{t('chat.searching')}</p>
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="no-search-results">
                                            {t('chat.noSearchResults')}
                                        </div>
                                    ) : (
                                        searchResults.map(account => {
                                            const accountId = account.user_id || account.id;
                                            const isSelected = activeChatId === accountId;
                                            const status = userStatuses[accountId];
                                            
                                            return (
                                                <div
                                                    key={accountId}
                                                    className={`search-result-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => selectAccount(account)}
                                                >
                                                    <div className="contact-avatar-container">
                                                        <img
                                                            src={account.avatar}
                                                            alt={account.display_name || account.username}
                                                            className="search-result-avatar"
                                                        />
                                                        {status && status.is_online && (
                                                            <span className="online-indicator"></span>
                                                        )}
                                                        {status && !status.is_online && status.last_seen && (
                                                            <span className="last-seen-indicator"></span>
                                                        )}
                                                    </div>
                                                    <div className="search-result-info">
                                                        <div className="search-result-name">
                                                            {account.display_name || `@${account.username}`}
                                                        </div>
                                                        {account.display_name && (
                                                            <div className="search-result-username">
                                                                @{account.username}
                                                            </div>
                                                        )}
                                                        {status && !status.is_online && status.last_seen && (
                                                            <div className="last-seen-text">
                                                                {t('chat.status.lastSeen')}: {formatLastSeen(status.last_seen)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {loadingContacts && contacts.length === 0 ? (
                                    <div className="loading-contacts">
                                        <div className="spinner"></div>
                                        <p>{t('chat.loadingContacts')}</p>
                                    </div>
                                ) : contacts.length === 0 ? (
                                    <div className="no-contacts">
                                        <p>{t('chat.noContacts')}</p>
                                    </div>
                                ) : (
                                    contacts.map(contact => {
                                        const contactId = contact.user_id || contact.id;
                                        const isSelected = activeChatId === contactId;
                                        const status = userStatuses[contactId];
                                        
                                        return (
                                            <div
                                                key={contactId}
                                                className={`contact-item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => selectAccount(contact)}
                                            >
                                                <div className="contact-avatar-container">
                                                    <img
                                                        src={contact.avatar}
                                                        alt={contact.display_name || contact.username}
                                                        className="contact-avatar"
                                                    />
                                                    {status && status.is_online && (
                                                        <span className="online-indicator"></span>
                                                    )}
                                                    {status && !status.is_online && status.last_seen && (
                                                        <span className="last-seen-indicator"></span>
                                                    )}
                                                </div>
                                                <div className="contact-info">
                                                    <div className="contact-name">
                                                        {contact.display_name || `@${contact.username}`}
                                                    </div>
                                                    {contact.display_name && (
                                                        <div className="contact-username">
                                                            @{contact.username}
                                                        </div>
                                                    )}
                                                    <div className="contact-last-message">
                                                        {contact.last_message_type === 'voice' ? (
                                                            <span>🎤 {t('chat.voice.voiceMessage')}</span>
                                                        ) : (
                                                            contact.last_message
                                                        )}
                                                    </div>
                                                    {status && !status.is_online && status.last_seen && (
                                                        <div className="last-seen-text">
                                                            {formatLastSeen(status.last_seen)}
                                                        </div>
                                                    )}
                                                </div>
                                                {contact.count_unread > 0 && (
                                                    <div className="unread-badge">
                                                        {contact.count_unread}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}

                                {hasMoreContacts && !showSearchResults && (
                                    <div className="load-more-contacts">
                                        <button
                                            onClick={() => loadContacts(contactsPage + 1)}
                                            disabled={loadingContacts}
                                            className="load-more-button"
                                        >
                                            {loadingContacts ? t('chat.loading') : t('chat.loadMore')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right side - Chat Area */}
                <div className={`chat-area ${isMobile && !selectedAccount ? 'hidden' : ''}`}>
                    {selectedAccount ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header">
                                {isMobile && (
                                    <button 
                                        className="back-to-contacts"
                                        onClick={backToContacts}
                                    >
                                        ←
                                    </button>
                                )}
                                <div className="chat-header-avatar-container">
                                    <img
                                        src={selectedAccount.avatar}
                                        alt={selectedAccount.display_name || selectedAccount.username}
                                        className="chat-header-avatar"
                                        onClick={() => navigate(`/@${selectedAccount.username}`)}
                                    />
                                    {selectedUserStatus && selectedUserStatus.is_online && (
                                        <span className="online-indicator large"></span>
                                    )}
                                    {selectedUserStatus && !selectedUserStatus.is_online && selectedUserStatus.last_seen && (
                                        <span className="last-seen-indicator large"></span>
                                    )}
                                </div>
                                <div 
                                    className="chat-header-info"
                                    onClick={() => navigate(`/@${selectedAccount.username}`)}
                                >
                                    <div className="chat-header-name">
                                        {selectedAccount.display_name || `@${selectedAccount.username}`}
                                    </div>
                                    {selectedAccount.display_name && (
                                        <div className="chat-header-username">
                                            @{selectedAccount.username}
                                        </div>
                                    )}
                                    {selectedUserStatus && (
                                        <div className="chat-header-status">
                                            {selectedUserStatus.is_online ? (
                                                <span className="status-online">{t('chat.status.online')}</span>
                                            ) : (
                                                selectedUserStatus.last_seen && (
                                                    <span className="status-offline">
                                                        {t('chat.status.lastSeen')}: {formatLastSeen(selectedUserStatus.last_seen)}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Тугмаи менюи се нуқта */}
                                <div className="chat-menu-container" ref={chatMenuRef}>
                                    <button 
                                        className="chat-menu-button"
                                        onClick={() => setChatMenuOpen(!chatMenuOpen)}
                                    >
                                        <span className="material-icons">more_vert</span>
                                    </button>
                                    
                                    {chatMenuOpen && (
                                        <div className="chat-menu-dropdown">
                                            <button
                                                className="chat-menu-item delete-chat"
                                                onClick={() => {
                                                    setChatMenuOpen(false);
                                                    setDeleteChatDialogOpen(true);
                                                }}
                                            >
                                                <span className="material-icons">delete</span>
                                                {t('chat.menu.deleteFullChat')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="messages-container" ref={chatContainerRef}>
                                {activeChatData?.loadingMessages && !activeChatData?.messageGroups ? (
                                    <div className="loading-contacts">
                                        <div className="spinner"></div>
                                        <p>{t('chat.messages.loading')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {activeChatData?.hasMoreMessages && (
                                            <div className="load-more-container">
                                                <button
                                                    className="load-more-button"
                                                    onClick={loadMoreMessages}
                                                    disabled={activeChatData?.loadingMessages}
                                                >
                                                    {activeChatData?.loadingMessages ? t('chat.messages.loadingMore') : t('chat.messages.loadMore')}
                                                </button>
                                            </div>
                                        )}

                                        {!activeChatData?.messageGroups || Object.keys(activeChatData.messageGroups).length === 0 ? (
                                            <div className="no-messages">
                                                <p>{t('chat.messages.noMessages')}</p>
                                            </div>
                                        ) : (
                                            sortedDates.map(date => (
                                                <div key={date}>
                                                    <div className='load-more-container'>
                                                        <div className="date-separator">
                                                            {formatDateTajik(date)}
                                                        </div>
                                                    </div>
                                                    {activeChatData.messageGroups[date].map((message, index) => (
                                                        <div
                                                            key={message.message_id || message.id || index}
                                                            className={`message-wrapper ${
                                                                message.isSelf ? 'self' : 'other'
                                                            }`}
                                                        >
                                                            <div className="message-bubble-container">
                                                                <div
                                                                    id={`message-${message.message_id || message.id}`}
                                                                    className={`message-bubble ${
                                                                        message.isSelf ? 'self' : 'other'
                                                                    } ${message.message_type === 'voice' ? 'voice-message' : ''}`}
                                                                >
                                                                    {/* Намоиши паёми ҷавоб */}
                                                                    {message.reply_to && (
                                                                        <div 
                                                                            className={`reply-to-message ${message.reply_to.is_deleted ? 'deleted' : ''}`}
                                                                            onClick={() => {
                                                                                if (!message.reply_to.is_deleted) {
                                                                                    const element = document.getElementById(`message-${message.reply_to.message_id}`);
                                                                                    if (element) {
                                                                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                    }
                                                                                }
                                                                            }}
                                                                            style={message.reply_to.is_deleted ? { cursor: 'default', opacity: 0.7 } : {}}
                                                                        >
                                                                            <span className="reply-to-label">
                                                                                @{message.reply_to.from_username}
                                                                            </span>
                                                                            <span className="reply-to-text">
                                                                                {message.reply_to.is_deleted 
                                                                                    ? t('chat.messages.deletedMessage') 
                                                                                    : (message.reply_to.message_type === 'voice' 
                                                                                        ? '🎤 ' + t('chat.voice.voiceMessage') 
                                                                                        : message.reply_to.text)}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {message.message_type === 'voice' ? (
                                                                        <div className="voice-message-container">
                                                                            <button 
                                                                                className="play-voice-button"
                                                                                onClick={() => playVoiceMessage(message.message_id || message.id, message.voice_data)}
                                                                            >
                                                                                {playingAudioId === (message.message_id || message.id) ? '⏸️' : '▶️'}
                                                                            </button>
                                                                            <div className="voice-waveform">
                                                                                <div className="voice-duration">
                                                                                    {formatDuration(message.voice_duration || 0)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="message-text">
                                                                            {convertTextToHtmlLinks(message.text, navigate)}
                                                                        </div>
                                                                    )}
                                                                    
                                                                    <div className="message-footer">
                                                                        {message.is_edited && (
                                                                            <span className="edited-label">
                                                                                {t('chat.messages.edited')}
                                                                            </span>
                                                                        )}
                                                                        <span className="message-time">
                                                                            {formatTimeTajik(message.created_at)}
                                                                        </span>
                                                                        {message.isSelf && (
                                                                            <span className="read-status">
                                                                                {message.is_read ? '✓✓' : '✓'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {message.isSelf ? (
                                                                    <div className="message-actions">
                                                                        <div className="message-menu">
                                                                            <button
                                                                                className="menu-button"
                                                                                onClick={() => handleReplyToMessage(message)}
                                                                            >
                                                                                {t('chat.messages.reply')}
                                                                            </button>
                                                                            {message.message_type === 'text' && (
                                                                                <button
                                                                                    className="menu-button"
                                                                                    onClick={() => {
                                                                                        setEditingMessage(message);
                                                                                        setEditText(message.text);
                                                                                        setEditDialogOpen(true);
                                                                                    }}
                                                                                >
                                                                                    {t('chat.messages.edit')}
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                className="menu-button delete"
                                                                                onClick={() => {
                                                                                    setDeletingMessage(message);
                                                                                    setDeleteDialogOpen(true);
                                                                                }}
                                                                            >
                                                                                {t('chat.messages.delete')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="message-actions">
                                                                        <div className="message-menu">
                                                                            <button
                                                                                className="menu-button"
                                                                                onClick={() => handleReplyToMessage(message)}
                                                                            >
                                                                                {t('chat.messages.reply')}
                                                                            </button>
                                                                            <button
                                                                                className="menu-button delete"
                                                                                onClick={() => {
                                                                                    setDeletingMessage(message);
                                                                                    setDeleteDialogOpen(true);
                                                                                }}
                                                                            >
                                                                                {t('chat.messages.deleteForBoth')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="message-input-container">

                                {replyToMessage && (
                                    <div className="reply-preview-wrapper">
                                        <ReplyPreview
                                            replyTo={replyToMessage}
                                            onCancel={cancelReply}
                                        />
                                    </div>
                                )}

                                {audioUrl ? (
                                    <div className="voice-preview">
                                        <audio src={audioUrl} controls />

                                        <button
                                            className="cancel-voice-button"
                                            onClick={() => {
                                                setAudioBlob(null);
                                                setAudioUrl(null);
                                            }}
                                        >
                                            ×
                                        </button>

                                        <button
                                            className="send-voice-button"
                                            onClick={sendVoiceMessage}
                                            disabled={sendingMessage}
                                        >
                                            ➤
                                        </button>
                                    </div>
                                ) : isRecording ? (
                                    <div className="recording-indicator">
                                        <span className="recording-dot"></span>

                                        <span className="recording-time">
                                            {formatDuration(recordingTime)}
                                        </span>

                                        <button
                                            className="stop-recording-button"
                                            onClick={stopRecording}
                                        >
                                            ⏹️
                                        </button>

                                        <button
                                            className="cancel-recording-button"
                                            onClick={cancelRecording}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="message-input-wrapper">
                                        <button
                                            className="emoji-button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        >
                                            😊
                                        </button>

                                        {showEmojiPicker && (
                                            <div
                                                className="emoji-picker-container"
                                                ref={emojiPickerRef}
                                            >
                                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                                            </div>
                                        )}

                                        <input
                                            ref={messageInputRef}
                                            type="text"
                                            className="message-input"
                                            placeholder={t('chat.messages.sendMessage')}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            disabled={
                                                sendingMessage ||
                                                activeChatData?.loadingMessages
                                            }
                                        />

                                        <button
                                            className="voice-button"
                                            onClick={startRecording}
                                            disabled={
                                                sendingMessage ||
                                                activeChatData?.loadingMessages
                                            }
                                        >
                                            🎤
                                        </button>

                                        <button
                                            className="send-button"
                                            onClick={sendMessage}
                                            disabled={
                                                !messageInput.trim() ||
                                                sendingMessage ||
                                                activeChatData?.loadingMessages
                                            }
                                        >
                                            ➤
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <div className="welcome-message">
                                <h3>{t('chat.welcome.title')}</h3>
                                <p>{t('chat.welcome.description')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ChatUI;
