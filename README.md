# מערכת ניחושי מונדיאל 2026

אפליקציית `Next.js` בעברית וב-RTL לניחושי מונדיאל 2026: הרשמה, פרופיל שחקן, ניחושי משחקים, ניחושי טורניר, ליגות פרטיות, השוואה מול חברים וטבלת ניקוד.

## מצב נוכחי

נכון ל-2026-04-24, האפליקציה כוללת:

- דף בית ציבורי בעברית עבור `moran65.com` עם דף נחיתה זמני, שמוצג רק כשהבקשה מגיעה מהדומיין הציבורי.
- הרשמה עם מייל וסיסמה דרך קוד OTP בן 6 ספרות, כולל מד סיסמה חזק, אימות סיסמה כפול, וחסימה של סיסמאות פשוטות כמו `123456`.
- הרשמה עם אפשרות להפעיל Authenticator/TOTP אחרי אימות המייל; רק חשבונות שהשלימו חיבור Authenticator יקבלו מסך קוד נוסף בכניסות הבאות.
- הרשמה קיימת/מאומתת כבר לא מציגה מסך "קוד נשלח" כשהמערכת לא באמת אמורה לשלוח OTP חדש; המשתמש מקבל הכוונה להתחברות או לכתובת אחרת.
- התחברות Google שממשיכה ל-onboarding לפני כניסה למשחק.
- onboarding עם כינוי ייחודי, תמונת פרופיל אופציונלית, זוכת טורניר ומלך שערים כשבחירות הטורניר עדיין פתוחות.
- אם הטורניר כבר התחיל, משתמש חדש עדיין עובר דרך שלב פרופיל, אבל בלי בחירת זוכה ומלך שערים.
- עריכת פרופיל אחרי כניסה: שינוי כינוי ותמונה, כולל העלאת תמונה אישית, זום ומיקום.
- ליגות פרטיות, קודי הצטרפות, השוואת ניחושים וטבלת ניקוד.
- דפי `/dashboard/tournament` ו-`/dashboard/matches` נטענו מחדש בדפדפן אחרי תיקוני 2026-04-24: טבלת הטורניר הציבורית מציגה את כל 48 הנבחרות וה-Match Center מציג את כל 104 המשחקים.
- דף הטורניר הציבורי קורא רק מ-views ציבוריים מצומצמים לנתוני `teams` ו-`matches`, ולא משתמש יותר ב-service-role key.
- בראש דף הטורניר מופיע אזור הכרעה: אחרי משחק המקום השלישי מוצג מקום 3 לצד "2 נבחרות שנותרו", ואחרי הגמר מוצג פודיום מלא למקומות 1-2-3.
- במשחקים חיים, דקה 45 מוצגת כ-"מחצית" במקום `45' LIVE`, כהכנה לסנכרון עתידי מול API חיצוני.
- תבנית מייל עברית ל-Supabase Auth עם לוגו ממורכז וקוד אימות.

## פיתוח מקומי

התקנת תלויות:

```powershell
npm.cmd install
```

הרצה מקומית:

```powershell
npm.cmd run dev
```

כתובת ברירת מחדל:

```text
http://localhost:3000
```

בדיקות לפני push:

```powershell
npm.cmd run lint
npm.cmd run build
```

אם מריצים `npm.cmd run build` בזמן ששרת הפיתוח פתוח, מומלץ להפעיל מחדש את `npm.cmd run dev` אחרי הבילד כדי שה-localhost לא יישאר עם מצב `.next` מעורב.

## קבצים מרכזיים

- `app/page.tsx` - דף הבית. ב-`moran65.com` מוצג דף נחיתה זמני; ב-localhost ובשאר ה-hosts מוצג דף הבית הרגיל של האפליקציה.
- `app/icon.svg` - אייקון האתר שמופיע בטאב הדפדפן.
- `cloudflare/coming-soon-worker.js` - Worker זמני להצגת דף “בקרוב” ישירות דרך Cloudflare עד שהאתר האמיתי עולה.
- `app/login/page.tsx` - התחברות.
- `app/signup/page.tsx` - הרשמה עם קוד OTP.
- `app/onboarding/page.tsx` ו-`app/onboarding/OnboardingForm.tsx` - מסך הפרופיל הראשוני.
- `app/dashboard/tournament/page.tsx` - דף טורניר ציבורי שקורא מה-views `public_tournament_teams` ו-`public_tournament_matches`, כדי להציג נתוני טורניר ציבוריים בלי service-role.
- `app/dashboard/tournament/TournamentClient.tsx` - UI הטורניר, כולל טבלאות, בראקט ופודיום הסיום.
- `app/dashboard/matches/MatchesClient.tsx` - מרכז המשחקים, כולל התאמות Next 16 למידות דגלים כדי למנוע אזהרות aspect-ratio.
- `components/profile/ProfileEditorModal.tsx` - עריכת פרופיל אחרי כניסה.
- `components/profile/ProfileAvatarField.tsx` - בחירה, העלאה, תצוגה מקדימה וחיתוך תמונת פרופיל.
- `app/api/profile/avatar/[userId]/route.ts` - הגשת תמונות פרופיל פרטיות.
- `app/game/*` - אזור המשחק והליגות.
- `supabase/email-templates/confirm-signup-he.html` - תבנית מייל האימות בעברית.
- `SECURITY_AUDIT_2026-04-23.md` - פירוט האבטחה וה-PRs שטופלו.
- `BSD_SYNC_ARCHITECTURE_2026-04-24.md` - מסמך תכנון בעברית לסנכרון עתידי מול BSD API, כולל Cloudflare Worker, Supabase, Realtime, odds וניקוד.

