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
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      // In a real app, you would call an API to delete the account
      alert("Account deletion would be implemented here");
    }
  };

  return (
    <div className="profile-screen">
      <Navigation />

      <div className="profile-content">
        <div className="profile-header">
          <h1>👤 Profile</h1>
          <p>Manage your account and preferences</p>
        </div>

        <div className="profile-grid">
          {/* Profile Information */}
          <div className="profile-card">
            <div className="card-header">
              <h3>Personal Information</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  Edit
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-button">
                    Save
                  </button>
                  <button onClick={handleCancel} className="cancel-button">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
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
                  <label>Last Name</label>
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
                <label>Email</label>
                <div className="form-value">{user?.email}</div>
              </div>

              <div className="form-group">
                <label>Username</label>
                <div className="form-value">{user?.username}</div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
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
                  <label>Height (cm)</label>
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
                  <label>Weight (kg)</label>
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
                  <label>Fitness Level</label>
                  {isEditing ? (
                    <select
                      name="fitnessLevel"
                      value={formData.fitnessLevel}
                      onChange={handleInputChange}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
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
            <h3>Account Statistics</h3>
            <div className="stats-list">
              <div className="stat-item">
                <span className="stat-label">Total Workouts</span>
                <span className="stat-value">
                  {user?.stats?.totalWorkouts || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Reps</span>
                <span className="stat-value">
                  {user?.stats?.totalReps || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Average Form</span>
                <span className="stat-value">
                  {user?.stats?.averageFormAccuracy || 0}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Current Streak</span>
                <span className="stat-value">
                  {user?.stats?.streakDays || 0} days
                </span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="profile-card">
            <h3>Account Actions</h3>
            <div className="action-buttons">
              <button onClick={logout} className="logout-button">
                Logout
              </button>
              <button onClick={handleDeleteAccount} className="delete-button">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
