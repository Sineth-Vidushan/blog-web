import { useState, useRef } from "react";
import { db } from "../firebase/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";
import "./Style/CreateBlog.css";

// Icons
import { FiUpload, FiEye, FiEyeOff, FiLink, FiTag, FiBookOpen, FiCheck, FiAlertCircle } from "react-icons/fi";
import { AiOutlinePicture, AiOutlineFileText } from "react-icons/ai";

const categoriesList = [
  "Tech",
  "Lifestyle",
  "Travel",
  "Food",
  "Health",
  "Education",
  "Finance",
];

export default function CreateBlog() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [references, setReferences] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingStep, setPublishingStep] = useState(0); // 0: idle, 1: media, 2: save, 3: success
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // store multiple files
  const [mediaPreview, setMediaPreview] = useState([]); // store multiple previews

  const [uploading, setUploading] = useState(false);

  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // --- Handlers ---

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((cat) => cat !== value)
        : [...prev, value]
    );
  };

  const handleTagInput = (e) => setTagInput(e.target.value);

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) =>
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files); // multiple files
    if (!files.length) return;

    const newPreviews = files.map((file) => URL.createObjectURL(file));

    setMediaFiles((prev) => [...prev, ...files]);
    setMediaPreview((prev) => [...prev, ...newPreviews]);
  };


  const handleSubmit = async () => {
    if (!title || !content) {
      setError("Title and content are required!");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    setPublishingStep(1);
    setUploadProgress(10); // Initial start

    let mediaUrls = [];

    try {
      // Upload media if selected
      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const uploaded = await uploadToCloudinary(file);
          mediaUrls.push(uploaded.secure_url);
          // Calculate progress for media (0-70%)
          setUploadProgress(Math.floor(((i + 1) / mediaFiles.length) * 70));
        }
      } else {
        setUploadProgress(70); // Skip media upload
      }

      setPublishingStep(2);
      setUploadProgress(85);

      // Save to Firestore
      await addDoc(collection(db, "blogs"), {
        title,
        subtitle,
        content,
        authorId: user.uid,
        authorEmail: user.email,
        authorPhoto: user.photoURL || "",
        categories: selectedCategories,
        tags: tags,
        references: references
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        mediaUrls: mediaUrls,
        createdAt: serverTimestamp(),
        likesCount: 0,
        likedBy: [],
        savedBy: [],
      });

      setPublishingStep(3);
      setUploadProgress(100);
      setSuccess("Post created successfully!");

      // Reset form
      setTimeout(() => {
        setTitle("");
        setSubtitle("");
        setContent("");
        setTags([]);
        setTagInput("");
        setSelectedCategories([]);
        setReferences("");
        setMediaFiles([]);
        setMediaPreview([]);
        setSuccess("");
        setIsSubmitting(false);
        setPublishingStep(0);
        setUploadProgress(0);
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create post. Please try again.");
      setIsSubmitting(false);
      setPublishingStep(0);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // --- Counters ---
  const characterCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="create-blog-container">
      <div className="create-blog-wrapper">
        {/* Header */}
        <div className="create-header">
          <h1 className="create-title">Create New Article</h1>
          <p className="create-subtitle">
            Share your knowledge and insights with the community. Write something meaningful.
          </p>

          <div className="progress-bar">
            <div className="progress-step active">
              <FiBookOpen /> Writing
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <AiOutlineFileText /> Preview
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <FiUpload /> Publish
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="create-form">
          {error && (
            <div className="error-message">
              <FiAlertCircle /> {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <FiCheck /> {success}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">
              Article Title <span className="required-marker">*</span>
            </label>
            <input
              className="form-input form-input-lg"
              placeholder="Catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
            <div className="character-count">
              <span>{title.length}/120 characters</span>
              <span className={title.length >= 100 ? "count-warning" : ""}>
                {title.length >= 100 ? "Getting long" : "Good length"}
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <div className="form-group">
            <label className="form-label">
              Article Subtitle <span className="required-marker">*</span>
            </label>
            <input
              className="form-input form-input-lg"
              placeholder="Subtitle..."
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={120}
            />
            <div className="character-count">
              <span>{subtitle.length}/120 characters</span>
              <span className={subtitle.length >= 100 ? "count-warning" : ""}>
                {subtitle.length >= 100 ? "Getting long" : "Good length"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label">
              Article Content <span className="required-marker">*</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Start writing your article..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
            />
            <div className="character-count">
              <div>
                <span>{wordCount} words</span> • <span>{characterCount} characters</span>
              </div>
              <span
                className={
                  wordCount < 300 ? "count-danger" : wordCount < 800 ? "count-good" : "count-warning"
                }
              >
                {wordCount < 300
                  ? "Add more content"
                  : wordCount < 800
                    ? "Good length"
                    : "Consider breaking into multiple articles"}
              </span>
            </div>
          </div>

          {/* Categories */}
          <div className="categories-section">
            <label className="form-label">
              <FiBookOpen /> Select Categories
            </label>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9rem" }}>
              Choose one or more categories that best describe your article
            </p>
            <div className="categories-grid">
              {categoriesList.map((cat) => (
                <div key={cat} className="category-item">
                  <input
                    type="checkbox"
                    id={`cat-${cat}`}
                    value={cat}
                    checked={selectedCategories.includes(cat)}
                    onChange={handleCategoryChange}
                    className="category-checkbox"
                  />
                  <label htmlFor={`cat-${cat}`} className="category-label">
                    {cat}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">
              <FiTag /> Tags
            </label>
            <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Add relevant tags separated by commas or press Enter
            </p>
            <div className="tags-container">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                  <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                    ×
                  </button>
                </span>
              ))}
              <input
                className="tags-input"
                placeholder="Add tags and press Enter"
                value={tagInput}
                onChange={handleTagInput}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* References */}
          <div className="form-group">
            <label className="form-label">
              <FiLink /> References
            </label>
            <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Add URLs to your sources (comma separated)
            </p>
            <input
              className="form-input"
              placeholder="https://example.com, https://another.com"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
            {references && (
              <div className="references-list">
                {references
                  .split(",")
                  .map((ref) => ref.trim())
                  .filter(Boolean)
                  .map((ref, index) => (
                    <div key={index} className="reference-item">
                      <FiLink className="reference-icon" /> {ref}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Media Upload */}
          <div className="media-upload-section">
            <AiOutlinePicture className="media-upload-icon" />
            <h3 className="media-upload-text">Add Images, Videos, or Audio</h3>

            <input
              type="file"
              accept="image/*,video/*,audio/*"
              ref={fileInputRef}
              hidden
              multiple
              onChange={handleMediaSelect}
            />


            <button className="media-upload-button" onClick={() => fileInputRef.current.click()}>
              <FiUpload /> Choose Media
            </button>

            {mediaPreview.length > 0 && (
              <div className="media-preview-grid">
                {mediaPreview.map((preview, index) => {
                  const file = mediaFiles[index];
                  return (
                    <div key={index} className="media-preview-item">
                      {file.type.startsWith("image") ? (
                        <img src={preview} alt={`preview ${index}`} />
                      ) : file.type.startsWith("video") ? (
                        <video src={preview} controls />
                      ) : (
                        <audio src={preview} controls />
                      )}
                      <button
                        type="button"
                        className="media-remove"
                        onClick={() => {
                          setMediaFiles(mediaFiles.filter((_, i) => i !== index));
                          setMediaPreview(mediaPreview.filter((_, i) => i !== index));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

            )}
          </div>

          {/* Preview Toggle */}
          <div className="preview-section">
            <div className="preview-header">
              <h3 className="preview-title">Article Preview</h3>
              <button className="preview-toggle" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? <FiEyeOff /> : <FiEye />}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>

            {showPreview && (
              <div className="preview-content">
                {content || <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Start writing to see the preview...</p>}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              className="draft-button"
              onClick={() => {
                setSuccess("Draft saved locally!");
                setTimeout(() => setSuccess(""), 3000);
              }}
              disabled={isSubmitting}
            >
              Save as Draft
            </button>

            <button
              className="publish-button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title || !content || uploading}
            >
              {isSubmitting || uploading ? (
                <span className="pulse">{uploading ? "Uploading..." : "Publishing..."}</span>
              ) : (
                <>
                  <FiUpload /> Publish Article
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Publishing Progress Overlay */}
      {isSubmitting && (
        <div className="publishing-overlay">
          <div className="publishing-card">
            <div className="publishing-loader">
              <div className="spinner-outer"></div>
              <div className="spinner-inner"></div>
              <span className="progress-percent">{uploadProgress}%</span>
            </div>

            <h3 className="publishing-title">
              {publishingStep === 1 && "Uploading Assets..."}
              {publishingStep === 2 && "Creating Article..."}
              {publishingStep === 3 && "Done!"}
            </h3>

            <div className="publishing-progress-bar-container">
              <div
                className="publishing-progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>

            <div className="publishing-steps">
              <div className={`pub-step ${publishingStep >= 1 ? 'active' : ''} ${publishingStep > 1 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <span>Media Upload</span>
              </div>
              <div className={`pub-step ${publishingStep >= 2 ? 'active' : ''} ${publishingStep > 2 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <span>Database Entry</span>
              </div>
              <div className={`pub-step ${publishingStep >= 3 ? 'active' : ''}`}>
                <div className="step-dot"></div>
                <span>Finalizing</span>
              </div>
            </div>

            {success && <p className="pub-success-msg">{success}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
