# מערכת ניחושי מונדיאל 2026

אפליקציית `Next.js` בעברית וב-RTL לניחושי מונדיאל 2026: הרשמה, פרופיל שחקן, ניחושי משחקים, ניחושי טורניר, ליגות פרטיות, השוואה מול חברים וטבלת ניקוד.

## מצב נוכחי

נכון ל-2026-04-28, האפליקציה כוללת:

- דף בית ציבורי בעברית עבור `moran65.com` עם דף נחיתה זמני, שמוצג רק כשהבקשה מגיעה מהדומיין הציבורי.
- מותג Moran65 החדש מחובר לדף הבית, לדף הנחיתה הציבורי, ל-favicon, ל-Open Graph ולמייל האימות.
- הרשמה עם מייל וסיסמה דרך קוד OTP בן 6 ספרות, כולל מד סיסמה חזק, אימות סיסמה כפול, וחסימה של סיסמאות פשוטות כמו `123456`.
- אם מבקשים קוד אימייל שוב מהר מדי, המשתמש רואה טיימר ידידותי של 60 שניות במקום הודעת Supabase/SMTP טכנית.
- הרשמה עם אפשרות להפעיל Authenticator/TOTP לפני בחירת Google או מייל וסיסמה; רק חשבונות שהשלימו חיבור Authenticator יקבלו מסך קוד נוסף בכניסות הבאות.
- הרשמה קיימת/מאומתת כבר לא מציגה מסך "קוד נשלח" כשהמערכת לא באמת אמורה לשלוח OTP חדש; המשתמש מקבל הכוונה להתחברות או לכתובת אחרת.
- אם משתמש קיים התחבר בעבר עם Google ואז בוחר להוסיף מייל וסיסמה לאותה כתובת, ההרשמה שולחת OTP אמיתי דרך `signInWithOtp` עם `shouldCreateUser: false`, מאמתת בעלות על המייל, ואז מחברת את הסיסמה לחשבון הקיים בלי ליצור משתמש כפול.
- Google במסך הרשמה ממשיך ל-onboarding לפני כניסה למשחק, ו-Google במסך התחברות מפנה משתמש חדש להרשמה עם הודעה ברורה במקום ליצור חוויית הרשמה שקטה.
- ברירת המחדל אחרי התחברות, הרשמה והשלמת onboarding היא אזור המשחק `/game`, שממשיך ל-`/game/predictions`; משתמש שסיים פרופיל כבר לא נשלח בטעות ל-`/dashboard`.
- שמות מלאים שמגיעים מ-Google כבר לא נשמרים אוטומטית כ-`profiles.display_name` בזמן יצירת Auth user; בחירת הכינוי הציבורי נשארת ב-onboarding כדי למנוע נפילה על כפילות nickname.
- אם Google נלחץ בטעות ממסך התחברות עבור משתמש שעוד לא התחיל רישום באפליקציה, ה-Auth user הזמני נמחק לפני ההפניה להרשמה כדי לא לחסום הרשמה במייל וסיסמה עם אותה כתובת.
- אם משתמש נמחק ידנית מ-Supabase בזמן שהדפדפן עדיין מחזיק session ישן, ה-UI מבצע בדיקת חיים ומנקה את המשתמש המקומי בלי לחכות ללחיצה על התנתקות.
- onboarding עם כינוי ייחודי, תמונת פרופיל אופציונלית, זוכת טורניר ומלך שערים כשבחירות הטורניר עדיין פתוחות.
- אם הטורניר כבר התחיל, משתמש חדש עדיין עובר דרך שלב פרופיל, אבל בלי בחירת זוכה ומלך שערים.
- עריכת פרופיל אחרי כניסה: שינוי כינוי ותמונה, כולל העלאת תמונה אישית, זום ומיקום.
- ליגות פרטיות, קודי הצטרפות, השוואת ניחושים וטבלת ניקוד.
- דפי `/dashboard/tournament` ו-`/dashboard/matches` נטענו מחדש בדפדפן אחרי תיקוני 2026-04-24: טבלת הטורניר הציבורית מציגה את כל 48 הנבחרות וה-Match Center מציג את כל 104 המשחקים.
- נוסף דף נבחרת ציבורי `/dashboard/teams/[id]`, וכל אזכור מרכזי של נבחרת במסכי משחקים, ניחושים, טורניר, בראקט, ליגות ובחירת זוכה טורניר מוביל אליו. הדף כולל משחקים לחיצים, סטטיסטיקות מורחבות, כושר אחרון, מאמן וסגל.
- נוסף עמוד סגל `/dashboard/teams/[id]/squad`, שמציג שחקנים קיימים לפי עמדות ומקום מוכן למאמן עד סנכרון API.
- נוסף עמוד מאמן `/dashboard/coaches/[id]` לכל נבחרת מסונכרנת. העמוד מושך בצד השרת את BSD `/api/managers/?team_id=...` ומציג מערך, סגנון טקטי, לחץ, קו הגנה וסטטיסטיקות מצטברות; כרטיסי/שורות מאמן קיימים מובילים אליו.
- רענון Dev Live במסכי `/dashboard/tournament` ו-`/dashboard/matches` בודק גרסת משחקים קטנה דרך `/api/dev/matches/version`, ומרענן את הדף רק כשבאמת היה שינוי ב-Dev Tools.
- דף הטורניר הציבורי קורא רק מ-views ציבוריים מצומצמים לנתוני `teams` ו-`matches`, ולא משתמש יותר ב-service-role key.
- בראש דף הטורניר מופיע אזור הכרעה: אחרי משחק המקום השלישי מוצג מקום 3 לצד "2 נבחרות שנותרו", ואחרי הגמר מוצג פודיום מלא למקומות 1-2-3.
- במשחקים חיים, מחצית, תוספת זמן, הארכה ופנדלים מיוצגים דרך `match_phase` ייעודי במקום להסיק מחצית אוטומטית מדקה 45; כך אפשר להציג גם `45+2' LIVE` ולתת ל-API עתידי לשלוט במצב המשחק במדויק.
- ב-Dev Tools כפתורי סטטוס משחק כמו `LIVE`, `FINISH` ו-`RESET` נשמרים מיד ל-Supabase ומפעילים סנכרון טבלאות/bracket, במקום להישאר רק כטיוטה מקומית עד שמירה ידנית.
- Dev Tools מונע מצבי משחק לא עקביים: אין יותר מצב "רגיל", במחצית ובפנדלים אין שדה דקה פעיל, מחצית 1 מוגבלת לדקות 0-60, מחצית 2 מוגבלת לדקות 46-105 בכל המשחקים, הארכה זמינה בנוקאאוט לדקות 91-135, ודקה 106+ בנוקאאוט עוברת ל-ET אוטומטית אם לא נבחרה מחצית 2 ידנית.
- `/mfa/setup` כבר לא מאפשר למשתמש שלא סימן Authenticator בזמן ההרשמה להתחיל חיבור חדש ידנית; גם factor לא מאומת לבדו לא מספיק, ורק סימון הרשמה מפורש ב-`user_metadata.mfa_setup_requested` פותח את המסך עד אימות ה-QR.
- בפלואו שבו משתמש Google קיים מוסיף סיסמה לאותו אימייל, הסיסמה כבר לא נשמרת ב-state בזמן ההמתנה ל-OTP; לפני אימות הקוד המשתמש מקליד אותה שוב, המדיניות נבדקת, ורק אחרי OTP תקין מתבצע `updateUser`.
- בחירת מלך שערים ב-onboarding ובמסך הניחושים נשמרת לפי שם קנוני מה-DB כאשר נשלח `player_id`, ודוחה רק חוסר התאמה אמיתי אחרי נרמול שם. כך אי אפשר להצמיד שם לשחקן אחר כדי לנפח odds, אבל שינויי רווחים/אותיות לא מפילים בחירה תקינה.
- נתיב Dev Tools ההרסני `POST /api/dev/matches/clear` דורש עכשיו בקשת same-origin מלאה, session מחובר ומייל ניהול דרך `DEV_TOOLS_ADMIN_EMAIL` או `admin@moran65.com`, לפני שימוש ב-service-role למחיקת נתונים.
- סבב PRים פתוחים 21-32 נסקר ב-2026-04-28 וב-2026-04-29. תיקונים בטוחים הוטמעו, ה-global leaderboard הוגבל ל-500 משתמשים מובילים + המשתמש הנוכחי, ועמוד יריב גלובלי כבר לא נפתח למשתמשים ללא ליגה משותפת. תיקוני PR שעלולים לפגוע בדיוק חישובי הבתים או לבטל את חוויית ה-global leaderboard תועדו ב-`SECURITY_AUDIT_2026-04-23.md`.
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
- `app/icon.png` ו-`app/favicon.ico` - אייקון האתר שמופיע בטאב הדפדפן.
- `public/brand/moran65-logo.png` ו-`public/brand/moran65-landing.png` - נכסי המותג החדשים של Moran65 לדף הבית, שיתופים ודף הנחיתה.
- `cloudflare/coming-soon-worker.js` - Worker זמני להצגת דף “בקרוב” ישירות דרך Cloudflare עד שהאתר האמיתי עולה.
- `app/login/page.tsx` - התחברות.
- `app/signup/page.tsx` - הרשמה עם קוד OTP.
- `app/auth/callback/route.ts`, `lib/security/safe-redirect.ts` ו-`proxy.ts` - ניתוב Auth בטוח, כולל ברירת מחדל ל-`/game` אחרי כניסה/הרשמה.
- `app/onboarding/page.tsx` ו-`app/onboarding/OnboardingForm.tsx` - מסך הפרופיל הראשוני.
- `app/dashboard/tournament/page.tsx` - דף טורניר ציבורי שקורא מה-views `public_tournament_teams` ו-`public_tournament_matches`, כדי להציג נתוני טורניר ציבוריים בלי service-role.
- `app/dashboard/tournament/TournamentClient.tsx` - UI הטורניר, כולל טבלאות, בראקט ופודיום הסיום.
- `app/dashboard/teams/[id]/page.tsx` - דף נבחרת ציבורי עם משחקים לחיצים, המשחק הבא, טבלת בית קטנה, סטטוס, סטטיסטיקות מורחבות, כושר אחרון ותצוגת סגל מקוצרת.
- `app/dashboard/teams/[id]/squad/page.tsx` - עמוד סגל ומאמן לנבחרת, מוכן לסנכרון API עתידי.
- `app/dashboard/coaches/[id]/page.tsx` - עמוד מאמן לנבחרת, עם פרופיל BSD חי, סגנונות טקטיים וסטטיסטיקות מאמן.
- `app/dashboard/matches/MatchesClient.tsx` - מרכז המשחקים, כולל התאמות Next 16 למידות דגלים כדי למנוע אזהרות aspect-ratio.
- `components/TeamLink.tsx` - קישור אחיד לנבחרות, כדי שכל דגל/שם/תג זוכה יוביל לדף הנבחרת בלי לשבור RTL או שורות לחיצות.
- `components/CoachLink.tsx` - קישור אחיד למאמן הנבחרת, כדי שכל הופעת שם/כרטיס מאמן תוביל לעמוד המאמן.
- `lib/bzzoiro/managers.ts` - helper שרת למשיכת פרופיל מאמן מ-BSD managers API בלי לחשוף את token ל-client.
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

