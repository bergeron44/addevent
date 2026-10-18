// ===== קונטרולר שליחת מיילי התראה =====
// להעתיק אל: final-project-server/controllers/Notification-controller.js
//
// כל סוג מייל (type) ממופה לטמפלייט ב-Brevo דרך משתנה סביבה. אם משתנה
// הסביבה לא מוגדר - נופלים ל-HTML המובנה בקוד (approval/rejection בלבד).
// כדי להוסיף סוג מייל חדש (למשל זכייה בקופון):
//   1. בונים טמפלייט בממשק Brevo ומקבלים templateId (מספר)
//   2. מוסיפים שורה ל-EMAIL_TYPES למטה
//   3. מגדירים את משתנה הסביבה ב-Render (למשל BREVO_TEMPLATE_COUPON=14)

const { successResponse, errorResponse } = require('../utils/serverResponse');
const {
  sendBrevoEmail,
  approvalEmailHtml,
  rejectionEmailHtml
} = require('../services/Brevo-service');
const Usernew = require('../models/Usernew');
const PushSubscription = require('../models/PushSubscription');
const pushService = require('../services/pushService');
const pushMessages = require('../services/pushMessages');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ===== מיפוי סוגי מיילים =====
// templateEnv - שם משתנה הסביבה שמחזיק את ה-templateId מ-Brevo
// fallbackHtml - תבנית מהקוד אם אין templateId (אופציונלי)
const EMAIL_TYPES = {
  approval: {
    templateEnv: 'BREVO_TEMPLATE_APPROVAL',
    subject: (org) => `חשבונך בארגון ${org} אושר בהצלחה! 🎉`,
    fallbackHtml: approvalEmailHtml
  },
  rejection: {
    templateEnv: 'BREVO_TEMPLATE_REJECTION',
    subject: (org) => `עדכון לגבי בקשת ההצטרפות שלך לארגון ${org}`,
    fallbackHtml: rejectionEmailHtml
  },
  coupon: {
    templateEnv: 'BREVO_TEMPLATE_COUPON'
    // אין fallback מהקוד - חובה להגדיר טמפלייט ב-Brevo לסוג הזה
  }
};

// POST /api/notifications/email
// body: { type, to?, userId?, name, organizationName, params? }
// - userId (מומלץ): הבקנד שולף את המשתמש ובוחר בעצמו את המייל הרגיל (הפרטי),
//   כך שהנמען מובטח בצד השרת ולא תלוי בקליינט.
// - to: כתובת מפורשת. משמשת כשאין userId (למשל מייל לנמען שאינו משתמש במערכת).
// params - משתנים דינמיים נוספים לטמפלייט (למשל { couponCode: 'WELCOME20' })
const sendNotificationEmail = async (req, res) => {
  try {
    const { type, to, userId, name, organizationName, params } = req.body || {};

    const config = EMAIL_TYPES[type];
    if (!config) {
      return res.status(400).json(
        errorResponse(`type לא מוכר. סוגים נתמכים: ${Object.keys(EMAIL_TYPES).join(', ')}`)
      );
    }

    // ===== בחירת נמען: תמיד המייל הרגיל (הפרטי), לא האוניברסיטאי =====
    // כשמגיע userId, הבקנד מושך את המשתמש ובוחר private_email; נופל ל-email
    // (האוניברסיטאי) רק אם אין מייל פרטי. בלי userId משתמשים ב-to כפי שהוא.
    let recipient = to;
    let recipientName = name;
    if (userId) {
      let user;
      try {
        user = await Usernew.findById(userId).select('email private_email full_name');
      } catch {
        return res.status(400).json(errorResponse('userId לא תקין'));
      }
      if (!user) {
        return res.status(404).json(errorResponse('משתמש לא נמצא עבור userId שסופק'));
      }
      recipient = user.private_email || user.email;
      recipientName = name || user.full_name;
    }

    if (!recipient || !EMAIL_REGEX.test(recipient)) {
      return res.status(400).json(errorResponse('כתובת מייל נמען לא תקינה (יש לספק userId או to תקין)'));
    }

    const safeName = String(recipientName || 'משתמש/ת').slice(0, 100);
    const safeOrg = String(organizationName || 'Map4U').slice(0, 100);
    const date = new Date().toLocaleDateString('he-IL');

    const templateId = process.env[config.templateEnv];
    let result;

    if (templateId) {
      // שליחה עם טמפלייט מהדשבורד של Brevo.
      // בטמפלייט המשתנים זמינים בתור: {{params.name}}, {{params.organizationName}},
      // {{params.date}} + כל מה שמגיע ב-params מהקליינט.
      result = await sendBrevoEmail({
        to: recipient,
        toName: safeName,
        templateId,
        params: {
          name: safeName,
          organizationName: safeOrg,
          date,
          ...(typeof params === 'object' && params !== null ? params : {})
        }
      });
    } else if (config.fallbackHtml) {
      // אין templateId מוגדר - שולחים את ה-HTML המובנה מהקוד
      result = await sendBrevoEmail({
        to: recipient,
        toName: safeName,
        subject: config.subject(safeOrg),
        htmlContent: config.fallbackHtml(safeName, safeOrg, date)
      });
    } else {
      return res.status(500).json(
        errorResponse(`לסוג '${type}' אין תבנית: הגדר ${config.templateEnv} במשתני הסביבה`)
      );
    }

    console.log(`📧 [NOTIFICATIONS] מייל ${type} נשלח אל ${recipient} (template: ${templateId || 'built-in'}, messageId: ${result.messageId || 'n/a'})`);
    res.json(successResponse({ messageId: result.messageId || null, to: recipient, type }, 'המייל נשלח בהצלחה'));
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] שגיאה בשליחת מייל:', error.message);
    res.status(502).json(errorResponse(`שליחת המייל נכשלה: ${error.message}`));
  }
};

