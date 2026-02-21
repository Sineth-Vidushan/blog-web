import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import "./Style/Settings.css";

import {
  FiUser,
  FiMail,
  FiSave,
  FiEdit,
  FiCheck,
  FiX,
} from "react-icons/fi";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    bio: "",
    website: "",
    location: "",
  });
  const [originalData, setOriginalData] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const userInfo = {
            name: data.name || user.displayName || "",
            email: user.email || "",
            bio: data.bio || "",
            website: data.website || "",
            location: data.location || "",
          };
          setUserData(userInfo);
          setOriginalData(userInfo);
        } else {
          setUserData({
            name: user.displayName || "",
            email: user.email || "",
            bio: "",
            website: "",
            location: "",
          });
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setMessage({ type: "error", text: "Failed to load user data" });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        name: userData.name,
        bio: userData.bio,
        website: userData.website,
        location: userData.location,
        updatedAt: new Date(),
      });

      if (userData.name !== originalData.name) {
        await updateProfile(auth.currentUser, {
          displayName: userData.name,
        });
      }

      setOriginalData({ ...userData });
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUserData({ ...originalData });
    setEditing(false);
    setMessage({ type: "", text: "" });
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-wrapper">
        <header className="settings-header">
          <h1 className="settings-title">Account Settings</h1>
          <p className="settings-subtitle">Manage your profile information</p>
        </header>

        {message.text && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-content">
          <div className="settings-section">
            <h2 className="settings-section-title">Profile Information</h2>

            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">
                  <FiUser /> Display Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="name"
                    value={userData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Your name"
                  />
                ) : (
                  <div className="form-display">{userData.name || "Not set"}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiMail /> Email
                </label>
                <div className="form-display">{userData.email}</div>
                <p className="form-hint">Email cannot be changed</p>
              </div>

              <div className="form-group">
                <label className="form-label">Bio</label>
                {editing ? (
                  <textarea
                    name="bio"
                    value={userData.bio}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                ) : (
                  <div className="form-display">
                    {userData.bio || "No bio added yet"}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                {editing ? (
                  <input
                    type="url"
                    name="website"
                    value={userData.website}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://yourwebsite.com"
                  />
                ) : (
                  <div className="form-display">
                    {userData.website ? (
                      <a
                        href={userData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {userData.website}
                      </a>
                    ) : (
                      "Not set"
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                {editing ? (
                  <input
                    type="text"
                    name="location"
                    value={userData.location}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="City, Country"
                  />
                ) : (
                  <div className="form-display">
                    {userData.location || "Not set"}
                  </div>
                )}
              </div>
            </div>

            <div className="settings-actions">
              {editing ? (
                <>
                  <button
                    className="settings-btn settings-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <FiSave /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="settings-btn settings-btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <FiX /> Cancel
                  </button>
                </>
              ) : (
                <button
                  className="settings-btn settings-btn-primary"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
