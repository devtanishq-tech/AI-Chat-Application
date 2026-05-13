import { useState } from "react";
import axios from "axios";
import "./AuthModal.css";

// ===================== AuthModal Component =====================
// Handles both Login and Signup in a single modal.
// mode: "login" | "signup"
// Switches between modes via onSwitchMode without unmounting overlay
// — this keeps the backdrop blur/fade alive during the transition.
export default function AuthModal({ mode, onClose, onSuccess, onSwitchMode }) {
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/login`,
          { email: formData.email, password: formData.password },
          { withCredentials: true },
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/signup`,
          {
            userName: formData.userName,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          },
          { withCredentials: true },
        );
      }

      // Pass back minimal user info for display purposes
      onSuccess({
        email: formData.email,
        userName: formData.userName || formData.email.split("@")[0],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // WHY: clicking outside the card (.auth-overlay itself) closes the modal.
  // Clicks on the card bubble to .auth-modal, not .auth-overlay.
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="auth-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="auth-modal">
        {/* ---- Close button ---- */}
        <button
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        {/* ---- Header ---- */}
        <div className="auth-header">
          <h2>{isLogin ? "Welcome back" : "Create account"}</h2>
          <p>
            {isLogin
              ? "Sign in to continue your conversations"
              : "Join to unlock the full experience"}
          </p>
        </div>

        {/* ---- Form ---- */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Username — signup only */}
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="userName">Username</label>
              <input
                id="userName"
                name="userName"
                type="text"
                placeholder="Choose a username"
                value={formData.userName}
                onChange={handleChange}
                required
                autoComplete="username"
                autoFocus
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              autoFocus={isLogin}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {/* Confirm Password — signup only */}
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`auth-submit-btn${loading ? " loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner" aria-label="Loading" />
            ) : isLogin ? (
              "Continue"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* ---- Mode switch ---- */}
        <div className="auth-divider" />
        <div className="auth-switch">
          {isLogin ? (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => onSwitchMode("signup")}>
                Sign up for free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => onSwitchMode("login")}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
