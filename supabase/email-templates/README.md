# תבניות מייל ל-Supabase Auth

## Confirm signup

בפרויקט Supabase הפעיל:

1. להיכנס אל `Authentication -> Email Templates`.
2. לפתוח את `Confirm signup`.
3. בשדה `Subject` להדביק:

```text
קוד האימות שלך למונדיאל 2026
```

4. בשדה `Body` להדביק את כל התוכן של:

```text
supabase/email-templates/confirm-signup-he.html
```

5. לשמור ולבדוק הרשמה חדשה עם מייל שלא קיים במערכת.

## איך התבנית עובדת

התבנית משתמשת ב-`{{ .Token }}` במקום `{{ .ConfirmationURL }}`.
כך המשתמש מקבל קוד אימות חד-פעמי ומזין אותו במסך ההרשמה, במקום ללחוץ על קישור שנראה פחות אמין.

כדי שהקוד יהיה בן 6 ספרות, צריך לוודא ב-Supabase:

```text
Authentication -> Providers -> Email -> Email OTP Length = 6
```

## כתובות המייל של הדומיין

הכתובות שנוצרו ב-Cloudflare Email Routing:

- `support@cup26picks.com` - כתובת התמיכה הציבורית. אפשר לפרסם באתר, בתחתית מיילים ובעתיד בעמוד יצירת קשר.
- `no-reply@cup26picks.com` - כתובת שליחת מיילי Auth. זו הכתובת שצריכה להופיע ב-Supabase כ-`Sender email`.
- `admin@cup26picks.com` - כתובת ניהול פנימית להתראות, חשבונות שירות וגישה למערכות כמו Supabase, Brevo או Cloudflare.

חשוב: Cloudflare Email Routing מטפל בקבלת מיילים בלבד. שליחת מיילי Auth נעשית דרך Brevo SMTP.

## Supabase SMTP

ב-Supabase:

```text
Authentication -> Settings -> SMTP Settings
```

ערכים מומלצים:

```text
Sender email: no-reply@cup26picks.com
Sender name: ניחושי מונדיאל 2026
Host: smtp-relay.brevo.com
Port: 587
Username: ה-SMTP login מ-Brevo
Password: ה-SMTP key מ-Brevo
```

לא לשמור סיסמאות או SMTP keys בקבצים של הפרויקט.

## מגבלות שליחה

Brevo Free מוגבל לכמות יומית לחשבון, ולכן כדאי להשאיר ב-Supabase מגבלות הגיוניות:

```text
Emails sent: 100 per hour
OTP sent: 30-60 per hour
OTP resend interval: 60 seconds
Signup confirmation request: 60 seconds
```

אם יש יום השקה עם הרבה משתמשים, צריך להעלות תוכנית ב-Brevo או להכין מראש תור/רשימת המתנה.

## תמונת שולח ב-Gmail

הלוגו בתוך המייל נשלט על ידי קובץ ה-HTML.
התמונה הקטנה ליד שם השולח בתיבת הדואר אינה מוגדרת ב-Supabase או ב-Brevo בכפתור פשוט.
בשביל זה צריך BIMI: אימות SPF/DKIM/DMARC, מדיניות DMARC מחמירה, לוגו SVG מתאים, ולעיתים גם תעודה בתשלום.

כרגע ההמלצה היא להשקיע בלוגו ובתוכן המייל עצמו, ולא להיכנס ל-BIMI עד שיש דומיין ואתר יציבים בפרודקשן.
