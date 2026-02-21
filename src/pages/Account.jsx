import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth, db, storage } from "../firebase/firebaseConfig";
import { signOut, updateProfile } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  orderBy
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { format } from "date-fns";
import "./Style/Account.css";

// Icons
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiBookOpen,
  FiEye,
  FiHeart,
  FiClock,
  FiUser,
  FiSave,
  FiX,
  FiBell,
  FiCamera,
  FiLogOut,
  FiUsers
} from "react-icons/fi";

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [myBlogs, setMyBlogs] = useState([]);
  const [myVideos, setMyVideos] = useState([]);
  const [likedContent, setLikedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(user?.photoURL || "");
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const fileInputRef = useRef(null);

  const categoriesList = [
    "Tech", "Lifestyle", "Travel", "Food", "Health", "Education", "Finance"
  ];

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.split('@')[0].charAt(0).toUpperCase();
  };

  const calculateReadTime = (content) => {
    if (!content) return 5;
    const wordsPerMinute = 200;
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setName(prev => prev || data.name || user.displayName || "");
        setSelectedCategories(prev => prev.length ? prev : (data.preferredCategories || []));
        setCurrentPhotoURL(data.photoURL || user.photoURL || "");
      } else {
        setUserData({ followers: [], following: [] });
      }
    }, (err) => {
      console.error("Error listening to user data:", err);
    });

    const fetchMyBlogs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "blogs"), where("authorId", "==", user.uid));
        const snapshot = await getDocs(q);
        const blogs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            readTime: calculateReadTime(data.content || ""),
            formattedDate: data.createdAt ? format(data.createdAt.toDate(), 'MMM dd, yyyy') : 'Recent'
          };
        });
        setMyBlogs(blogs);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setMyBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchMyVideos = async () => {
      try {
        const q = query(collection(db, "videos"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        setMyVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching videos:", err);
      }
    };

    const fetchLikedContent = async () => {
      try {
        const vq = query(collection(db, "videos"), where("likedBy", "array-contains", user.uid));
        const vSnapshot = await getDocs(vq);
        const likedVideos = vSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'video' }));

        const bq = query(collection(db, "blogs"), where("likedBy", "array-contains", user.uid));
        const bSnapshot = await getDocs(bq);
        const likedBlogs = bSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'blog' }));

        setLikedContent([...likedVideos, ...likedBlogs]);
      } catch (err) {
        console.error("Error fetching liked content:", err);
      }
    };

    const fetchNotifications = () => {
      const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("Error listening to notifications:", err);
      });
    };

    const unsubNotifications = fetchNotifications();
    fetchMyBlogs();
    fetchMyVideos();
    fetchLikedContent();

    return () => {
      unsubscribe();
      unsubNotifications();
    };
  }, [user]);

  // Separate effect to fetch social lists when tab changes
  useEffect(() => {
    if (!user || !userData) return;

    if (activeTab === 'followers' || activeTab === 'following') {
      const fetchSocialList = async () => {
        setLoadingSocial(true);
        try {
          const uids = activeTab === 'followers'
            ? (userData.followers || [])
            : (userData.following || []);

          if (uids.length === 0) {
            activeTab === 'followers' ? setFollowersList([]) : setFollowingList([]);
            return;
          }

          // Firebase query where('__name__', 'in', [...]) limit is 10/30 depending on version
          // Let's fetch them individually or in chunks if needed, but for simplicity:
          const profiles = await Promise.all(uids.map(async (uid) => {
            const docSnap = await getDoc(doc(db, "users", uid));
            return docSnap.exists() ? { id: uid, ...docSnap.data() } : null;
          }));

          const filteredProfiles = profiles.filter(Boolean);
          activeTab === 'followers' ? setFollowersList(filteredProfiles) : setFollowingList(filteredProfiles);
        } catch (err) {
          console.error(`Error fetching ${activeTab}:`, err);
        } finally {
          setLoadingSocial(false);
        }
      };

      fetchSocialList();
    }
  }, [activeTab, userData, user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB.");
      return;
    }

    setIsUploading(true);
    const uploadPath = `profile_images/${user.uid}/profile_${Date.now()}`;
    const storageRef = ref(storage, uploadPath);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      setCurrentPhotoURL(downloadURL);
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Upload error details:", err);
      // provide more clarity on specific errors if possible
      const errorMsg = err.code === 'storage/unauthorized'
        ? "Permission denied. Please check storage rules."
        : "Failed to upload image. Error: " + err.message;
      alert(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!currentPhotoURL) return;
    if (!window.confirm("Remove profile picture?")) return;

    setIsUploading(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: "" });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: "" });
      setCurrentPhotoURL("");
      alert("Profile picture removed.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to remove image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name,
        preferredCategories: selectedCategories,
        updatedAt: new Date()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearNotifications = async () => {
    if (!notifications.length || isClearingNotifications) return;
    if (!window.confirm("Clear all notifications?")) return;
    setIsClearingNotifications(true);
    try {
      const batch = notifications.map(n => deleteDoc(doc(db, "notifications", n.id)));
      await Promise.all(batch);
      setNotifications([]);
    } catch (err) {
      console.error("Clear error:", err);
    } finally {
      setIsClearingNotifications(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await deleteDoc(doc(db, "blogs", blogId));
      setMyBlogs(prev => prev.filter(b => b.id !== blogId));
    } catch (err) {
      console.error("Delete blog error:", err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Delete this video?")) return;
    try {
      await deleteDoc(doc(db, "videos", videoId));
      setMyVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (err) {
      console.error("Delete video error:", err);
    }
  };

  if (loading) {
    return (
      <div className="account-container">
        <div className="account-wrapper">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div className="account-wrapper">
        <div className="back-navigation">
          <Link to="/home" className="back-button">
            <FiArrowLeft /> Back to Home
          </Link>
        </div>

        <div className="account-header">
          <div className="avatar-section">
            <div className="user-avatar-large" onClick={() => fileInputRef.current.click()}>
              {currentPhotoURL ? (
                <img src={currentPhotoURL} alt="Profile" className="profile-image-preview" />
              ) : (
                getUserInitials()
              )}
              <div className="avatar-overlay">
                <FiCamera />
              </div>
              {isUploading && <div className="avatar-loading"><div className="loading-spinner-small"></div></div>}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageUpload}
            />
            {currentPhotoURL && (
              <button className="delete-photo-btn" onClick={handleImageDelete}>
                <FiTrash2 /> Remove Photo
              </button>
            )}
          </div>

          <div className="user-info-header">
            <h1>{name || getUserInitials()}'s Account</h1>
            <p className="user-email">{user.email}</p>
            <div className="account-stats">
              <div className="stat-card">
                <div className="stat-value">{myBlogs.length}</div>
                <div className="stat-label">Articles</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{myVideos.length}</div>
                <div className="stat-label">Videos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{userData?.followers?.length || 0}</div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{userData?.following?.length || 0}</div>
                <div className="stat-label">Following</div>
              </div>
            </div>
          </div>
        </div>

        <div className="account-tabs">
          {['profile', 'blogs', 'videos', 'likes', 'notifications', 'followers', 'following'].map(tab => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'profile' && <FiUser />}
              {tab === 'blogs' && <FiBookOpen />}
              {tab === 'videos' && <FiEye />}
              {tab === 'likes' && <FiHeart />}
              {tab === 'notifications' && <FiBell />}
              {(tab === 'followers' || tab === 'following') && <FiUsers />}
              <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>
                {tab}
                {tab === 'notifications' ? ` (${notifications.length})` : ''}
                {tab === 'followers' ? ` (${userData?.followers?.length || 0})` : ''}
                {tab === 'following' ? ` (${userData?.following?.length || 0})` : ''}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="profile-form">
            <h2 className="section-title">Profile Information</h2>
            <div className="form-row">
              <div className="form-label-group">
                <label className="form-label-main">Display Name</label>
                <p className="form-label-hint">Shown as the author of your content.</p>
              </div>
              <div className="form-input-group">
                <input
                  className="profile-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div className="categories-section">
              <label className="form-label-main">Preferred Categories</label>
              <div className="categories-grid">
                {categoriesList.map(cat => (
                  <div key={cat} className="category-option">
                    <input
                      type="checkbox"
                      id={`cat-${cat}`}
                      checked={selectedCategories.includes(cat)}
                      onChange={() => setSelectedCategories(prev =>
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      )}
                    />
                    <label htmlFor={`cat-${cat}`}>{cat}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="save-button" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? "Saving..." : <><FiSave /> Save Changes</>}
              </button>
              <button className="logout-button" onClick={() => setShowLogoutModal(true)}>
                <FiLogOut /> Logout
              </button>
            </div>
            {saveSuccess && <p className="save-success-msg">Profile updated successfully!</p>}
          </div>
        )}

        {/* ... Other Tabs remain identical in logic ... */}
        {activeTab === 'blogs' && (
          <div className="my-blogs-section">
            {myBlogs.length === 0 ? <p>No articles yet.</p> : (
              <div className="blogs-grid-account">
                {myBlogs.map(blog => (
                  <div key={blog.id} className="blog-item-account">
                    <h3>{blog.title}</h3>
                    <div className="blog-actions-account">
                      <button onClick={() => navigate(`/edit/${blog.id}`)}><FiEdit /> Edit</button>
                      <button onClick={() => handleDelete(blog.id)} className="danger"><FiTrash2 /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="my-videos-section">
            {myVideos.length === 0 ? <p>No videos uploaded yet.</p> : (
              <div className="videos-grid-profile">
                {myVideos.map(video => (
                  <div key={video.id} className="video-item-profile">
                    <video src={video.videoUrl} />
                    <button className="delete-video-btn" onClick={() => handleDeleteVideo(video.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <div className="section-header">
              <h2>Recent Activity</h2>
              {notifications.length > 0 && (
                <button onClick={handleClearNotifications} disabled={isClearingNotifications}>
                  Clear All
                </button>
              )}
            </div>
            <div className="notifications-list">
              {notifications.map(notif => (
                <div key={notif.id} className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}>
                  {notif.actorPhoto ? (
                    <img src={notif.actorPhoto} alt={notif.actorName} className="actor-photo" />
                  ) : (
                    <div className="actor-photo initial-avatar-notif">
                      {notif.actorName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="notification-content">
                    <p>
                      <strong>@{notif.actorName}</strong> {notif.type === 'like' ? 'liked' : 'commented on'} your {notif.targetType}
                    </p>
                    {notif.content && <p className="notif-text-snippet">"{notif.content}"</p>}
                    <span className="notif-time">
                      {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                    </span>
                  </div>
                  <Link
                    to={notif.targetType === 'video' ? '/videos' : `/post/${notif.targetId}`}
                    className="view-notif-btn"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'followers' || activeTab === 'following') && (
          <div className="social-list-section">
            <h2 className="section-title">
              {activeTab === 'followers' ? 'My Followers' : 'Users I Follow'}
            </h2>

            {loadingSocial ? (
              <div className="social-loading">
                <div className="loading-spinner-small"></div>
                <span>Syncing profiles...</span>
              </div>
            ) : (
              <div className="social-users-grid">
                {(activeTab === 'followers' ? followersList : followingList).length === 0 ? (
                  <p className="no-users-msg">
                    {activeTab === 'followers' ? "No followers yet." : "You're not following anyone yet."}
                  </p>
                ) : (
                  (activeTab === 'followers' ? followersList : followingList).map(socialUser => (
                    <div key={socialUser.id} className="social-user-card" onClick={() => navigate(`/profile/${socialUser.id}`)}>
                      <div className="social-user-avatar">
                        {socialUser.photoURL ? (
                          <img src={socialUser.photoURL} alt={socialUser.name} />
                        ) : (
                          <div className="social-initial-avatar">
                            {(socialUser.name || socialUser.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="social-user-info">
                        <span className="social-user-name">{socialUser.name || 'Anonymous'}</span>
                        <span className="social-user-handle">@{socialUser.email?.split('@')[0]}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showLogoutModal && (
        <div className="logout-modal">
          <div className="modal-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to exit?</p>
            <div className="modal-actions">
              <button onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button onClick={handleLogout} className="confirm-logout">Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
