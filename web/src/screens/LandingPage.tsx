import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LightRays from "../components/LightRays";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      if (result.success) {
        // Navigate to home page after successful login
        navigate("/home");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-container">
      {/* Light Rays Animation */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#00ffff"
        raysSpeed={1.5}
        lightSpread={0.8}
        rayLength={1.2}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.1}
        distortion={0.05}
        className="light-rays"
      />

      {/* Particle System */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      <div className={`landing-content ${showLogin ? "login-mode" : ""}`}>
        {!showLogin ? (
          <>
            <div className="logo-section">
              <h1>
                <img src="/logo.png" alt="Ript" style={{ width: "300px" }} />
              </h1>
            </div>
            <div className="sign-in-section">
              <button
                onClick={() => setShowLogin(true)}
                className="sign-in-text"
              >
                sign in →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="back-section">
              <button
                onClick={() => setShowLogin(false)}
                className="back-button"
              >
                ← back
              </button>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message">{error}</div>}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email"
                className="auth-input"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="password"
                className="auth-input"
              />

              <button
                type="submit"
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? "signing in..." : "sign in"}
              </button>
            </form>

            <div className="auth-footer">
              <Link to="/register" className="auth-link">
                create account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
