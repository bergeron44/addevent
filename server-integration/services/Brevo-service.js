// ===== שירות שליחת מיילים דרך Brevo =====
// להעתיק אל: final-project-server/services/Brevo-service.js
//
// משתמש במודול https המובנה של Node - אפס תלויות חדשות (עובד גם על Node 16).
// דורש משתני סביבה (ב-Render: Environment → Add Environment Variable):
//   BREVO_API_KEY      - מפתח ה-API מ-Brevo (Settings → SMTP & API → API Keys)
//   BREVO_SENDER_EMAIL - כתובת השולח שאומתה ב-Brevo (Senders → Add Sender)
//   BREVO_SENDER_NAME  - שם השולח שיוצג לנמען (אופציונלי)
//
// שני מצבי שליחה:
// 1. templateId - טמפלייט שנבנה בממשק של Brevo (מומלץ). המשתנים הדינמיים
//    מגיעים ב-params וזמינים בטמפלייט בתור {{params.name}} וכו'.
// 2. subject + htmlContent - HTML מהקוד (ה-fallback המובנה למטה).

const https = require('https');
// קישור Mobitti שפותח את המפה באפליקציה - אותו יעד של קישורי השיתוף
const { MOBITTI_APP_URL } = require('../config/share');

const sendBrevoEmail = ({ to, toName, subject, htmlContent, templateId, params }) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    // כתובת השולח מובטחת בצד השרת: ברירת המחדל הקשיחה היא map4uil@gmail.com,
    // וניתן לדרוס דרך BREVO_SENDER_EMAIL אם ירצו לשנות בעתיד בלי לגעת בקוד.
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'map4uil@gmail.com';

    if (!apiKey) {
      return reject(new Error('BREVO_API_KEY חסר במשתני הסביבה'));
    }

    // השולח מוגדר תמיד מהקוד (BREVO_SENDER_EMAIL / ברירת מחדל) - גם בשליחה עם טמפלייט.
    // לפי Brevo, sender בבקשת ה-API דורס את השולח שמוגדר בטמפלייט, כך שכל
    // המיילים יוצאים מכתובת אחת ויחידה בלי תלות בהגדרות הטמפלייטים.
    const sender = {
      name: process.env.BREVO_SENDER_NAME || 'Map4U',
      email: senderEmail
    };

    let body;
    if (templateId) {
      // שליחה עם טמפלייט מהדשבורד של Brevo
      body = {
        sender,
        to: [{ email: to, name: toName || to }],
        templateId: Number(templateId),
        params: params || {}
      };
    } else {
      // שליחה עם HTML מהקוד
      body = {
        sender,
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent
      };
    }

    const payload = JSON.stringify(body);

    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch {
            resolve({});
          }
        } else {
          reject(new Error(`Brevo החזיר ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

// ===== תבניות fallback מהקוד (עברית, RTL) =====
// משמשות רק כשלא הוגדר templateId מתאים במשתני הסביבה.

// ===== מדיה של תחרות השיתופים (במייל האישור) =====
// ה-GIF מגיע מספריית התמונות של Brevo דרך EMAIL_SHARE_GIF_URL (נטען מהר גם כשהשרת
// ב-Render "ישן", ולא נחסם ב-Cross-Origin-Resource-Policy של השרת). ברירת המחדל -
// public/email/share.gif בשרת - היא רק גיבוי.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://bangyourhead-server.onrender.com';
const SHARE_GIF_URL = process.env.EMAIL_SHARE_GIF_URL || `${PUBLIC_BASE_URL}/email/share.gif`;

const shareContestHtml = () => `
      <div style="margin:26px 0 4px;padding:22px 18px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;direction:rtl;">
        <div style="font-size:13px;font-weight:bold;color:#c2410c;">🏆 תחרות השיתופים</div>
        <h2 style="margin:6px 0 6px;font-size:19px;line-height:1.4;color:#1e293b;">המנצחים בתחרות השיתופים זוכים בכרטיס כניסה זוגי חינם לתחילת שנה!</h2>
        <p style="margin:0 0 14px;font-size:14px;color:#475569;">ככה מזמינים חבר ל-Map4U:</p>
        <img src="${SHARE_GIF_URL}" width="240" alt="ככה מזמינים חבר ל-Map4U: בוחרים מקום במפה, לוחצים על שיתוף ושולחים לחבר בוואטסאפ"
             style="display:block;margin:0 auto;width:240px;max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:12px;">
        <p style="margin:16px 0 0;font-size:14px;color:#334155;">כל פעם שחבר פותח את הקישור ששיתפתם, <strong>זה נספר לזכותכם</strong>.<br>המשתפים המובילים זוכים בכרטיס כניסה זוגי!</p>
      </div>`;

const approvalEmailHtml = (name, organizationName, date) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:#f2f4fb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(120deg,#312e81,#4f46e5,#7c3aed);padding:28px;text-align:center;">
      <div style="font-size:40px;">🎉</div>
      <h1 style="color:#ffffff;font-size:22px;margin:10px 0 0;">חשבונך אושר בהצלחה!</h1>
    </div>
    <div style="padding:28px;color:#334155;font-size:15px;line-height:1.7;text-align:right;direction:rtl;">
      <p>שלום <strong>${name}</strong>,</p>
      <p>שמחים לעדכן שחשבונך בארגון <strong>${organizationName}</strong> אושר בהצלחה!</p>
      <p>תאריך האישור: <strong>${date}</strong></p>
      <p>כעת תוכל/י להתחבר למערכת ולהשתמש בכל התכונות הזמינות לך.</p>
${shareContestHtml()}
      <div style="text-align:center;margin:22px 0 0;">
        <a href="${MOBITTI_APP_URL}" target="_blank"
           style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 32px;border-radius:999px;">🗺️ כניסה למפה</a>
      </div>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">אם יש שאלות או בעיות - פשוט השיבו למייל הזה.</p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;">
      בברכה, צוות Map4U
    </div>
  </div>
</body>
</html>`;

const rejectionEmailHtml = (name, organizationName, date) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:#f2f4fb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#334155;padding:28px;text-align:center;">
      <h1 style="color:#ffffff;font-size:20px;margin:0;">עדכון לגבי בקשת ההצטרפות שלך</h1>
    </div>
    <div style="padding:28px;color:#334155;font-size:15px;line-height:1.7;text-align:right;direction:rtl;">
      <p>שלום <strong>${name}</strong>,</p>
      <p>לצערנו בקשת ההצטרפות שלך לארגון <strong>${organizationName}</strong> לא אושרה בשלב זה.</p>
      <p>תאריך העדכון: <strong>${date}</strong></p>
      <p>אם לדעתך מדובר בטעות, או שברצונך לברר את הסיבה - ניתן להשיב למייל זה ונשמח לעזור.</p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;">
      בברכה, צוות Map4U
    </div>
  </div>
</body>
</html>`;

module.exports = {
  sendBrevoEmail,
  approvalEmailHtml,
  rejectionEmailHtml
};
