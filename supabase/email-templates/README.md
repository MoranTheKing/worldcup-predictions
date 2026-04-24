# תבניות מייל ל-Supabase Auth

## Confirm signup

בפרויקט Supabase הפעיל:

1. היכנס אל `Authentication -> Email Templates`.
2. פתח את `Confirm signup`.
3. בשדה `Subject` הדבק:

```text
קוד האימות שלך למונדיאל 2026
```

4. בשדה `Body` הדבק את כל התוכן של:

```text
supabase/email-templates/confirm-signup-he.html
```

5. שמור, ואז בדוק הרשמה חדשה עם מייל שלא קיים במערכת.

## למה משתמשים בקוד ולא בקישור

התבנית משתמשת ב-`{{ .Token }}` במקום `{{ .ConfirmationURL }}`.
זה גורם למייל להציג קוד חד-פעמי בן 6 ספרות, והאפליקציה מאמתת אותו במסך ההרשמה באמצעות `supabase.auth.verifyOtp`.

היתרון:

- פחות תחושה של קישור חשוד במייל.
- אין בעיה של מערכות מייל שסורקות ולפעמים "שורפות" קישורי אימות.
- המשתמש נשאר בתוך חוויית ההרשמה של האפליקציה.

## מומלץ לפרודקשן

כדי שהמיילים ייראו אמינים יותר:

- להגדיר `Custom SMTP` ב-Supabase.
- לשלוח מכתובת כמו `no-reply@your-domain`.
- להגדיר `Site URL` לדומיין האמיתי של האפליקציה כשיהיה כזה.

## Google OAuth branding

את מסך ההרשאה של Google לא משנים מתוך הקוד של האפליקציה.
צריך להגדיר אותו ב-Google Cloud:

1. `Google Cloud Console -> Google Auth Platform -> Branding`.
2. להגדיר שם אפליקציה ברור בעברית או באנגלית, למשל `World Cup Predictions`.
3. להוסיף לוגו.
4. להגדיר support email.
5. להוסיף authorized domain של הדומיין האמיתי של האתר.
6. אם רוצים להימנע ממראה של `supabase.co` במסך האישור, צריך להגדיר Custom Domain/Vanity Subdomain ב-Supabase Auth ולהשתמש בו כ-callback.
