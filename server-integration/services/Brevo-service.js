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

const sendBrevoEmail = ({ to, toName, subject, htmlContent, templateId, params }) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;

    if (!apiKey) {
      return reject(new Error('BREVO_API_KEY חסר במשתני הסביבה'));
    }

    let body;
    if (templateId) {
      // שליחה עם טמפלייט מהדשבורד של Brevo - השולח נלקח מהגדרות הטמפלייט
      body = {
        to: [{ email: to, name: toName || to }],
        templateId: Number(templateId),
        params: params || {}
      };
    } else {
      // שליחה עם HTML מהקוד
      if (!senderEmail) {
        return reject(new Error('BREVO_SENDER_EMAIL חסר במשתני הסביבה'));
      }
      body = {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Map4U',
          email: senderEmail
        },
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
