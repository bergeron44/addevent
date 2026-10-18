// ===== נתיב שליחת מיילי התראה =====
// להעתיק אל: final-project-server/routes/Notification-routes.js
//
// ואז להוסיף שורה ב-routes/index.js:
//   require('./Notification-routes')(app);

const {
  sendNotificationEmail,
  getPushConfig,
  subscribePush,
  unsubscribePush,
  updatePushPreferences,
  sendTestPush
} = require('../controllers/Notification-controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { requireAdminOrService } = require('../middleware/serviceAuth');
const { errorResponse } = require('../utils/serverResponse');

// מנוי Push שייך למשתמש אמיתי — טוקן שירות (בלי userId) לא רלוונטי כאן
const requireUserToken = (req, res, next) => (
  req.user?.userId ? next() : res.status(403).json(errorResponse('נדרש משתמש מחובר'))
);
const userOnly = [authenticateToken, requireUserToken];

module.exports = function (app) {
  // מוגן: רק מנהל או טוקן שירות עם הרשאת אישור משתמשים יכולים לשלוח מיילים.
  // זה בדיוק אותו scope שיש לטוקן של דשבורד המנהלים (admin:users:authorize),
  // כך שהדשבורד עובד מיד בלי טוקן חדש - וספאמרים חיצוניים חסומים.
  app.post(
    '/api/notifications/email',
    requireAdminOrService(authenticateToken, ['admin:users:authorize']),
    sendNotificationEmail
  );

  // ===== Web Push (docs/features/push-notifications.md) =====
  app.get('/api/notifications/push/config', ...userOnly, getPushConfig);
  app.post('/api/notifications/push/subscribe', ...userOnly, subscribePush);
  app.post('/api/notifications/push/unsubscribe', ...userOnly, unsubscribePush);
  app.patch('/api/notifications/push/preferences', ...userOnly, updatePushPreferences);
  app.post('/api/notifications/push/test', ...userOnly, requireAdmin, sendTestPush);
};
