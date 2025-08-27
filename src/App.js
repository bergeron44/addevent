import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

// קומפוננט התחברות מנהלים
const AdminLogin = ({ onLogin }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // קבלת כל הארגונים מה-API
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await axios.get("https://bangyourhead-server.onrender.com/api/organizations");
        setOrganizations(response.data.data || []);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setError("שגיאה בטעינת הארגונים");
      }
    };
    fetchOrganizations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedOrg || !password) {
      setError("אנא בחר ארגון והכנס סיסמה");
      setLoading(false);
      return;
    }

    try {
      // בדיקה מקומית אם הסיסמה מתאימה לארגון
      const org = organizations.find(org => org._id === selectedOrg);
      if (org) {
        // כאן אתה יכול להוסיף את הסיסמאות הידניות שלך
        const manualPasswords = {
          "68ab49e616a04657215f5d88": "1111", // Test Org
          "68aabd33fad0dcafc9e0d2f6": "2222", // בדיקת API חדש
          "68aab191386fca86c0090fa4": "3333", // אגודת הסטודנטים בן גוריון
          "68aa058f7e41eda32a50a08c": "4444"   // ארגון בדיקה API
        };
        
        if (manualPasswords[selectedOrg] === password) {
          onLogin(org);
        } else {
          setError("סיסמה שגויה לארגון זה");
        }
      } else {
        setError("ארגון לא נמצא");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔐 Admin-Map4U</h1>
          <p>מערכת ניהול מנהלים לארגונים ומשתמשים</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="organization">בחר ארגון:</label>
            <select
              id="organization"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              required
              className="form-select"
            >
              <option value="">-- בחר ארגון --</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} - {org.type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">סיסמה:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="הכנס סיסמה"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? "מתחבר..." : "התחבר"}
          </button>
        </form>
      </div>
    </div>
  );
};

