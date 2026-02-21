import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Link } from "react-router-dom";
import { truncateText } from "../utils/truncateText";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import "./Style/Home.css";

// Icons
import { FiSearch, FiClock, FiArrowRight, FiMail, FiVideo, FiCalendar, FiTrendingUp, FiBookOpen, FiUser,FiUsers } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { HiOutlineUserGroup } from "react-icons/hi";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [userData, setUserData] = useState({});
  const [trendingTopics] = useState([
    "Technology", "Design", "Development", "AI", "Web3", "Mobile"
  ]);

  const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content?.trim().split(/\s+/).length || 0;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  };

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
          limit(9)
        );

        const snapshot = await getDocs(q);
        const postsData = [];

        for (const docSnap of snapshot.docs) {
          const post = {
            id: docSnap.id,
            ...docSnap.data()
          };

          if (post.authorId) {
            const author = await fetchUserData(post.authorId);
            if (author) {
              post.authorName = author.name || author.displayName || 'Anonymous';
              post.authorAvatar = author.photoURL || `https://ui-avatars.com/api/?name=${post.authorName}&background=CBC19D&color=383737&bold=true`;
            }
          }

          post.readTime = calculateReadTime(post.content || "");
          post.formattedDate = post.createdAt ? format(post.createdAt.toDate(), 'MMM dd, yyyy') : 'Recent';

          postsData.push(post);
        }

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
  }, [user]);

  const handleSavePost = async (postId) => {
    if (!user) {
      alert("Please login to save articles");
      return;
    }

    const newSaved = new Set(savedPosts);
    const postRef = doc(db, "blogs", postId);

    try {
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
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleLikePost = async (postId) => {
    if (!user) {
      alert("Please login to like articles");
      return;
    }

    const newLiked = new Set(likedPosts);
    const postRef = doc(db, "blogs", postId);

    try {
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likesCount: increment(-1)
        });
        setPosts(prev => prev.map(p => 
          p.id === postId? { ...p, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p
        ));
      } else {
        newLiked.add(postId);
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likesCount: increment(1)
        });
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p
        ));
      }
      setLikedPosts(newLiked);
      localStorage.setItem('likedPosts', JSON.stringify([...newLiked]));
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.categories?.some(cat =>
      cat.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getMediaUrl = (post) => {
    if (post.mediaUrls?.length > 0) {
      return post.mediaUrls.find(url => 
        !url.match(/\.(mp4|webm|ogg|mov|mp3|wav|m4a|aac)$/i)
      );
    }
    if (post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg|mov|mp3|wav|m4a|aac)$/i)) {
      return post.mediaUrl;
    }
    return null;
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-badge">Welcome to the Community</span>
            <h1 className="hero-title">
              Discover Stories That
              <span className="hero-title-gradient"> Inspire Change</span>
            </h1>
            <p className="hero-description">
              Join thousands of readers and writers exploring technology, design, 
              and creative development through authentic storytelling.
            </p>
            
            <div className="hero-search">
              <FiSearch className="hero-search-icon" />
              <input
                type="text"
                placeholder="Search articles, topics, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-number"><FiBookOpen className="hero-stat-icon" /> </span>
                <span className="hero-stat-label">Articles</span>
              </div>
              <div className="hero-stat">
              <span className="hero-stat-number"><FiUser className="hero-stat-icon" /> </span>
                <span className="hero-stat-label">Writers</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number"><FiUsers className="hero-stat-icon" /> </span>
                <span className="hero-stat-label">Readers</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number"><FiVideo className="hero-stat-icon" /> </span>
                <span className="hero-stat-label">Videos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Topics */}
      <section className="trending">
        <div className="container">
          <div className="trending-header">
            <h2 className="section-title">
              <FiTrendingUp className="section-title-icon" />
              Trending Topics
            </h2>
            <Link to="/feed" className="section-link">
              View All <FiArrowRight />
            </Link>
          </div>
          <div className="trending-grid">
            {trendingTopics.map((topic, index) => (
              <button
                key={index}
                className="trending-topic"
                onClick={() => setSearchQuery(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section className="articles">
        <div className="container">
          <div className="articles-header">
            <h2 className="section-title">
              <FiBookOpen className="section-title-icon" />
              Latest Articles
            </h2>
            <Link to="/feed" className="section-link">
              Browse All <FiArrowRight />
            </Link>
          </div>

          {isLoading? (
            <div className="articles-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="article-card skeleton">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                  </div>
                </div>
              ))}
            </div>
          ): filteredPosts.length === 0 ? (
            <div className="empty-state">
              <h3>No articles found</h3>
              <p>{searchQuery ? `No results for "${searchQuery}"`: 'Check back soon for new content!'}</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="empty-state-button">
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="articles-grid">
              {filteredPosts.map((post, index) => {
                const mediaUrl = getMediaUrl(post);
                const isFeatured = index === 0;
                
                return (
                  <article 
                    key={post.id} 
                    className={`article-card ${isFeatured ? 'featured' : ''}`}
                  >
                    {mediaUrl && (
                      <Link to={`/post/${post.id}`} className="article-image-link">
                        <div className="article-image-wrapper">
                          <img 
                            src={mediaUrl} 
                            alt={post.title}
                            className="article-image"
                            loading="lazy"
                          />
                          <div className="article-image-overlay"></div>
                        </div>
                      </Link>
                    )}

                    <div className="article-content">
                      <div className="article-header">
                        <div className="article-author">
                          {post.authorAvatar && (
                            <img 
                              src={post.authorAvatar} 
                              alt={post.authorName}
                              className="article-author-avatar"
                            />
                          )}
                          <div className="article-author-info">
                            <span className="article-author-name">
                              {post.authorName || 'Anonymous'}
                            </span>
                            <span className="article-date">
                              <FiCalendar />
                              {post.formattedDate}
                            </span>
                          </div>
                        </div>

                        <button
                          className={`article-bookmark ${savedPosts.has(post.id) ? 'active' : ''}`}
                          onClick={() => handleSavePost(post.id)}
                          aria-label={savedPosts.has(post.id) ? 'Remove bookmark' : 'Bookmark article'}
                        >
                          {savedPosts.has(post.id) ? <FaBookmark /> : <FaRegBookmark />}
                        </button>
                      </div>

                      <Link to={`/post/${post.id}`} className="article-title-link">
                        <h3 className="article-title">{post.title || 'Untitled Article'}</h3>
                      </Link>

                      <p className="article-excerpt">
                        {truncateText(post.content || '', 150)}
                      </p>

                      <div className="article-footer">
                        <div className="article-meta">
                          <span className="article-category">
                            {post.categories?.[0] || 'General'}
                          </span>
                          <span className="article-read-time">
                            <FiClock />
                            {post.readTime} min read
                          </span>
                        </div>

                        <div className="article-actions">
                          <button
                            className={`article-like ${likedPosts.has(post.id) ? 'active' : ''}`}
                            onClick={() => handleLikePost(post.id)}
                            aria-label={likedPosts.has(post.id) ? 'Unlike': 'Like'}
                          >
                            {likedPosts.has(post.id) ? <AiFillHeart /> : <AiOutlineHeart />}
                            <span>{post.likesCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filteredPosts.length > 0 && (
            <div className="articles-footer">
              <Link to="/feed" className="view-all-button">
                View All Articles
                <FiArrowRight />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Share Your Story?</h2>
            <p className="cta-description">
              Join our community of writers and reach thousands of readers. 
              Your unique perspective matters.
            </p>
            <Link to="/create" className="cta-button">
              Start Writing <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter">
        <div className="container">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Stay in the Loop</h2>
            <p className="newsletter-description">
              Get the latest articles and insights delivered to your inbox weekly.
            </p>
            
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <div className="newsletter-input-wrapper">
                <FiMail className="newsletter-input-icon" />
                <input
                  type="email"
                  placeholder="Enter your email."
                  className="newsletter-input"
                  required
                />
              </div>
              <button type="submit" className="newsletter-submit">
                Subscribe
              </button>
            </form>

            <p className="newsletter-note">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