- במסך `/signup` המשתמש יכול לבחור הגנה נוספת עם אפליקציית אימות לפני בחירת Google או מייל וסיסמה.
- אחרי הרשמה ב-Google או אחרי אימות OTP במייל, משתמש שבחר בכך מופנה ל-`/mfa/setup`, סורק QR ומאמת קוד בן 6 ספרות.
- הגישה ל-`/mfa/setup` חסומה בשרת למי שלא בחר Authenticator בהרשמה עצמה; אחרי אימות QR מוצלח סימון ההרשמה נמחק כדי שאי אפשר יהיה לפתוח את מסך ההוספה מחדש במקרה.
- אם אותו אימייל כבר שייך לחשבון Google קיים, מסך ההרשמה לא מסתמך על `signUp` שקט; הוא שולח OTP לחשבון הקיים, מאמת את הקוד, ואז מעדכן את הסיסמה דרך `updateUser`.
- מסך `/mfa/setup` מנקה ניסיון TOTP לא מאומת לפני יצירת QR חדש, כדי שרענון באמצע ההגדרה לא ישאיר את המשתמש עם factor תקוע.
- הכנת ה-QR במסך `/mfa/setup` נעולה ברמת הטאב, כדי למנוע מצב שבו React dev/Strict Mode יוצר שני factors ומוחק את ה-factor שהמשתמש בדיוק סרק.
- אימות ה-QR במסך `/mfa/setup` מתבצע דרך `challengeAndVerify` בפעולה אחת, כדי למנוע נפילה בין יצירת challenge לאימות הקוד אצל משתמשי מייל וסיסמה.
- אם Supabase מחזיר `Factor not found` בזמן אימות Authenticator, המסך יוצר QR חדש ומבקש סריקה מחדש במקום להשאיר את המשתמש תקוע.
- ה-QR מוצג גם אם Supabase מחזיר SVG גולמי וגם אם הוא מחזיר data URL, ולצידו מוצג `secret` ידני למקרה שהסריקה לא עובדת.
- במסך ההגדרה מוצגות אפליקציות Authenticator נפוצות: Google Authenticator, Microsoft Authenticator, 2FAS Auth ו-1Password.
- אם משתמש בחר Authenticator והתחיל את ההגדרה אבל עבר ל-onboarding לפני שסיים, הוא מוחזר קודם ל-`/mfa/setup`.
- בכניסות הבאות, רק משתמשים שיש להם factor מסוג TOTP במצב `verified` יקבלו מסך קוד נוסף אחרי סיסמה.
- בדיקת ה-MFA ברקע לא מחליפה את המסך ולא מציגה מצב "בודקים"; מסך הקוד מופיע רק כש-Supabase מחזיר שבאמת נדרש `aal2`.
- בזמן כניסה לחשבון עם Authenticator, בדיקת ה-MFA הראשונית רצה כבר ב-server layout כדי שלא יוצג תוכן מוגן אפילו לשבריר שנייה לפני מסך הקוד.
- אזור `/game` ופעולות השרת של ליגות/ניחושים בודקים `aal2` גם בצד שרת לפני קריאות admin או כתיבה ל-DB; אם החשבון עדיין ב-`aal1`, המשתמש נשלח ל-`/mfa/challenge` ולא למסלול ניטרלי שעוקף את מסך הקוד.
- משתמשים שנרשמו דרך Google או מייל רגיל בלי לסמן Authenticator לא רואים את מסך הקוד הנוסף.

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
- PR `#20`: סגירת עקיפת MFA בצד שרת באזור `/game` ובפעולות ליגות/ניחושים, כולל fail-closed למסך `/mfa/challenge`.

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
- `20260425000022_add_match_phase.sql`
- `20260426000023_enable_live_leaderboard_realtime.sql`
- `20260426000024_add_match_odds_columns.sql`
- `20260426000025_enable_global_leaderboard_realtime.sql`
- `20260426000026_sync_match_schedule_with_kan.sql`
- `20260426000027_correct_schedule_from_fifa.sql`
- `20260426000028_align_knockout_kickoffs_israel.sql`
- `20260427000029_align_knockout_kickoffs_with_fifa_api.sql`
- `20260427000030_add_team_api_profile_fields.sql`
- `20260427000031_add_top_scorer_odds.sql`
- `20260427000032_add_player_roster_visual_fields.sql`
- `20260427000033_add_bzzoiro_sync_fields.sql`
- `20260427000034_add_outright_scoring_columns.sql`
- `20260428000035_expand_matches_minute_range_to_135.sql`
- `20260429000036_stop_oauth_name_prefill_on_signup.sql`

