import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

// Icons (install react-icons if not already)
import {
  FiHome,
  FiCompass,
  FiPlusCircle,
  FiUser,
  FiChevronDown,
  FiMenu,
  FiX,
  FiBookOpen,
  FiLogOut,
  FiSettings,
  FiBookmark,
  FiVideo,
} from "react-icons/fi";

export default function Navbar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const navigate = useNavigate();


  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    const email = user.email;
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  const getUserName = () => {
    if (!user?.email) return "User";
    return user.email.split('@')[0];
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname === path;
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/home" className="navbar-brand">
            <div className="logo-icon">
              <FiBookOpen />
            </div>
            <div>
              <div className="logo-text">InsightHub</div>
              <div className="logo-subtext">Blog Platform</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <ul className="navbar-menu">
            <li className="nav-item">
              <Link
                to="/home"
                className={`nav-link ${isActive('/home') ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <FiHome className="nav-icon" />
                Home
                <span className="nav-indicator"></span>
              </Link>
            </li>

            <li className="nav-item">
              <Link
                to="/feed"
                className={`nav-link ${isActive('/feed') ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <FiCompass className="nav-icon" />
                Explore
                <span className="nav-indicator"></span>
              </Link>
            </li>

            <li className="nav-item">
              <Link
                to="/videos"
                className={`nav-link ${isActive('/videos') ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <FiVideo className="nav-icon" />
                Videos
                <span className="nav-indicator"></span>
              </Link>
            </li>

            <li className="nav-item">
              <Link
                to="/create"
                className="create-link"
                onClick={() => setIsDropdownOpen(false)}
              >
                <FiPlusCircle className="create-icon" />
                Write
              </Link>
            </li>

            {/* User Dropdown */}
            <li className={`user-dropdown ${isDropdownOpen ? 'active' : ''}`}>
              <button
                className="user-toggle"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="user-avatar">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="nav-avatar-img" />
                  ) : (
                    getUserInitials()
                  )}
                </div>
                <span className="user-name">{getUserName()}</span>
                <FiChevronDown className="dropdown-icon" />
              </button>

              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                    {getUserName()}
                  </div>
                  <div className="dropdown-email">
                    {user?.email}
                  </div>
                </div>

                <ul className="dropdown-list">
                  <li>
                    <Link
                      to="/account"
                      className="dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FiUser className="dropdown-icon-small" />
                      My Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/saved"
                      className="dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FiBookmark className="dropdown-icon-small" />
                      Saved Articles
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FiSettings className="dropdown-icon-small" />
                      Settings
                    </Link>
                  </li>

                  <li className="dropdown-divider"></li>

                  <li>
                    <button
                      className="logout-nav-button"
                      onClick={handleLogout}
                    >
                      <FiLogOut className="dropdown-icon-small" />
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </li>
          </ul>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <ul className="mobile-nav-list">
          <li className="mobile-nav-item">
            <Link
              to="/home"
              className={`mobile-nav-link ${isActive('/home') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiHome />
              Home
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/feed"
              className={`mobile-nav-link ${isActive('/feed') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiCompass />
              Explore
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/videos"
              className={`mobile-nav-link ${isActive('/videos') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiVideo />
              Videos
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/create"
              className="mobile-create-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiPlusCircle />
              Write Article
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/account"
              className={`mobile-nav-link ${isActive('/account') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiUser />
              My Account
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/saved"
              className={`mobile-nav-link ${isActive('/saved') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiBookmark />
              Saved
            </Link>
          </li>

          <li className="mobile-nav-item">
            <Link
              to="/settings"
              className={`mobile-nav-link ${isActive('/settings') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiSettings />
              Settings
            </Link>
          </li>
        </ul>

        <div className="mobile-user-section">
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="nav-avatar-img" />
              ) : (
                getUserInitials()
              )}
            </div>
            <div className="mobile-user-details">
              <div className="mobile-user-name">{getUserName()}</div>
              <div className="mobile-user-email">{user?.email}</div>
            </div>
          </div>

          <button
            className="mobile-logout-button"
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}