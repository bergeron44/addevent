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
// body: { type, to, name, organizationName, params? }
// params - משתנים דינמיים נוספים לטמפלייט (למשל { couponCode: 'WELCOME20' })
const sendNotificationEmail = async (req, res) => {
  try {
    const { type, to, name, organizationName, params } = req.body || {};

    const config = EMAIL_TYPES[type];
    if (!config) {
      return res.status(400).json(
        errorResponse(`type לא מוכר. סוגים נתמכים: ${Object.keys(EMAIL_TYPES).join(', ')}`)
      );
    }
    if (!to || !EMAIL_REGEX.test(to)) {
      return res.status(400).json(errorResponse('כתובת מייל (to) לא תקינה'));
    }

    const safeName = String(name || 'משתמש/ת').slice(0, 100);
    const safeOrg = String(organizationName || 'Map4U').slice(0, 100);
    const date = new Date().toLocaleDateString('he-IL');

    const templateId = process.env[config.templateEnv];
    let result;

    if (templateId) {
      // שליחה עם טמפלייט מהדשבורד של Brevo.
      // בטמפלייט המשתנים זמינים בתור: {{params.name}}, {{params.organizationName}},
      // {{params.date}} + כל מה שמגיע ב-params מהקליינט.
      result = await sendBrevoEmail({
        to,
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
        to,
        toName: safeName,
        subject: config.subject(safeOrg),
        htmlContent: config.fallbackHtml(safeName, safeOrg, date)
      });
    } else {
      return res.status(500).json(
        errorResponse(`לסוג '${type}' אין תבנית: הגדר ${config.templateEnv} במשתני הסביבה`)
      );
    }

    console.log(`📧 [NOTIFICATIONS] מייל ${type} נשלח אל ${to} (template: ${templateId || 'built-in'}, messageId: ${result.messageId || 'n/a'})`);
    res.json(successResponse({ messageId: result.messageId || null, to, type }, 'המייל נשלח בהצלחה'));
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] שגיאה בשליחת מייל:', error.message);
    res.status(502).json(errorResponse(`שליחת המייל נכשלה: ${error.message}`));
  }
};

module.exports = { sendNotificationEmail };
