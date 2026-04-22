# תחזיות מונדיאל 2026

אפליקציית PWA בעברית, RTL ומובייל-פירסט לניהול תחזיות מונדיאל 2026, עם טבלאות בתים, נוקאאוט חי, משחק ניחושים חברתי וליגות פרטיות.

## מצב הפרויקט נכון ל־22 באפריל 2026

### טורניר ולוגיקת משחקים

- מקור האמת הוא טבלת `matches` ב־Supabase.
- טבלאות הבתים מחושבות בזמן אמת מתוך תוצאות חיות, עם שוברי שוויון מלאים לפי FIFA.
- נעילת מיקומים בבתים ובטבלת המקומות השלישיים היא דטרמיניסטית.
- הזרקת Annex C לנוקאאוט עובדת מול `fifa_2026_matchups.json` ומעדכנת בפועל את `matches`.
- הבראקט של הנוקאאוט מבוסס על גרף ה־placeholders הרשמי ולא על רצף מספרי משחקים.

### UX ו־RTL

- תצוגות הסקור עברו פיצול ל־DOM spans נפרדים כדי למנוע שיבושי Bidi ב־RTL.
- בכרטיסי משחק, תוצאת הבית תמיד מוצמדת ויזואלית לצד ימין, ותוצאת החוץ לצד שמאל.
- פגיעת Joker מדויקת משתמשת כעת בתמת סגול/מג'נטה שמותאמת לשפת המותג.
- כרטיסי outrights נעולים מציגים את אותו premium badge גם אצל המשתמש עצמו וגם בצפייה ביריב.

### משחק הניחושים `/game`

- Auth גלובלי עוטף את כל האפליקציה.
- `My Predictions` כולל משחקים עתידיים, חיים וגמורים.
- `Total Hits` מציג כמה פגיעות מדויקות המשתמש השיג.
- `LIVE` מוצג בצבע ציאן, והניחוש של המשתמש משנה מסגרת בזמן אמת:
  - ירוק רך כאשר הניחוש כרגע מדויק
  - צהוב רך כאשר כיוון התוצאה נכון
  - אדום כאשר הניחוש כרגע מפספס
- אם משחק חי או גמור לא נשלח עבורו ניחוש, התצוגה אדומה כמו miss מלא.

### ליגות ופרטיות

- ליגות פרטיות תומכות ביצירה, הצטרפות, שיתוף קישור, עזיבה, הסרת חברים ומחיקת ליגה לבעלים.
- צפייה ביריב (`/game/users/[id]`) מוגנת:
  - מוצגים רק משחקים `live` או `finished`
  - משחקים `scheduled` מוסתרים כדי למנוע העתקת ניחושים
  - גם placeholders לא פתורים מוסתרים
- תחזיות winner/top scorer של יריבים מוסתרות עד פתיחת הטורניר.
- המשתמש עצמו תמיד יכול לראות את ה־outrights שלו גם בטבלת הליגה.

## קבצים מרכזיים

- [app/dashboard/tournament/TournamentClient.tsx](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/app/dashboard/tournament/TournamentClient.tsx)
- [app/game/predictions/MatchPredictionCard.tsx](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/app/game/predictions/MatchPredictionCard.tsx)
- [app/game/predictions/OutrightForm.tsx](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/app/game/predictions/OutrightForm.tsx)
- [app/game/leagues/[id]/LeagueViewClient.tsx](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/app/game/leagues/[id]/LeagueViewClient.tsx)
- [app/game/users/[id]/page.tsx](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/app/game/users/[id]/page.tsx)
- [lib/utils/standings.ts](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/lib/utils/standings.ts)
- [lib/tournament/knockout-progression.ts](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/lib/tournament/knockout-progression.ts)
- [lib/bracket/knockout.ts](C:/Users/MoranFestinger/Desktop/worldcup-predictions-master/lib/bracket/knockout.ts)

## מסדי נתונים ומיגרציות חשובות

- `20260422000010_phase1_social_auth.sql`
- `20260422000012_fix_rls_recursion.sql`
- `20260422000013_repair_phase2_social_schema.sql`
- `20260422000014_harden_game_social_security.sql`
- `20260422000015_force_flat_prediction_rls.sql`
- `20260422000016_enable_social_prediction_selects.sql`

הערה: אם סביבת Supabase עדיין לא קיבלה את כל מיגרציות ה־RLS של שלב 2, יש להריץ אותן ב־SQL Editor לפני בדיקות social/viewing מלאות.

## השלב הבא

### Phase 3

- מנוע ניקוד מלא שמעדכן `points_earned`, `profiles.total_score` וסטטיסטיקות ליגה.
- חישוב leaderboards היסטוריים וגרפים של מגמות.
- נעילת ניחושים אוטומטית לפי kickoff אמיתי.
- QA רחב למובייל צר במיוחד ולשילובי RTL/Live/Joker.
- השלמת כל 495 קומבינציות Annex C אם עדיין חסר מפתח ב־JSON.
