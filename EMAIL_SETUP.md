# 📧 הגדרת EmailJS לשליחת מיילי אישור

## 🚀 מה זה EmailJS?
EmailJS הוא שירות חינמי שמאפשר לשלוח מיילים ישירות מהפרונטנד ללא צורך בשרת מיילים.

## ⚙️ שלבי ההגדרה:

### 1. הרשמה לשירות
- היכנס ל: https://www.emailjs.com/
- צור חשבון חינמי
- אשר את המייל שלך

### 2. יצירת שירות מייל
- לחץ על "Add New Service"
- בחר את ספק המייל שלך (Gmail, Outlook, וכו')
- התחבר לחשבון המייל שלך
- שמור את ה-Service ID

### 3. יצירת תבנית מייל
- לחץ על "Email Templates"
- צור תבנית חדשה
- השתמש בתבנית הבאה:

**נושא:** חשבונך אושר בהצלחה!

**תוכן:**
```
שלום {{to_name}},

חשבונך בארגון {{organization_name}} אושר בהצלחה!

תאריך האישור: {{approval_date}}

כעת תוכל להתחבר למערכת ולהשתמש בכל התכונות הזמינות לך.

אם יש לך שאלות או בעיות, אנא פנה אלינו במייל: {{support_email}}

בברכה,
צוות Admin-Map4U
```

- שמור את ה-Template ID

### 4. קבלת מפתח API
- לחץ על "Account" -> "API Keys"
- העתק את ה-Public Key

### 5. עדכון הקוד באמצעות משתני סביבה (מומלץ)

**יצירת קובץ .env:**
צור קובץ `.env` בתיקיית הפרויקט (באותה רמה כמו `package.json`) והוסף את המפתחות הבאים:

```env
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_USER_ID=your_user_id_here
REACT_APP_EMAILJS_APPROVAL_TEMPLATE_ID=your_approval_template_id_here
REACT_APP_EMAILJS_REJECTION_TEMPLATE_ID=your_rejection_template_id_here
```

**החלף את:**
- `your_service_id_here` - עם ה-Service ID שקיבלת (לדוגמה: `service_xxxxx`)
- `your_user_id_here` - עם ה-Public Key שקיבלת (לדוגמה: `xxxxxxxxxxxxx`)
- `your_approval_template_id_here` - עם ה-Template ID למייל אישור (לדוגמה: `template_xxxxx`)
- `your_rejection_template_id_here` - עם ה-Template ID למייל דחייה (לדוגמה: `template_xxxxx`)

**⚠️ חשוב:**
- הקובץ `.env` כבר קיים בפרויקט - עדכן אותו עם הערכים הנכונים
- לאחר עדכון הקובץ, הפעל מחדש את השרת (`npm start`)
- הקובץ `.env` לא נשמר ב-Git (מופיע ב-.gitignore) כדי לשמור על אבטחה

### 6. בדיקה
- הרץ את הפרויקט
- התחבר כאדמין
- אשר משתמש
- בדוק שהמייל נשלח

## 🔧 הגדרות נוספות:

### שינוי מייל התמיכה
בקובץ `src/App.js`, מצא את השורה:
```javascript
support_email: 'support@map4u.com'
```
והחלף אותה במייל התמיכה שלך.

### התאמת תבנית המייל
אפשר לשנות את תוכן המייל בפונקציה `sendApprovalEmail`.

## ⚠️ הערות חשובות:
- החשבון החינמי מאפשר 200 מיילים בחודש
- המיילים נשלחים מהחשבון שלך
- מומלץ לבדוק את המיילים לפני שליחה לפרודקשן

## 🆘 פתרון בעיות:

### שגיאה: "The service ID not found"
**הבעיה:** ה-Service ID לא נמצא בחשבון EmailJS שלך.

**פתרון:**
1. היכנס ל-EmailJS Dashboard: https://dashboard.emailjs.com/admin
2. בדוק את ה-Service ID שלך תחת "Email Services"
3. אם אין לך Service, צור אחד חדש:
   - לחץ על "Add New Service"
   - בחר את ספק המייל שלך (Gmail, Outlook, וכו')
   - התחבר לחשבון המייל שלך
   - העתק את ה-Service ID החדש
4. עדכן את הקובץ `.env` עם ה-Service ID הנכון:
   ```env
   REACT_APP_EMAILJS_SERVICE_ID=service_xxxxx
   ```
5. הפעל מחדש את השרת (`npm start`)

### שגיאות אחרות:
אם המיילים לא נשלחים:
1. ✅ בדוק שה-Service ID נכון ב-`.env`
2. ✅ בדוק שה-Template ID נכון ב-`.env`
3. ✅ בדוק שה-Public Key (User ID) נכון ב-`.env`
4. ✅ בדוק את ה-console לשגיאות
5. ✅ ודא שהמייל שלך מאושר ב-EmailJS
6. ✅ ודא שהשרת הופעל מחדש לאחר עדכון `.env`
7. ✅ בדוק שהתבניות ב-EmailJS מכילות את המשתנים הנכונים:
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{organization_name}}`
   - `{{approval_date}}` או `{{rejection_date}}`
