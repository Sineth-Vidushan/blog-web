import { useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { saveUserToFirestore } from "../utils/saveUserToFirestore";
import "./Style/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(result.user);
      navigate("/home");
    } catch {
      setError("Invalid email or password");
    }
  };

  const provider = new GoogleAuthProvider();
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      navigate("/home");
    } catch (err) {
      setError("Google sign-in failed: " + err.message);
    }
  };

  return (
    <div className="auth-container min-h-screen">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="auth-video"
      >
        <source
          src="https://videos.pexels.com/video-files/3009533/3009533-hd_1920_1080_24fps.mp4"
          type="video/mp4"
        />
      </video>

      {/* Overlay */}
      <div className="auth-overlay" />

      {/* Login Card */}
      <div className="auth-card fade-in shadow-lg rounded-lg bg-secondary">
        <h2 className="text-center text-primary font-bold mb-2">
          Welcome Back
        </h2>
        <p className="text-center text-secondary mb-4">
          Continue your writing journey
        </p>

        {error && (
          <p className="text-center mb-3" style={{ color: "crimson" }}>
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="auth-input mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="auth-input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button mb-2" onClick={handleLogin}>
          Login
        </button>

        <button
          className="auth-button google-btn mb-3"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </button>

        <p className="text-center text-secondary">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-accent font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