## דומיין ומיילים

הדומיין שנבחר:

```text
moran65.com
```

הכתובות שצריך ליצור ב-Cloudflare Email Routing:

- `support@moran65.com` - כתובת התמיכה הציבורית.
- `no-reply@moran65.com` - כתובת שליחת מיילי Auth דרך Supabase.
- `admin@moran65.com` - כתובת ניהול פנימית לחשבונות, התראות ושירותים.

Cloudflare Email Routing משמש לקבלת מיילים בלבד. שליחת מיילי Auth מתבצעת דרך Brevo SMTP.

## דף “בקרוב” בדומיין הציבורי

כל עוד האתר האמיתי עדיין לא מחובר ל-hosting, צריך להציג את דף “בקרוב” דרך Cloudflare Worker:

1. להיכנס ל-Cloudflare.
2. לפתוח `Workers & Pages`.
3. ליצור Worker בשם `moran65-coming-soon`.
4. להדביק את הקוד מתוך `cloudflare/coming-soon-worker.js`.
5. להוסיף Custom Domains או Routes עבור:

```text
moran65.com
www.moran65.com
```

אם רוצים לתפוס גם כל תת-דומיין עתידי, מוסיפים route:

```text
*.moran65.com/*
```

ולוודא שב-DNS יש רשומות מתאימות ושהן במצב Proxied, כלומר ענן כתום.

כשמעלים את האתר האמיתי, להסיר את ה-Worker routes/custom domains כדי שהדומיין יפנה ל-hosting האמיתי.

## Supabase Auth Email

ב-Supabase יש לעדכן:

```text
Authentication -> Email Templates -> Confirm signup
```

Subject:

```text
קוד האימות שלך למונדיאל 2026
```

Body:

```text
התוכן המלא של supabase/email-templates/confirm-signup-he.html
```

כדי לקבל קוד בן 6 ספרות:

```text
Authentication -> Providers -> Email -> Email OTP Length = 6
```

## Supabase Password Security

ב-Supabase צריך להקשיח את מדיניות הסיסמאות כדי שהשרת יאכוף את אותה חוויה שמופיעה ב-UI:

```text
Authentication -> Settings -> Password Security
```

ערכים מומלצים:

```text
Minimum password length: 10
Required characters: lowercase, uppercase, numbers, symbols
Leaked password protection: On אם הפרויקט בתוכנית Pro ומעלה
```

ה-UI במסך `/signup` כבר חוסם שליחה עד שהסיסמה כוללת לפחות 10 תווים, אות קטנה, אות גדולה, מספר, סימן מיוחד, ואינה נראית כמו רצף פשוט או חלק מהאימייל. בנוסף, המשתמש חייב להקליד את הסיסמה פעמיים, והטופס לא נשלח אם אימות הסיסמה לא תואם. Supabase נשאר קו ההגנה הסופי, ולכן חשוב להפעיל את ההגדרה גם בדשבורד.

## Supabase MFA / Authenticator

הפרויקט משתמש ב-Supabase TOTP MFA כאפשרות הרשמה מאובטחת נוספת:

- במסך `/signup` המשתמש יכול לבחור להוסיף Authenticator אחרי אימות המייל.
- אחרי אימות ה-OTP במייל, משתמש שבחר בכך מופנה ל-`/mfa/setup`, סורק QR ומאמת קוד בן 6 ספרות.
- בכניסות הבאות, רק משתמשים שיש להם factor מסוג TOTP במצב `verified` יקבלו מסך קוד נוסף אחרי סיסמה.
- משתמשים שנרשמו דרך Google או מייל רגיל בלי Authenticator לא רואים את מסך הקוד הנוסף.

הערה חשובה: Authenticator הוא שכבת MFA שנייה אחרי התחברות בסיסית, לא תחליף מלא למייל/סיסמה או Google. אם בעתיד נרצה לחייב MFA גם ל-Google, צריך להחליט זאת במפורש ולעדכן את זרימת ה-onboarding.

## Google OAuth Branding

כדי שמסך Google לא יציג `plyzqdqcokspmgrffvrm.supabase.co`, הפתרון הרשמי הוא Supabase Custom Domain לתת-דומיין כמו:

