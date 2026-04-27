# מערכת ניחושי מונדיאל 2026

אפליקציית `Next.js` בעברית וב-RTL לניחושי מונדיאל 2026: הרשמה, פרופיל שחקן, ניחושי משחקים, ניחושי טורניר, ליגות פרטיות, השוואה מול חברים וטבלת ניקוד.

## מצב נוכחי

נכון ל-2026-04-25, האפליקציה כוללת:

- דף בית ציבורי בעברית עבור `moran65.com` עם דף נחיתה זמני, שמוצג רק כשהבקשה מגיעה מהדומיין הציבורי.
- מותג Moran65 החדש מחובר לדף הבית, לדף הנחיתה הציבורי, ל-favicon, ל-Open Graph ולמייל האימות.
- הרשמה עם מייל וסיסמה דרך קוד OTP בן 6 ספרות, כולל מד סיסמה חזק, אימות סיסמה כפול, וחסימה של סיסמאות פשוטות כמו `123456`.
- אם מבקשים קוד אימייל שוב מהר מדי, המשתמש רואה טיימר ידידותי של 60 שניות במקום הודעת Supabase/SMTP טכנית.
- הרשמה עם אפשרות להפעיל Authenticator/TOTP לפני בחירת Google או מייל וסיסמה; רק חשבונות שהשלימו חיבור Authenticator יקבלו מסך קוד נוסף בכניסות הבאות.
- הרשמה קיימת/מאומתת כבר לא מציגה מסך "קוד נשלח" כשהמערכת לא באמת אמורה לשלוח OTP חדש; המשתמש מקבל הכוונה להתחברות או לכתובת אחרת.
- אם משתמש קיים התחבר בעבר עם Google ואז בוחר להוסיף מייל וסיסמה לאותה כתובת, ההרשמה שולחת OTP אמיתי דרך `signInWithOtp` עם `shouldCreateUser: false`, מאמתת בעלות על המייל, ואז מחברת את הסיסמה לחשבון הקיים בלי ליצור משתמש כפול.
- Google במסך הרשמה ממשיך ל-onboarding לפני כניסה למשחק, ו-Google במסך התחברות מפנה משתמש חדש להרשמה עם הודעה ברורה במקום ליצור חוויית הרשמה שקטה.
- אם Google נלחץ בטעות ממסך התחברות עבור משתמש שעוד לא התחיל רישום באפליקציה, ה-Auth user הזמני נמחק לפני ההפניה להרשמה כדי לא לחסום הרשמה במייל וסיסמה עם אותה כתובת.
- אם משתמש נמחק ידנית מ-Supabase בזמן שהדפדפן עדיין מחזיק session ישן, ה-UI מבצע בדיקת חיים ומנקה את המשתמש המקומי בלי לחכות ללחיצה על התנתקות.
- onboarding עם כינוי ייחודי, תמונת פרופיל אופציונלית, זוכת טורניר ומלך שערים כשבחירות הטורניר עדיין פתוחות.
- אם הטורניר כבר התחיל, משתמש חדש עדיין עובר דרך שלב פרופיל, אבל בלי בחירת זוכה ומלך שערים.
- עריכת פרופיל אחרי כניסה: שינוי כינוי ותמונה, כולל העלאת תמונה אישית, זום ומיקום.
- ליגות פרטיות, קודי הצטרפות, השוואת ניחושים וטבלת ניקוד.
- דפי `/dashboard/tournament` ו-`/dashboard/matches` נטענו מחדש בדפדפן אחרי תיקוני 2026-04-24: טבלת הטורניר הציבורית מציגה את כל 48 הנבחרות וה-Match Center מציג את כל 104 המשחקים.
- נוסף דף נבחרת ציבורי `/dashboard/teams/[id]`, וכל אזכור מרכזי של נבחרת במסכי משחקים, ניחושים, טורניר, בראקט, ליגות ובחירת זוכה טורניר מוביל אליו. הדף כולל משחקים לחיצים, סטטיסטיקות מורחבות, כושר אחרון, מאמן וסגל.
- נוסף עמוד סגל `/dashboard/teams/[id]/squad`, שמציג שחקנים קיימים לפי עמדות ומקום מוכן למאמן עד סנכרון API.
- רענון Dev Live במסכי `/dashboard/tournament` ו-`/dashboard/matches` בודק גרסת משחקים קטנה דרך `/api/dev/matches/version`, ומרענן את הדף רק כשבאמת היה שינוי ב-Dev Tools.
- דף הטורניר הציבורי קורא רק מ-views ציבוריים מצומצמים לנתוני `teams` ו-`matches`, ולא משתמש יותר ב-service-role key.
- בראש דף הטורניר מופיע אזור הכרעה: אחרי משחק המקום השלישי מוצג מקום 3 לצד "2 נבחרות שנותרו", ואחרי הגמר מוצג פודיום מלא למקומות 1-2-3.
- במשחקים חיים, מחצית, תוספת זמן, הארכה ופנדלים מיוצגים דרך `match_phase` ייעודי במקום להסיק מחצית אוטומטית מדקה 45; כך אפשר להציג גם `45+2' LIVE` ולתת ל-API עתידי לשלוט במצב המשחק במדויק.
- ב-Dev Tools כפתורי סטטוס משחק כמו `LIVE`, `FINISH` ו-`RESET` נשמרים מיד ל-Supabase ומפעילים סנכרון טבלאות/bracket, במקום להישאר רק כטיוטה מקומית עד שמירה ידנית.
- Dev Tools מונע מצבי משחק לא עקביים: אין יותר מצב "רגיל", במחצית ובפנדלים אין שדה דקה פעיל, מחצית 1 מוגבלת לדקות 0-60, מחצית 2 מוגבלת לדקות 46-105 בכל המשחקים, הארכה זמינה בנוקאאוט לדקות 91-135, ודקה 106+ בנוקאאוט עוברת ל-ET אוטומטית אם לא נבחרה מחצית 2 ידנית.
- `/mfa/setup` כבר לא מאפשר למשתמש שלא סימן Authenticator בזמן ההרשמה להתחיל חיבור חדש ידנית; גם factor לא מאומת לבדו לא מספיק, ורק סימון הרשמה מפורש ב-`user_metadata.mfa_setup_requested` פותח את המסך עד אימות ה-QR.
- בפלואו שבו משתמש Google קיים מוסיף סיסמה לאותו אימייל, הסיסמה כבר לא נשמרת ב-state בזמן ההמתנה ל-OTP; לפני אימות הקוד המשתמש מקליד אותה שוב, המדיניות נבדקת, ורק אחרי OTP תקין מתבצע `updateUser`.
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
- `app/onboarding/page.tsx` ו-`app/onboarding/OnboardingForm.tsx` - מסך הפרופיל הראשוני.
- `app/dashboard/tournament/page.tsx` - דף טורניר ציבורי שקורא מה-views `public_tournament_teams` ו-`public_tournament_matches`, כדי להציג נתוני טורניר ציבוריים בלי service-role.
- `app/dashboard/tournament/TournamentClient.tsx` - UI הטורניר, כולל טבלאות, בראקט ופודיום הסיום.
- `app/dashboard/teams/[id]/page.tsx` - דף נבחרת ציבורי עם משחקים לחיצים, המשחק הבא, טבלת בית קטנה, סטטוס, סטטיסטיקות מורחבות, כושר אחרון ותצוגת סגל מקוצרת.
- `app/dashboard/teams/[id]/squad/page.tsx` - עמוד סגל ומאמן לנבחרת, מוכן לסנכרון API עתידי.
- `app/dashboard/matches/MatchesClient.tsx` - מרכז המשחקים, כולל התאמות Next 16 למידות דגלים כדי למנוע אזהרות aspect-ratio.
- `components/TeamLink.tsx` - קישור אחיד לנבחרות, כדי שכל דגל/שם/תג זוכה יוביל לדף הנבחרת בלי לשבור RTL או שורות לחיצות.
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
