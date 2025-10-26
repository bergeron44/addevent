import React, { useState, useEffect } from "react";
import axios from "axios";
import emailjs from '@emailjs/browser';
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
  const [activeTab, setActiveTab] = useState('users'); // 'users' או 'reviews'
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [pointsModal, setPointsModal] = useState({ isOpen: false, user: null, action: null, points: 0 });

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
        console.log("Current organization details:", organization); // לוג לבדיקה
        
        // סינון משתמשים לפי הארגון שנבחר
        const filteredUsers = allUsers.filter(user => {
          // דילוג על מסמכים ללא שם או עם שם ריק
          if (!user.full_name || user.full_name.trim() === '') {
            console.log("Skipping user with empty/undefined name:", user._id);
            return false;
          }
          
          console.log("Checking user:", user.full_name, "with organization:", user.organization); // לוג לבדיקה
          
          // בדיקה אם המשתמש מקושר לארגון דרך organization.name (הדרך הנפוצה ביותר)
          if (user.organization && user.organization.name === organization.name) {
            console.log("User matched by organization.name:", user.full_name); // לוג לבדיקה
            return true;
          }
          // בדיקה אם המשתמש מקושר לארגון דרך organization._id
          if (user.organization && user.organization._id === organization._id) {
            console.log("User matched by organization._id:", user.full_name); // לוג לבדיקה
            return true;
          }
          // בדיקה אם המשתמש מקושר לארגון דרך organizationId._id
          if (user.organizationId && user.organizationId._id === organization._id) {
            console.log("User matched by organizationId._id:", user.full_name); // לוג לבדיקה
            return true;
          }
          // בדיקה אם המשתמש מקושר לארגון דרך organizationId.name
          if (user.organizationId && user.organizationId.name === organization.name) {
            console.log("User matched by organizationId.name:", user.full_name); // לוג לבדיקה
            return true;
          }
          // בדיקה גם דרך השדה organization (string - מזהה בלבד)
          if (user.organization === organization._id) {
            console.log("User matched by organization string field:", user.full_name); // לוג לבדיקה
            return true;
          }
          console.log("User NOT matched:", user.full_name); // לוג לבדיקה
          return false;
        });
        
        console.log("Total users from API:", allUsers.length); // לוג לבדיקה
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
  }, [organization._id, organization.name]);

  // קבלת ביקורות הארגון
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`https://bangyourhead-server.onrender.com/api/reviews/organization/${organization._id}`);
        console.log("Reviews from API:", response.data);
        
        // הביקורות נמצאות ב-response.data.message ולא ב-response.data.data
        const reviewsData = response.data.message || [];
        console.log("Reviews data:", reviewsData);
        
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // ביקורות לדוגמה אם השרת לא עובד
        setReviews([
          { _id: "review1", review: "ביקורת לדוגמה 1", rating: 4, userId: { full_name: "משתמש לדוגמה 1" }, createdAt: new Date() },
          { _id: "review2", review: "ביקורת לדוגמה 2", rating: 5, userId: { full_name: "משתמש לדוגמה 2" }, createdAt: new Date() },
          { _id: "review3", review: "ביקורת לדוגמה 3", rating: 3, userId: { full_name: "משתמש לדוגמה 3" }, createdAt: new Date() }
        ]);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [organization._id]);

  const handleAuthorizeToggle = async (userId, currentStatus) => {
    try {
      const user = users.find(u => u._id === userId);
      const newStatus = !user.is_authorized;

      // עדכון מקומי ראשית
      setUsers(users.map(user =>
        user._id === userId
          ? { ...user, is_authorized: newStatus }
          : user
      ));

      // אם המשתמש אושר - שלח מייל אישור
      if (newStatus && user.email) {
        try {
          await sendApprovalEmail(user.email, user.full_name || user.username, organization.name);
          console.log('מייל אישור נשלח בהצלחה!');
        } catch (emailError) {
          console.error('שגיאה בשליחת מייל אישור:', emailError);
          // לא נעצור את התהליך אם המייל נכשל
        }
      }

      // ניסיון לעדכן בשרת - משתמש ב-authorize לאישור וב-ban לביטול
      try {
        if (newStatus) {
          // אם מאשרים - תקרא ל-authorize
          await axios.patch(`https://bangyourhead-server.onrender.com/api/usernews/${userId}/authorize`);
        } else {
          // אם מבטלים אישור - תקרא ל-ban
          await axios.patch(`https://bangyourhead-server.onrender.com/api/usernews/${userId}/ban`);
        }
      } catch (serverError) {
        console.error("Server update failed, but local update succeeded:", serverError);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("שגיאה בעדכון סטטוס המשתמש");
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      const user = users.find(u => u._id === userId);

      // עדכון מקומי ראשית - לא מאושר
      setUsers(users.map(user =>
        user._id === userId
          ? { ...user, is_authorized: false }
          : user
      ));

      // שלח מייל דחייה
      if (user.email) {
        try {
          await sendRejectionEmail(user.email, user.full_name || user.username, organization.name);
          console.log('מייל דחייה נשלח בהצלחה!');
        } catch (emailError) {
          console.error('שגיאה בשליחת מייל דחייה:', emailError);
          // לא נעצור את התהליך אם המייל נכשל
        }
      }

      // ניסיון לעדכן בשרת
      try {
        await axios.patch(`https://bangyourhead-server.onrender.com/api/usernews/${userId}/authorize`);
      } catch (serverError) {
        console.error("Server update failed, but local update succeeded:", serverError);
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      alert("שגיאה בדחיית המשתמש");
    }
  };

  const openPointsModal = (user, action) => {
    setPointsModal({ isOpen: true, user, action, points: 1 });
  };

  const closePointsModal = () => {
    setPointsModal({ isOpen: false, user: null, action: null, points: 0 });
  };

  const handlePointsUpdate = async () => {
    try {
      const { user, action, points } = pointsModal;
      if (!user || !action || points <= 0) {
        alert("אנא הכנס כמות נקודות תקינה");
        return;
      }

      const currentPoints = user.points || 0;
      let pointsDelta; // השינוי שנשלח לשרת
      let newPoints; // הערך החדש לתצוגה מקומית

      if (action === 'add') {
        pointsDelta = points; // מספר חיובי להוספה
        newPoints = currentPoints + points;
      } else if (action === 'subtract') {
        pointsDelta = -points; // מספר שלילי להורדה
        newPoints = Math.max(0, currentPoints - points); // לא יכול להגיע למספר שלילי
      } else {
        alert("פעולה לא תקינה");
        return;
      }

      // עדכון בשרת תחילה
      const response = await axios.patch(`https://bangyourhead-server.onrender.com/api/usernews/${user._id}/points`, {
        points: pointsDelta // ← שולחים את השינוי (דלתא), לא את הסכום הסופי
      });

      // עדכון מקומי עם הנתונים מהשרת
      const updatedUser = response.data.data;
      setUsers(users.map(u =>
        u._id === user._id
          ? { ...u, points: updatedUser.points }
          : u
      ));

      closePointsModal();
      alert(`נקודות המשתמש עודכנו בהצלחה! נקודות חדשות: ${updatedUser.points}`);

    } catch (error) {
      console.error("Error updating user points:", error);
      alert("שגיאה בעדכון נקודות המשתמש");
    }
  };

  // פונקציה לשליחת מייל אישור
  const sendApprovalEmail = async (userEmail, userName, organizationName) => {
    try {
      // תבנית המייל שתואמת לתבנית ב-EmailJS
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        organization_name: organizationName,
        approval_date: new Date().toLocaleDateString('he-IL')
      };
      
      // שליחה דרך EmailJS עם המפתחות האמיתיים
      await emailjs.send('service_8lbirmd', 'template_z1vwxve', templateParams, '4TqCN9vQEhk_heUkz');
      
      // הצגת הודעה למשתמש שהמייל נשלח
      alert(`מייל אישור נשלח בהצלחה ל-${userEmail}`);
      
    } catch (error) {
      console.error('שגיאה בשליחת מייל:', error);
      throw error;
    }
  };

  // פונקציה לשליחת מייל דחייה
  const sendRejectionEmail = async (userEmail, userName, organizationName) => {
    try {
      // תבנית המייל לדחייה
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        organization_name: organizationName,
        rejection_date: new Date().toLocaleDateString('he-IL')
      };
      
      // שליחה דרך EmailJS עם המפתחות החדשים שסיפקת
      await emailjs.send('service_grx9y87', 'template_bddg4ud', templateParams, 'TuCOVDloC0qDsiDXO');
      
      // הצגת הודעה למשתמש שהמייל נשלח (באדום)
      const message = `מייל דחייה נשלח בהצלחה ל-${userEmail}`;
      alert(message);
      console.log('🔴 ' + message);
      
    } catch (error) {
      console.error('שגיאה בשליחת מייל דחייה:', error);
      throw error;
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
        {/* כפתורי מעבר בין הטבלאות */}
        <div className="tab-switcher">
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 משתמשי הארגון
          </button>
          <button 
            className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            📊 ביקורות הארגון
          </button>
        </div>

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

        {/* טבלת משתמשים */}
        {activeTab === 'users' && (
          <div className="users-section">
            <h2>👥 משתמשי הארגון</h2>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>שם משתמש</th>
                    <th>אימייל</th>
                    <th>טלפון</th>
                    <th>נקודות</th>
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
                        <span className="points-display">
                          {user.points || 0} נקודות
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.is_authorized ? "authorized" : "not-authorized"}`}>
                          {user.is_authorized ? "מאושר" : "לא מאושר"}
                        </span>
                      </td>
                      <td>
                        <div className="actions-container">
                          {!user.is_authorized && (
                            <>
                              <button
                                onClick={() => handleAuthorizeToggle(user._id, user.is_authorized)}
                                className="toggle-button authorize"
                              >
                                אשר
                              </button>
                              <button
                                onClick={() => handleRejectUser(user._id)}
                                className="toggle-button reject"
                              >
                                אל תאשר
                              </button>
                            </>
                          )}
                          {user.is_authorized && (
                            <button
                              onClick={() => handleAuthorizeToggle(user._id, user.is_authorized)}
                              className="toggle-button deauthorize"
                            >
                              ביטול אישור
                            </button>
                          )}
                          <div className="points-actions">
                            <button
                              onClick={() => openPointsModal(user, 'add')}
                              className="points-button add"
                              title="הוסף נקודות"
                            >
                              ➕
                            </button>
                            <button
                              onClick={() => openPointsModal(user, 'subtract')}
                              className="points-button subtract"
                              title="הורד נקודות"
                            >
                              ➖
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stats">
              <div className="stats-section">
                <h4>📊 סטטיסטיקות כלליות</h4>
                <p>סה"כ משתמשים: {users.length}</p>
                <p>משתמשים מאושרים: {users.filter(u => u.is_authorized).length}</p>
                <p>משתמשים לא מאושרים: {users.filter(u => !u.is_authorized).length}</p>
              </div>
              <div className="stats-section">
                <h4>🏆 סטטיסטיקות נקודות</h4>
                <p>סה"כ נקודות בארגון: {users.reduce((sum, u) => sum + (u.points || 0), 0)}</p>
                <p>ממוצע נקודות למשתמש: {users.length > 0 ? (users.reduce((sum, u) => sum + (u.points || 0), 0) / users.length).toFixed(1) : '0.0'}</p>
                <p>המשתמש עם הכי הרבה נקודות: {users.length > 0 ? Math.max(...users.map(u => u.points || 0)) : 0}</p>
                <p>משתמשים עם נקודות: {users.filter(u => (u.points || 0) > 0).length}</p>
              </div>
            </div>
          </div>
        )}

        {/* טבלת ביקורות */}
        {activeTab === 'reviews' && (
          <div className="reviews-section">
            <h2>📊 ביקורות הארגון</h2>
            {reviewsLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>טוען ביקורות...</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="reviews-table">
                    <thead>
                      <tr>
                        <th>אימייל</th>
                        <th>ביקורת</th>
                        <th>דירוג</th>
                        <th>תאריך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(reviews) && reviews.map((review) => (
                        <tr key={review._id} className="review-row">
                          <td>{review.userId?.email || "אין אימייל"}</td>
                          <td className="review-text">{review.review}</td>
                          <td>
                            <div className="rating-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span 
                                  key={star} 
                                  className={`star ${star <= review.rating ? 'filled' : 'empty'}`}
                                >
                                  {star <= review.rating ? '⭐' : '☆'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{new Date(review.createdAt).toLocaleDateString('he-IL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="stats">
                  <p>סה"כ ביקורות: {Array.isArray(reviews) ? reviews.length : 0}</p>
                  <p>דירוג ממוצע: {Array.isArray(reviews) && reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}</p>
                  <p>ביקורות חיוביות (4-5 כוכבים): {Array.isArray(reviews) ? reviews.filter(r => r.rating >= 4).length : 0}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* מודל ניהול נקודות */}
        {pointsModal.isOpen && (
          <div className="modal-overlay" onClick={closePointsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {pointsModal.action === 'add' ? '➕ הוספת נקודות' : '➖ הורדת נקודות'}
                </h3>
                <button className="close-button" onClick={closePointsModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="user-info">
                  <p><strong>משתמש:</strong> {pointsModal.user?.full_name || pointsModal.user?.username}</p>
                  <p><strong>נקודות נוכחיות:</strong> {pointsModal.user?.points || 0}</p>
                </div>
                <div className="form-group">
                  <label htmlFor="points-input">
                    כמות נקודות {pointsModal.action === 'add' ? 'להוספה:' : 'להורדה:'}
                  </label>
                  <input
                    type="number"
                    id="points-input"
                    min="1"
                    value={pointsModal.points}
                    onChange={(e) => setPointsModal(prev => ({
                      ...prev,
                      points: Math.max(1, parseInt(e.target.value) || 0)
                    }))}
                    className="points-input"
                  />
                </div>
                <div className="preview">
                  <p>
                    <strong>תוצאה:</strong> {pointsModal.user?.points || 0}
                    {pointsModal.action === 'add' ? ' + ' : ' - '}
                    {pointsModal.points} = {pointsModal.action === 'add'
                      ? (pointsModal.user?.points || 0) + pointsModal.points
                      : Math.max(0, (pointsModal.user?.points || 0) - pointsModal.points)
                    } נקודות
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-button" onClick={closePointsModal}>
                  ביטול
                </button>
                <button className="confirm-button" onClick={handlePointsUpdate}>
                  {pointsModal.action === 'add' ? 'הוסף נקודות' : 'הורד נקודות'}
                </button>
              </div>
            </div>
          </div>
        )}
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
