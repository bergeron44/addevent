import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import emailjs from '@emailjs/browser';
import "./App.css";

// ===== קבועים וכלי עזר גלובליים =====
const API_BASE = "https://bangyourhead-server.onrender.com";
const SERVICE_CODE = '8263867';
const FALLBACK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZSIsInNjb3BlcyI6WyJhZG1pbjp1c2VyczphdXRob3JpemUiLCJhZG1pbjp1c2VyczpiYW4iXSwiYXVkIjoiYWRkZXZlbnQub25yZW5kZXIuY29tIiwiaWF0IjoxNzY1NDg2MTM2LCJleHAiOjE3OTcwMjIxMzZ9.Kz_UZQD-uF4fcJVu6T-NvxTsQHl2MnMRYICDVrVSaGM';

const getServiceToken = () => process.env.REACT_APP_MAP4U_TOKEN || FALLBACK_TOKEN;

const getAuthHeaders = () => ({
  'x-service-code': SERVICE_CODE,
  'Authorization': `Bearer ${getServiceToken()}`
});

// ===== זיהוי סוג מייל: אוניברסיטאי (לאימות) מול אישי (לתקשורת) =====
const isUniversityEmail = (email) => {
  if (!email) return false;
  const domain = email.split('@')[1] || '';
  return /bgu|ac\.il|\.edu$|aguda/i.test(domain);
};

// ===== מיילים ידניים (גיבוי מקומי בדפדפן) =====
// בשרת קיים שדה private_email. אם הוא ריק אצל משתמש, המנהל יכול להזין מייל
// ידנית - הוא נשמר ב-localStorage בלבד (לשירות אין הרשאת כתיבה לשדה בשרת).
const PERSONAL_EMAILS_KEY = 'map4u_personal_emails';

const loadManualEmails = () => {
  try {
    return JSON.parse(localStorage.getItem(PERSONAL_EMAILS_KEY)) || {};
  } catch {
    return {};
  }
};

const saveManualEmail = (userId, email) => {
  const all = loadManualEmails();
  if (email) {
    all[userId] = email;
  } else {
    delete all[userId];
  }
  localStorage.setItem(PERSONAL_EMAILS_KEY, JSON.stringify(all));
  return all;
};

// המייל האוניברסיטאי (לאימות בלבד)
const getUniversityEmail = (user) =>
  isUniversityEmail(user.email) ? user.email : null;

// המייל האישי לתקשורת, לפי סדר עדיפות:
// 1. private_email מהשרת  2. email שהוא בעצם מייל אישי  3. מייל שהוזן ידנית
const getPersonalEmail = (user, manualEmails = {}) => {
  if (user.private_email) return user.private_email;
  if (user.email && !isUniversityEmail(user.email)) return user.email;
  return manualEmails[user._id] || null;
};

// מקור המייל האישי (לתצוגה)
const getPersonalEmailSource = (user, manualEmails = {}) => {
  if (user.private_email) return 'server';
  if (user.email && !isUniversityEmail(user.email)) return 'login';
  if (manualEmails[user._id]) return 'manual';
  return null;
};

// כתובת היעד לשליחת מיילים: תמיד מעדיפים את המייל האישי
const getContactEmail = (user, manualEmails = {}) =>
  getPersonalEmail(user, manualEmails) || user.email || null;

// ===== תוויות בעברית =====
const getRoleLabel = (role) => {
  const roleLabels = {
    'user': 'משתמש',
    'admin': 'מנהל',
    'superadmin': 'מנהל על',
    'business_owner': 'בעל עסק'
  };
  return roleLabels[role] || 'משתמש';
};

const getStatusLabel = (status) => {
  const labels = { 'active': 'פעיל', 'inactive': 'לא פעיל', 'banned': 'חסום' };
  return labels[status] || status || 'לא ידוע';
};

const getActivityLabel = (level) => {
  const labels = { 'new': 'חדש', 'low': 'נמוכה', 'medium': 'בינונית', 'high': 'גבוהה' };
  return labels[level] || level || 'לא ידוע';
};

const getLanguageLabel = (lang) => {
  const labels = { 'he': 'עברית', 'en': 'אנגלית', 'ar': 'ערבית' };
  return labels[lang] || lang || 'לא צוין';
};

const getThemeLabel = (theme) => {
  const labels = { 'light': 'בהיר', 'dark': 'כהה', 'auto': 'אוטומטי' };
  return labels[theme] || theme || 'לא צוין';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : 'לא ידוע';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('he-IL') : 'לא ידוע';
const formatMinutes = (m) => {
  const minutes = Math.round(m || 0);
  if (minutes < 60) return `${minutes} דקות`;
  return `${Math.floor(minutes / 60)} שעות ו-${minutes % 60} דקות`;
};

// ===== אווטאר עם ראשי תיבות וצבע קבוע לפי השם =====
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #0ea5e9, #2563eb)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
  'linear-gradient(135deg, #ef4444, #b91c1c)'
];

const getInitials = (name) => {
  const parts = (name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
};

const getAvatarGradient = (name) => {
  let hash = 0;
  for (const ch of (name || '')) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

const Avatar = ({ name, size = 'md' }) => (
  <span
    className={`avatar avatar-${size}`}
    style={{ background: getAvatarGradient(name) }}
  >
    {getInitials(name)}
  </span>
);

// ===== מערכת התראות (Toast) =====
let toastCounter = 0;

const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type, title, message = '', duration) => {
    const id = ++toastCounter;
    const ttl = duration || (type === 'error' ? 9000 : 5000);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return { toasts, showToast, dismiss };
};

const ToastStack = ({ toasts, dismiss }) => (
  <div className="toast-stack">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
        <span className="toast-icon">
          {t.type === 'success' && '✓'}
          {t.type === 'error' && '✕'}
          {t.type === 'info' && 'ℹ'}
        </span>
        <div className="toast-body">
          <strong>{t.title}</strong>
          {t.message && <p>{t.message}</p>}
        </div>
      </div>
    ))}
  </div>
);