```text
auth.moran65.com
```

הפיצ'ר הזה הוא add-on בתשלום לפרויקט Supabase בתוכנית בתשלום. אחרי הפעלה צריך להוסיף ב-Google Cloud גם את ה-callback החדש:

```text
https://auth.moran65.com/auth/v1/callback
```

בנוסף, Google Branding/Verification עם שם ולוגו של "ניחושי מונדיאל 2026" יכול לשפר אמון, אבל בלי Custom Domain עדיין ייתכן שיופיע דומיין Supabase במסך OAuth.

## Supabase SMTP

הגדרות מומלצות:

```text
Authentication -> Settings -> SMTP Settings
```

```text
Sender email: no-reply@moran65.com
Sender name: ניחושי מונדיאל 2026
Host: smtp-relay.brevo.com
Port: 587
Username: ה-SMTP login מ-Brevo
Password: ה-SMTP key מ-Brevo
```

לא לשמור SMTP keys, service role keys או סיסמאות בקבצי הפרויקט.

## מגבלות מייל ו-OTP

מומלץ להשאיר ב-Supabase:

```text
Emails sent: 100 per hour
OTP sent: 30-60 per hour
OTP resend interval: 60 seconds
Signup confirmation request: 60 seconds
```

Brevo Free מוגבל בכמות יומית לכל החשבון, לכן ביום השקה עם הרבה משתמשים צריך לשקול שדרוג או תור הרשמה.

## אבטחה

בוצע audit אבטחה מלא ב-2026-04-23. בין הדברים שטופלו:

- open redirects ב-login, signup ו-auth callback.
- חשיפת ניחושי טורניר לפני kickoff.
- brute force לקודי הצטרפות לליגות.
- גישה מרחוק לנתיבי dev מסוכנים.
- אמון שגוי ב-`X-Forwarded-Host`.
- RLS פתוח מדי בטבלאות social predictions.
- נעילות kickoff ברמת DB וברמת אפליקציה.
- העלאות avatar פרטיות, מוגבלות ל-JPG, PNG ו-WebP.
- חסימת avatar URLs שרירותיים או חיצוניים שמתחזים לנתיב פנימי.

פירוט מלא נמצא ב-`SECURITY_AUDIT_2026-04-23.md`.

## מיגרציות Supabase חשובות

לוודא שבפרויקט הפעיל הורצו:

- `20260422000010_phase1_social_auth.sql`
- `20260422000012_fix_rls_recursion.sql`
- `20260422000013_repair_phase2_social_schema.sql`
- `20260422000014_harden_game_social_security.sql`
- `20260422000015_force_flat_prediction_rls.sql`
- `20260422000016_enable_social_prediction_selects.sql`
- `20260423000018_restore_social_prediction_privacy.sql`
- `20260423000019_enforce_prediction_lock_windows.sql`
- `20260423000020_enforce_unique_profile_handles.sql`
- `20260424000021_public_tournament_projection.sql`

את `20260424000021_public_tournament_projection.sql` צריך להריץ לפני בדיקת `/dashboard/tournament` כמשתמש לא רשום. בלי ה-migration הזה, הדף כבר לא ישתמש ב-service-role, אבל Supabase לא יכיר את ה-views הציבוריים ולכן לא יחזיר נתוני טורניר ל-anon.

## הערות חשובות

- כלי dev מיועדים ל-localhost בלבד.
- תמונות פרופיל אישיות נשמרות ב-bucket פרטי ומוגשות דרך route מאומת.
- כינוי חייב להיות ייחודי ברמת DB וגם בזרימות UI.
- דף הנחיתה הזמני מופיע רק תחת `moran65.com` או `www.moran65.com`. בהרצה מקומית של `localhost:3000` נשאר דף הבית הרגיל של האפליקציה.
- תמונת השולח הקטנה ב-Gmail דורשת BIMI, ולכן כרגע הלוגו מוגדר בתוך תבנית המייל עצמה.
- `/dashboard/tournament` ציבורי גם למשתמשים לא רשומים. הוא מציג נתוני טורניר ציבוריים, כולל סטטוס LIVE, תוצאות ודקה אם קיימים ב-DB, אבל לא מציג ניחושי משתמשים או נתוני ליגות.

## בדיקת דפדפן אחרונה

בוצע smoke test ב-2026-04-24 דרך הדפדפן המקומי:

- הרשמה חדשה השלימה onboarding מלא.
- הכינוי נשמר והמשתמש עבר ל-`/dashboard/matches`.
- נשמרו בחירות פתיחה לטורניר מתוך ה-wizard.
- `/dashboard/matches` נטען עם 104 משחקים.
- אחרי תיקוני הדגלים ו-`data-scroll-behavior="smooth"`, רענון הדף לא יצר אזהרות Next חדשות בקונסול.
