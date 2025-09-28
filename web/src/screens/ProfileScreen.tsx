import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/Navigation";
import "./ProfileScreen.css";

const ProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || "",
    lastName: user?.profile?.lastName || "",
    age: user?.profile?.age || "",
    height: user?.profile?.height || "",
    weight: user?.profile?.weight || "",
    fitnessLevel: user?.profile?.fitnessLevel || "beginner",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    updateUser({
      ...user!,
      profile: {
        ...user!.profile,
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.profile?.firstName || "",
      lastName: user?.profile?.lastName || "",
      age: user?.profile?.age || "",
      height: user?.profile?.height || "",
      weight: user?.profile?.weight || "",
      fitnessLevel: user?.profile?.fitnessLevel || "beginner",
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "are you sure you want to delete your account? this action cannot be undone."
      )
    ) {
      // In a real app, you would call an API to delete the account
      alert("account deletion would be implemented here");
    }
  };

  return (
    <div className="profile-screen">
      <Navigation />

      <div className="profile-content">
        <div className="profile-header">
          <h1>
            welcome {user?.profile?.firstName || user?.username || "athlete"}
          </h1>
          <p>manage your account and preferences</p>
        </div>

        <div className="profile-grid">
          {/* Profile Information */}
          <div className="profile-card">
            <div className="card-header">
              <h3>personal information</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  edit
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-button">
                    save
                  </button>
                  <button onClick={handleCancel} className="cancel-button">
                    cancel
                  </button>
                </div>
              )}
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>first name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <div className="form-value">
                      {user?.profile?.firstName || "Not set"}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>last name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <div className="form-value">
                      {user?.profile?.lastName || "Not set"}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>email</label>
                <div className="form-value">{user?.email}</div>
              </div>

              <div className="form-group">
                <label>username</label>
                <div className="form-value">{user?.username}</div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Age"
                    />
                  ) : (
                    <div className="form-value">
                      {user?.profile?.age || "Not set"}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>height (cm)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="Height in cm"
                    />
                  ) : (
                    <div className="form-value">
                      {user?.profile?.height
                        ? `${user.profile.height} cm`
                        : "Not set"}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>weight (kg)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="Weight in kg"
                    />
                  ) : (
                    <div className="form-value">
                      {user?.profile?.weight
                        ? `${user.profile.weight} kg`
                        : "Not set"}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>fitness level</label>
                  {isEditing ? (
                    <select
                      name="fitnessLevel"
                      value={formData.fitnessLevel}
                      onChange={handleInputChange}
                    >
                      <option value="beginner">beginner</option>
                      <option value="intermediate">intermediate</option>
                      <option value="advanced">advanced</option>
                    </select>
                  ) : (
                    <div className="form-value fitness-level">
                      {user?.profile?.fitnessLevel || "beginner"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="profile-card">
            <h3 style={{ marginBottom: "20px" }}>account statistics</h3>
            <div className="stats-list">
              <div className="stat-item">
                <span className="stat-label">total workouts</span>
                <span className="stat-value">
                  {user?.stats?.totalWorkouts || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">total reps</span>
                <span className="stat-value">
                  {user?.stats?.totalReps || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">average form</span>
                <span className="stat-value">
                  {user?.stats?.averageFormAccuracy.toFixed(2) || 0}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">current streak</span>
                <span className="stat-value">
                  {user?.stats?.streakDays || 0} days
                </span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="profile-card">
            <h3 style={{ marginBottom: "20px" }}>account actions</h3>
            <div className="action-buttons">
              <button onClick={logout} className="logout-button">
                logout
              </button>
              <button onClick={handleDeleteAccount} className="delete-button">
                delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
