# 📧 מעבר ל-Brevo לשליחת מיילים (300 מיילים ביום בחינם)

## למה עברנו?
EmailJS מגביל ל-200 מיילים **בחודש**. Brevo נותן 300 מיילים **ביום** בחינם, לתמיד,
בלי צורך בדומיין משלנו. השליחה עוברת דרך השרת (מאובטח - ה-API key לא חשוף בדפדפן).

## איך זה עובד עכשיו בדשבורד?
הקליינט מנסה קודם לשלוח דרך השרת (`POST /api/notifications/email` → Brevo).
אם ה-endpoint עדיין לא קיים בשרת - יש **fallback אוטומטי ל-EmailJS**, אז שום דבר
לא נשבר בינתיים. ברגע שתסיים את השלבים למטה, המיילים יעברו ל-Brevo אוטומטית.

---

## שלב 1: פתיחת חשבון Brevo (אתה עושה - 5 דקות)
1. הירשם ב-https://www.brevo.com (חשבון Free).
2. אמת כתובת שולח: **Senders, Domains & Dedicated IPs → Senders → Add Sender**
   - הזן את המייל שממנו יישלחו ההודעות (למשל המייל של האגודה).
   - Brevo שולח לינק אימות לכתובת - לחץ עליו.
3. צור מפתח API: **Settings → SMTP & API → API Keys → Generate a new API key**
   - שמור את המפתח - הוא מוצג פעם אחת בלבד!

## שלב 2: העתקת 3 קבצים לשרת (final-project-server)
הקבצים מוכנים בתיקייה `server-integration/` כאן בפרויקט:

| מקור (כאן) | יעד (בשרת) |
|---|---|
| `server-integration/services/Brevo-service.js` | `services/Brevo-service.js` |
| `server-integration/controllers/Notification-controller.js` | `controllers/Notification-controller.js` |
| `server-integration/routes/Notification-routes.js` | `routes/Notification-routes.js` |

פקודת העתקה מהטרמינל (מתוך תיקיית insert):

```bash
cp server-integration/services/Brevo-service.js       ~/Projects/final-project-server/services/
cp server-integration/controllers/Notification-controller.js ~/Projects/final-project-server/controllers/
cp server-integration/routes/Notification-routes.js   ~/Projects/final-project-server/routes/
```

## שלב 3: רישום הנתיב ב-routes/index.js של השרת
הוסף שורה אחת בסוף הרשימה ב-`final-project-server/routes/index.js`:

```javascript
require('./Notification-routes')(app);
```

## שלב 4: משתני סביבה ב-Render
ב-Render Dashboard של השרת → **Environment** → הוסף:

```
BREVO_API_KEY=xkeysib-...            ← המפתח משלב 1
BREVO_SENDER_EMAIL=your@email.com    ← הכתובת שאימתת בשלב 1
BREVO_SENDER_NAME=Map4U              ← השם שיוצג לנמענים
```

(לבדיקה מקומית: להוסיף אותם גם ל-.env של השרת)

## שלב 5: דיפלוי ובדיקה
1. עשה commit + push לשרת → Render יעשה דיפלוי אוטומטי.
2. בדשבורד: אשר משתמש בדיקה → אמור להופיע toast "מייל אישור נשלח בהצלחה (דרך השרת)".
3. אם השרת עדיין לא מעודכן תראה בקונסול "fallback ל-EmailJS" - זה תקין בינתיים.

---

## 🎨 טמפלייטים: איך בונים תבנית לכל ייעוד (אישור, דחייה, קופון...)

יש שתי דרכים, ושתיהן נתמכות בקוד:

### דרך א' (עובדת מיד, בלי להגדיר כלום)
תבניות ה-HTML של אישור ודחייה כבר כתובות בקוד השרת (`services/Brevo-service.js`).
אם לא תגדיר טמפלייטים ב-Brevo - המיילים יישלחו עם התבניות האלה. אפשר לערוך את
ה-HTML ישירות בקובץ.

### דרך ב' (מומלץ לטווח ארוך): טמפלייט בממשק של Brevo לכל סוג מייל
1. ב-Brevo: **Campaigns → Templates → New Template** - בונים בעורך הוויזואלי.
2. בתוך הטמפלייט משתמשים במשתנים דינמיים:
   - `{{params.name}}` - שם המשתמש
   - `{{params.organizationName}}` - שם הארגון
   - `{{params.date}}` - תאריך
   - וכל משתנה נוסף שתשלח (למשל `{{params.couponCode}}`)
3. שומרים ומעתיקים את **מספר הטמפלייט** (templateId - מופיע ברשימת הטמפלייטים).
4. מגדירים משתנה סביבה ב-Render לפי סוג המייל:

```
BREVO_TEMPLATE_APPROVAL=1     ← טמפלייט "אישור הרשמה"
BREVO_TEMPLATE_REJECTION=2    ← טמפלייט "דחיית הרשמה"
BREVO_TEMPLATE_COUPON=3       ← טמפלייט "זכייה בקופון" (לעתיד)
```

ברגע שמשתנה סביבה מוגדר - השרת עובר אוטומטית לטמפלייט של Brevo לאותו סוג מייל.

### הוספת סוג מייל חדש (למשל "זכייה בקופון")
1. בונים טמפלייט ב-Brevo ומקבלים templateId.
2. ב-`controllers/Notification-controller.js` בשרת מוסיפים שורה ל-`EMAIL_TYPES`
   (הסוג `coupon` כבר מוכן שם כדוגמה).
3. מגדירים את משתנה הסביבה, והקליינט שולח:
   `{ type: 'coupon', to, name, params: { couponCode: 'WELCOME20' } }`

---

## 🔑 אבטחת ה-API Key - חשוב מאוד!
- ה-API key נכנס **רק** למשתני הסביבה ב-Render (ול-.env המקומי של השרת אם צריך).
- **לעולם לא** לשים אותו בקוד, בקבצים של insert, או בכל דבר שעולה ל-GitHub -
  הריפו ציבורי וכל מי שמוצא את המפתח יכול לשלוח מיילים בשמך עד שתחסום אותו.
- אם המפתח הודבק בצ'אט / הועבר במקום לא מאובטח - מומלץ לג'נרט חדש
  (Settings → SMTP & API → API Keys → מחיקת הישן ויצירת חדש).

---

## פרטים טכניים
- ה-endpoint מוגן ב-`requireAdminOrService` עם scope בדיוק כמו אישור משתמשים
  (`admin:users:authorize`) - אותו טוקן שהדשבורד כבר שולח. אף אחד מבחוץ לא יכול לספאם.
- תבניות המייל (אישור + דחייה, עברית RTL) נמצאות בקוד השרת ב-`Brevo-service.js` -
  אין צורך לבנות תבניות בממשק של Brevo.
- אין תלויות חדשות בשרת - הקוד משתמש ב-https המובנה של Node (תואם Node 16).
- מגבלות Brevo Free: 300 מיילים/יום, המכסה מתאפסת כל יום.
