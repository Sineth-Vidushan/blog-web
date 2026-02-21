import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { Link } from "react-router-dom";
import { calculateReadTime } from "../utils/truncateText";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import "./Style/Feed.css";

// Icons
import {
  FiSearch,
  FiClock,
  FiCalendar,
  FiTrendingUp,
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiBookOpen,
  FiGrid,
  FiList,
  FiHeart,
  FiBookmark,
  FiEye
} from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

// Categories for filtering
const CATEGORIES = [
  "Tech",
  "Lifestyle",
  "Travel",
  "Food",
  "Health",
  "Education",
  "Finance",
  "All"
];

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "blogs"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          readTime: calculateReadTime(doc.data().content || ""),
          formattedDate: doc.data().createdAt
            ? format(doc.data().createdAt.toDate(), 'MMM dd, yyyy')
            : 'Recent'
        }));

        // Initialize liked/saved sets from fetched data
        const liked = new Set();
        const saved = new Set();

        if (user) {
          postsData.forEach(p => {
            if (p.likedBy?.includes(user.uid)) liked.add(p.id);
            if (p.savedBy?.includes(user.uid)) saved.add(p.id);
          });
        } else {
          const localSaved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
          const localLiked = JSON.parse(localStorage.getItem('likedPosts') || '[]');
          localSaved.forEach(id => saved.add(id));
          localLiked.forEach(id => liked.add(id));
        }

        setLikedPosts(liked);
        setSavedPosts(saved);
        setPosts(postsData);
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.authorEmail?.toLowerCase().includes(query) ||
        (post.categories && post.categories.some(cat =>
          cat.toLowerCase().includes(query)
        ))
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(post =>
        post.categories && post.categories.includes(selectedCategory)
      );
    }

    // Sort posts
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) =>
          (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
        );
        break;
      case "oldest":
        filtered.sort((a, b) =>
          (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0)
        );
        break;
      case "popular":
        filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        break;
      case "readingTime":
        filtered.sort((a, b) => (a.readTime || 0) - (b.readTime || 0));
        break;
    }

    return filtered;
  }, [posts, searchQuery, selectedCategory, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage]);

  const handleSavePost = async (postId) => {
    if (!user) return alert("Please login to save articles");

    const newSaved = new Set(savedPosts);
    const postRef = doc(db, "blogs", postId);

    if (newSaved.has(postId)) {
      newSaved.delete(postId);
      await updateDoc(postRef, {
        savedBy: arrayRemove(user.uid)
      });
    } else {
      newSaved.add(postId);
      await updateDoc(postRef, {
        savedBy: arrayUnion(user.uid)
      });
    }
    setSavedPosts(newSaved);
    localStorage.setItem('savedPosts', JSON.stringify([...newSaved]));
  };

  const handleLikePost = async (postId) => {
    if (!user) return alert("Please login to like articles");

    const newLiked = new Set(likedPosts);
    const postRef = doc(db, "blogs", postId);

    try {
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likesCount: increment(-1)
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
      } else {
        newLiked.add(postId);
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likesCount: increment(1)
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p));
      }
      setLikedPosts(newLiked);
      localStorage.setItem('likedPosts', JSON.stringify([...newLiked]));
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSortBy("newest");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="feed-container">
        <div className="feed-wrapper">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading articles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="feed-wrapper">
        {/* Header */}
        <div className="feed-header">
          <div className="feed-title-section">
            <h1 className="feed-title">All Articles</h1>
            <div className="feed-stats">
              <div className="stat-item">
                <span className="stat-value">{posts.length}</span>
                <span className="stat-label">Articles</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(posts.reduce((sum, post) => sum + (post.readTime || 0), 0) / 60)}
                </span>
                <span className="stat-label">Hours of Reading</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {posts.reduce((sum, post) => sum + (post.likesCount || 0), 0)}
                </span>
                <span className="stat-label">Total Likes</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-section">
            <div className="filter-row">
              <div className="search-container">
                <FiSearch className="search-icon" />
                <input
                  className="search-input"
                  placeholder="Search articles, topics, authors..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="filter-controls">
                <div className="filter-dropdown">
                  <select
                    className="filter-select"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category === "All" ? "All Categories" : category}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="dropdown-icon" />
                </div>

                <div className="filter-tags">
                  {CATEGORIES.filter(cat => cat !== "All").map(category => (
                    <span
                      key={category}
                      className={`filter-tag ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentPage(1);
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>

                {(searchQuery || selectedCategory !== "All") && (
                  <button className="clear-filters" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="sort-section">
          <div className="sort-label">
            <FiFilter />
            Sort by:
          </div>

          <div className="sort-options">
            <button
              className={`sort-button ${sortBy === 'newest' ? 'active' : ''}`}
              onClick={() => setSortBy('newest')}
            >
              Newest
            </button>
            <button
              className={`sort-button ${sortBy === 'oldest' ? 'active' : ''}`}
              onClick={() => setSortBy('oldest')}
            >
              Oldest
            </button>
            <button
              className={`sort-button ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              Most Popular
            </button>
            <button
              className={`sort-button ${sortBy === 'readingTime' ? 'active' : ''}`}
              onClick={() => setSortBy('readingTime')}
            >
              Reading Time
            </button>
          </div>

          <div className="view-toggle">
            <button
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <FiGrid />
            </button>
            <button
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <FiList />
            </button>
          </div>
        </div>

        {/* Posts Grid/List */}
        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <FiEye className="empty-icon" />
            <h3 className="empty-title">No articles found</h3>
            <p className="empty-description">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "No articles available in this category yet."}
            </p>
            <button className="empty-action" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'posts-grid-view' : 'posts-list-view'}>
              {paginatedPosts.map(post => (
                viewMode === 'grid' ? (
                  // Grid View Card
                  <article className="blog-card-grid" key={post.id}>
                    <div className="card-header-grid">
                      <div className="author-info-grid">
                        {post.authorPhoto ? (
                          <img src={post.authorPhoto} alt={post.authorEmail} className="author-avatar-feed" />
                        ) : (
                          <div className="author-avatar-feed initial-avatar-feed">
                            {post.authorEmail?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="author-details-grid">
                          <span className="author-name-grid">
                            @{post.authorEmail?.split('@')[0] || 'Anonymous'}
                          </span>
                          <span className="post-date-grid">
                            <FiCalendar />
                            {post.formattedDate}
                          </span>
                        </div>
                      </div>

                      <button
                        className={`save-button-grid ${savedPosts.has(post.id) ? 'saved' : ''}`}
                        onClick={() => handleSavePost(post.id)}
                        aria-label={savedPosts.has(post.id) ? 'Remove from saved' : 'Save article'}
                      >
                        {savedPosts.has(post.id) ? <FiBookmark fill="currentColor" /> : <FiBookmark />}
                        <span>{savedPosts.has(post.id) ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    {/* Media Preview */}
                    {post.mediaUrls?.length > 0 && (
                      <div className="card-media-preview-grid">
                        {(() => {
                          const firstImage = post.mediaUrls.find(url =>
                            !url.includes("video") &&
                            !url.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i)
                          );
                          return firstImage ? (
                            <img src={firstImage} alt={post.title} className="card-media-image-grid" />
                          ) : null;
                        })()}
                      </div>
                    )}
                    {!post.mediaUrls?.length && post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i) && (
                      <div className="card-media-preview-grid">
                        <img src={post.mediaUrl} alt={post.title} className="card-media-image-grid" />
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="card-body-grid">
                      <div className="card-title-grid">
                        <Link to={`/post/${post.id}?fullscreen=true`} className="blog-title-grid">
                          {post.title || 'Untitled Article'}
                        </Link>
                      </div>

                      <p className="card-excerpt-grid">
                        {post.content?.substring(0, 180).replace(/<[^>]*>/g, '') + (post.content?.length > 180 ? '...' : '')}
                      </p>

                      <Link to={`/post/${post.id}?fullscreen=true`} className="read-more-link">
                        Read more <FiBookOpen />
                      </Link>
                    </div>

                    <div className="card-footer-grid">
                      <div className="meta-left-grid">
                        <span className="category-badge-grid">
                          {(post.categories && post.categories[0]) || 'General'}
                        </span>

                        <button
                          className={`likes-count-grid ${likedPosts.has(post.id) ? 'liked' : ''}`}
                          onClick={() => handleLikePost(post.id)}
                          aria-label={likedPosts.has(post.id) ? 'Unlike article' : 'Like article'}
                        >
                          {likedPosts.has(post.id) ? <AiFillHeart /> : <AiOutlineHeart />}
                          <span>{post.likesCount || 0}</span>
                        </button>
                      </div>

                      <div className="meta-right-grid">
                        <span className="read-time">
                          <FiClock />
                          {post.readTime || 5} min read
                        </span>
                      </div>
                    </div>
                  </article>
                ) : (
                  // List View Card
                  <article className="blog-card-list" key={post.id}>
                    <div className="card-content-list">
                      <div className="card-header-list">
                        <div className="author-info-list">
                          {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt={post.authorEmail} className="author-avatar-feed" />
                          ) : (
                            <div className="author-avatar-feed initial-avatar-feed">
                              {post.authorEmail?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="author-details-list">
                            <span className="author-name-list">
                              @{post.authorEmail?.split('@')[0] || 'Anonymous'}
                            </span>
                            <span className="post-date-list">
                              <FiCalendar /> {post.formattedDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link to={`/post/${post.id}?fullscreen=true`} className="blog-title-list">
                        {post.title || 'Untitled Article'}
                      </Link>

                      <p className="blog-excerpt-list">
                        {post.content?.substring(0, 180).replace(/<[^>]*>/g, '') + (post.content?.length > 180 ? '...' : '')}
                      </p>

                      <div className="card-footer-list">
                        <span className="category-badge-list">
                          {(post.categories && post.categories[0]) || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Media Preview for List View */}
                    {(post.mediaUrls?.length > 0 || post.mediaUrl) && (
                      <div className="card-media-preview-list">
                        {(() => {
                          const firstImage = (post.mediaUrls || []).find(url =>
                            !url.includes("video") &&
                            !url.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i)
                          ) || (!post.mediaUrls?.length && post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i) ? post.mediaUrl : null);

                          return firstImage ? (
                            <img src={firstImage} alt={post.title} className="card-media-image-list" />
                          ) : null;
                        })()}
                      </div>
                    )}

                    <div className="card-sidebar-list">
                      <button
                        className={`likes-count-list ${likedPosts.has(post.id) ? 'liked' : ''}`}
                        onClick={() => handleLikePost(post.id)}
                        aria-label={likedPosts.has(post.id) ? 'Unlike article' : 'Like article'}
                      >
                        {likedPosts.has(post.id) ? <AiFillHeart /> : <AiOutlineHeart />}
                        <span>{post.likesCount || 0}</span>
                      </button>

                      <span className="read-time-list">
                        <FiClock />
                        {post.readTime || 5} min
                      </span>

                      <button
                        className={`save-button-list ${savedPosts.has(post.id) ? 'saved' : ''}`}
                        onClick={() => handleSavePost(post.id)}
                        aria-label={savedPosts.has(post.id) ? 'Remove from saved' : 'Save article'}
                      >
                        <FiBookmark />
                      </button>
                    </div>
                  </article>
                )
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className={`page-button ${currentPage === 1 ? 'disabled' : ''}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      className={`page-button ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  className={`page-button ${currentPage === totalPages ? 'disabled' : ''}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}