// ===================================================================
// ===== Web Push — מנויים והעדפות =====
// ===================================================================

const MAX_SUBSCRIPTIONS_PER_USER = 10;

// מבנה של PushSubscription.toJSON() מהדפדפן; שדות נוספים (expirationTime) מתעלמים
const parseSubscription = (body) => {
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== 'string' || endpoint.length > 2048 || !pushService.isAllowedEndpoint(endpoint)) return null;
  if (typeof p256dh !== 'string' || !p256dh || p256dh.length > 256) return null; // 65 bytes → 87 תווים
  if (typeof auth !== 'string' || !auth || auth.length > 128) return null;       // 16 bytes → 22 תווים
  return { endpoint, keys: { p256dh, auth } };
};

const pushSettingsOf = (user) => ({
  enabled: user?.pushEnabled === true,
  categories: {
    activity: user?.pushCategories?.activity !== false,
    favorites: user?.pushCategories?.favorites !== false,
    jointPurchases: user?.pushCategories?.jointPurchases !== false,
    newContent: user?.pushCategories?.newContent !== false,
    marketing: user?.pushCategories?.marketing === true
  }
});

// GET /api/notifications/push/config  (מחובר)
const getPushConfig = async (req, res) => {
  try {
    if (!pushService.isEnabled()) {
      return res.status(503).json(errorResponse('התראות Push לא זמינות כרגע'));
    }
    const user = await Usernew.findById(req.user.userId).select('pushEnabled pushCategories').lean();
    res.json(successResponse({ publicKey: pushService.getPublicKey(), ...pushSettingsOf(user) }));
  } catch (error) {
    console.error('❌ [PUSH] config failed:', error.message);
    res.status(500).json(errorResponse('שגיאה בטעינת הגדרות ההתראות'));
  }
};

async function dropOverflowDevices(userId) {
  const overflow = await PushSubscription.find({ user: userId })
    .sort({ updatedAt: -1 }).skip(MAX_SUBSCRIPTIONS_PER_USER).select('_id').lean();
  if (overflow.length) await PushSubscription.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
}

