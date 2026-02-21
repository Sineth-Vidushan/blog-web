import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Link } from "react-router-dom";
import { truncateText } from "../utils/truncateText";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import "./Style/Home.css";

// Icons (Install react-icons: npm install react-icons)
import { FiSearch, FiClock, FiArrowRight, FiMail, FiCalendar } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart, AiOutlineBook, AiFillBook } from "react-icons/ai";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";


export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [userData, setUserData] = useState({});

  // Calculate reading time (words per minute)
  const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Fetch user data to get author names
  const fetchUserData = async (userId) => {
    if (!userId || userData[userId]) return userData[userId];

    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const user = { id: userDoc.id, ...userDoc.data() };
        setUserData(prev => ({ ...prev, [userId]: user }));
        return user;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
    return null;
  };





  useEffect(() => {
    const fetchLatestPosts = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "blogs"),
          orderBy("createdAt", "desc"),
          limit(6) // Increased to 6 for better grid layout
        );

        const snapshot = await getDocs(q);
        const postsData = [];

        // Process each post
        for (const docSnap of snapshot.docs) {
          const post = {
            id: docSnap.id,
            ...docSnap.data()
          };

          // Get author data if authorId exists
          if (post.authorId) {
            const author = await fetchUserData(post.authorId);
            if (author) {
              post.authorName = author.name;
            }
          }

          // Calculate reading time
          post.readTime = calculateReadTime(post.content || "");

          // Format date
          if (post.createdAt) {
            post.formattedDate = format(post.createdAt.toDate(), 'MMM dd, yyyy');
          }

          postsData.push(post);
        }

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
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestPosts();
    const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
    const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    setSavedPosts(new Set(saved));
    setLikedPosts(new Set(liked));
  }, []);

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




  // Filter posts based on search
  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.categories?.some(cat =>
      cat.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Insights & Ideas
            <br />
            <span style={{ color: '#CBC19D' }}>for Modern Thinkers</span>
          </h1>
          <p className="hero-subtitle">
            Discover thought-provoking articles, tutorials, and insights
            on technology, design, and creative development.
          </p>

          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-hero-input"
              placeholder="Search articles, tutorials, insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="section-header">
          <h2 className="section-title">Latest Articles</h2>
          <Link to="/feed" className="view-all-btn">
            View All Articles
            <FiArrowRight />
          </Link>
        </div>

        {isLoading ? (
          <div className="loading-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-heading)' }}>
              No articles found
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {searchQuery ? `No results for "${searchQuery}"` : 'No articles available yet.'}
            </p>
          </div>
        ) : (
          <div className="posts-grid">
            {filteredPosts.map(post => (
              <article className="blog-card" key={post.id}>
                {/* Card Header */}
                <div className="card-header">
                  <div className="author-info">
                    <span className="author-name">
                      {post.authorName || 'Anonymous Author'}
                    </span>
                    <span className="post-date">
                      <FiCalendar />
                      {post.formattedDate || 'Recent'}
                    </span>
                  </div>

                  <button
                    className={`save-button ${savedPosts.has(post.id) ? 'saved' : ''}`}
                    onClick={() => handleSavePost(post.id)}
                    aria-label={savedPosts.has(post.id) ? 'Remove from saved' : 'Save article'}
                  >
                    {savedPosts.has(post.id) ? <FaBookmark /> : <FaRegBookmark />}
                    {savedPosts.has(post.id) ? 'Saved' : 'Save'}
                  </button>
                </div>

                {/* Media Preview */}
                {post.mediaUrls?.length > 0 && (
                  <div className="card-media-preview">
                    {(() => {
                      const firstImage = post.mediaUrls.find(url =>
                        !url.includes("video") &&
                        !url.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i)
                      );
                      return firstImage ? (
                        <img src={firstImage} alt={post.title} className="card-media-image" />
                      ) : null;
                    })()}
                  </div>
                )}
                {!post.mediaUrls?.length && post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mp3|wav|ogg|m4a|aac)$/i) && (
                  <div className="card-media-preview">
                    <img src={post.mediaUrl} alt={post.title} className="card-media-image" />
                  </div>
                )}

                {/* Card Body */}
                <div className="card-body">
                  {/* Card Title */}
                  <Link to={`/post/${post.id}?fullscreen=true`} className="blog-title">
                    {post.title || 'Untitled Article'}
                  </Link>

                  {/* Card Content */}
                  <div className="card-content">
                    <p className="blog-excerpt">
                      {truncateText(post.content || '', 200)}
                    </p>
                  </div>

                  {/* Divider */}
                  <hr className="card-divider" />

                  {/* Card Footer */}
                  <div className="card-footer">
                    <div className="meta-left">
                      <span className="category-badge">
                        {(post.categories && post.categories[0]) || 'General'}
                      </span>

                      <button
                        className={`like-button ${likedPosts.has(post.id) ? 'liked' : ''}`}
                        onClick={() => handleLikePost(post.id)}
                        aria-label={likedPosts.has(post.id) ? 'Unlike article' : 'Like article'}
                      >
                        {likedPosts.has(post.id) ? <AiFillHeart /> : <AiOutlineHeart />}
                        <span className="likes-count">
                          {post.likesCount || 0}
                        </span>
                      </button>
                    </div>

                    <div className="meta-right">
                      <span className="read-time">
                        <FiClock />
                        {post.readTime || 5} min read
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Start Your Writing Journey</h2>
          <p className="cta-text">
            Join our community of writers and share your insights with thousands
            of readers. Whether you're an expert or just starting out, your voice matters.
          </p>
          <Link to="/create" className="cta-button">
            Write Your First Article
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#383737' }}>
            Stay Updated
          </h2>
          <p style={{ color: '#5B5757', marginBottom: '2rem' }}>
            Get the latest articles and insights delivered directly to your inbox.
          </p>

          <form className="newsletter-form">
            <input
              type="email"
              className="newsletter-input"
              placeholder="Your email address"
              required
            />
            <button type="submit" className="newsletter-button">
              <FiMail style={{ marginRight: '0.5rem' }} />
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}