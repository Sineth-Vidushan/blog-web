import { useState, useRef } from "react";
import { storage, db, auth } from "../firebase/firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FiUpload, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import "../pages/Style/Video.css";

export default function VideoUpload({ onClose }) {
    const [videoFile, setVideoFile] = useState(null);
    const [caption, setCaption] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef();
    const uploadTaskRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("video/")) {
            setVideoFile(file);
            setError("");
        } else {
            setError("Please select a valid video file (MP4, etc.)");
        }
    };

    const handleCancelUpload = () => {
        if (uploadTaskRef.current) {
            uploadTaskRef.current.cancel();
            setIsUploading(false);
            setUploadProgress(0);
            setError("Upload cancelled by user.");
        }
    };

    const handleUpload = async () => {
        if (!videoFile || !caption) {
            setError("Please select a video and add a caption.");
            return;
        }

        setIsUploading(true);
        setError("");

        const storageRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, videoFile);
        uploadTaskRef.current = uploadTask;

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log("Upload is " + progress + "% done");
                setUploadProgress(progress);
            },
            (err) => {
                if (err.code === 'storage/canceled') {
                    console.log("User cancelled the upload");
                } else {
                    console.error("Firebase Storage Upload Error:", err);
                    setError("Upload failed: " + err.message);
                }
                setIsUploading(false);
                uploadTaskRef.current = null;
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                try {
                    await addDoc(collection(db, "videos"), {
                        videoUrl: downloadURL,
                        caption: caption,
                        userId: auth.currentUser.uid,
                        username: auth.currentUser.displayName || "Anonymous",
                        userPhoto: auth.currentUser.photoURL || "",
                        likes: 0,
                        likedBy: [],
                        comments: 0,
                        shares: 0,
                        createdAt: serverTimestamp(),
                    });
                    setSuccess(true);
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } catch (dbErr) {
                    setError("Failed to save video data: " + dbErr.message);
                } finally {
                    setIsUploading(false);
                    uploadTaskRef.current = null;
                }
            }
        );
    };

    return (
        <div className="video-upload-overlay">
            <div className="video-upload-modal">
                <button className="close-btn" onClick={onClose}><FiX /></button>
                <h2>Upload Video</h2>

                {error && <div className="error-msg"><FiAlertCircle /> {error}</div>}
                {success && <div className="success-msg"><FiCheck /> Uploaded Successfully!</div>}

                <div className="upload-form">
                    <textarea
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        disabled={isUploading}
                    />

                    <input
                        type="file"
                        accept="video/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        hidden
                    />

                    {!videoFile ? (
                        <div className="file-dropzone" onClick={() => fileInputRef.current.click()}>
                            <FiUpload size={40} />
                            <p>Select video to upload</p>
                        </div>
                    ) : (
                        <div className="file-selected">
                            <p>Selected: {videoFile.name}</p>
                            <button onClick={() => setVideoFile(null)}>Remove</button>
                        </div>
                    )}

                    {isUploading && (
                        <div className="upload-status-overlay">
                            <div className="status-content">
                                <div className="loader"></div>
                                <h2>{uploadProgress < 100 ? "Uploading Video..." : "Saving Metadata..."}</h2>
                                <div className="progress-container">
                                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <span>{Math.round(uploadProgress)}%</span>
                                <button className="cancel-upload-btn" onClick={handleCancelUpload}>Cancel Upload</button>
                            </div>
                        </div>
                    )}

                    <button
                        className="upload-btn"
                        onClick={handleUpload}
                        disabled={isUploading || success}
                    >
                        {isUploading ? "Processing..." : "Publish"}
                    </button>
                </div>
            </div>
        </div>
    );
}
