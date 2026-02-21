import { useState, useRef, useEffect } from "react";
import { FiHeart, FiMessageCircle, FiShare2, FiMusic, FiX, FiSend } from "react-icons/fi";
import { AiFillHeart } from "react-icons/ai";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { updateDoc, getDoc, doc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, where, increment, setDoc } from "firebase/firestore";
import "../pages/Style/Video.css";

export default function VideoCard({ video }) {
    const { user } = useAuth();
    const [playing, setPlaying] = useState(false);
    const [liked, setLiked] = useState(false);
    const [localLikes, setLocalLikes] = useState(0);
    const [isFollowed, setIsFollowed] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // {commentId, username}
    const videoRef = useRef(null);
    const lastInteractionTime = useRef(0);
    const latestInteractionId = useRef(null);
    const INTERACTION_COOLDOWN = 3000; // 3 seconds

    // Sync state with props initially and on change
    useEffect(() => {
        if (video) {
            // Only overwrite if we haven't recently interacted with this video
            const now = Date.now();
            if (now - lastInteractionTime.current > INTERACTION_COOLDOWN || latestInteractionId.current !== video.id) {
                setLiked(video.likedBy?.includes(user?.uid) || false);
                setLocalLikes(video.likes || 0);
            }
        }
    }, [video.id, user?.uid]);

    const onVideoClick = () => {
        if (playing) {
            videoRef.current.pause();
            setPlaying(false);
        } else {
            videoRef.current.play();
            setPlaying(true);
        }
    };

    const handleLike = async () => {
        if (!user) return;

        const videoDoc = doc(db, "videos", video.id);
        const userId = user.uid;

        try {
            lastInteractionTime.current = Date.now();
            latestInteractionId.current = video.id;
            if (liked) {
                setLiked(false);
                setLocalLikes(prev => Math.max(0, prev - 1));
                await updateDoc(videoDoc, {
                    likedBy: arrayRemove(userId),
                    likes: increment(-1)
                });
            } else {
                setLiked(true);
                setLocalLikes(prev => prev + 1);
                await updateDoc(videoDoc, {
                    likedBy: arrayUnion(userId),
                    likes: increment(1)
                });

                // Trigger Notification
                if (video.userId !== user.uid) {
                    await addDoc(collection(db, "notifications"), {
                        recipientId: video.userId,
                        actorId: user.uid,
                        actorName: user.displayName || user.email.split('@')[0],
                        actorPhoto: user.photoURL || "",
                        type: "like",
                        targetId: video.id,
                        targetType: "video",
                        isRead: false,
                        createdAt: serverTimestamp()
                    });
                }
            }
        } catch (err) {
            console.error("Like error:", err);
            // Revert local state on error
            setLiked(!liked);
            setLocalLikes(prev => liked ? prev + 1 : Math.max(0, prev - 1));
        }
    };

    const handleFollow = async () => {
        if (!user || video.userId === user.uid) return;

        const currentUserRef = doc(db, "users", user.uid);
        const targetUserRef = doc(db, "users", video.userId);

        try {
            if (isFollowed) {
                setIsFollowed(false);
                await setDoc(currentUserRef, { following: arrayRemove(video.userId) }, { merge: true });
                await setDoc(targetUserRef, { followers: arrayRemove(user.uid) }, { merge: true });
            } else {
                setIsFollowed(true);
                await setDoc(currentUserRef, { following: arrayUnion(video.userId) }, { merge: true });
                await setDoc(targetUserRef, { followers: arrayUnion(user.uid) }, { merge: true });
            }
        } catch (err) {
            console.error("Follow error:", err);
            alert("Failed to follow: " + err.message);
            setIsFollowed(!isFollowed); // Revert UI
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        console.log("Attempting to submit comment...");

        if (!user) {
            alert("You must be logged in to comment.");
            return;
        }

        if (!commentText.trim() || isSubmittingComment) return;

        if (!video.id) {
            console.error("Video ID is missing!", video);
            alert("Error: Video ID is missing. Please refresh.");
            return;
        }

        setIsSubmittingComment(true);
        const videoRef = doc(db, "videos", video.id);

        try {
            // Check if video still exists
            const videoSnap = await getDoc(videoRef);
            if (!videoSnap.exists()) {
                alert("This video no longer exists.");
                return;
            }

            const commentsCol = collection(videoRef, "comments");
            console.log("Adding comment to sub-collection...");
            await addDoc(commentsCol, {
                text: commentText,
                userId: user.uid,
                username: user.displayName || user.email.split('@')[0],
                userPhoto: user.photoURL || "",
                createdAt: serverTimestamp(),
                parentId: replyingTo ? replyingTo.commentId : null,
                replyToUser: replyingTo ? replyingTo.username : null
            });

            console.log("Updating message count in video document...");
            try {
                await updateDoc(videoRef, {
                    comments: increment(1)
                });

                // Trigger Notification
                if (video.userId !== user.uid) {
                    await addDoc(collection(db, "notifications"), {
                        recipientId: video.userId,
                        actorId: user.uid,
                        actorName: user.displayName || user.email.split('@')[0],
                        actorPhoto: user.photoURL || "",
                        type: "comment",
                        content: commentText.slice(0, 50),
                        targetId: video.id,
                        targetType: "video",
                        isRead: false,
                        createdAt: serverTimestamp()
                    });
                }
            } catch (countErr) {
                console.error("Failed to update comment count or notification, but comment was posted:", countErr);
            }

            setCommentText("");
            setReplyingTo(null);
            console.log("Comment submitted successfully!");
        } catch (err) {
            console.error("Detailed Comment Error:", err);
            if (err.code === 'permission-denied') {
                alert(`Permission denied: You do not have permission to post comments on this video (UID: ${user?.uid || 'null'}). Please ensure rules are deployed.`);
            } else if (err.code === 'not-found') {
                alert("The video or comment collection was not found.");
            } else {
                alert("Failed to post comment: " + err.message);
            }
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: `Check out this video by @${video.username}`,
            text: video.caption,
            url: window.location.href, // Or a deep link to the video
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };

    useEffect(() => {
        if (!showComments) return;

        const videoDoc = doc(db, "videos", video.id);
        const q = query(collection(videoDoc, "comments"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setComments(commentData);
        });

        return () => unsubscribe();
    }, [showComments, video.id]);

    // Real-time listener for video stats (likes, etc.)
    useEffect(() => {
        if (!video.id) return;
        const videoRef = doc(db, "videos", video.id);
        const unsubscribe = onSnapshot(videoRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const now = Date.now();
                // Only sync if we haven't interacted recently to avoid "fighting" the local state
                if (now - lastInteractionTime.current > INTERACTION_COOLDOWN) {
                    setLocalLikes(data.likes || 0);
                    if (user) {
                        setLiked(data.likedBy?.includes(user.uid) || false);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [video.id, user?.uid]);

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: "0px",
            threshold: 0.8,
        };

        const handleIntersection = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    videoRef.current.play();
                    setPlaying(true);
                } else {
                    videoRef.current.pause();
                    setPlaying(false);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, options);
        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) {
                observer.unobserve(videoRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!user || !video.userId) return;

        const q = query(collection(db, "users"), where("__name__", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                setIsFollowed(userData.following?.includes(video.userId) || false);
            }
        });

        return () => unsubscribe();
    }, [video.userId, user?.uid]);

    return (
        <div className="video-card">
            <video
                className="video-player"
                loop
                onClick={onVideoClick}
                ref={videoRef}
                src={video.videoUrl}
            ></video>

            <div className="video-sidebar">
                <div className="sidebar-icon" onClick={handleLike}>
                    {liked ? <AiFillHeart color="#ff2d55" size={32} /> : <FiHeart size={32} />}
                    <span>{localLikes}</span>
                </div>
                <div className="sidebar-icon" onClick={() => setShowComments(true)}>
                    <FiMessageCircle size={32} />
                    <span>{comments.length || video.comments || 0}</span>
                </div>
                <div className="sidebar-icon" onClick={handleShare}>
                    <FiShare2 size={32} />
                    <span>{video.shares}</span>
                </div>
            </div>

            <div className="video-overlay">
                <div className="video-info">
                    <div className="user-info">
                        <img src={video.userPhoto || "https://via.placeholder.com/40"} alt="user" className="user-avatar" />
                        <span className="username">@{video.username}</span>
                        {user?.uid !== video.userId && (
                            <button
                                className={`follow-btn ${isFollowed ? 'followed' : ''}`}
                                onClick={handleFollow}
                            >
                                {isFollowed ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <p className="caption">{video.caption}</p>
                    <div className="music-info">
                        <FiMusic />
                        <marquee scrollamount="3">Original Audio - @{video.username}</marquee>
                    </div>
                </div>
            </div>

            {showComments && (
                <div className="comments-drawer">
                    <div className="comments-header">
                        <h3>Comments ({comments.length})</h3>
                        <button onClick={() => setShowComments(false)}><FiX /></button>
                    </div>
                    <div className="comments-list">
                        {comments.length > 0 ? (
                            comments.filter(c => !c.parentId).map((comment) => (
                                <div key={comment.id} className="comment-group">
                                    <div className="comment-item">
                                        <img src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.username}`} alt="user" className="comment-avatar" />
                                        <div className="comment-content">
                                            <p className="comment-user">@{comment.username}</p>
                                            <p className="comment-text">{comment.text}</p>
                                            <button
                                                className="reply-btn"
                                                onClick={() => {
                                                    setReplyingTo({ commentId: comment.id, username: comment.username });
                                                    setCommentText(`@${comment.username} `);
                                                }}
                                            >
                                                Reply
                                            </button>
                                        </div>
                                    </div>

                                    {/* Display replies */}
                                    <div className="replies-list">
                                        {comments.filter(r => r.parentId === comment.id).map(reply => (
                                            <div key={reply.id} className="comment-item reply-item">
                                                <img src={reply.userPhoto || `https://ui-avatars.com/api/?name=${reply.username}`} alt="user" className="comment-avatar small" />
                                                <div className="comment-content">
                                                    <p className="comment-user">@{reply.username} <span>replied to @{reply.replyToUser}</span></p>
                                                    <p className="comment-text">{reply.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-comments">No comments yet. Be the first to say something!</p>
                        )}
                    </div>
                    <form className="comment-input-area" onSubmit={handleCommentSubmit}>
                        {replyingTo && (
                            <div className="replying-to-bar">
                                <span>Replying to @{replyingTo.username}</span>
                                <button type="button" onClick={() => {
                                    setReplyingTo(null);
                                    setCommentText("");
                                }}><FiX /></button>
                            </div>
                        )}
                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                autoFocus={!!replyingTo}
                            />
                            <button type="submit" disabled={!commentText.trim() || isSubmittingComment}>
                                {isSubmittingComment ? <div className="mini-loader"></div> : <FiSend />}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