// ===== מסך התחברות מנהלים =====
const AdminLogin = ({ onLogin }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/organizations`);
        setOrganizations(response.data.data || []);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setError("שגיאה בטעינת הארגונים");
      } finally {
        setOrgsLoading(false);
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
      const org = organizations.find(org => org._id === selectedOrg);
      if (org) {
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
      <div className="login-orb login-orb-1"></div>
      <div className="login-orb login-orb-2"></div>
      <div className="login-orb login-orb-3"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🗺️</div>
          <h1>Admin-Map4U</h1>
          <p>מערכת ניהול מנהלים לארגונים ומשתמשים</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="organization">ארגון</label>
            <select
              id="organization"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              required
              className="form-select"
            >
              <option value="">
                {orgsLoading ? "טוען ארגונים..." : "-- בחר ארגון --"}
              </option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} - {org.type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                placeholder="הכנס סיסמה"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "מתחבר..." : "כניסה למערכת ←"}
          </button>
        </form>

        <div className="login-footer">גישה למנהלי ארגונים מורשים בלבד</div>
      </div>
    </div>
  );
};

// ===== שורת ערך בפאנל הפרטים =====
const DetailCell = ({ label, children, ltr, mono }) => (
  <div className="detail-cell">
    <span className="detail-label">{label}</span>
    <span className={`detail-value${mono ? ' mono' : ''}`} dir={ltr ? 'ltr' : undefined}>
      {children}
    </span>
  </div>
);

// ===== פאנל פרטי משתמש מלאים (נפתח בתוך הטבלה בלחיצה על שורה) =====
// הרשומה המלאה מגיעה מ-GET /api/usernews/:id וכוללת את private_email, טלפון,
// מיקום, העדפות, עסקאות, חברים ועוד - הרבה מעבר למה שרשימת המשתמשים מחזירה.
const UserDetailPanel = ({ user, loading, loadError, manualEmails, onSaveManualEmail, showToast }) => {
  const [emailInput, setEmailInput] = useState(manualEmails[user._id] || '');

  const universityEmail = getUniversityEmail(user);
  const personalEmail = getPersonalEmail(user, manualEmails);
  const personalSource = getPersonalEmailSource(user, manualEmails);
  const contactEmail = getContactEmail(user, manualEmails);

  const handleSaveEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('error', 'כתובת מייל לא תקינה', 'בדוק את הכתובת ונסה שוב');
      return;
    }
    onSaveManualEmail(user._id, trimmed);
    showToast('success', trimmed ? 'המייל האישי נשמר' : 'המייל האישי הוסר',
      trimmed ? `${trimmed} (נשמר מקומית בדפדפן זה)` : '');
  };

  if (loading) {
    return (
      <div className="detail-panel">
        <div className="detail-loading">
          <div className="spinner spinner-sm"></div>
          <p>טוען את הרשומה המלאה מהשרת...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      {loadError && (
        <div className="warning-banner">
          ⚠️ לא ניתן היה למשוך את הרשומה המלאה מהשרת - מוצג מידע חלקי מהרשימה
        </div>
      )}

      {/* ===== מיילים ===== */}
      <div className="detail-section">
        <h4><span className="section-icon">📧</span> כתובות מייל</h4>
        <div className="email-cards">
          <div className="email-card">
            <div className="email-card-top">
              <span className="email-card-icon">🎓</span>
              <span className="email-card-title">מייל אוניברסיטאי</span>
              <span className="chip chip-muted">לאימות בלבד</span>
            </div>
            <div className="email-card-value" dir="ltr">
              {universityEmail || <span className="missing-value">לא קיים במערכת</span>}
            </div>
          </div>
          <div className={`email-card ${personalEmail ? 'email-card-active' : ''}`}>
            <div className="email-card-top">
              <span className="email-card-icon">✉️</span>
              <span className="email-card-title">מייל אישי</span>
              <span className="chip chip-success">לכאן נשלחים המיילים</span>
            </div>
            <div className="email-card-value" dir="ltr">
              {personalEmail || <span className="missing-value">לא קיים - ניתן להזין למטה</span>}
            </div>
            {personalSource && (
              <div className="email-card-source">
                {personalSource === 'server' && '🔗 מגיע מהשרת (private_email)'}
                {personalSource === 'login' && '🔑 מייל ההתחברות של המשתמש'}
                {personalSource === 'manual' && '✍️ הוזן ידנית על ידי מנהל'}
              </div>
            )}
          </div>
        </div>

        {!user.private_email && (
          <div className="personal-email-editor">
            <label htmlFor={`personal-email-${user._id}`}>
              עדכון מייל אישי לתקשורת (נשמר מקומית בדפדפן - לשירות אין הרשאת כתיבה לשרת):
            </label>
            <div className="personal-email-row">
              <input
                id={`personal-email-${user._id}`}
                type="email"
                dir="ltr"
                placeholder="personal@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="form-input personal-email-input"
              />
              <button className="btn btn-primary" onClick={handleSaveEmail}>שמור</button>
            </div>
          </div>
        )}

        <p className="email-note">
          💡 מיילי אישור / דחייה נשלחים תמיד למייל האישי{contactEmail ? ` (${contactEmail})` : ''};
          רק אם אין מייל אישי - למייל האוניברסיטאי.
        </p>
      </div>

      {/* ===== זהות וסטטוס ===== */}
      <div className="detail-section">
        <h4><span className="section-icon">🪪</span> זהות וסטטוס</h4>
        <div className="detail-grid">
          <DetailCell label="שם מלא">{user.full_name || 'לא צוין'}</DetailCell>
          <DetailCell label="מזהה (ID)" ltr mono>{user._id}</DetailCell>
          <DetailCell label="תפקיד">{getRoleLabel(user.role)}</DetailCell>
          <DetailCell label="סטטוס חשבון">{getStatusLabel(user.status)}</DetailCell>
          <DetailCell label="אישור">
            <span className={`status-badge ${user.is_authorized ? "authorized" : "not-authorized"}`}>
              {user.is_authorized ? "מאושר" : "ממתין לאישור"}
            </span>
          </DetailCell>
          <DetailCell label="ארגון">
            {user.organizationId?.name || user.organization?.name || 'לא משויך'}
          </DetailCell>
          <DetailCell label="טלפון" ltr>{user.phone || 'לא צוין'}</DetailCell>
          <DetailCell label="נרשם בתאריך">{formatDate(user.created_at || user.createdAt)}</DetailCell>
          <DetailCell label="עודכן לאחרונה">{formatDateTime(user.updated_at || user.updatedAt)}</DetailCell>
          <DetailCell label="פעיל לאחרונה">{formatDateTime(user.lastActiveAt)}</DetailCell>
          {user.bio && <DetailCell label="ביוגרפיה">{user.bio}</DetailCell>}
          {(user.location?.city || user.location?.address) && (
            <DetailCell label="מיקום">
              {[user.location.address, user.location.city].filter(Boolean).join(', ')}
            </DetailCell>
          )}
        </div>
      </div>

      {/* ===== נקודות ופעילות ===== */}
      <div className="detail-section">
        <h4><span className="section-icon">🏆</span> נקודות ופעילות</h4>
        <div className="detail-grid">
          <DetailCell label="נקודות">{user.points || 0}</DetailCell>
          <DetailCell label="משתמש פרימיום">{user.isPremium ? 'כן (מעל 1000 נקודות)' : 'לא'}</DetailCell>
          <DetailCell label="רמת פעילות">{getActivityLabel(user.activityLevel)}</DetailCell>
          <DetailCell label="מספר התחברויות">{user.sessionCount || 0}</DetailCell>
          <DetailCell label="זמן שימוש ממוצע">{formatMinutes(user.avgSessionTime)}</DetailCell>
          <DetailCell label="זמן שימוש כולל">{formatMinutes(user.totalSessionTime)}</DetailCell>
          <DetailCell label="לייקים שנתן">{user.likesGiven || 0}</DetailCell>
          <DetailCell label="תגובות שכתב">{user.commentsCount || 0}</DetailCell>
        </div>
      </div>

      {/* ===== חברתי, קופונים ועסקאות ===== */}
      <div className="detail-section">
        <h4><span className="section-icon">🤝</span> חברתי, קופונים ועסקאות</h4>
        <div className="detail-grid">
          <DetailCell label="חברים">
            {Array.isArray(user.friends) ? user.friends.length : (user.friendsCount || 0)}
          </DetailCell>
          <DetailCell label="מועדפים">
            {Array.isArray(user.favorites) ? user.favorites.length : (user.favoritesCount || 0)}
          </DetailCell>
          <DetailCell label="קודים / קופונים">
            {Array.isArray(user.codeList) && user.codeList.length > 0
              ? user.codeList.join(', ')
              : 'אין'}
          </DetailCell>
          <DetailCell label="עסקאות">
            {Array.isArray(user.transactions) ? user.transactions.length : 0}
          </DetailCell>
        </div>
        {Array.isArray(user.transactions) && user.transactions.length > 0 && (
          <div className="transactions-list">
            {user.transactions.map((t, i) => (
              <div key={t.transactionId || i} className="transaction-row">
                <span>{formatDate(t.date)}</span>
                <span>{t.description || 'ללא תיאור'}</span>
                <span>{t.amount} {t.currency || 'ILS'}</span>
                <span className={`chip chip-${t.status === 'completed' ? 'success' : 'muted'}`}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== העדפות ושאלון הצטרפות ===== */}
      <div className="detail-section">
        <h4><span className="section-icon">⚙️</span> העדפות ושאלון הצטרפות</h4>
        <div className="detail-grid">
          <DetailCell label="שפה">{getLanguageLabel(user.preferences?.language)}</DetailCell>
          <DetailCell label="ערכת נושא">{getThemeLabel(user.preferences?.theme)}</DetailCell>
          <DetailCell label="התראות">
            {user.preferences?.notifications
              ? [
                  user.preferences.notifications.email ? 'מייל' : null,
                  user.preferences.notifications.push ? 'דחיפה' : null,
                  user.preferences.notifications.sms ? 'SMS' : null
                ].filter(Boolean).join(', ') || 'כבויות'
              : 'לא צוין'}
          </DetailCell>
          <DetailCell label="שאלון הצטרפות">
            {user.onboardingSurvey?.completed ? 'הושלם' : 'לא הושלם'}
            {user.onboardingSurvey?.reasonsForJoining?.length > 0 &&
              ` (סיבות: ${user.onboardingSurvey.reasonsForJoining.join(', ')})`}
          </DetailCell>
          {user.onboardingSurvey?.fieldOfStudy && (
            <DetailCell label="תחום לימודים">{user.onboardingSurvey.fieldOfStudy}</DetailCell>
          )}
          {user.onboardingSurvey?.studyYear && (
            <DetailCell label="שנת לימודים">{user.onboardingSurvey.studyYear}</DetailCell>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== כרטיס KPI =====
const StatCard = ({ icon, label, value, sub, tone = 'default' }) => (
  <div className={`stat-card stat-${tone}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-text">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  </div>
);

// ===== הדשבורד המרכזי =====
const OrganizationData = ({ organization, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [pointsModal, setPointsModal] = useState({ isOpen: false, user: null, action: null, points: 0 });
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [manualEmails, setManualEmails] = useState(loadManualEmails);
  const [serverStatus, setServerStatus] = useState('checking');
  const [usersError, setUsersError] = useState(false);
  const [orgDetailsOpen, setOrgDetailsOpen] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState({}); // משתמשים שפעולה רצה עליהם כרגע

  // מטמון רשומות מלאות מהשרת (כולל private_email) לפי מזהה משתמש
  const [fullUsers, setFullUsers] = useState({});
  const [detailLoading, setDetailLoading] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const fullUsersRef = useRef(fullUsers);
  fullUsersRef.current = fullUsers;

  const { toasts, showToast, dismiss } = useToasts();

  // חיפוש, סינון, מיון ועימוד
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 25;

  // בדיקת זמינות השרת
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/health`, { timeout: 15000 });
        setServerStatus(response.data?.db === 'connected' ? 'online' : 'offline');
      } catch {
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);

  // קבלת משתמשי הארגון (limit גבוה - ברירת המחדל של השרת היא 50 בלבד)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/usernews?limit=1000`, {
          headers: getAuthHeaders()
        });

        const allUsers = response.data.data || [];

        const filteredUsers = allUsers.filter(user => {
          if (!user.full_name || user.full_name.trim() === '') return false;
          if (user.organization && user.organization.name === organization.name) return true;
          if (user.organization && user.organization._id === organization._id) return true;
          if (user.organizationId && user.organizationId._id === organization._id) return true;
          if (user.organizationId && user.organizationId.name === organization.name) return true;
          if (user.organization === organization._id) return true;
          return false;
        });

        console.log(`Users: ${allUsers.length} total, ${filteredUsers.length} in organization "${organization.name}"`);
        setUsers(filteredUsers);
        setUsersError(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsersError(true);
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
        const response = await axios.get(`${API_BASE}/api/reviews/organization/${organization._id}`, {
          headers: getAuthHeaders()
        });
        const reviewsData = response.data.message || [];
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
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

  // ===== משיכת רשומה מלאה מהשרת (עם מטמון) - המקור ל-private_email =====
  const ensureFullUser = useCallback(async (userId) => {
    if (fullUsersRef.current[userId]) return fullUsersRef.current[userId];
    setDetailLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await axios.get(`${API_BASE}/api/usernews/${userId}`, {
        headers: getAuthHeaders()
      });
      const full = response.data.data;
      setFullUsers(prev => ({ ...prev, [userId]: full }));
      setDetailErrors(prev => ({ ...prev, [userId]: false }));
      return full;
    } catch (error) {
      console.error("Error fetching full user details:", error);
      setDetailErrors(prev => ({ ...prev, [userId]: true }));
      return null;
    } finally {
      setDetailLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, []);

  // משתמש "ממוזג": נתוני הרשימה + הרשומה המלאה אם כבר נטענה
  const getMergedUser = useCallback((user) =>
    fullUsers[user._id] ? { ...user, ...fullUsers[user._id], is_authorized: user.is_authorized, points: user.points, role: user.role } : user,
  [fullUsers]);

  // שמירת מייל ידני (מקומית) ורענון המצב
  const handleSaveManualEmail = (userId, email) => {
    setManualEmails({ ...saveManualEmail(userId, email) });
  };

  const setBusy = (userId, value) =>
    setBusyUserIds(prev => ({ ...prev, [userId]: value }));

  // ===== שליחת מייל דרך השרת (Brevo) =====
  // ערוץ השליחה המועדף: POST /api/notifications/email בשרת, שמעביר ל-Brevo
  // (300 מיילים ביום בחינם). אם ה-endpoint עדיין לא קיים בשרת - החזרה false
  // והקוד נופל חזרה ל-EmailJS. ראה BREVO_SETUP.md להוראות חיבור השרת.
  const trySendViaServer = async (type, userEmail, userName, organizationName) => {
    try {
      await axios.post(`${API_BASE}/api/notifications/email`, {
        type,
        to: userEmail,
        name: userName,
        organizationName
      }, {
        headers: getAuthHeaders(),
        timeout: 20000
      });
      const emailType = isUniversityEmail(userEmail)
        ? 'למייל האוניברסיטאי (אין מייל אישי במערכת)'
        : 'למייל האישי';
      showToast('success',
        type === 'approval' ? 'מייל אישור נשלח בהצלחה (דרך השרת)' : 'מייל דחייה נשלח בהצלחה (דרך השרת)',
        `${emailType}: ${userEmail}`);
      return true;
    } catch (error) {
      console.warn(`שליחה דרך השרת (Brevo) נכשלה - fallback ל-EmailJS:`,
        error.response?.status, error.response?.data?.message || error.message);
      return false;
    }
  };

  // ===== פונקציות שליחת מייל (Brevo דרך השרת, עם fallback ל-EmailJS) =====
  const sendApprovalEmail = async (userEmail, userName, organizationName) => {
    // ניסיון ראשון: דרך השרת (Brevo)
    if (await trySendViaServer('approval', userEmail, userName, organizationName)) return;

    // fallback: EmailJS (מוגבל ל-200 מיילים בחודש)
    try {
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        organization_name: organizationName,
        approval_date: new Date().toLocaleDateString('he-IL')
      };

      const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_p2pb4sg';
      const templateId = process.env.REACT_APP_EMAILJS_APPROVAL_TEMPLATE_ID || 'template_z1vwxve';
      const userId = process.env.REACT_APP_EMAILJS_USER_ID || '4TqCN9vQEhk_heUkz';

      console.log('📧 שליחת מייל אישור:', { serviceId, templateId, userEmail });
      await emailjs.send(serviceId, templateId, templateParams, userId);

      const emailType = isUniversityEmail(userEmail)
        ? 'למייל האוניברסיטאי (אין מייל אישי במערכת)'
        : 'למייל האישי';
      showToast('success', 'מייל אישור נשלח בהצלחה', `${emailType}: ${userEmail}`);
    } catch (error) {
      console.error('שגיאה בשליחת מייל אישור:', error);
      const errorMessage = error.text || error.message || 'שגיאה לא ידועה';

      if (errorMessage.includes('service ID not found')) {
        showToast('error', 'Service ID לא נמצא ב-EmailJS',
          'בדוק את ה-Service ID ב-EmailJS Dashboard והוסף אותו ל-.env כ-REACT_APP_EMAILJS_SERVICE_ID');
      } else if (errorMessage.includes('template ID not found')) {
        showToast('error', 'Template ID לא נמצא ב-EmailJS', 'בדוק את ה-Template ID ב-EmailJS Dashboard');
      } else {
        showToast('error', 'שגיאה בשליחת מייל אישור', errorMessage);
      }
      throw error;
    }
  };

  const sendRejectionEmail = async (userEmail, userName, organizationName) => {
    // ניסיון ראשון: דרך השרת (Brevo)
    if (await trySendViaServer('rejection', userEmail, userName, organizationName)) return;

    // fallback: EmailJS (מוגבל ל-200 מיילים בחודש)
    try {
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        organization_name: organizationName,
        rejection_date: new Date().toLocaleDateString('he-IL')
      };

      const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_p2pb4sg';
      const templateId = process.env.REACT_APP_EMAILJS_REJECTION_TEMPLATE_ID || 'template_bddg4ud';
      const userId = process.env.REACT_APP_EMAILJS_USER_ID || 'TuCOVDloC0qDsiDXO';

      console.log('📧 שליחת מייל דחייה:', { serviceId, templateId, userEmail });
      await emailjs.send(serviceId, templateId, templateParams, userId);

      const emailType = isUniversityEmail(userEmail)
        ? 'למייל האוניברסיטאי (אין מייל אישי במערכת)'
        : 'למייל האישי';
      showToast('success', 'מייל דחייה נשלח בהצלחה', `${emailType}: ${userEmail}`);
    } catch (error) {
      console.error('שגיאה בשליחת מייל דחייה:', error);
      const errorMessage = error.text || error.message || 'שגיאה לא ידועה';

      if (errorMessage.includes('service ID not found')) {
        showToast('error', 'Service ID לא נמצא ב-EmailJS',
          'בדוק את ה-Service ID ב-EmailJS Dashboard והוסף אותו ל-.env כ-REACT_APP_EMAILJS_SERVICE_ID');
      } else if (errorMessage.includes('template ID not found')) {
        showToast('error', 'Template ID לא נמצא ב-EmailJS', 'בדוק את ה-Template ID ב-EmailJS Dashboard');
      } else {
        showToast('error', 'שגיאה בשליחת מייל דחייה', errorMessage);
      }
      throw error;
    }
  };

  // כתובת היעד למיילים: מושכים קודם את הרשומה המלאה כדי לקבל את private_email
  const resolveContactEmail = async (user) => {
    const full = await ensureFullUser(user._id);
    const merged = full ? { ...user, ...full } : user;
    return getContactEmail(merged, manualEmails);
  };

  // ===== אישור / ביטול אישור =====
  const handleAuthorizeToggle = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user || busyUserIds[userId]) return;
    const newStatus = !user.is_authorized;
    setBusy(userId, true);

    try {
      // עדכון מקומי ראשית
      setUsers(prev => prev.map(u =>
        u._id === userId ? { ...u, is_authorized: newStatus } : u
      ));

      // אם המשתמש אושר - שלח מייל אישור למייל האישי (או לאוניברסיטאי אם אין)
      if (newStatus) {
        const contactEmail = await resolveContactEmail(user);
        if (contactEmail) {
          try {
            await sendApprovalEmail(contactEmail, user.full_name || user.username, organization.name);
          } catch (emailError) {
            // לא נעצור את התהליך אם המייל נכשל - ההודעה כבר הוצגה ב-toast
          }
        } else {
          showToast('info', 'לא נשלח מייל', 'למשתמש אין כתובת מייל במערכת');
        }
      }

      // עדכון בשרת - authorize לאישור, ban לביטול
      try {
        if (newStatus) {
          await axios.patch(`${API_BASE}/api/usernews/${userId}/authorize`, {}, {
            headers: getAuthHeaders()
          });
          showToast('success', 'המשתמש אושר', `${user.full_name || ''} עודכן בשרת בהצלחה`);
        } else {
          await axios.patch(`${API_BASE}/api/usernews/${userId}/ban`, {}, {
            headers: getAuthHeaders()
          });
          showToast('success', 'האישור בוטל', `${user.full_name || ''} עודכן בשרת בהצלחה`);
        }
      } catch (serverError) {
        console.error("Server update failed, but local update succeeded:", serverError);
        showToast('error', 'העדכון בשרת נכשל',
          'הסטטוס שמוצג הוא מקומי בלבד וישתנה חזרה ברענון');
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      showToast('error', 'שגיאה בעדכון סטטוס המשתמש');
    } finally {
      setBusy(userId, false);
    }
  };

  // ===== דחיית משתמש =====
  const handleRejectUser = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user || busyUserIds[userId]) return;
    setBusy(userId, true);

    try {
      setUsers(prev => prev.map(u =>
        u._id === userId ? { ...u, is_authorized: false } : u
      ));

      // שלח מייל דחייה למייל האישי (או לאוניברסיטאי אם אין)
      const contactEmail = await resolveContactEmail(user);
      if (contactEmail) {
        try {
          await sendRejectionEmail(contactEmail, user.full_name || user.username, organization.name);
        } catch (emailError) {
          // ההודעה כבר הוצגה ב-toast
        }
      }

      try {
        await axios.patch(`${API_BASE}/api/usernews/${userId}/ban`, {}, {
          headers: getAuthHeaders()
        });
        showToast('success', 'המשתמש נדחה', `${user.full_name || ''} עודכן בשרת בהצלחה`);
      } catch (serverError) {
        console.error("Server update failed, but local update succeeded:", serverError);
        showToast('error', 'העדכון בשרת נכשל',
          'הסטטוס שמוצג הוא מקומי בלבד וישתנה חזרה ברענון');
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      showToast('error', 'שגיאה בדחיית המשתמש');
    } finally {
      setBusy(userId, false);
    }
  };

  // ===== עדכון תפקיד =====
  const handleRoleUpdate = async (userId, newRole) => {
    const previousRole = users.find(u => u._id === userId)?.role || 'user';
    try {
      setUsers(prev => prev.map(u =>
        u._id === userId ? { ...u, role: newRole } : u
      ));

      try {
        await axios.patch(`${API_BASE}/api/usernews/${userId}/role`, {
          role: newRole
        }, {
          headers: getAuthHeaders()
        });
        showToast('success', 'התפקיד עודכן', `התפקיד שונה ל"${getRoleLabel(newRole)}"`);
      } catch (serverError) {
        console.error("Server role update failed:", serverError);
        if (serverError.response?.status === 403) {
          showToast('error', 'אין הרשאה לעדכן תפקידים (403)',
            'לטוקן השירות נדרשת הרשאת admin:users:role - פנה למנהל השרת');
        } else {
          showToast('error', 'שגיאה בעדכון התפקיד בשרת');
        }
        setUsers(prev => prev.map(u =>
          u._id === userId ? { ...u, role: previousRole } : u
        ));
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      showToast('error', 'שגיאה בעדכון תפקיד המשתמש');
    }
  };

  // ===== ניהול נקודות =====
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
        showToast('error', 'אנא הכנס כמות נקודות תקינה');
        return;
      }

      let pointsDelta;
      if (action === 'add') {
        pointsDelta = points;
      } else if (action === 'subtract') {
        pointsDelta = -points;
      } else {
        showToast('error', 'פעולה לא תקינה');
        return;
      }

      // עדכון בשרת תחילה - שולחים דלתא, לא סכום סופי
      const response = await axios.patch(`${API_BASE}/api/usernews/${user._id}/points`, {
        points: pointsDelta
      }, {
        headers: getAuthHeaders()
      });

      const updatedUser = response.data.data;
      setUsers(prev => prev.map(u =>
        u._id === user._id ? { ...u, points: updatedUser.points } : u
      ));

      closePointsModal();
      showToast('success', 'הנקודות עודכנו בהצלחה', `יתרה חדשה: ${updatedUser.points} נקודות`);
    } catch (error) {
      console.error("Error updating user points:", error);
      if (error.response?.status === 403) {
        showToast('error', 'אין הרשאה לעדכן נקודות (403)',
          'לטוקן השירות נדרשת הרשאת admin:users:points - פנה למנהל השרת');
      } else {
        showToast('error', 'שגיאה בעדכון נקודות המשתמש');
      }
    }
  };

  // ===== חיפוש, סינון ומיון =====
  const visibleUsers = useMemo(() => {
    let result = [...users];

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(u =>
        (u.full_name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (fullUsers[u._id]?.private_email || '').toLowerCase().includes(term) ||
        (manualEmails[u._id] || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter === 'authorized') {
      result = result.filter(u => u.is_authorized);
    } else if (statusFilter === 'pending') {
      result = result.filter(u => !u.is_authorized);
    }

    if (sortBy === 'points_desc') {
      result.sort((a, b) => (b.points || 0) - (a.points || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'he'));
    } else {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return result;
  }, [users, searchTerm, statusFilter, sortBy, manualEmails, fullUsers]);

  // עימוד
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = visibleUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  // לחיצה על שורה - פתיחה/סגירה של פאנל הפרטים (מתעלמים מלחיצות על פקדים)
  const handleRowClick = (user, e) => {
    if (e.target.closest('button, select, input, a')) return;
    if (expandedUserId === user._id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(user._id);
      ensureFullUser(user._id);
    }
  };

  // ===== KPI =====
  const approvedCount = users.filter(u => u.is_authorized).length;
  const pendingCount = users.length - approvedCount;
  const totalPoints = users.reduce((sum, u) => sum + (u.points || 0), 0);
  const withPersonalEmail = users.filter(u =>
    getPersonalEmail(getMergedUser(u), manualEmails)
  ).length;
  const avgRating = Array.isArray(reviews) && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="loading-container page-loading">
        <div className="spinner"></div>
        <p>טוען נתוני הארגון...</p>
      </div>
    );
  }

  return (
    <div className="organization-data-container">
      <ToastStack toasts={toasts} dismiss={dismiss} />

      {/* ===== כותרת עליונה ===== */}
      <header className="data-header">
        <div className="header-brand">
          <span className="header-logo">🗺️</span>
          <div className="header-titles">
            <h1>Admin-Map4U</h1>
            <div className="header-org">
              <span className="org-name">{organization.name}</span>
              <span className="chip chip-outline">{organization.type}</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <span className={`server-status ${serverStatus}`}>
            <span className="status-dot"></span>
            {serverStatus === 'online' && 'שרת מחובר'}
            {serverStatus === 'offline' && 'שרת לא זמין'}
            {serverStatus === 'checking' && 'בודק חיבור...'}
          </span>
          <button onClick={onLogout} className="logout-button">
            התנתק ⎋
          </button>
        </div>
      </header>

      <div className="data-content">
        {/* ===== כרטיסי KPI ===== */}
        <div className="stats-row">
          <StatCard icon="👥" label='סה"כ משתמשים' value={users.length} tone="indigo" />
          <StatCard icon="✅" label="מאושרים" value={approvedCount} tone="green" />
          <StatCard icon="⏳" label="ממתינים לאישור" value={pendingCount} tone="amber" />
          <StatCard icon="✉️" label="עם מייל אישי" value={withPersonalEmail} tone="sky" />
          <StatCard icon="🏆" label='סה"כ נקודות' value={totalPoints.toLocaleString('he-IL')} tone="violet" />
          <StatCard icon="⭐" label="דירוג ממוצע" value={avgRating} sub={`${Array.isArray(reviews) ? reviews.length : 0} ביקורות`} tone="rose" />
        </div>

        {/* ===== פרטי הארגון (מתקפל) ===== */}
        <div className={`card org-card ${orgDetailsOpen ? 'open' : ''}`}>
          <button className="org-card-toggle" onClick={() => setOrgDetailsOpen(v => !v)}>
            <span className="org-toggle-title">🏢 פרטי הארגון</span>
            <span className={`chevron ${orgDetailsOpen ? 'rotated' : ''}`}>▾</span>
          </button>
          {orgDetailsOpen && (
            <div className="org-details detail-grid">
              <DetailCell label="שם הארגון">{organization.name}</DetailCell>
              <DetailCell label="מזהה (ID)" ltr mono>{organization._id}</DetailCell>
              <DetailCell label="סוג">{organization.type}</DetailCell>
              <DetailCell label="תיאור">{organization.description || 'לא צוין'}</DetailCell>
              <DetailCell label="סטטוס">{organization.status}</DetailCell>
              <DetailCell label="מספר חברים">{organization.memberCount || 0}</DetailCell>
              {organization.location && (
                <DetailCell label="מיקום" ltr>
                  {organization.location.lat}, {organization.location.lng}
                </DetailCell>
              )}
              <DetailCell label="נוצר בתאריך">{formatDate(organization.createdAt)}</DetailCell>
            </div>
          )}
        </div>

        {/* ===== מעבר בין טאבים ===== */}
        <div className="tab-switcher">
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 משתמשי הארגון
            <span className="tab-count">{users.length}</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            ⭐ ביקורות הארגון
            <span className="tab-count">{Array.isArray(reviews) ? reviews.length : 0}</span>
          </button>
        </div>

        {/* ===== טאב משתמשים ===== */}
        {activeTab === 'users' && (
          <div className="card users-section">
            {usersError && (
              <div className="warning-banner">
                ⚠️ לא ניתן היה לטעון משתמשים מהשרת - מוצגים נתוני דוגמה בלבד
              </div>
            )}

            {/* סרגל חיפוש, סינון ומיון */}
            <div className="table-toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="חיפוש לפי שם או מייל..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="form-select toolbar-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">כל הסטטוסים</option>
                <option value="authorized">מאושרים בלבד</option>
                <option value="pending">ממתינים לאישור</option>
              </select>
              <select
                className="form-select toolbar-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date_desc">חדשים ראשונים</option>
                <option value="points_desc">הכי הרבה נקודות</option>
                <option value="name_asc">לפי שם (א-ת)</option>
              </select>
              <span className="results-count">
                מציג {pagedUsers.length} מתוך {visibleUsers.length}
              </span>
            </div>

            <p className="table-hint">💡 לחיצה על שורת משתמש פותחת את כל הפרטים המלאים שלו</p>

            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="th-expand"></th>
                    <th>משתמש</th>
                    <th>🎓 מייל אוניברסיטאי</th>
                    <th>✉️ מייל אישי (לתקשורת)</th>
                    <th>נקודות</th>
                    <th>תפקיד</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => {
                    const merged = getMergedUser(user);
                    const universityEmail = getUniversityEmail(merged);
                    const personalEmail = getPersonalEmail(merged, manualEmails);
                    const isExpanded = expandedUserId === user._id;
                    const isBusy = !!busyUserIds[user._id];
                    return (
                      <React.Fragment key={user._id}>
                        <tr
                          className={`clickable-row ${user.is_authorized ? "authorized" : "not-authorized"} ${isExpanded ? 'expanded' : ''}`}
                          onClick={(e) => handleRowClick(user, e)}
                          title={isExpanded ? "לחץ לסגירת הפרטים" : "לחץ להצגת פרטים מלאים"}
                        >
                          <td className="td-expand">
                            <span className={`chevron ${isExpanded ? 'rotated' : ''}`}>▾</span>
                          </td>
                          <td>
                            <div className="user-cell">
                              <Avatar name={user.full_name || user.username} />
                              <div className="user-cell-text">
                                <span className="user-name">{user.full_name || user.username || "אין שם"}</span>
                                <span className="user-joined">הצטרף {formatDate(user.created_at)}</span>
                              </div>
                            </div>
                          </td>
                          <td dir="ltr" className="email-cell">
                            {universityEmail || <span className="missing-value">—</span>}
                          </td>
                          <td dir="ltr" className="email-cell">
                            {personalEmail
                              ? <span className="personal-email-value">{personalEmail}</span>
                              : <span className="missing-value">לא הוזן</span>}
                          </td>
                          <td>
                            <span className="points-display">{user.points || 0}</span>
                          </td>
                          <td>
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                              className="role-select"
                            >
                              <option value="user">משתמש</option>
                              <option value="admin">מנהל</option>
                              <option value="superadmin">מנהל על</option>
                              <option value="business_owner">בעל עסק</option>
                            </select>
                          </td>
                          <td>
                            <span className={`status-badge ${user.is_authorized ? "authorized" : "not-authorized"}`}>
                              {user.is_authorized ? "מאושר" : "ממתין"}
                            </span>
                          </td>
                          <td>
                            <div className="actions-container">
                              {!user.is_authorized && (
                                <>
                                  <button
                                    onClick={() => handleAuthorizeToggle(user._id)}
                                    className="btn btn-approve"
                                    disabled={isBusy}
                                  >
                                    {isBusy ? '...' : '✓ אשר'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(user._id)}
                                    className="btn btn-reject"
                                    disabled={isBusy}
                                  >
                                    ✕ דחה
                                  </button>
                                </>
                              )}
                              {user.is_authorized && (
                                <button
                                  onClick={() => handleAuthorizeToggle(user._id)}
                                  className="btn btn-revoke"
                                  disabled={isBusy}
                                >
                                  {isBusy ? '...' : 'ביטול אישור'}
                                </button>
                              )}
                              <div className="points-actions">
                                <button
                                  onClick={() => openPointsModal(user, 'add')}
                                  className="points-button add"
                                  title="הוסף נקודות"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => openPointsModal(user, 'subtract')}
                                  className="points-button subtract"
                                  title="הורד נקודות"
                                >
                                  −
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="expand-row">
                            <td colSpan={8}>
                              <UserDetailPanel
                                user={getMergedUser(user)}
                                loading={!!detailLoading[user._id]}
                                loadError={!!detailErrors[user._id]}
                                manualEmails={manualEmails}
                                onSaveManualEmail={handleSaveManualEmail}
                                showToast={showToast}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        <div className="empty-illustration">🔎</div>
                        לא נמצאו משתמשים התואמים את החיפוש
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* עימוד */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                >
                  → הקודם
                </button>
                <span className="page-info">עמוד {safePage} מתוך {totalPages}</span>
                <button
                  className="page-button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                >
                  הבא ←
                </button>
              </div>
            )}

            {/* סטטיסטיקות נקודות */}
            <div className="stats">
              <div className="stats-section">
                <h4>📊 סטטיסטיקות כלליות</h4>
                <p><span>סה"כ משתמשים</span><strong>{users.length}</strong></p>
                <p><span>משתמשים מאושרים</span><strong>{approvedCount}</strong></p>
                <p><span>ממתינים לאישור</span><strong>{pendingCount}</strong></p>
                <p><span>עם מייל אישי לתקשורת</span><strong>{withPersonalEmail}</strong></p>
              </div>
              <div className="stats-section">
                <h4>🏆 סטטיסטיקות נקודות</h4>
                <p><span>סה"כ נקודות בארגון</span><strong>{totalPoints.toLocaleString('he-IL')}</strong></p>
                <p><span>ממוצע נקודות למשתמש</span><strong>{users.length > 0 ? (totalPoints / users.length).toFixed(1) : '0.0'}</strong></p>
                <p><span>שיא נקודות</span><strong>{users.length > 0 ? Math.max(...users.map(u => u.points || 0)) : 0}</strong></p>
                <p><span>משתמשים עם נקודות</span><strong>{users.filter(u => (u.points || 0) > 0).length}</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* ===== טאב ביקורות ===== */}
        {activeTab === 'reviews' && (
          <div className="card reviews-section">
            {reviewsLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>טוען ביקורות...</p>
              </div>
            ) : (
              <>
                <div className="reviews-summary">
                  <div className="reviews-avg">
                    <span className="reviews-avg-number">{avgRating}</span>
                    <span className="reviews-avg-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= Math.round(avgRating) ? 'star filled' : 'star empty'}>★</span>
                      ))}
                    </span>
                    <span className="reviews-avg-label">
                      דירוג ממוצע · {Array.isArray(reviews) ? reviews.length : 0} ביקורות
                    </span>
                  </div>
                  <div className="reviews-positive">
                    👍 {Array.isArray(reviews) ? reviews.filter(r => r.rating >= 4).length : 0} ביקורות חיוביות (4-5 כוכבים)
                  </div>
                </div>

                <div className="reviews-grid">
                  {Array.isArray(reviews) && reviews.map((review) => (
                    <div key={review._id} className="review-card">
                      <div className="review-card-top">
                        <Avatar name={review.userId?.full_name || review.userId?.email || '?'} size="sm" />
                        <div className="review-author">
                          <span className="review-name">{review.userId?.full_name || 'משתמש'}</span>
                          <span className="review-email" dir="ltr">{review.userId?.email || ''}</span>
                        </div>
                        <span className="review-date">{formatDate(review.createdAt)}</span>
                      </div>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`star ${star <= review.rating ? 'filled' : 'empty'}`}>★</span>
                        ))}
                      </div>
                      <p className="review-text">{review.review}</p>
                    </div>
                  ))}
                  {Array.isArray(reviews) && reviews.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-illustration">⭐</div>
                      אין עדיין ביקורות לארגון זה
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== מודל ניהול נקודות ===== */}
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
                  <Avatar name={pointsModal.user?.full_name || pointsModal.user?.username} />
                  <div>
                    <p className="user-info-name">{pointsModal.user?.full_name || pointsModal.user?.username}</p>
                    <p className="user-info-points">יתרה נוכחית: {pointsModal.user?.points || 0} נקודות</p>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="points-input">
                    כמות נקודות {pointsModal.action === 'add' ? 'להוספה' : 'להורדה'}
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
                  <span>{pointsModal.user?.points || 0}</span>
                  <span className="preview-op">{pointsModal.action === 'add' ? '+' : '−'}</span>
                  <span>{pointsModal.points}</span>
                  <span className="preview-op">=</span>
                  <strong>
                    {pointsModal.action === 'add'
                      ? (pointsModal.user?.points || 0) + pointsModal.points
                      : Math.max(0, (pointsModal.user?.points || 0) - pointsModal.points)}
                  </strong>
                  <span>נקודות</span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closePointsModal}>
                  ביטול
                </button>
                <button className="btn btn-primary" onClick={handlePointsUpdate}>
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