את `20260424000021_public_tournament_projection.sql` צריך להריץ לפני בדיקת `/dashboard/tournament` כמשתמש לא רשום. בלי ה-migration הזה, הדף כבר לא ישתמש ב-service-role, אבל Supabase לא יכיר את ה-views הציבוריים ולכן לא יחזיר נתוני טורניר ל-anon.

את `20260425000022_add_match_phase.sql` צריך להריץ לפני בדיקת מצבי מחצית/תוספת זמן חדשים. ה-migration מוסיף `match_phase` לטבלת `matches`, מרחיב את ה-view הציבורי `public_tournament_matches`, ומוסיף constraints שמונעים `match_phase` במשחק לא חי, דקה בזמן מחצית/פנדלים, והארכה/פנדלים במשחקי בתים. כך Dev Tools ודפי המשחקים מציגים מחצית, `45+`, `90+`, הארכה ופנדלים בלי לנחש לפי מספר הדקה בלבד.

את `20260426000027_correct_schedule_from_fifa.sql` צריך להריץ אחרי מיגרציית הסנכרון הקודמת כדי להתיישר מול לוח המשחקים הרשמי של FIFA. ה-migration משנה רק את `matches.match_number` ואת `matches.date_time`, ומעדכן הפניות קיימות של `predictions.match_id`/`bets.match_id` לאותו משחק אחרי שינוי מספר המשחק. הוא לא משנה צד בית/חוץ, סטטוסים, תוצאות, יחסים או placeholders.

את `20260426000028_align_knockout_kickoffs_israel.sql` צריך להריץ אחריו כדי להצמיד את שעות משחקי הנוקאאוט 74-90 ללוח ישראל לפי מספר משחק. זו מיגרציה של `date_time` בלבד.

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

## עדכון - 2026-04-26

- `/game/predictions` צובע פגיעת בול עם Joker בזמן LIVE בסגול jackpot, כולל הריבועים של התוצאה/הניחוש/הנקודות באותו tone כמו אחרי סיום משחק.
- `/game/leagues/[id]` מציג ב-Leaderboard עד שני משחקים חיים עם ניחושי החברים: דגל בית, תוצאת הניחוש ב-`dir="ltr"`, דגל חוץ, וסימון Joker קטן.
- צ'יפי הלייב בליגה מקבלים צבע לפי מצב הניחוש מול התוצאה החיה: סגול ל-Joker exact, ירוק ל-exact, צהוב לכיוון, אדום להחמצה או חוסר ניחוש, וכחול כשאין עדיין תוצאה להערכה.
- מסך הליגה משתמש ב-Supabase Realtime לרענון לייב בפרודקשן, ונשאר מחובר ל-BroadcastChannel המקומי של DevTools בלי polling.
- בדיקות שעברו: `npm.cmd run lint`, `npm.cmd run build`.

## Production live refresh - 2026-04-26

- `/game/leagues/[id]` no longer relies on interval polling for live leaderboard updates. It uses Supabase Realtime postgres changes for `matches`, current live-match `predictions`, and the current `league_members` row scope.
- `/game/predictions` uses the same production refresh path for live match status/score changes and the current user's prediction updates.
- The `/game` hero score cards also refresh through Supabase Realtime. `Total Score` remains the persisted finished-match score, and a small `LIVE +N` badge shows the current projected live delta without mutating `profiles.total_score`.
- Client refreshes are debounced and throttled before calling `router.refresh()`, and refresh work is deferred while the browser tab is hidden.
- The old dev refresh hook now disables its polling branch in production builds. DevTools can still notify local tabs through BroadcastChannel/localStorage without hitting the server.
- Run `supabase/migrations/20260426000023_enable_live_leaderboard_realtime.sql` so Supabase publishes the realtime table changes needed by the leaderboard.

## Odds-based scoring engine - 2026-04-26

