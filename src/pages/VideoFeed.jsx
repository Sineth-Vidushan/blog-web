import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import VideoCard from "../components/VideoCard";
import VideoUpload from "../components/VideoUpload";
import { FiPlus } from "react-icons/fi";
import "./Style/Video.css";

export default function VideoFeed() {
    const [videos, setVideos] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const videoData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVideos(videoData);
            setLoading(loading && false); // Only set loading to false on first snapshot
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="video-feed-container">
            {loading ? (
                <div className="loading-container">
                    <div className="loader"></div>
                    <p>Loading Videos...</p>
                </div>
            ) : videos.length > 0 ? (
                videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                ))
            ) : (
                <div className="no-videos">
                    <p>No videos yet. Be the first to upload!</p>
                </div>
            )}

            <button className="add-video-btn" onClick={() => setShowUpload(true)}>
                <FiPlus size={32} />
            </button>

            {showUpload && <VideoUpload onClose={() => setShowUpload(false)} />}
        </div>
    );
}
