import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import {
  FiHeart,
  FiCopy,
  FiEdit,
  FiTrash2,
  FiArrowLeft,
  FiDownload,
  FiMaximize2,
  FiMessageCircle,
  FiSend,
  FiX,
  FiClock,
  FiCalendar
} from "react-icons/fi";
import { format } from "date-fns";
import "./Style/PostDetail.css";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const ref = doc(db, "blogs", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setPost({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const commentsRef = collection(db, "blogs", id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [id]);

  // Auto-open fullscreen if query param is present
  useEffect(() => {
    if (post && searchParams.get("fullscreen") === "true" && !fullscreen) {
      setFullscreen(true);
    }
  }, [post, searchParams, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onEscape = (e) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen || !post) return;
    const readingEl = document.querySelector(".post-fullscreen-reading-panel");
    const progressEl = document.getElementById("post-fullscreen-progress");
    if (!readingEl || !progressEl) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = readingEl;
      const total = scrollHeight - clientHeight;
      const pct = total <= 0 ? 100 : (scrollTop / total) * 100;
      progressEl.style.width = `${Math.min(100, pct)}%`;
    };
    readingEl.addEventListener("scroll", onScroll);
    onScroll();
    return () => readingEl.removeEventListener("scroll", onScroll);
  }, [fullscreen, post]);

  const handleLike = async () => {
    if (!user) return alert("Please login to like");

    const postRef = doc(db, "blogs", id);
    const isLiked = post?.likedBy?.includes(user.uid);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likesCount: increment(-1),
        });
        setPost((prev) => ({
          ...prev,
          likedBy: prev.likedBy.filter(uid => uid !== user.uid),
          likesCount: (prev.likesCount || 0) - 1,
        }));
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likesCount: increment(1),
        });

        // Trigger Notification
        if (post.authorId !== user.uid) {
          await addDoc(collection(db, "notifications"), {
            recipientId: post.authorId,
            actorId: user.uid,
            actorName: user.displayName || user.email.split('@')[0],
            actorPhoto: user.photoURL || "",
            type: "like",
            targetId: post.id,
            targetType: "blog",
            isRead: false,
            createdAt: serverTimestamp()
          });
        }

        setPost((prev) => ({
          ...prev,
          likedBy: [...(prev.likedBy || []), user.uid],
          likesCount: (prev.likesCount || 0) + 1,
        }));
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      alert("Failed to update like. Please try again.");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please login to comment");
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const blogRef = doc(db, "blogs", id);
      await addDoc(collection(blogRef, "comments"), {
        text: commentText,
        userId: user.uid,
        username: user.displayName || user.email.split('@')[0],
        userPhoto: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      await updateDoc(blogRef, {
        commentsCount: increment(1)
      });

      if (post.authorId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          recipientId: post.authorId,
          actorId: user.uid,
          actorName: user.displayName || user.email.split('@')[0],
          actorPhoto: user.photoURL || "",
          type: "comment",
          content: commentText.slice(0, 50),
          targetId: post.id,
          targetType: "blog",
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setCommentText("");
    } catch (err) {
      console.error(err);
      alert("Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCopy = () => {
    const text = `${post.title}\n\n${post.content}\n\n${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this article permanently?")) return;
    await deleteDoc(doc(db, "blogs", id));
    navigate("/home");
  };

  const handleDownload = () => {
    const lines = [
      post.title || "Untitled",
      "",
      `By ${post.authorEmail || "Unknown"}`,
      post.categories?.length ? `Categories: ${post.categories.join(", ")}` : "",
      "",
      "---",
      "",
      post.content || "",
      "",
    ];
    if (post.references?.length) {
      lines.push("References:", ...post.references.map((r) => `- ${r}`), "");
    }
    if (post.mediaUrls?.length) {
      lines.push("Media:", ...post.mediaUrls.map((u) => u), "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(post.title || "post").replace(/[^a-z0-9]/gi, "_").slice(0, 50)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="post-loading">Loading article…</div>;
  if (!post) return <div className="post-loading">Article not found</div>;

  const isAuthor = user?.email === post.authorEmail;

  const mediaUrls = post.mediaUrls?.length
    ? post.mediaUrls
    : post.mediaUrl
      ? [post.mediaUrl]
      : [];

  const renderMediaItem = (mediaUrl, index) => {
    const isVideo =
      mediaUrl.includes("video") || mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);
    const isAudio =
      mediaUrl.includes("audio") || mediaUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
    return (
      <div key={index} className="post-media-item">
        {isVideo ? (
          <video src={mediaUrl} controls playsInline />
        ) : isAudio ? (
          <audio src={mediaUrl} controls style={{ width: "100%" }} />
        ) : (
          <img src={mediaUrl} alt={`${post.title} - Media ${index + 1}`} />
        )}
      </div>
    );
  };

  return (
    <div className="post-page">
      <button
        className="back-btn"
        onClick={() => navigate("/feed")}
      >
        <FiArrowLeft /> Back to Feed
      </button>

      <article className="post-card">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
          <div className="post-author-snapshot">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorEmail} className="post-author-avatar" />
            ) : (
              <div className="post-author-avatar initial-avatar-post">
                {post.authorEmail?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="post-author-details">
              <span className="author">@{post.authorEmail?.split('@')[0]}</span>
              <span className="post-date-full">
                <FiCalendar /> {post.formattedDate || (post.createdAt?.toDate ? format(post.createdAt.toDate(), "MMM dd, yyyy") : "Recent")}
              </span>
            </div>
          </div>
          {post.categories && (
            <span className="categories">{post.categories.join(" • ")}</span>
          )}
        </div>
        <div className="post-content">{post.content}</div>
        {post.references?.length > 0 && (
          <div className="post-references">
            <h4>References</h4>
            <ul>
              {post.references.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ul>
          </div>
        )}
        {mediaUrls.length > 0 && (
          <div className="post-media">
            {mediaUrls.map((url, i) => renderMediaItem(url, i))}
          </div>
        )}

        <div className="post-actions">
          <button onClick={handleLike}>
            <FiHeart /> {post.likesCount || 0}
          </button>
          <button onClick={handleCopy}>
            <FiCopy /> {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleDownload} title="Download as text">
            <FiDownload /> Download
          </button>

          {isAuthor && (
            <>
              <button onClick={() => navigate(`/edit/${id}`)}>
                <FiEdit /> Edit
              </button>
              <button className="danger" onClick={handleDelete}>
                <FiTrash2 /> Delete
              </button>
            </>
          )}
        </div>

        {/* Comments Section */}
        <div className="post-comments-section">
          <h3>Comments ({comments.length})</h3>

          <form className="post-comment-form" onSubmit={handleCommentSubmit}>
            <div className="comment-input-wrapper">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" disabled={!commentText.trim() || isSubmittingComment}>
                {isSubmittingComment ? "..." : <FiSend />}
              </button>
            </div>
          </form>

          <div className="post-comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="post-comment-item">
                <div className="post-comment-avatar">
                  {comment.userPhoto ? (
                    <img src={comment.userPhoto} alt={comment.username} />
                  ) : (
                    <div className="initial-avatar">{comment.username?.charAt(0).toUpperCase() || 'U'}</div>
                  )}
                </div>
                <div className="post-comment-content">
                  <div className="post-comment-header">
                    <span className="comment-username">@{comment.username}</span>
                    <span className="comment-date">
                      {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), "MMM dd, HH:mm") : "Just now"}
                    </span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>}
          </div>
        </div>
      </article>

      {/* Fullscreen Overlay */}
      {fullscreen && (
        <div className="post-fullscreen-overlay">
          <div id="post-fullscreen-progress" className="post-fullscreen-progress"></div>

          <header className="post-fullscreen-header">
            <button className="post-fullscreen-back" onClick={() => navigate("/feed")}>
              <FiArrowLeft /> Back to Feed
            </button>
            <div className="post-fullscreen-mode">Reading Mode</div>
            <div className="post-fullscreen-actions">
              <button onClick={handleLike} className="fullscreen-action-btn" title="Like">
                <FiHeart fill={post?.likedBy?.includes(user?.uid) ? "currentColor" : "none"} />
                <span>{post.likesCount || 0}</span>
              </button>
              <button onClick={handleCopy} className="fullscreen-action-btn" title="Copy Link">
                <FiCopy />
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button onClick={handleDownload} className="fullscreen-action-btn" title="Download">
                <FiDownload />
                <span>Save</span>
              </button>
            </div>
          </header>

          <div className="post-fullscreen-layout">
            {mediaUrls.length > 0 && (
              <aside className="post-fullscreen-media-panel">
                <div className="post-fullscreen-media-inner">
                  <h4 className="post-fullscreen-media-label">Media Gallery</h4>
                  {mediaUrls.map((url, i) => renderMediaItem(url, i))}
                </div>
              </aside>
            )}

            <main className="post-fullscreen-reading-panel">
              <div className="post-fullscreen-reading-inner">
                <p className="post-fullscreen-reading-label">Full Article</p>
                <h1 className="post-title">{post.title}</h1>
                <div className="post-meta">
                  <div className="post-author-snapshot">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorEmail} className="post-author-avatar" />
                    ) : (
                      <div className="post-author-avatar initial-avatar-post">
                        {post.authorEmail?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="post-author-details">
                      <span className="author">@{post.authorEmail?.split('@')[0]}</span>
                      <span className="post-date-full">
                        <FiCalendar /> {post.formattedDate || (post.createdAt?.toDate ? format(post.createdAt.toDate(), "MMM dd, yyyy") : "Recent")}
                      </span>
                    </div>
                  </div>
                  {post.categories && (
                    <span className="categories">{post.categories.join(" • ")}</span>
                  )}
                </div>
                <div className="post-content">{post.content}</div>

                {post.references?.length > 0 && (
                  <div className="post-references">
                    <h4>References</h4>
                    <ul>
                      {post.references.map((ref, i) => (
                        <li key={i}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