- `public.matches` now stores 1X2 decimal odds in `home_odds`, `draw_odds`, and `away_odds` through `supabase/migrations/20260426000024_add_match_odds_columns.sql`.
- `lib/game/scoring.ts` contains the pure `calculatePredictionPoints(prediction, match)` engine: miss returns `0`; direction hits use odds base points + stage direction bonus, and exact hits add the stage exact-score bonus before the x2 Joker multiplier.
- Finished match updates call `scoreFinishedMatchPredictions`, updating `predictions.points_earned` and recalculating affected `profiles.total_score` values for leaderboard consistency.
- If a dev/admin update moves a match away from `finished`, `clearUnfinishedMatchScoring` resets that match's `points_earned` back to `0` and recalculates affected profile totals so stale final points do not remain during LIVE.
- `/game/predictions` shows the available direction reward for home/draw/away before saving, and the "exact score" row shows only the extra points added on top of the direction reward.
- `/game/leagues/[id]` projects live scoring in the leaderboard with `+N` badges per live prediction chip and a live delta next to each member's persisted total.
- League rows are sorted by projected score during LIVE (`total_score + live +N`) so users move up immediately when the current score puts them ahead. Equal projected scores are currently ordered by profile registration date.
- The global league header shows participant count and the logged-in user's current rank in that same projected-live league order, instead of showing live-match count.
- `lib/game/live-score-projection.ts` reuses `calculatePredictionPoints` for the logged-in user's current live matches, and `/api/game/live-score-projection` returns the hero card's persisted totals plus the temporary live score delta.
- `/game/leaderboard` reuses the full league leaderboard UI for all profiles: live prediction chips, projected live `+N`, tournament winner and top-scorer picks, and profile-based realtime total updates.
- `/game/leaderboard` now loads the top 500 profiles by persisted score plus the current user, bounding downstream live-prediction/outright queries. Global rows no longer open another user's full opponent page unless the viewer also shares a private league with that user.
- Dev Tools can edit `home_odds`/`draw_odds`/`away_odds` and can generate random future predictions for the currently logged-in dev user only.
- Dev Tools also includes a random odds button that seeds plausible 1/X/2 odds for every match and persists them through the bulk match API.
- Dev Tools `Clear All Match Data` is a full reset: it clears match scores/statuses, odds, match predictions, tournament predictions, legacy bets, `profiles.total_score`, and therefore all league leaderboard totals.
- The scoring sync now writes `0` into `predictions.points_earned` when a finished prediction earns zero, instead of leaving stale `null` values.

## Tournament status labels - 2026-04-27

- Group tables now display guaranteed qualification/elimination even when the exact group rank is not locked yet. Example: a team can show "הבטיחה העפלה" while still being able to finish first or second.
- Locked rank labels remain separate: when the exact position is mathematically fixed, the row still shows `מקום N`.
- Pending group-match scenarios now use the same tie-break ranking pipeline as the visible table instead of only comparing points. Late-group checks include scoreline variants, so draws with goals and goal-difference swings are considered before a team is marked as guaranteed top two.

## Schedule sync - 2026-04-26

- `matches_data.json`, `matches_data.json.txt`, and migration `20260426000027_correct_schedule_from_fifa.sql` now store the World Cup schedule according to FIFA's official match order and kickoff timestamps, with Israel-time `+03:00` kickoff values.
- The correction changes only `match_number` and `date_time`. Team sides, knockout placeholders, scores, statuses and odds are unchanged.
- Confirmed reference fixes: Brazil vs Haiti is match #29 at `2026-06-20T03:30:00+03:00`; Turkey vs Paraguay is match #31 at `2026-06-20T06:00:00+03:00`; Norway vs France is match #61.
- `20260426000028_align_knockout_kickoffs_israel.sql` then aligns knockout matches #74-#90 to the Israel-time knockout list by match number. This makes July 4 contain only match #88 at `01:00` and match #89 at `20:00`.
- `20260427000029_align_knockout_kickoffs_with_fifa_api.sql` corrects #74-#90 again against FIFA's official Scores & Fixtures API (`api.fifa.com/api/v3/calendar/matches`, `idCompetition=17`, `idSeason=285023`). This fixes the July 3/4 drift: #86 is `2026-07-04T01:00:00+03:00`, #87 is `2026-07-04T04:30:00+03:00`, #88 is `2026-07-03T21:00:00+03:00`, #89 is `2026-07-05T00:00:00+03:00`, and #90 is `2026-07-04T20:00:00+03:00`.
- Dev Tools keeps the existing controls but its match table now uses an LTR scroll container with an RTL table and a narrower minimum width so the horizontal overflow behaves predictably.

## Team Hub update - 2026-04-27

- Added `/dashboard/teams` as a live RTL teams index. It groups all teams by group, mirrors the tournament standings logic, and displays each team's outright winning odds from `teams.outright_odds`.
- Expanded `/dashboard/teams/[id]` so the hero no longer repeats points or goal difference. The team record now lives in the group table, while goals are shown clearly as goals for and goals against.
- Added `/dashboard/teams/[id]/stats` for team and player statistics: goals, assists, appearances, minutes, yellow cards, red cards, clean sheets, and group status.
- Updated `/dashboard/teams/[id]/squad` to read coach and richer player stats from API-ready columns.
- Added migration `20260427000030_add_team_api_profile_fields.sql` with `teams.outright_odds`, `teams.coach_name`, player stat columns, and `team_recent_matches` for the five pre-tournament form matches.
- Team-perspective scores are rendered with RTL-safe inline order: the viewed team's goals are on the visual right side, and the opponent's goals are on the visual left side.

## Joker and live table update - 2026-04-26

- Joker rules are now two total Jokers, both usable only on group-stage matches. Server saves, client selection, dev random prediction filling, and `calculatePredictionPoints` all enforce the same eligibility rule.
- The game header shows two group-stage Joker cards instead of one group Joker and one knockout Joker.
- Unused group-stage Joker cards stop showing `זמין` once the group stage is closed or a knockout match has started; they show an expired state instead.
- Legacy/non-group `is_joker_applied` values are ignored for scoring and display, so a knockout prediction cannot receive a Joker x2 multiplier.
- Group live standings score pills render from the row team's perspective with the row team's goals on the visual right side.

## Stats tables visibility update - 2026-04-27

- Added a prominent global stats route at `/dashboard/stats`, reachable from the main dashboard navigation as `טבלאות`. It shows top scorers, assists, yellow cards, red cards, top-scorer odds, team attack/defense/points, and tournament-winning odds.
- Added `/dashboard/teams/[id]/team-stats` as a separate team-statistics page. `/dashboard/teams/[id]/stats` now remains focused on individual player statistics.
- Team pages link directly to squad, player stats, team stats, and global tables so the statistics tables are no longer hidden.
- Finished group tables display exact locked places (`מקום 1`, `מקום 2`, `מקום 3`, `מקום 4`) when the final rank is known, matching the tournament page behavior instead of showing only qualified/eliminated.
- Goal-difference values use an LTR-safe signed-number component so negative values render as `-4`, not `4-`.
- Added migration `20260427000031_add_top_scorer_odds.sql` for `players.top_scorer_odds` and `players.top_scorer_odds_updated_at`.
- Dev Tools now includes a localhost-only button that seeds random team outright odds and top-scorer odds through `/api/dev/outright-odds/randomize`.
- Dev Tools `Clear All Match Data` also clears `teams.outright_odds` and player `top_scorer_odds` so local development resets all odds surfaces.

