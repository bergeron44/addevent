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

### 5. עדכון הקוד
בקובץ `src/App.js`, מצא את השורה הזו:
```javascript
// await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_USER_ID');
```

והחלף אותה ב:
```javascript
await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_USER_ID');
```

החלף את:
- `YOUR_SERVICE_ID` - עם ה-Service ID שקיבלת
- `YOUR_TEMPLATE_ID` - עם ה-Template ID שקיבלת  
- `YOUR_USER_ID` - עם ה-Public Key שקיבלת

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
אם המיילים לא נשלחים:
1. בדוק שה-Service ID נכון
2. בדוק שה-Template ID נכון
3. בדוק שה-Public Key נכון
4. בדוק את ה-console לשגיאות
5. ודא שהמייל שלך מאושר ב-EmailJS
