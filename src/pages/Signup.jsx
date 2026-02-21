import { useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { saveUserToFirestore } from "../utils/saveUserToFirestore";
import "./Style/Signup.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(result.user);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const provider = new GoogleAuthProvider();
  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      navigate("/home");
    } catch (err) {
      setError("Google sign-up failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background Video */}
      <video autoPlay muted loop playsInline className="auth-video">
  <source
    src="https://videos.pexels.com/video-files/6932943/6932943-hd_1920_1080_25fps.mp4"
    type="video/mp4"
  />
</video>


      {/* Dark Overlay */}
      <div className="auth-overlay"></div>

      {/* Card */}
      <form className="auth-card" onSubmit={handleSignup}>
        <h1>Create account</h1>
        <p className="subtitle">Start writing your thoughts</p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Sign up"}
        </button>

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleSignup}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "0.5rem",
            background: "#fff",
            color: "#171414",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          Continue with Google
        </button>

        <p className="switch-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