## Team UX refinement - 2026-04-27

- `/dashboard/teams` is now a first-class dashboard navigation item, so the all-teams page is no longer hidden behind a small link.
- The all-teams page is a compact team directory instead of duplicating the full live tournament table. Full standings remain on `/dashboard/tournament`; team cards show status, group, rank and outright odds.
- Team and stats tables show goals as explicit `זכות` and `חובה` chips instead of ambiguous `10:5` text in RTL.
- Goal-difference numbers use the shared `components/StatNumbers.tsx` signed-number component everywhere they appear, so negative values render as `-4`.
- Tournament-winner picks in the locked prediction view link to the selected team's page through `TeamLink`.
- `/dashboard/teams/[id]/squad` now has a sports-app style squad surface: coach card, visual formation, player avatars, shirt numbers, and per-player mini stats.
- Added `supabase/migrations/20260427000032_add_player_roster_visual_fields.sql` for `players.photo_url` and `players.shirt_number`, so the future API sync can fill player photos and numbers.
- Dev Tools now supports manual editing and resetting of `teams.outright_odds` through `/api/dev/outright-odds/teams`; top-scorer odds remain API/random-seed only for now.
- API sync planning can begin from the current schema: map external team/player/match IDs, sync odds/coach/roster/form into the API-ready columns, then let existing realtime/UI surfaces consume Supabase rather than calling external APIs from the browser.

## BSD team sync foundation - 2026-04-27

- `/dashboard/matches` match cards are fully clickable to `/dashboard/matches/[match_number]`; nested team names still route to team pages.
- Team and stats goal chips now render number-first labels (`8 חובה`, `10 זכות`) to avoid Hebrew RTL flips.
- `/dashboard/teams` no longer shows the unclear `יחסים מוכנים` counter; the header keeps useful tournament scope stats instead.
- `/dashboard/teams/[id]/squad` now shows a simple coach block rather than a professional-staff card, and it can display `teams.coach_photo_url` when BSD supplies a manager image.
- Added `supabase/migrations/20260427000033_add_bzzoiro_sync_fields.sql` for BSD/Bzzoiro team IDs, player IDs, coach image fields, and sync timestamps.
- Added localhost-only `/api/dev/bzzoiro/sync-teams` plus the Dev Tools `סנכרון נבחרות BSD` button. The sync uses BSD `/api/teams/`, `/api/players/?national_team=...`, `/api/managers/?team_id=...`, and public `/img/{type}/{id}/` image URLs, then writes the results into Supabase.
- The BSD team-name matching was checked against the configured World Cup league ID: paginated BSD team data maps to all 48 local teams after aliases such as `Czech Republic/Czechia` and `Bosnia and Herzegovina/Bosnia & Herzegovina`.

## Dev odds and BSD sync safety - 2026-04-27

- Manual team outright odds saving is update-only. `/api/dev/outright-odds/teams` no longer uses `upsert` into `teams`, so saving an empty or partial odds form cannot accidentally insert a team row without `name`.
- Dev Tools now has a team-only random odds button for all national teams. It updates existing `teams.outright_odds` rows and leaves player top-scorer odds untouched.
- The combined team/player odds randomizer also updates existing rows only. It must not create teams or players as a side effect of seeding development odds.
- Running the BSD migration does not run the sync. After `20260427000033_add_bzzoiro_sync_fields.sql` is applied, use the Dev Tools `סנכרון נבחרות BSD` action, or `POST /api/dev/bzzoiro/sync-teams` locally, to pull data.
- Successful BSD team sync is visible in Supabase and UI through `teams.bzzoiro_team_id`, BSD team image URLs, `teams.coach_name`, `teams.coach_photo_url`, `players.bzzoiro_player_id`, player photos, shirt numbers, and refreshed squad pages.
- BSD fetching is server-side only. The browser calls the local Next route, the route reads the BSD token from server env, writes Supabase, and revalidates pages. Regular visitors do not call BSD directly.
- The BSD team sync now overwrites the original 49 mock top-scorer players in place when an exact BSD player exists, preserving existing prediction references while adding `bzzoiro_player_id`, `photo_url`, position, and shirt number. If the mock row duplicates an already-synced BSD row or has no BSD match, the dev sync removes the stale mock row after moving legacy outright references.

## Stats table UX - 2026-04-27

- Global stats tables now use `components/stats/CompactLeaderTable.tsx`: each row shows only the relevant entity, team context, and one metric.
- Player leaderboards include player photos from `players.photo_url`, the linked national team chip, and the current metric.
- Every stats table shows Top 3 by default and can expand to Top 10 with a single `עוד - Top 10` button.
- The same compact table pattern is reused for team player stats so the UI stays RTL-safe and avoids wide, overloaded tables.

## Team directory, recent form, and player pages - 2026-04-27

- `/dashboard/teams` no longer repeats the tournament group tables. It now stays focused as the all-teams directory, with API sync counters, outright-odds leaders, recent-form leaders, and a compact card for every national team.
- Eliminated teams remain clickable but render in a muted grayscale style so the full 48-team directory stays useful without visually competing with active teams.
- `POST /api/dev/bzzoiro/sync-teams` now also calls BSD `/api/events/` server-side and writes verified national-team recent matches into `team_recent_matches`. The route filters returned events so broad team names cannot accidentally save club matches.
- Team detail pages consume `team_recent_matches` for the five latest pre-tournament/recent form matches, while tournament matches still come from the local `matches` table.
- Added `/dashboard/players/[id]` as the player profile route. Player names in global leaderboards, team stats, squad cards, and formation tokens now link to that profile.
- `/dashboard/stats` no longer advertises a raw synced-player count in the hero; it shows table count instead, because the BSD roster can exceed 1000 records.

## Outrights scoring and server-side odds sync - 2026-04-27

- Added migration `20260427000034_add_outright_scoring_columns.sql` for locked outright odds and final winner/top-scorer points on `tournament_predictions`.
- `lib/game/scoring.ts` now exports `calculateOutrightPoints("winner" | "scorer", odds)`. Both outrights use the unified `10/15/25/50/150` point scale with separate thresholds for tournament winner and top scorer.
- `/game/predictions` shows the potential reward while choosing tournament winner and top scorer; saving locks the current `teams.outright_odds` and `players.top_scorer_odds`.
- Added secure `POST /api/admin/finalize-tournament` to finalize outrights, write `winner_points_earned`/`scorer_points_earned`, and refresh `profiles.total_score`.
- Added secure server-side `POST /api/admin/bzzoiro/sync-odds` for BSD match-odds pulls. Browsers still read Supabase; BSD API calls stay on server routes.
- Recent-form sync now stores Hebrew opponent names and Hebrew friendly labels. A manual sync verified Jordan vs Nigeria as `ניגריה`.
- Dev Tools adds scorer-odds random/reset, player-stat randomization, `Clear Tournament`, and BSD odds sync buttons.