// POST /api/notifications/push/subscribe  (מחובר)
// body = subscription.toJSON(). גם מסמן pushEnabled=true (זו ההסכמה).
const subscribePush = async (req, res) => {
  try {
    if (!pushService.isEnabled()) {
      return res.status(503).json(errorResponse('התראות Push לא זמינות כרגע'));
    }
    const parsed = parseSubscription(req.body);
    if (!parsed) return res.status(400).json(errorResponse('מנוי Push לא תקין'));
    const userId = req.user.userId;

    // upsert לפי endpoint: אותו דפדפן שנרשם מחשבון אחר עובר אליו
    const previous = await PushSubscription.findOneAndUpdate(
      { endpoint: parsed.endpoint },
      { $set: { user: userId, type: 'web', keys: parsed.keys } },
      { upsert: true }
    );
    const user = await Usernew.findById(userId).select('pushEnabled pushConsentAt').lean();
    const update = { pushEnabled: true };
    if (!user?.pushConsentAt || !user?.pushEnabled) update.pushConsentAt = new Date();
    await Promise.all([
      dropOverflowDevices(userId),
      Usernew.updateOne({ _id: userId }, { $set: update })
    ]);
    res.status(previous ? 200 : 201).json(successResponse({ subscribed: true }));
  } catch (error) {
    console.error('❌ [PUSH] subscribe failed:', error.message);
    res.status(500).json(errorResponse('שגיאה בהרשמה להתראות'));
  }
};

// POST /api/notifications/push/unsubscribe  (מחובר)
// turnOff:true (toggle באזור האישי) → כבוי לחשבון, מוחקים את כל המכשירים.
// בלי turnOff (logout) → רק המכשיר הזה, הבחירה של החשבון נשמרת.
const unsubscribePush = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    const turnOff = req.body?.turnOff === true;
    const userId = req.user.userId;
    if (turnOff) {
      await Promise.all([
        PushSubscription.deleteMany({ user: userId }),
        Usernew.updateOne({ _id: userId }, { $set: { pushEnabled: false } })
      ]);
    } else {
      if (typeof endpoint !== 'string' || !endpoint) {
        return res.status(400).json(errorResponse('endpoint חסר'));
      }
      await PushSubscription.deleteOne({ endpoint, user: userId }); // רק אם שייך למבקש
    }
    res.status(204).end();
  } catch (error) {
    console.error('❌ [PUSH] unsubscribe failed:', error.message);
    res.status(500).json(errorResponse('שגיאה בביטול ההתראות'));
  }
};

// PATCH /api/notifications/push/preferences  (מחובר)
// body: { categories: { activity?, favorites?, jointPurchases?, marketing? } }
const updatePushPreferences = async (req, res) => {
  try {
    const categories = req.body?.categories;
    if (!categories || typeof categories !== 'object') {
      return res.status(400).json(errorResponse('categories חסר'));
    }
    const set = {};
    for (const key of pushService.CATEGORIES) {
      if (key in categories) {
        if (typeof categories[key] !== 'boolean') {
          return res.status(400).json(errorResponse(`ערך לא תקין עבור ${key}`));
        }
        set[`pushCategories.${key}`] = categories[key];
      }
    }
    if (!Object.keys(set).length) return res.status(400).json(errorResponse('אין שינוי'));
    // הסכמה שיווקית נפרדת — נשמר מתי ניתנה (או מאופס כשמבוטלת)
    if ('marketing' in categories) set.marketingConsentAt = categories.marketing ? new Date() : null;

    const user = await Usernew.findByIdAndUpdate(req.user.userId, { $set: set }, { new: true })
      .select('pushEnabled pushCategories').lean();
    if (!user) return res.status(404).json(errorResponse('משתמש לא נמצא'));
    res.json(successResponse(pushSettingsOf(user), 'ההעדפות נשמרו'));
  } catch (error) {
    console.error('❌ [PUSH] preferences failed:', error.message);
    res.status(500).json(errorResponse('שגיאה בשמירת ההעדפות'));
  }
};

// POST /api/notifications/push/test  (אדמין בלבד) — שולח התראת בדיקה לעצמך
const sendTestPush = async (req, res) => {
  try {
    if (!pushService.isEnabled()) {
      return res.status(503).json(errorResponse('התראות Push לא זמינות כרגע'));
    }
    const result = await pushService.sendToDevices(req.user.userId, pushMessages.testMessage());
    res.json(successResponse(result, result.sent ? 'נשלח' : 'אין מכשירים רשומים לחשבון הזה'));
  } catch (error) {
    console.error('❌ [PUSH] test failed:', error.message);
    res.status(500).json(errorResponse('שגיאה בשליחת התראת בדיקה'));
  }
};

module.exports = {
  sendNotificationEmail,
  getPushConfig,
  subscribePush,
  unsubscribePush,
  updatePushPreferences,
  sendTestPush
};
