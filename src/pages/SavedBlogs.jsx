import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { calculateReadTime } from "../utils/truncateText";
import "./Style/SavedBlogs.css";

import { FiBookmark, FiClock, FiCalendar, FiHeart, FiTrash2 } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

export default function SavedBlogs() {
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState(new Set());

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedPosts") || "[]");
    setSavedPostIds(saved);

    const liked = JSON.parse(localStorage.getItem("likedPosts") || "[]");
    setLikedPosts(new Set(liked));
  }, []);

  useEffect(() => {
    if (savedPostIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const fetchSavedPosts = async () => {
      setLoading(true);
      try {
        const postsData = [];
        for (const postId of savedPostIds) {
          try {
            const postDoc = await getDoc(doc(db, "blogs", postId));
            if (postDoc.exists()) {
              const post = {
                id: postDoc.id,
                ...postDoc.data(),
                formattedDate: postDoc.data().createdAt
                  ? format(postDoc.data().createdAt.toDate(), "MMM dd, yyyy")
                  : "Recent",
                readTime: calculateReadTime(postDoc.data().content || ""),
              };
              postsData.push(post);
            }
          } catch (err) {
            console.error(`Error fetching post ${postId}:`, err);
          }
        }
        setPosts(postsData);
      } catch (err) {
        console.error("Error fetching saved posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [savedPostIds]);

  const handleRemoveSaved = (postId) => {
    const newSaved = savedPostIds.filter((id) => id !== postId);
    setSavedPostIds(newSaved);
    localStorage.setItem("savedPosts", JSON.stringify(newSaved));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLikePost = (postId) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
    } else {
      newLiked.add(postId);
    }
    setLikedPosts(newLiked);
    localStorage.setItem("likedPosts", JSON.stringify([...newLiked]));
  };

  return (
    <div className="saved-blogs-container">
      <div className="saved-blogs-wrapper">
        <header className="saved-blogs-header">
          <h1 className="saved-blogs-title">
            <FiBookmark /> Saved Articles
          </h1>
          <p className="saved-blogs-subtitle">
            {posts.length} {posts.length === 1 ? "article" : "articles"} saved
          </p>
        </header>

        {loading ? (
          <div className="saved-blogs-loading">Loading saved articles...</div>
        ) : posts.length === 0 ? (
          <div className="saved-blogs-empty">
            <FiBookmark className="empty-icon" />
            <h3>No saved articles</h3>
            <p>Start saving articles you want to read later!</p>
            <Link to="/feed" className="empty-action">
              Browse Articles
            </Link>
          </div>
        ) : (
          <div className="saved-blogs-grid">
            {posts.map((post) => {
              const firstImage =
                post.mediaUrls?.find(
                  (url) =>
                    !url.includes("video") &&
                    !url.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i)
                ) || (post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i) ? post.mediaUrl : null);

              return (
                <article className="saved-blog-card" key={post.id}>
                  {firstImage && (
                    <div className="saved-card-media">
                      <img src={firstImage} alt={post.title} />
                    </div>
                  )}
                  <div className="saved-card-content">
                    <div className="saved-card-header">
                      <div className="saved-card-meta">
                        <span className="saved-card-author">
                          {post.authorEmail?.split("@")[0] || "Anonymous"}
                        </span>
                        <span className="saved-card-date">
                          <FiCalendar /> {post.formattedDate}
                        </span>
                      </div>
                      <button
                        className="saved-remove-btn"
                        onClick={() => handleRemoveSaved(post.id)}
                        title="Remove from saved"
                      >
                        <FiTrash2 />
                      </button>
                    </div>

                    <Link
                      to={`/post/${post.id}?fullscreen=true`}
                      className="saved-card-title"
                    >
                      {post.title || "Untitled Article"}
                    </Link>

                    <p className="saved-card-excerpt">
                      {post.content?.substring(0, 150) +
                        (post.content?.length > 150 ? "..." : "")}
                    </p>

                    <div className="saved-card-footer">
                      <span className="saved-card-category">
                        {(post.categories && post.categories[0]) || "General"}
                      </span>
                      <button
                        className={`saved-card-like ${likedPosts.has(post.id) ? "liked" : ""}`}
                        onClick={() => handleLikePost(post.id)}
                      >
                        {likedPosts.has(post.id) ? (
                          <AiFillHeart />
                        ) : (
                          <AiOutlineHeart />
                        )}
                        <span>
                          {(post.likesCount || 0) +
                            (likedPosts.has(post.id) ? 1 : 0)}
                        </span>
                      </button>
                      <span className="saved-card-read-time">
                        <FiClock /> {post.readTime || 5} min
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