## Coach, lineup, player and PR #32 follow-up - 2026-04-29

- Added `/dashboard/coaches/[id]` as a national-team coach page keyed by the local team id, with existing coach cards/rows linking through `components/CoachLink.tsx`.
- Coach pages call BSD managers server-side and label the data as team-under-manager metrics. World Cup 2026 local stats are shown separately, and manager records render LTR as wins / draws / losses to avoid RTL reversals.
- PR `#32` remains addressed without binding Dev Tools to a single mailbox. `POST /api/dev/matches/clear` still requires the dev-only localhost guard, same-origin request and logged-in Supabase session, but no longer checks `DEV_TOOLS_ADMIN_EMAIL` or `admin@moran65.com`.
- No new SQL migration is required for this follow-up. Previously pending migrations still matter, especially `20260429000036_stop_oauth_name_prefill_on_signup.sql` if first-time Google signup has not yet been fixed in the target Supabase project.
- `/dashboard/stats` and `/dashboard/teams/[id]/stats` now break all-zero ties by odds: player tables use `players.top_scorer_odds`, and team attack/defense/points tables use `teams.outright_odds`.
- `/dashboard/teams/[id]/squad` now prefers BSD `/api/predicted-lineup/{event_id}/` when available. Until World Cup lineups are generated, it uses the BSD manager formation plus a deterministic role-based lineup score from position, minutes, appearances, shirt number and top-scorer odds instead of a fixed 4-3-3.
- `/dashboard/players/[id]` now calls BSD `/api/players/{id}/` and `/api/player-stats/?player=...` server-side, keeping local World Cup 2026 stats separate from general BSD match-history stats.

## Team page odds sorting follow-up - 2026-04-29

- `/dashboard/teams/[id]` now sorts the squad preview by top-scorer odds first, and shows the odds chip next to each player so the highest-market players appear before the rest while tournament stats are still zero.
- The team-page "מובילי הנבחרת" table now includes a top-scorer odds column and uses odds as the first tie-breaker after goals/assists.
- `/dashboard/teams/[id]/squad` now sorts each position group by top-scorer odds first and shows odds on formation tokens and squad cards.
- `/dashboard/teams/[id]/stats` now places odds before appearances/cards as the all-zero tie-breaker, so pre-tournament internal tables match the market order.
- The coach record card now renders separate labeled cells for wins, draws and losses. This avoids any RTL ambiguity such as interpreting Mexico's `3 wins, 2 draws, 0 losses` backwards.
- Missing BSD predicted lineups now return a quiet `null` fallback on 404 instead of logging a server console error; this is expected while BSD has not generated lineups for future World Cup fixtures yet.
- `/dashboard/players/[id]` now avoids Hebrew slash-pair metric cards. Cards such as yellow/red cards, saves/conceded, xG/xA, shots, duels, tackles and height/weight are split into labeled values so numbers cannot be read backwards in RTL.
- Player profile metric cards and recent-match mini metrics are centered, and recent-match score chips now show `ניצחון`, `תיקו`, or `הפסד` with color and a team-perspective score when the player team can be matched to the event.
- Split player metric cards use constrained columns and smaller tabular numbers so paired values such as `xG`/`xA` cannot overlap in narrow cards.
- Player age rows no longer combine Hebrew dates inside an LTR parenthesized string; they render as separate RTL-safe age and birth-date tokens.
- Player advanced stats now label BSD `duel_won/duel_lost` as general duels, keep aerial duels separate, and only show the goalkeeper card for goalkeepers or players with real goalkeeper activity.

## Match detail API center - 2026-04-29

- `/dashboard/matches/[id]` now builds a BSD-backed match center without requiring a new SQL migration. It maps the local match to a BSD World Cup event by `teams.bzzoiro_team_id`, team names, and the local kickoff window.
- Added `lib/bzzoiro/matches.ts` for server-side event matching, `events/{id}?full=true`, `/live/?full=true`, `/predicted-lineup/{event_id}/`, and `/player-stats/?event=...` reads. API failures return quiet fallbacks instead of breaking the page.
- Match pages now show API status, venue/referee, odds, live/full stat comparisons, actual or predicted lineups, substitutes, unavailable players, incidents, player-stat leaders, momentum, and recent shots when BSD provides those fields.
- Live BSD pages refresh the server payload every 30 seconds while the tab is visible. Local dev match edits still use the existing dev refresh channel.

## Match center UX, stadiums, and PR audit - 2026-04-29

- Match pages now use a process-local 30-second BSD match-center TTL/de-dupe cache, reducing repeated `events/live/predicted-lineup/player-stats/broadcasts` fan-out during visible auto-refresh.
- `/dashboard/matches/[id]` now adds richer context panels: pre-match form/head-to-head/coaches, official broadcasts, safer stat grid sizing, local squad fallback before BSD lineups exist, and clickable venue cards.
- Added `/dashboard/stadiums/[id]` for BSD venue detail pages with venue image, capacity, city/country, home team metadata, and World Cup events played at that venue when BSD assigns them.
- Ran the local BSD team sync again: 112 remote teams checked, 48 matched, 47 coaches synced, 1087 player rows synced, and 96 recent-form rows refreshed.
- Added `SECURITY_SCAN_PROMPT.md` with future scan context, especially the intended dev-clear behavior and why fixed email allowlists should not be reintroduced.
- PR `#33` was addressed on `master` with a local 30-second TTL/de-dupe cache. PR `#34` remains intentionally rejected because it reintroduces the fixed-email dev-clear restriction that breaks the intended localhost developer workflow.

## Match center UI and BSD pagination follow-up - 2026-04-29

- Fixed BSD pagination for `/events/` and `/live/`: those endpoints now use `limit/offset` instead of `page/page_size`, matching BSD docs and preventing repeated first-page event payloads.
- Stadium pages de-dupe BSD venue events before rendering and use a composite event key, so repeated BSD events no longer trigger duplicate React key warnings or duplicated match cards.
- Match pages now refresh BSD live data every 15 seconds while a match is live/in-progress. Scores, incidents, VAR/card/substitution rows, shotmap, momentum, xG and player stats update from the server-side BSD payload when BSD exposes them.
- The pre-match context panel was simplified into a lighter sports-site style preview: form chips, coach name and head-to-head only. The confusing points/xG mini cards were removed.
- The live match-state panel now uses centered comparison rows and compact odds rows instead of wide stat cards.
- The lineups panel now renders actual, predicted or local fallback XIs on a pitch. The fallback uses the coach formation plus all synced team players, then chooses the XI by position, minutes, appearances, shirt number, goals/assists and odds rather than a fixed 4-3-3 or a random list.
- Ran the local BSD team sync again after the pagination fix: 112 remote teams checked, 48 matched, 47 coaches synced, 1087 player rows synced, and 100 recent-form rows refreshed.
- GitHub PR check on this pass found no open PRs. The latest visible PRs remain closed, including `#33` and `#34`.

