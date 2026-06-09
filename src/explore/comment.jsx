// comment.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './comment.css';
import { useNavigate } from 'react-router-dom';

const CommentComponent = ({
    backendUrl,
    userIdFromMe,
    userId,
    collaboratorIds = [],
    postId,
    typePost = '',
    selectedCommentId = null,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [showReplies, setShowReplies] = useState({});
    const [loadingMore, setLoadingMore] = useState(false);
    const [likeStatuses, setLikeStatuses] = useState({});
    const [userAvatars, setUserAvatars] = useState({});
    const [pinnedComments, setPinnedComments] = useState([]);
    const [loadingPin, setLoadingPin] = useState({});
    
    const [commentOffset, setCommentOffset] = useState(0);
    const [replyOffsets, setReplyOffsets] = useState({});
    
    const commentLimit = 10;
    const replyLimit = 5;
    
    const commentInputRef = useRef(null);
    const [sendingCommentMessage, setSendingCommentMessage] = useState(false);
    const [sendingReplyMessage, setSendingReplyMessage] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState({});
    const [nestedReplyingTo, setNestedReplyingTo] = useState(null);

    // WebSocket хуруҷҳо
    const websocketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const [isWebsocketConnected, setIsWebsocketConnected] = useState(false);
    const receivedCommentsRef = useRef(new Set());
    const isConnectingRef = useRef(false);

    // State барои selectedComment
    const [selectedCommentData, setSelectedCommentData] = useState(null);
    const [loadingSelectedComment, setLoadingSelectedComment] = useState(false);
    const [selectedCommentLoaded, setSelectedCommentLoaded] = useState(false);

    // Функсия барои созмони URL-и WebSocket
    const getWebSocketUrl = useCallback(() => {
        let wsScheme = "ws://";
        if (backendUrl.startsWith("https://")) {
            wsScheme = "wss://";
        }

        const backendDomain = backendUrl.replace('https://', '').replace('http://', '').split('/')[0];

        return `${wsScheme}${backendDomain}/ws/updates-${typePost}/${postId}`;
    }, [backendUrl, typePost, postId]);

    // Функсия барои пайвастшавӣ ба WebSocket
    const connectWebSocket = useCallback(() => {
        if (isConnectingRef.current || websocketRef.current) {
            return;
        }
        
        const wsUrl = getWebSocketUrl();
        if (!wsUrl) {
            console.error('❌ Навъи номаълуми пост барои WebSocket');
            return;
        }

        isConnectingRef.current = true;
        
        try {
            const socket = new WebSocket(wsUrl);
            websocketRef.current = socket;
            
            socket.onopen = () => {
                setIsWebsocketConnected(true);
                isConnectingRef.current = false;
                
                pingIntervalRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 25000);
            };
            
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('❌ Хато дар парси паёми WebSocket:', error);
                }
            };
            
            socket.onerror = (error) => {
                console.error('❌ Хатои WebSocket:', error);
                setIsWebsocketConnected(false);
                isConnectingRef.current = false;
                
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
            };
            
            socket.onclose = (event) => {
                setIsWebsocketConnected(false);
                isConnectingRef.current = false;
                
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
                
                websocketRef.current = null;
                
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, 5000);
            };
            
        } catch (error) {
            console.error('❌ Хато дар сохтани WebSocket:', error);
            isConnectingRef.current = false;
            websocketRef.current = null;
        }
    }, [getWebSocketUrl]);

    // Функсия барои коркарди паёмҳои WebSocket
    const handleWebSocketMessage = useCallback((data) => {
        const messageType = data.type;
        
        if (!messageType) {
            console.warn('⚠️ Паёми бе навъ аз WebSocket');
            return;
        }

        switch (messageType) {
            case 'replay_count':
                handleReplayCount(data);
                break;
            case 'comment_like_count':
                handleCommentLikeCount(data);
                break;
            case 'new_comment':
                handleNewComment(data);
                break;
            case 'delete_comment':
                handleDeleteComment(data);
                break;
            case 'edit_comment':
                handleEditComment(data);
                break;
            case 'comment_like_status':
                if (data.user_id === userId) {
                    handleCommentLikeStatus(data);
                }
                break;
            case 'pong':
                break;
            default:
                console.warn(`⚠️ Навъи номаълуми паём: ${messageType}`);
        }
    }, [userId]);

    // Функсия барои коркарди навсозии миқдори ҷавобҳо
    const handleReplayCount = useCallback((data) => {
        const { comment_id, value } = data;
        
        setComments(prev => updateReplayCountInTree(prev, comment_id, value));
        
        setPinnedComments(prev => prev.map(comment => 
            comment.id === comment_id 
                ? { ...comment, CountReplays: value }
                : comment
        ));
        
        if (selectedCommentData && selectedCommentData.id === comment_id) {
            setSelectedCommentData(prev => ({
                ...prev,
                CountReplays: value
            }));
        }
        
    }, [selectedCommentData]);

    const updateReplayCountInTree = (commentsList, commentId, count) => {
        return commentsList.map(comment => {
            if (comment.id === commentId) {
                return { ...comment, CountReplays: count };
            }
            
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateReplayCountInTree(comment.replies, commentId, count)
                };
            }
            
            return comment;
        });
    };

    const handleCommentLikeCount = useCallback((data) => {
        const { comment_id, value } = data;
        
        setComments(prev => updateLikeCountInTree(prev, comment_id, value));
        
        setPinnedComments(prev => prev.map(comment => 
            comment.id === comment_id 
                ? { ...comment, CountLike: value }
                : comment
        ));
        
        if (selectedCommentData && selectedCommentData.id === comment_id) {
            setSelectedCommentData(prev => ({
                ...prev,
                CountLike: value
            }));
        }
        
    }, [selectedCommentData]);

    const updateLikeCountInTree = (commentsList, commentId, count) => {
        return commentsList.map(comment => {
            if (comment.id === commentId) {
                return { ...comment, CountLike: count };
            }
            
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateLikeCountInTree(comment.replies, commentId, count)
                };
            }
            
            return comment;
        });
    };

    const handleCommentLikeStatus = useCallback((data) => {
        const { comment_id, liked } = data;
        
        setLikeStatuses(prev => ({
            ...prev,
            [comment_id]: liked
        }));
        
        setComments(prev => updateLikeStatusInTree(prev, comment_id, liked));
        
        setPinnedComments(prev => prev.map(comment => 
            comment.id === comment_id 
                ? { ...comment, user_liked: liked }
                : comment
        ));
        
        if (selectedCommentData && selectedCommentData.id === comment_id) {
            setSelectedCommentData(prev => ({
                ...prev,
                user_liked: liked
            }));
        }
    }, [selectedCommentData]);

    const updateLikeStatusInTree = (commentsList, commentId, isLiked) => {
        return commentsList.map(comment => {
            if (comment.id === commentId) {
                return { ...comment, user_liked: isLiked };
            }
            
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateLikeStatusInTree(comment.replies, commentId, isLiked)
                };
            }
            
            return comment;
        });
    };

    const handleNewComment = useCallback(async (data) => {
        const commentData = data.comment;
        

        // if (receivedCommentsRef.current.has(commentData.id)) {
        //     return;
        // }
        
        receivedCommentsRef.current.add(commentData.id);
        
        // Гирифтани акси профили корбар
        let avatarBase64 = userAvatars[commentData.user_id];
        if (!avatarBase64) {
            avatarBase64 = await fetchUserAvatar(commentData.user_id);
        }
        commentData.avatar = avatarBase64;
        
        if (!commentData.parent_comment_id || commentData.parent_comment_id === 'null' || commentData.parent_comment_id === null) {
            const newCommentItem = {
                ...commentData,
                id: commentData.id,
                username: commentData.username || 'User',
                display: commentData.display || '',
                CountReplays: commentData.CountReplays || 0,
                CountLike: commentData.CountLike || 0,
                user_liked: false,
                replies: [],
                hasMoreReplies: true,
                replyOffset: 0,
                loadingReplies: false,
                isNested: false,
                user_id: commentData.user_id,
                avatar: avatarBase64,
                pinned: commentData.pinned || false,
                created_at: commentData.created_at,
                text: commentData.text || '',
                is_edited: commentData.is_edited || false
            };
            
            setComments(prev => [newCommentItem, ...prev]);
            setCommentOffset(prev => prev + 1);
            
        } else {
            await handleReplyComment(commentData);
        }
    }, [userAvatars]);

    const handleReplyComment = useCallback(async (commentData) => {
        const parentCommentId = commentData.parent_comment_id;
        
        // Боварӣ ҳосил кунед, ки акси профил барои ҷавоб вуҷуд дорад
        let avatarBase64 = commentData.avatar;
        if (!avatarBase64 && commentData.user_id) {
            avatarBase64 = userAvatars[commentData.user_id];
            if (!avatarBase64) {
                avatarBase64 = await fetchUserAvatar(commentData.user_id);
            }
        }
        
        const addReplyToTree = (commentsList, parentId, newReply) => {
            return commentsList.map(comment => {
                if (comment.id === parentId) {
                    const updatedReplies = [newReply, ...(comment.replies || [])];
                    return {
                        ...comment,
                        replies: updatedReplies,
                        CountReplays: updatedReplies.length,
                    };
                }
                
                if (comment.replies && comment.replies.length > 0) {
                    return {
                        ...comment,
                        replies: addReplyToTree(comment.replies, parentId, newReply)
                    };
                }
                
                return comment;
            });
        };
        
        const newReply = {
            ...commentData,
            id: commentData.id,
            username: commentData.username || 'User',
            display: commentData.display || '',
            CountReplays: commentData.CountReplays || 0,
            CountLike: commentData.CountLike || 0,
            user_liked: false,
            replies: [],
            hasMoreReplies: false,
            replyOffset: 0,
            loadingReplies: false,
            isNested: true,
            user_id: commentData.user_id,
            avatar: avatarBase64,
            pinned: false,
            created_at: commentData.created_at,
            text: commentData.text || '',
            is_edited: false
        };
        
        setComments(prev => addReplyToTree(prev, parentCommentId, newReply));
        setPinnedComments(prev => addReplyToTree(prev, parentCommentId, newReply));
        
        await checkLikeStatuses([commentData.id]);
    }, [userAvatars]);

    const handleDeleteComment = useCallback((data) => {
        const commentId = data.comment_id;
        const parentCommentId = data.parent_comment_id;
        
        if (selectedCommentData && selectedCommentData.id === commentId) {
            setSelectedCommentData(null);
            setSelectedCommentLoaded(false);
        }
        
        const deleteCommentFromTree = (commentsList, targetId) => {
            const isTopLevel = commentsList.some(c => c.id === targetId);
            
            if (isTopLevel) {
                return commentsList.filter(comment => comment.id !== targetId);
            }
            
            return commentsList.map(comment => {
                if (comment.replies && comment.replies.length > 0) {
                    const replyIndex = comment.replies.findIndex(reply => reply.id === targetId);
                    
                    if (replyIndex !== -1) {
                        const updatedReplies = comment.replies.filter(reply => reply.id !== targetId);
                        
                        return {
                            ...comment,
                            replies: updatedReplies,
                        };
                    }
                    
                    return {
                        ...comment,
                        replies: deleteCommentFromTree(comment.replies, targetId)
                    };
                }
                return comment;
            });
        };
        
        setComments(prev => deleteCommentFromTree(prev, commentId));
        setPinnedComments(prev => prev.filter(comment => comment.id !== commentId));
        
        if (parentCommentId && parentCommentId !== 'null' && parentCommentId !== null) {
            setReplyOffsets(prev => {
                const currentOffset = prev[parentCommentId] || 0;
                const newOffset = Math.max(0, currentOffset - 1);
                return {
                    ...prev,
                    [parentCommentId]: newOffset
                };
            });
        } else {
            setCommentOffset(prev => Math.max(0, prev - 1));
        }
        
        receivedCommentsRef.current.delete(commentId);
        
        setLikeStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[commentId];
            return newStatuses;
        });
        
    }, [selectedCommentData]);

    const handleEditComment = useCallback((data) => {
        const { comment_id, text, created_at, is_edited } = data;
        
        if (selectedCommentData && selectedCommentData.id === comment_id) {
            setSelectedCommentData(prev => ({
                ...prev,
                text: text,
                created_at: created_at,
                is_edited: is_edited
            }));
        }
        
        const editCommentInTree = (commentsList, targetId, newText, newCreatedAt, edited) => {
            return commentsList.map(comment => {
                if (comment.id === targetId) {
                    return { 
                        ...comment, 
                        text: newText,
                        created_at: newCreatedAt,
                        is_edited: edited
                    };
                }
                
                if (comment.replies && comment.replies.length > 0) {
                    return {
                        ...comment,
                        replies: editCommentInTree(comment.replies, targetId, newText, newCreatedAt, edited)
                    };
                }
                
                return comment;
            });
        };
        
        setComments(prev => editCommentInTree(prev, comment_id, text, created_at, is_edited));
        
        setPinnedComments(prev => prev.map(comment => 
            comment.id === comment_id 
                ? { ...comment, text, created_at, is_edited } 
                : comment
        ));
        
    }, [selectedCommentData]);

    const cleanupWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        
        if (websocketRef.current) {
            if (websocketRef.current.readyState === WebSocket.OPEN) {
                websocketRef.current.close(1000, 'Normal closure by component unmount');
            }
            websocketRef.current = null;
        }
        
        setIsWebsocketConnected(false);
        isConnectingRef.current = false;
    }, []);

    // Функсия барои гирифтани акси профили корбар
    const fetchUserAvatar = async (userId) => {
        if (!userId) return '';
        
        // Агар акс аллакай дар кэш бошад
        if (userAvatars[userId]) {
            return userAvatars[userId];
        }
        
        try {
            const response = await fetch(`${backendUrl}/get-user-avatar/${userId}`);
            if (response.ok) {
                const data = await response.json();
                const avatarUrl = data.avatar ? `data:image/jpeg;base64,${data.avatar}` : '';
                
                setUserAvatars(prev => ({
                    ...prev,
                    [userId]: avatarUrl
                }));
                
                return avatarUrl;
            }
        } catch (err) {
            console.error(`Error fetching avatar for user ${userId}:`, err);
        }
        
        return '';
    };

    // Функсия барои гирифтани аксҳои ҳамаи корбарони дар комментҳо
    const fetchAvatarsForComments = async (commentList) => {
        const userIds = new Set();
        
        const collectUserIds = (comment) => {
            if (comment.user_id) {
                userIds.add(comment.user_id);
            }
            
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(collectUserIds);
            }
        };
        
        commentList.forEach(collectUserIds);
        
        const avatarPromises = Array.from(userIds).map(userId => fetchUserAvatar(userId));
        await Promise.all(avatarPromises);
    };

    const checkLikeStatuses = async (commentIds) => {
        if (!commentIds || commentIds.length === 0) return;
        
        try {
            const likePromises = commentIds.map(async (commentId) => {
                try {
                    const response = await fetch(
                        `${backendUrl}/get-${typePost}-comment-like-status/${commentId}/${userId}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        return { commentId, liked: data.liked || false };
                    }
                } catch (err) {
                    console.error(`Error checking like status for comment ${commentId}:`, err);
                }
                return { commentId, liked: false };
            });
            
            const results = await Promise.all(likePromises);
            const newLikeStatuses = {};
            results.forEach(result => {
                newLikeStatuses[result.commentId] = result.liked;
            });
            
            setLikeStatuses(prev => ({ ...prev, ...newLikeStatuses }));
        } catch (err) {
            console.error('Error checking like statuses:', err);
        }
    };

    const fetchComments = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
                setCommentOffset(0);
            } else {
                if (!hasMore || loadingMore) return;
                setLoadingMore(true);
            }

            let commentsList = [];

            if (selectedCommentId && reset) {
                try {
                    const res = await fetch(
                        `${backendUrl}/get-${typePost}-comment-by-id?comment_id=${selectedCommentId}`
                    );

                    if (res.ok) {
                        const result = await res.json();
                        const data = result.comment_data;

                        if (data) {
                            // Гирифтани акси профил барои комменти интихобшуда
                            const avatarUrl = await fetchUserAvatar(data.user_id);
                            const selectedFormatted = {
                                ...data,
                                avatar: avatarUrl,
                                replies: [],
                                hasMoreReplies: true,
                                replyOffset: 0,
                                loadingReplies: false,
                                isNested: false
                            };

                            commentsList.push(selectedFormatted);
                            receivedCommentsRef.current.add(data.id);
                        }
                    }
                } catch (e) {
                    console.error('Error loading selected comment', e);
                }
            }

            const currentOffset = reset ? 0 : commentOffset;

            const url = `${backendUrl}/get-${typePost}-comments/${postId}?offset=${currentOffset}&limit=${commentLimit}&user_id=${userId}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            const processedComments = await Promise.all((data.comments || [])
                .filter(c => c.id !== selectedCommentId)
                .map(async (comment) => {
                    // Гирифтани акси профил барои ҳар як коммент
                    const avatarUrl = await fetchUserAvatar(comment.user_id);
                    return {
                        ...comment,
                        avatar: avatarUrl,
                        replies: [],
                        hasMoreReplies: true,
                        replyOffset: 0,
                        loadingReplies: false,
                        isNested: false
                    };
                }));

            processedComments.forEach(c => receivedCommentsRef.current.add(c.id));

            commentsList = [...commentsList, ...processedComments];

            if (reset) {
                setComments(commentsList);
            } else {
                setComments(prev => [...prev, ...commentsList]);
            }

            setCommentOffset(currentOffset + processedComments.length);
            setHasMore(data.has_more || false);
            setError(null);

            const ids = commentsList.map(c => c.id);
            await checkLikeStatuses(ids);

        } catch (err) {
            console.error('Error fetching comments:', err);
            setError(t('comment.error'));
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handlePinComment = async (commentId) => {
        if (loadingPin[commentId]) return;

        setLoadingPin(prev => ({ ...prev, [commentId]: true }));

        const payload = {
            user_id: userId,
            comment_id: commentId,
        };
        
        if (typePost === 'video') {
            payload.video_id = postId;
        } else if (typePost === 'image') {
            payload.image_id = postId;
        } else if (typePost === 'product') {
            payload.product_id = postId;
        } else if (typePost === 'theory') {
            payload.theory_id = postId;
        } else if (typePost === 'article') {
            payload.article_id = postId;
        }

        try {
            const response = await fetch(`${backendUrl}/pin-${typePost}-comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();

                const updatePinStatusInTree = (commentsList, targetId, pinnedStatus) =>
                    commentsList.map(comment => {
                        if (comment.id === targetId) {
                            return { ...comment, pinned: pinnedStatus };
                        }

                        if (comment.replies?.length) {
                            return {
                                ...comment,
                                replies: updatePinStatusInTree(
                                    comment.replies,
                                    targetId,
                                    pinnedStatus
                                )
                            };
                        }

                        return comment;
                    });

                setComments(prev =>
                    updatePinStatusInTree(prev, commentId, data.pinned)
                );

                if (selectedCommentData && selectedCommentData.id === commentId) {
                    setSelectedCommentData(prev => ({
                        ...prev,
                        pinned: data.pinned
                    }));
                }

                setPinnedComments(prev => {
                    const index = prev.findIndex(c => c.id === commentId);

                    if (index !== -1) {
                        if (!data.pinned) {
                            return prev.filter(c => c.id !== commentId);
                        }
                        const updated = [...prev];
                        updated[index] = { ...updated[index], pinned: data.pinned };
                        return updated;
                    }

                    if (data.pinned) {
                        const findCommentInTree = (list, id) => {
                            for (const c of list) {
                                if (c.id === id) return c;
                                if (c.replies?.length) {
                                    const found = findCommentInTree(c.replies, id);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };

                        const commentToPin = findCommentInTree(comments, commentId);
                        if (commentToPin) {
                            return [...prev, { ...commentToPin, pinned: true }];
                        }
                    }

                    return prev;
                });

                alert(data.pinned ? t('comment.pinSuccess') : t('comment.unpinSuccess'));
            } else {
                const errorData = await response.json().catch(() => ({ detail: t('comment.pinError') }));
                alert(errorData.detail || t('comment.pinError'));
            }
        } catch (err) {
            console.error('Error pinning comment:', err);
            alert(t('comment.connectionError'));
        } finally {
            setLoadingPin(prev => ({ ...prev, [commentId]: false }));
        }
    };

    useEffect(() => {
        if (postId && backendUrl && userId) {
            fetchComments(true);
        }
        
        connectWebSocket();
        
        return () => {
            cleanupWebSocket();
        };
    }, [postId, backendUrl, userId, connectWebSocket, cleanupWebSocket]);

    useEffect(() => {
        if (userId) {
            fetchUserAvatar(userId);
        }
    }, [userId]);

    const loadMoreComments = () => {
        fetchComments(false);
    };

    const fetchReplies = async (parentId, reset = false, isNestedReply = false) => {
        try {
            const currentReplyOffset = replyOffsets[parentId] || 0;
            
            setLoadingReplies(prev => ({ ...prev, [parentId]: true }));
            
            const response = await fetch(
                `${backendUrl}/get-${typePost}-replays/${parentId}?offset=${currentReplyOffset}&limit=${replyLimit}&user_id=${userId}`
            );
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Боргирии аксҳо барои ҳар як ҷавоб
            const processedReplies = await Promise.all((data.replays || []).filter(reply => 
                !receivedCommentsRef.current.has(reply.id)
            ).map(async (reply) => {
                // Гирифтани акси профили корбар барои ҳар як ҷавоб
                const avatarUrl = await fetchUserAvatar(reply.user_id);
                
                return {
                    ...reply,
                    user_liked: false,
                    user_disliked: false,
                    replies: [],
                    hasMoreReplies: false,
                    replyOffset: 0,
                    loadingReplies: false,
                    isNested: true,
                    avatar: avatarUrl
                };
            }));
            
            if (processedReplies.length === 0) {
                setShowReplies(prev => ({ ...prev, [parentId]: true }));
                
                const updateHasMoreInTree = (commentsList) => {
                    return commentsList.map(comment => {
                        if (comment.id === parentId) {
                            return {
                                ...comment,
                                hasMoreReplies: false,
                                loadingReplies: false
                            };
                        }
                        
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateHasMoreInTree(comment.replies)
                            };
                        }
                        
                        return comment;
                    });
                };
                
                setComments(prev => updateHasMoreInTree(prev));
                
                setLoadingReplies(prev => ({ ...prev, [parentId]: false }));
                return;
            }
            
            const replyIds = processedReplies.map(reply => reply.id);
            replyIds.forEach(id => receivedCommentsRef.current.add(id));

            const updateCommentsWithReplies = (commentsList) => {
                return commentsList.map(comment => {
                    if (comment.id === parentId) {
                        const existingReplies = comment.replies || [];
                        
                        const filterDuplicateReplies = (newReplies, existingReplies) => {
                            const existingIds = new Set(existingReplies.map(r => r.id));
                            return newReplies.filter(reply => !existingIds.has(reply.id));
                        };
                        
                        const filteredNewReplies = filterDuplicateReplies(processedReplies, existingReplies);
                        const newReplies = reset ? filteredNewReplies : [...existingReplies, ...filteredNewReplies];
                        
                        const totalLoadedReplies = newReplies.length;
                        
                        const totalComments = data.total_count || 0;
                        const hasMore = totalLoadedReplies < totalComments;
                        
                        return {
                            ...comment,
                            replies: newReplies,
                            hasMoreReplies: hasMore,
                            replyOffset: totalLoadedReplies,
                            loadingReplies: false
                        };
                    }
                    
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateCommentsWithReplies(comment.replies)
                        };
                    }
                    
                    return comment;
                });
            };
            
            setComments(prev => updateCommentsWithReplies(prev));
            
            const newTotalOffset = currentReplyOffset + processedReplies.length;
            setReplyOffsets(prev => ({
                ...prev,
                [parentId]: newTotalOffset
            }));
            
            setShowReplies(prev => ({ ...prev, [parentId]: true }));
            
            await checkLikeStatuses(replyIds);
            
        } catch (err) {
            console.error('Error fetching replies:', err);
        } finally {
            setLoadingReplies(prev => ({ ...prev, [parentId]: false }));
        }
    };

    const loadMoreReplies = (commentId, isNestedReply = false) => {
        fetchReplies(commentId, false, isNestedReply);
    };

    const toggleReplies = (commentId, isNestedReply = false) => {
        if (showReplies[commentId]) {
            setShowReplies(prev => ({ ...prev, [commentId]: false }));
            return;
        }

        setShowReplies(prev => ({ ...prev, [commentId]: true }));
        fetchReplies(commentId, true, isNestedReply);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || sendingCommentMessage) return;

        setSendingCommentMessage(true);

        const payload = {
            user_id: userId,
            text: newComment.trim(),
            parent_comment_id: null,
            user_id_from_me: userIdFromMe
        };
        
        if (typePost === 'video') {
            payload.video_id = postId;
        } else if (typePost === 'image') {
            payload.image_id = postId;
        } else if (typePost === 'product') {
            payload.product_id = postId;
        } else if (typePost === 'theory') {
            payload.theory_id = postId;
        } else if (typePost === 'article') {
            payload.article_id = postId;
        }

        try {
            const response = await fetch(`${backendUrl}/add-comment-in-${typePost}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const newCommentData = await response.json();

                if (newCommentData.comment_id) {
                    receivedCommentsRef.current.add(newCommentData.comment_id);
                }

                setNewComment('');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error response:', errorData);
                alert(t('comment.addError'));
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            alert(t('comment.addError'));
        } finally {
            setSendingCommentMessage(false);
        }
    };

    const handleDeleteCommentManual = async (commentId) => {
        if (!window.confirm(t('comment.deleteConfirm'))) {
            return;
        }
        
        try {
            const response = await fetch(`${backendUrl}/delete-${typePost}-comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    comment_id: commentId
                })
            });
            
            if (response.ok) {
                // WebSocket паёмро барои несткунӣ мефиристад
            } else {
                alert(t('comment.deleteError'));
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
            alert(t('comment.deleteError'));
        }
    };

    const handleLikeComment = async (commentId, isLike) => {
        try {
            const currentLiked = likeStatuses[commentId] || false;

            const payload = {
                user_id: userId,
                comment_id: commentId,
            };
            
            if (typePost === 'video') {
                payload.video_id = postId;
            } else if (typePost === 'image') {
                payload.image_id = postId;
            } else if (typePost === 'product') {
                payload.product_id = postId;
            } else if (typePost === 'theory') {
                payload.theory_id = postId;
            } else if (typePost === 'article') {
                payload.article_id = postId;
            }

            if (currentLiked && isLike) {
                const response = await fetch(
                    `${backendUrl}/unlike-${typePost}-comment`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }
                );

                if (response.ok) {
                    setLikeStatuses(prev => ({
                        ...prev,
                        [commentId]: false
                    }));
                }
            }
            else if (!currentLiked && isLike) {
                const response = await fetch(
                    `${backendUrl}/like-${typePost}-comment`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }
                );

                if (response.ok) {
                    setLikeStatuses(prev => ({
                        ...prev,
                        [commentId]: true
                    }));
                }
            }
        } catch (err) {
            console.error('Error liking/unliking comment:', err);
            alert(t('comment.likeError'));
        }
    };

    const timeAgo = (timestamp) => {
        if (!timestamp) return t('comment.timeAgo.unknown');
        
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

        if (seconds < minute) return t('comment.timeAgo.secondsAgo');
        if (seconds < hour) {
            const minutes = Math.floor(seconds / minute);
            return minutes > 1 ? t('comment.timeAgo.minutesAgo', { count: minutes }) : t('comment.timeAgo.minuteAgo');
        }
        if (seconds < day) {
            const hours = Math.floor(seconds / hour);
            return hours > 1 ? t('comment.timeAgo.hoursAgo', { count: hours }) : t('comment.timeAgo.hourAgo');
        }
        if (seconds < week) {
            const days = Math.floor(seconds / day);
            return days > 1 ? t('comment.timeAgo.daysAgo', { count: days }) : t('comment.timeAgo.dayAgo');
        }
        if (seconds < month) {
            const weeks = Math.floor(seconds / week);
            return weeks > 1 ? t('comment.timeAgo.weeksAgo', { count: weeks }) : t('comment.timeAgo.weekAgo');
        }
        if (seconds < year) {
            const months = Math.floor(seconds / month);
            return months > 1 ? t('comment.timeAgo.monthsAgo', { count: months }) : t('comment.timeAgo.monthAgo');
        }
        const years = Math.floor(seconds / year);
        return years > 1 ? t('comment.timeAgo.yearsAgo', { count: years }) : t('comment.timeAgo.yearAgo');
    };

    useEffect(() => {
        if (Object.keys(likeStatuses).length > 0) {
            const updateLikesInTree = (commentsList) => {
                return commentsList.map(comment => {
                    const isLiked = likeStatuses[comment.id] || false;
                    
                    let updatedComment = {
                        ...comment,
                        user_liked: isLiked
                    };
                    
                    if (comment.replies && comment.replies.length > 0) {
                        updatedComment.replies = updateLikesInTree(comment.replies);
                    }
                    
                    return updatedComment;
                });
            };
            
            setComments(prev => updateLikesInTree(prev));
            
            if (selectedCommentData) {
                const isLiked = likeStatuses[selectedCommentData.id] || false;
                setSelectedCommentData(prev => ({
                    ...prev,
                    user_liked: isLiked
                }));
            }
            
            setPinnedComments(prev => prev.map(comment => ({
                ...comment,
                user_liked: likeStatuses[comment.id] || false
            })));
        }
    }, [likeStatuses, selectedCommentData]);

    // Навсозии комментҳо бо аксҳо
    useEffect(() => {
        const updateAvatarsInTree = (commentsList) => {
            return commentsList.map(comment => {
                const updatedComment = {
                    ...comment,
                    avatar: userAvatars[comment.user_id] || comment.avatar || ''
                };
                
                if (comment.replies && comment.replies.length > 0) {
                    updatedComment.replies = updateAvatarsInTree(comment.replies);
                }
                
                return updatedComment;
            });
        };
        
        if (Object.keys(userAvatars).length > 0) {
            setComments(prev => updateAvatarsInTree(prev));
            
            if (selectedCommentData) {
                setSelectedCommentData(prev => ({
                    ...prev,
                    avatar: userAvatars[prev.user_id] || prev.avatar || ''
                }));
            }
            
            setPinnedComments(prev => prev.map(comment => ({
                ...comment,
                avatar: userAvatars[comment.user_id] || comment.avatar || ''
            })));
        }
    }, [userAvatars, selectedCommentData]);

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

    const CommentItem = ({ comment, depth = 0, isPinned = false, isSelected = false }) => {
        const isOwner = comment.user_id === userId;
        const isPostOwner = userIdFromMe === comment.user_id;
        const canDelete = isOwner || userId === userIdFromMe || collaboratorIds.includes(userId);
        const canEdit = isOwner;
        const canPin = userId === userIdFromMe || collaboratorIds.includes(userId);
        const isLiked = comment.user_liked || false;
        // Агар акс мавҷуд набошад, доираи хокистаранг намоиш дода мешавад
        const avatarUrl = comment.avatar || userAvatars[comment.user_id] || '';
        const isLoadingReplies = loadingReplies[comment.id] || false;
        const isNested = comment.isNested || false;
        const isPinnedComment = comment.pinned || isPinned;
        
        const [localNewReply, setLocalNewReply] = useState('');
        const [isEditing, setIsEditing] = useState(false);
        const [editText, setEditText] = useState(comment.text || comment.comment_text);

        const isCollaborator = collaboratorIds.includes(comment.user_id);

        const handleAddReplyToThisComment = async () => {
            if (!localNewReply.trim() || sendingReplyMessage) return;

            try {
                setSendingReplyMessage(true);

                const payload = {
                    user_id: userId,
                    text: localNewReply.trim(),
                    parent_comment_id: comment.id,
                    user_id_from_me: userIdFromMe
                };
                
                if (typePost === 'video') {
                    payload.video_id = postId;
                } else if (typePost === 'image') {
                    payload.image_id = postId;
                } else if (typePost === 'product') {
                    payload.product_id = postId;
                } else if (typePost === 'theory') {
                    payload.theory_id = postId;
                } else if (typePost === 'article') {
                    payload.article_id = postId;
                }

                const response = await fetch(`${backendUrl}/add-comment-in-${typePost}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    setLocalNewReply('');
                    setNestedReplyingTo(null);

                    if (!showReplies[comment.id]) {
                        setShowReplies(prev => ({
                            ...prev,
                            [comment.id]: true
                        }));
                    }
                } else {
                    alert(t('comment.addError'));
                }
            } catch (err) {
                console.error('Error adding reply:', err);
                alert(t('comment.addError'));
            } finally {
                setSendingReplyMessage(false);
            }
        };

        const handleEditThisComment = async () => {
            if (!editText.trim()) return;
            
            try {
                const response = await fetch(`${backendUrl}/edit-${typePost}-comment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        comment_id: comment.id,
                        text: editText.trim()
                    })
                });
                
                if (response.ok) {
                    setIsEditing(false);
                } else {
                    alert(t('comment.editError'));
                }
            } catch (err) {
                console.error('Error editing comment:', err);
                alert(t('comment.editError'));
            }
        };

        return (
            <div className={`comment-item ${depth > 1 ? 'nested-comment' : ''} ${isPinnedComment ? 'pinned-comment' : ''} ${isSelected ? 'selected-comment' : ''}`}>
                {isPinnedComment && (
                    <div className="pinned-badge">
                        📌 {t('comment.pinned')}
                    </div>
                )}

                <div className="comment-avatar">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={comment.username} className="comment-avatar-img" />
                    ) : (
                        <div className="avatar-placeholder"></div>
                    )}
                </div>

                <div className="comment-content">
                    <div className="comment-header">
                        <span className="author-display">
                            {!comment.display ? (
                                <>
                                    {convertTextToHtmlLinks(`@${comment.username}`, navigate)}
                                </>
                            ) : (
                                <>
                                    {comment.display}
                                </>
                            )}
                        </span>
                        {!comment.display && isPostOwner && (
                            <span className="owner-badge"> {t('comment.owner')}</span>
                        )}
                        {!comment.display && isCollaborator && (
                            <span className="owner-badge"> {t('comment.collaborator')}</span>
                        )}
                    </div>

                    {comment.display && (
                        <div className="comment-header">
                            <span className="author-username">
                                {convertTextToHtmlLinks(`@${comment.username}`, navigate)}
                            </span>
                            {isPostOwner && <span className="owner-badge"> {t('comment.owner')}</span>}
                            {isCollaborator && <span className="owner-badge"> {t('comment.collaborator')}</span>}
                        </div>
                    )}

                    <div className="comment-text">
                        {isEditing ? (
                            <div className="edit-comment-in-place">
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows="3"
                                    className="edit-textarea"
                                    autoFocus
                                />
                                <div className="edit-in-place-actions">
                                    <button 
                                        onClick={handleEditThisComment}
                                        className="save-edit-btn"
                                    >
                                        {t('comment.save')}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditText(comment.text || comment.comment_text);
                                        }}
                                        className="cancel-edit-btn"
                                    >
                                        {t('comment.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="message-text">
                                    {convertTextToHtmlLinks(comment.text || comment.comment_text, navigate)}
                                </div>

                                <span className="comment-time">
                                    {timeAgo(comment.created_at)}
                                    {comment.is_edited && (
                                        <span className="edited-badge"> {t('comment.edited')}</span>
                                    )}
                                </span>
                            </>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="comment-actions">
                            <button
                                className={`like-button ${isLiked ? 'liked' : ''}`}
                                onClick={() => handleLikeComment(comment.id, true)}
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill={isLiked ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20.8 4.6c-1.8-1.8-4.7-1.8-6.5 0L12 6.9l-2.3-2.3c-1.8-1.8-4.7-1.8-6.5 0s-1.8 4.7 0 6.5L12 21l8.8-8.9c1.8-1.8 1.8-4.7 0-6.5z" />
                                </svg>
                                {comment.CountLike || 0}
                            </button>

                            <button 
                                className="reply-button"
                                onClick={() => setNestedReplyingTo(nestedReplyingTo === comment.id ? null : comment.id)}
                            >
                                💬 {t('comment.reply')}
                            </button>

                            {canPin && !isNested && (
                                <button 
                                    className={`pin-button ${isPinnedComment ? 'pinned' : ''}`}
                                    onClick={() => handlePinComment(comment.id)}
                                    disabled={loadingPin[comment.id]}
                                >
                                    {loadingPin[comment.id] ? (
                                        <span className="loading-comment-spinner-small"></span>
                                    ) : isPinnedComment ? (
                                        `📌 ${t('comment.unpin')}`
                                    ) : (
                                        `📌 ${t('comment.pin')}`
                                    )}
                                </button>
                            )}

                            {canEdit && (
                                <button 
                                    className="edit-button"
                                    onClick={() => setIsEditing(true)}
                                >
                                    ✏️ {t('comment.edit')}
                                </button>
                            )}

                            {canDelete && (
                                <button 
                                    className="delete-button"
                                    onClick={() => handleDeleteCommentManual(comment.id)}
                                >
                                    🗑️ {t('comment.delete')}
                                </button>
                            )}
                        </div>
                    )}

                    {nestedReplyingTo === comment.id && (
                        <div className="add-comment-header">
                            <div className="current-user-avatar">
                                {userAvatars[userId] ? (
                                    <img src={userAvatars[userId]} alt="Your avatar" />
                                ) : (
                                    <div className="avatar-placeholder"></div>
                                )}
                            </div>

                            <div className="add-comment-textarea">
                                <textarea
                                    value={localNewReply}
                                    onChange={(e) => setLocalNewReply(e.target.value)}
                                    disabled={sendingReplyMessage}
                                    placeholder={t('comment.addReply')}
                                    rows={1}
                                />
                            </div>

                            <button
                                className="send-comment-button"
                                onClick={handleAddReplyToThisComment}
                                disabled={!localNewReply.trim() || sendingReplyMessage}
                            >
                                {sendingReplyMessage ? (
                                    <div className="send-spinner"></div>
                                ) : (
                                    '➤'
                                )}
                            </button>
                        </div>
                    )}

                    {comment.CountReplays > 0 && !isEditing && (
                        <div className="replies-section">
                            {comment.CountReplays > 0 && !showReplies[comment.id] && (
                                <button 
                                    className="show-replies-btn"
                                    onClick={() => toggleReplies(comment.id, isNested)}
                                    disabled={isLoadingReplies}
                                >
                                    {isLoadingReplies ? (
                                        <>
                                            <span className="loading-comment-spinner-small"></span>
                                            {t('comment.loadingMore')}
                                        </>
                                    ) : (
                                        t('comment.showReplies', { count: comment.CountReplays })
                                    )}
                                </button>
                            )}

                            {showReplies[comment.id] && comment.replies && (
                                <div className="replies-list">
                                    {comment.replies.map(reply => (
                                        <CommentItem 
                                            key={reply.id} 
                                            comment={reply} 
                                            depth={depth + 1}
                                        />
                                    ))}
                                    
                                    {comment.hasMoreReplies && (
                                        <div className="load-more-comment-container">
                                            <button 
                                                onClick={() => loadMoreReplies(comment.id, isNested)}
                                                disabled={isLoadingReplies}
                                                className="load-more-comment-btn"
                                            >
                                                {isLoadingReplies ? (
                                                    <>
                                                        <span className="loading-comment-spinner-small"></span>
                                                        {t('comment.loadingMore')}
                                                    </>
                                                ) : (
                                                    `+`
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading && commentOffset === 0 && !selectedCommentId) {
        return (
            <div className="comments-loading">
                <div className="loading-comment-spinner"></div>
                <p>{t('comment.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="comments-error">
                <p>{error}</p>
                <button onClick={() => fetchComments(true)}>{t('comment.loadMore')}</button>
            </div>
        );
    }

    return (
        <div className="comments-container">
            <div className="websocket-status-bar">
                <span className={`status-indicator ${isWebsocketConnected ? 'connected' : 'disconnected'}`}>
                    ●
                </span>
                <span className="status-text">
                    {isWebsocketConnected ? t('comment.status.connected') : t('comment.status.disconnected')}
                </span>
            </div>

            <div className="add-comment-section">
                <div className="add-comment-header">
                    <div className="current-user-avatar">
                        {userAvatars[userId] ? (
                            <img src={userAvatars[userId]} alt="Your avatar" />
                        ) : (
                            <div className="avatar-placeholder"></div>
                        )}
                    </div>

                    <div className="add-comment-textarea">
                        <textarea
                            ref={commentInputRef}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={sendingCommentMessage}
                            placeholder={t('comment.addComment')}
                            rows={1}
                        />
                    </div>

                    <button
                        className="send-comment-button"
                        onClick={() => handleAddComment()}
                        disabled={!newComment.trim() || sendingCommentMessage}
                    >
                        {sendingCommentMessage ? (
                            <div className="send-spinner"></div>
                        ) : (
                            '➤'
                        )}
                    </button>
                </div>
            </div>

            <div className="comments-list">
                {loadingSelectedComment && selectedCommentId && (
                    <div className="selected-comment-loading">
                        <div className="loading-comment-spinner-small"></div>
                        <p>{t('comment.loadingComment')}</p>
                    </div>
                )}

                {comments.length === 0 && pinnedComments.length === 0 && !selectedCommentData ? (
                    <div className="no-comments">
                        <p>{t('comment.noComments')}</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            depth={0}
                        />
                    ))
                )}

                {hasMore && (
                    <div className="load-more-comment-container">
                        <button 
                            onClick={loadMoreComments}
                            disabled={loadingMore}
                            className="load-more-comment-btn"
                        >
                            {loadingMore ? (
                                <>
                                    <span className="loading-comment-spinner-small"></span>
                                    {t('comment.loadingMore')}
                                </>
                            ) : (
                                `+`
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentComponent;