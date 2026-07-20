// ===== נתיב שליחת מיילי התראה =====
// להעתיק אל: final-project-server/routes/Notification-routes.js
//
// ואז להוסיף שורה ב-routes/index.js:
//   require('./Notification-routes')(app);

const { sendNotificationEmail } = require('../controllers/Notification-controller');
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrService } = require('../middleware/serviceAuth');

module.exports = function (app) {
  // מוגן: רק מנהל או טוקן שירות עם הרשאת אישור משתמשים יכולים לשלוח מיילים.
  // זה בדיוק אותו scope שיש לטוקן של דשבורד המנהלים (admin:users:authorize),
  // כך שהדשבורד עובד מיד בלי טוקן חדש - וספאמרים חיצוניים חסומים.
  app.post(
    '/api/notifications/email',
    requireAdminOrService(authenticateToken, ['admin:users:authorize']),
    sendNotificationEmail
  );
};
