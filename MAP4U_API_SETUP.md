# 🔐 הוראות התממשקות ל-MAP4U API

## 📋 סטטוס
✅ הקוד מעודכן ומשתמש ב-Authorization Bearer עבור authorize ו-ban  
✅ שאר הקריאות משתמשות ב-x-service-code: 8263867

## 🚀 הגדרת Environment Variables

### לפיתוח מקומי (.env)
צור קובץ `.env` בתיקיית `insert/` עם התוכן הבא:

```env
REACT_APP_MAP4U_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZSIsInNjb3BlcyI6WyJhZG1pbjp1c2VyczphdXRob3JpemUiLCJhZG1pbjp1c2VyczpiYW4iXSwiYXVkIjoiYWRkZXZlbnQub25yZW5kZXIuY29tIiwiaWF0IjoxNzY1NDg2MTM2LCJleHAiOjE3OTcwMjIxMzZ9.Kz_UZQD-uF4fcJVu6T-NvxTsQHl2MnMRYICDVrVSaGM
```

**⚠️ חשוב:** הקובץ `.env` כבר ב-.gitignore ולא יידחף ל-Git!

### ל-Production (Render)
1. לך ל-Dashboard → Your Service
2. Environment → Add Environment Variable
3. הוסף:
   - **Key:** `REACT_APP_MAP4U_TOKEN`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZSIsInNjb3BlcyI6WyJhZG1pbjp1c2VyczphdXRob3JpemUiLCJhZG1pbjp1c2VyczpiYW4iXSwiYXVkIjoiYWRkZXZlbnQub25yZW5kZXIuY29tIiwiaWF0IjoxNzY1NDg2MTM2LCJleHAiOjE3OTcwMjIxMzZ9.Kz_UZQD-uF4fcJVu6T-NvxTsQHl2MnMRYICDVrVSaGM`
4. שמור ועשה deploy מחדש

## 📡 API Endpoints בשימוש

### 1. אישור משתמש (Authorize)
- **Method:** `PATCH`
- **URL:** `/api/usernews/:userId/authorize`
- **Headers:** `Authorization: Bearer {REACT_APP_MAP4U_TOKEN}`
- **Body:** אין

### 2. חסימת משתמש (Ban)
- **Method:** `PATCH`
- **URL:** `/api/usernews/:userId/ban`
- **Headers:** `Authorization: Bearer {REACT_APP_MAP4U_TOKEN}`
- **Body:** אין

### 3. קבלת משתמשים
- **Method:** `GET`
- **URL:** `/api/usernews`
- **Headers:** `x-service-code: 8263867`

### 4. קבלת ביקורות
- **Method:** `GET`
- **URL:** `/api/reviews/organization/:organizationId`
- **Headers:** `x-service-code: 8263867`

### 5. עדכון תפקיד
- **Method:** `PATCH`
- **URL:** `/api/usernews/:userId/role`
- **Headers:** `x-service-code: 8263867`
- **Body:** `{ "role": "user" | "admin" | "superadmin" | "business_owner" }`

### 6. עדכון נקודות
- **Method:** `PATCH`
- **URL:** `/api/usernews/:userId/points`
- **Headers:** `x-service-code: 8263867`
- **Body:** `{ "points": <מספר> }` (חיובי להוספה, שלילי להורדה)

## ✅ בדיקת התחברות

לאחר הגדרת ה-.env, הרץ את האפליקציה ובדוק:
1. נסה לאשר משתמש - צריך לעבוד
2. נסה לחסום משתמש - צריך לעבוד
3. בדוק את הקונסול לשגיאות

## 🔒 אבטחה
- ✅ `.env` ב-.gitignore - לא יידחף ל-Git
- ✅ הטוקן נלקח מ-environment variable
- ✅ Fallback לטוקן ברירת מחדל (רק לפיתוח)

## 📞 תמיכה
במקרה של בעיה:
- בדוק שה-CORS מוגדר נכון
- ודא שהטוקן בהיידר Authorization
- בדוק את הקונסול לשגיאות
- הטוקן תקף ל-365 ימים

