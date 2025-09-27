import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navigation.css";

const Navigation: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logout();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
      <img src={require("./logo.png")} alt="Ript" className="brand-logo" />

      </div>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
          Home
        </Link>
        <Link
          to="/analytics"
          className={`nav-link ${isActive("/analytics") ? "active" : ""}`}
        >
          Progress
        </Link>
        <Link
          to="/profile"
          className={`nav-link ${isActive("/profile") ? "active" : ""}`}
        >
          Profile
        </Link>
      </div>

      <div className="nav-user">
        <span className="user-name">
          {user?.profile?.firstName || user?.username}
        </span>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