## RTL-safe formation and stat UI - 2026-04-29

- Added a shared football formation builder in `lib/football/formation.ts`. It preserves formation layers instead of collapsing all midfielders into one row, so shapes like `4-1-4-1` and `4-2-3-1` render as separate attacking/holding midfield bands.
- Added shared `components/football/FormationPitch.tsx` for match pages and team squad pages. Player names now use direction-safe two-line labels instead of leading ellipses, and formation badges render the numeric shape in an isolated LTR token.
- `/dashboard/matches/[id]` and `/dashboard/teams/[id]/squad` now use the same pitch UI and the same lineup scoring logic, so predicted and fallback XIs look consistent across match and team views.
- Replaced ambiguous RTL pair values like `שערים בעד/נגד 4-7` with split labeled cells (`בעד`, `נגד`).
- Added `RecordBreakdown` in `components/StatNumbers.tsx` and used it in team stat tabs, so records render as labeled wins / draws / losses instead of a bare `W-D-L` string.

## Dev simulation form and match-event display - 2026-04-30

- `/dashboard/teams` now overlays finished local tournament results on top of BSD recent-form rows. Dev simulations therefore update the visible five-match form immediately, while `team_recent_matches` remains an API baseline and survives `Clear All Match Data`.
- `/dashboard/matches/[id]` keeps BSD xG authoritative whenever the API returns live/full xG, and uses a deterministic local `xG סימולציה` only when the page is already showing a local simulated score because BSD still reports pre-match state.
- Match formations and squad fallback pitches now show compact event badges for local Dev events: goals, assists, yellow cards and red cards from `dev_match_player_events`.
- Verified with `npm run lint`, `npm run build`, and localhost HTTP checks for `/dashboard/teams` and `/dashboard/matches/1`.

## Knockout simulation fallback and team-profile wording - 2026-04-30

- Knockout and third-place match pages now render a local simulation match center even when no BSD event can be matched yet. The page shows simulated score, local xG, projected squads and Dev timeline events instead of stopping at an empty BSD message.
- The match comparison bars now keep the home side on the right in purple and the away side on the left in green, so the visual weight follows the numbers in RTL layouts.
- Local simulated xG now takes precedence over stale BSD `0.00` values when BSD still reports a not-started event while the local match is already live/finished.
- Team profile pages no longer use the wording “טבלה חיה” for the group table, and no longer show “בעד/נגד” chips. The UI now uses clearer football wording: `כבשה`, `ספגה`, `הפרש`, and `טבלת שלב הבתים`.
- Final team status wording is clearer after elimination: the hero chip says where the team finished, such as `סיימה בבתים`, `סיימה בשמינית הגמר`, `סגנית`, `מקום 3`, etc., while the group rank is labeled as `מקום X בבית`.

## Match event Hebrew and PR follow-up - 2026-04-30

- Match-event badges now use natural Hebrew plural forms with the number first: `2 שערים`, `2 בישולים`, `2 צהובים`, `2 אדומים`, instead of awkward forms such as `צהוב 2` or abbreviated `ביש 2`.
- Match timelines no longer show ambiguous `בית`/`חוץ` chips. Non-scoring events show the relevant national team name, and scoring chips are oriented for the RTL match header.
- Dev player-stat randomization now creates local goal events even when a simulated team still has no synced squad. Those events are labeled as future-squad placeholders until BSD/local roster data is available, so score simulations still produce a visible timeline.
- Match lineups now include an “אירועי שחקנים” summary under each side, so scorers, assistants and carded players are visible even if they were not in the projected starting XI.
- Team player-stat leader cards now label attacking output as `שערים + בישולים` instead of the vague `תרומה`.
- `/dashboard/stadiums/[id]` is included in protected dashboard routing, and stadium match-card scores now follow the BSD event-side mapping safely when the local home/away order is swapped.

## Match page minimal lineup pass - 2026-04-30

- RTL visual score rendering is now shared across the match list, match detail hero and stadium cards: the visual left/right numbers line up with the rendered teams, while stored home/away values remain unchanged for scoring and API sync.
- Removed the separate “אירועי שחקנים” block from match pages. The page keeps one timeline for match events, and player involvement is shown only where it belongs: on the pitch token or bench row.
- Local fallback lineups now render a bench under each projected XI. Bench players keep their photo/name/number, and scorers, assistants and carded players receive compact symbols beside the row.
- Match involvement badges moved from text pills to symbols: ⚽ for goal, 👟 for assist, yellow-card rectangle and red-card rectangle. Only goals highlight a player token with the green match-event frame; assists and cards stay subtler.
- Ran `POST /api/dev/tournament/clear` locally, then `POST /api/dev/bzzoiro/sync-teams`: 104 matches reset, 627 dev events cleared, 48 teams matched, 47 coaches synced, 1087 players synced, 16 legacy rows enriched, and 100 recent-form rows refreshed.

## Match score/API alignment follow-up - 2026-04-30

- Confirmed against BSD that `home_score` belongs to BSD `home_team` and `away_score` belongs to BSD `away_team`; data, Dev Tools and match-state panels stay home-away, while the match hero renders the visual score as away-home so the right-side home team has its score on the right side of the dash in RTL.
- Match event timelines now use the same home-away score order as the match hero and Dev Tools, so local scorer events cannot visually assign a goal to the wrong side.
- BSD match-center lookup no longer requires local home/away team ids. Knockout, third-place and final pages now match BSD events by normalized placeholders such as `2A`, `3A/B/C`, `W73` and `L101`, so R32+ pages can show API venue/status data before local teams are resolved.
- Stadium event matching uses the same normalized placeholder logic before falling back to kickoff time, reducing accidental duplicate or wrong local-match links for knockout venue cards.
- Player pitch tokens no longer get a green frame for goals or assists. The match involvement stays as compact symbols on the token/bench row without overloading the lineup UI.
- Match lineup cards now keep pitch and bench in the same responsive row on wider screens, while stacking teams later so each side has enough room.
- Team player-stat leader tables now sort `שערים + בישולים` by total contribution once any player has goals/assists, and only fall back to top-scorer odds while the tournament stats are still all zero.
- Verified with `npm run lint`, `npm run build`, and direct BSD/local checks for match 73, round-of-16, quarter-final, third-place and final event matching.

## Match lineup empty-state UX - 2026-04-30