// קומפוננט מבנה נתונים של הארגון
const OrganizationData = ({ organization, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // קבלת משתמשי הארגון
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("https://bangyourhead-server.onrender.com/api/usernews");
        console.log("All users from API:", response.data); // לוג לבדיקה
        console.log("Current organization ID:", organization._id); // לוג לבדיקה
        
        // המשתמשים נמצאים ב-response.data.data ולא ב-response.data
        const allUsers = response.data.data || [];
        console.log("All users array:", allUsers); // לוג לבדיקה
        
        // סינון משתמשים לפי הארגון שנבחר - בדיקה נכונה של organizationId._id
        const filteredUsers = allUsers.filter(user => {
          console.log("Checking user:", user.full_name, "with organizationId:", user.organizationId); // לוג לבדיקה
          
          // בדיקה אם המשתמש מקושר לארגון דרך organizationId._id
          if (user.organizationId && user.organizationId._id === organization._id) {
            console.log("User matched by organizationId._id:", user.full_name); // לוג לבדיקה
            return true;
          }
          // בדיקה גם דרך השדה organization (למקרה שיש גם שם)
          if (user.organization === organization._id) {
            console.log("User matched by organization field:", user.full_name); // לוג לבדיקה
            return true;
          }
          console.log("User NOT matched:", user.full_name); // לוג לבדיקה
          return false;
        });
        
        console.log("Filtered users for organization:", filteredUsers); // לוג לבדיקה
        console.log("Number of filtered users:", filteredUsers.length); // לוג לבדיקה
        
        if (filteredUsers.length === 0) {
          console.log("No users found for this organization, showing example users"); // לוג לבדיקה
          // משתמשים לדוגמה אם אין משתמשים אמיתיים
          setUsers([
            { _id: "user1", username: "משתמש לדוגמה 1", email: "user1@example.com", phone: "050-1234567", authorized: true },
            { _id: "user2", username: "משתמש לדוגמה 2", email: "user2@example.com", phone: "050-2345678", authorized: false },
            { _id: "user3", username: "משתמש לדוגמה 3", email: "user3@example.com", phone: "050-3456789", authorized: true }
          ]);
        } else {
          setUsers(filteredUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        // משתמשים לדוגמה אם השרת לא עובד
        setUsers([
          { _id: "user1", username: "משתמש לדוגמה 1", email: "user1@example.com", phone: "050-1234567", authorized: true },
          { _id: "user2", username: "משתמש לדוגמה 2", email: "user2@example.com", phone: "050-2345678", authorized: false },
          { _id: "user3", username: "משתמש לדוגמה 3", email: "user3@example.com", phone: "050-3456789", authorized: true }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [organization._id]);

  const handleAuthorizeToggle = async (userId, currentStatus) => {
    try {
      // עדכון מקומי ראשית
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, is_authorized: !user.is_authorized }
          : user
      ));

      // ניסיון לעדכן בשרת
      try {
        await axios.patch(`https://bangyourhead-server.onrender.com/api/usernews/${userId}/authorize`);
      } catch (serverError) {
        console.error("Server update failed, but local update succeeded:", serverError);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("שגיאה בעדכון סטטוס המשתמש");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען נתוני הארגון...</p>
      </div>
    );
  }

  return (
    <div className="organization-data-container">
      <div className="data-header">
        <h1>📊 Admin-Map4U - {organization.name}</h1>
        <button onClick={onLogout} className="logout-button">
          התנתק
        </button>
      </div>

      <div className="data-content">
        <div className="org-details-section">
          <h2>🏢 פרטי הארגון</h2>
          <div className="org-details">
            <div className="detail-item">
              <strong>שם הארגון:</strong> {organization.name}
            </div>
            <div className="detail-item">
              <strong>מזהה (ID):</strong> {organization._id}
            </div>
            <div className="detail-item">
              <strong>סוג:</strong> {organization.type}
            </div>
            <div className="detail-item">
              <strong>תיאור:</strong> {organization.description || 'לא צוין'}
            </div>
            <div className="detail-item">
              <strong>סטטוס:</strong> {organization.status}
            </div>
            <div className="detail-item">
              <strong>מספר חברים:</strong> {organization.memberCount || 0}
            </div>
            {organization.location && (
              <div className="detail-item">
                <strong>מיקום:</strong> {organization.location.lat}, {organization.location.lng}
              </div>
            )}
            <div className="detail-item">
              <strong>נוצר בתאריך:</strong> {new Date(organization.createdAt).toLocaleDateString('he-IL')}
            </div>
          </div>
        </div>

        <div className="users-section">
          <h2>👥 משתמשי הארגון</h2>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>שם משתמש</th>
                  <th>אימייל</th>
                  <th>טלפון</th>
                  <th>סטטוס אישור</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className={user.is_authorized ? "authorized" : "not-authorized"}>
                    <td>{user.full_name || user.username || "אין שם"}</td>
                    <td>{user.email || "אין אימייל"}</td>
                    <td>{user.phone || "אין טלפון"}</td>
                    <td>
                      <span className={`status-badge ${user.is_authorized ? "authorized" : "not-authorized"}`}>
                        {user.is_authorized ? "מאושר" : "לא מאושר"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleAuthorizeToggle(user._id, user.is_authorized)}
                        className={`toggle-button ${user.is_authorized ? "deauthorize" : "authorize"}`}
                      >
                        {user.is_authorized ? "ביטול אישור" : "אשר"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="stats">
            <p>סה"כ משתמשים: {users.length}</p>
            <p>משתמשים מאושרים: {users.filter(u => u.is_authorized).length}</p>
            <p>משתמשים לא מאושרים: {users.filter(u => !u.is_authorized).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// קומפוננט ראשי
function App() {
  const [currentOrganization, setCurrentOrganization] = useState(null);

  const handleLogin = (organization) => {
    setCurrentOrganization(organization);
  };

  const handleLogout = () => {
    setCurrentOrganization(null);
  };

  return (
    <div className="App">
      {currentOrganization ? (
        <OrganizationData 
          organization={currentOrganization} 
          onLogout={handleLogout}
        />
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