- Match-page local fallback lineups no longer render a tall empty pitch when one team still has no synced squad. The team now gets a polished waiting card that explains the lineup will appear once BSD or local sync returns players.
- Local projected XIs now keep the pitch as the primary visual and move the estimated bench beneath it as a compact grid, avoiding the cramped side-by-side layout that looked broken before official lineup data exists.
- The bench preview is capped visually with a remaining-player chip, while player event symbols still appear on visible bench rows without changing API or Dev Tools score semantics.

## Global leaderboard profile links - 2026-04-30

- Restored clickable rows on `/game/leaderboard` for every global leaderboard member, not only the current user.
- `/game/users/[id]?league=global` now allows authenticated users to open the global opponent view even when they do not share a private league with that player. Future predictions remain locked by the existing opponent-view rules.

## BSD live cron and model predictions - 2026-04-30

- Match odds stay intentionally focused on 1X2 only: `home_odds`, `draw_odds`, and `away_odds`. BSD markets such as over/under, BTTS, double chance and bookmaker snapshots are not synced into the game-scoring path.
- Added protected `POST /api/admin/bzzoiro/sync-live` for cron/server-side live sync. It pulls BSD `/events/` for the active date window plus `/live/`, updates local match status, score, minute, 1X2 odds and penalties, then runs tournament progression and finished-match scoring.
- Added protected `POST /api/admin/bzzoiro/sync-predictions` for BSD model predictions. These are stored separately on `matches` as BSD probabilities/expected goals/model metadata and raw JSON, without touching user `predictions`.
- `POST /api/admin/bzzoiro/sync-odds` still syncs only match 1X2. It now accepts optional `date_from` / `date_to` query params for active-window cron runs; no query still means a full 104-match 1X2 refresh.
- Added `supabase/migrations/20260430000038_add_bsd_match_prediction_fields.sql` for the BSD model-prediction columns.
- Added `cloudflare/bzzoiro-cron-worker.js` as a Cloudflare Worker cron runner. It calls live sync every scheduled run plus a delayed second live pulse after 30 seconds, active-window 1X2 odds every 5 minutes, full 1X2 odds every 30 minutes, and BSD model predictions every 15 minutes using the existing bearer admin/cron secret.
- Added `cloudflare/wrangler.bzzoiro-cron.example.toml` with a one-minute cron trigger example.
- Match pages now hide pre-match context, broadcasts and 1X2 odds once a match is live/finished, keeping the live page focused on score, live stats, events, lineups, player stats and spatial data.
- Added local-only `GET /api/dev/bzzoiro/live-match/[id]` for quickly checking a real BSD event payload, counts and samples without writing to Supabase.
- Added local-only `/dashboard/matches/bsd-live/[id]` as a temporary visual preview page that renders a real BSD live event through the same match-center UI without writing to Supabase. Example: `/dashboard/matches/bsd-live/9291`.
- Live match pages now promote match events directly under the hero, hide period-only API rows from the event list, render timeline scores in the same RTL visual order as the hero, and push momentum/shotmap lower.
- Lineup labels now distinguish official BSD lineups from temporary BSD lineup models during live matches, and API goals/assists/cards decorate matching lineup and bench players by local id, full name, or last-name fallback.

## Live match detail cleanup - 2026-04-30

- Live match pages now remove the momentum block and keep a focused Hebrew “בעיטות אחרונות” panel with translated shot situation/result text and `שערים צפויים` labels.
- The central match status under the score is now a stronger live pill, so minute/half-time/finished state is visible while watching a match.
- Temporary BSD live-preview matches no longer link their venue tile into the World Cup stadium pages, because those external test events are only for validating the live UI.
- Predicted/model lineups shown after kickoff now say `מבנה זמני מ-BSD` and `שחקנים נוספים מהמודל` instead of implying an official bench. Once BSD returns official `lineups`, the page switches back to `הרכב רשמי`.
- Formation pitches now use one stable height across common shapes, reducing uneven cards between formations such as `4-4-2` and `4-2-3-1`.
- Goal/assist/card indicators on pitch tokens and squad rows were polished into compact icon badges with count support for multiple goals, assists or cards.

## Official BSD lineups and live events - 2026-04-30

- BSD official lineups are now parsed from the real `lineups.home/away.players` and `lineups.home/away.substitutes` object returned by `GET /api/events/{id}/?full=true`. Confirmed lineups take priority over `predicted-lineup`, so live match pages show `הרכב רשמי מ-BSD` and `ספסל רשמי` whenever the API provides them.
- Official lineup players use BSD `api_id` for photos and local player matching, while retaining jersey number, formation, substitutions and card/goal state from the match payload.
- If a player has a red card or reaches two yellows, the UI suppresses the yellow badge and shows only red.
- Match-event rows now have stronger event-specific UI for goals, cards, substitutions, VAR and penalties. Substitutions show `נכנס` / `יוצא` explicitly.
- The local BSD live-preview page is now strictly development-only (`NODE_ENV === "development"`), so non-development deployments cannot be used to trigger BSD server-side preview calls.
- Global opponent profile access is still available from `/game/leaderboard`, but `?league=global` is now restricted to users actually visible in the global leaderboard instead of acting as a broad authorization bypass for arbitrary user IDs.
- Local/dev request checks now prefer `request.url` and `Origin` over spoofable `Host`, while server-rendered local pages require development mode and allow normal same-origin navigations without an `Origin` header.
- Added `supabase/migrations/20260430000039_restrict_bsd_prediction_columns.sql`, which revokes table-level `SELECT` on `public.matches` from `anon`/`authenticated` and grants back only non-`bsd_*` columns. This keeps BSD model/raw prediction data server-only instead of relying on ineffective column-only revokes.

## Live match timeline polish - 2026-04-30

- Match events now render latest-first, so the newest event is at the top and early-match events move down the list.
- A halftime marker is synthesized from BSD halftime scores when available, showing `HT`, minute 45 and the halftime score inside the same event timeline.
- A full-time marker is also added for finished BSD events, showing `FT` and the final score at the top of the match timeline.
- BSD live preview no longer calls `predicted-lineup` after a match is finished or after official `lineups` are already present, and 400/404 predicted-lineup responses are treated as unavailable data instead of crashing the page.
- Substitution badges no longer show `נכנס 0'`. Zero/empty substitution minutes are ignored, while real substitutions render as compact `נכנס` / `יצא` markers with related player/minute details when BSD provides them.
- Non-scoring match events show the team logo instead of a text team-name chip, making yellow cards, substitutions and VAR checks easier to scan.
- Pitch-token event symbols now sit as small overlays outside the player card, so goals, assists, cards and substitutions do not stretch the player tile.
- Shotmap icons now use visual symbols instead of short Hebrew abbreviations such as `חס` or `בע`, while the detailed shot result text stays in Hebrew. The panel now sorts shots by actual minute before taking the latest eight, so it does not get stuck on early shots when BSD returns shotmap newest-first.
