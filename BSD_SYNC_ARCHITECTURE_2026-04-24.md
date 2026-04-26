# תכנון ארכיטקטורת סנכרון BSD API למערכת ניחושי מונדיאל 2026

מסמך זה מתאר תכנון מלא לשילוב BSD Football API בפרויקט `worldcup-predictions`, בלי לממש כרגע קוד, בלי להריץ מיגרציות, ובלי לשנות פונקציונליות קיימת. המטרה היא להשאיר תוכנית מפורטת מספיק כדי שמפתח או Agent יוכלו לקחת אותה לשלב ביצוע עתידי בצורה מסודרת, בטוחה, ובשלבים קטנים.

נכון ל-2026-04-24 נמצאו ב-BSD:

- League: `World Cup 2026`
- League ID: `27`
- Season ID: `188`
- מספר משחקים בטווח הטורניר: `104`
- Base URL: `https://sports.bzzoiro.com/api/`
- Authentication: `Authorization: Token YOUR_API_KEY`
- MCP endpoint קיים: `https://sports.bzzoiro.com/mcp`

מקורות רשמיים:

- BSD API Docs: https://sports.bzzoiro.com/docs/
- BSD MCP Info: https://sports.bzzoiro.com/mcp-info/

## עקרונות על

המערכת לא אמורה להיות "דפדפן שמושך API". היא צריכה להיות מערכת סנכרון אמיתית:

- BSD הוא מקור הנתונים החיצוני.
- Supabase הוא מקור האמת הפנימי של האתר.
- Cloudflare Worker מריץ את הסנכרון באופן אוטומטי.
- Next.js קורא מ-Supabase בלבד ברוב המסכים.
- הדפדפן לא מקבל אף פעם את `BSD_API_TOKEN`.
- ה-Service Role של Supabase נשאר רק בצד שרת/Worker.
- כל עדכון תוצאה, סטטוס, יחס, סטטיסטיקה או ניקוד חייב להיות idempotent, כלומר אפשר להריץ אותו שוב בלי ליצור כפילויות או ניקוד כפול.

## מטרות

1. לסנכרן את לוח 104 משחקי מונדיאל 2026 מול BSD.
2. לקבל תוצאות לייב, דקות משחק, מחציות, הארכה ופנדלים.
3. לקבל סטטיסטיקות משחק קבוצתיות.
4. לקבל lineups, predicted lineups, פצועים/מושעים, מאמנים, שופט ואצטדיון.
5. לקבל סטטיסטיקות שחקנים אישיות אחרי/במהלך משחקים לפי זמינות ה-API.
6. לקבל odds ולנעול יחס בזמן שמירת ניחוש.
7. לחשב ניקוד אוטומטי אחרי סיום משחק.
8. לעדכן את הדפים בזמן אמת בלי F5.
9. לשמור פרטיות של ניחושי משתמשים וליגות פרטיות.
10. לא לפגוע במבנה הטורניר הקיים, knockout progression, RLS, onboarding או Dev Tools.

## דברים שלא עושים בשלב הראשון

- לא מחליפים את Supabase כמקור הנתונים של האתר.
- לא קוראים ל-BSD ישירות מה-Client.
- לא חושפים token בדפדפן.
- לא משנים את חוקי הנעילה של ניחושים אחרי kickoff.
- לא מוחקים את Dev Tools הקיימים.
- לא משנים את UI/UX לפני שיש שכבת נתונים יציבה.
- לא מסתמכים על MCP כדרך הסנכרון של האתר.

## למה לא לסנכרן דרך MCP

ל-BSD יש MCP endpoint, אבל MCP מתאים בעיקר לעבודה של AI clients ו-Agents: לשאול שאלות, לקבל מידע, ולבנות יכולות עזר חכמות. האתר עצמו צריך pipeline יציב, צפוי, ומתועד דרך REST API.

ההחלטה:

- MCP יכול לשמש בעתיד לכלי Admin או Agent פנימי.
- הסנכרון הקבוע לאתר יתבצע דרך REST API של BSD.
- Cloudflare Worker יהיה המריץ האוטומטי.
- Supabase יהיה המקום שממנו Next.js והדפדפן קוראים נתונים.

## ארכיטקטורת יעד

```text
BSD REST API
  |
  | Authorization: Token BSD_API_TOKEN
  v
Cloudflare Worker / Cron
  |
  | Supabase Service Role
  v
Supabase Postgres
  |
  | Public views + RLS + Realtime
  v
Next.js App
  |
  v
Browser UI
```

## רכיבי מערכת

### 1. BSD Client בצד שרת

תפקיד:

- לבנות wrapper אחיד לקריאות BSD.
- להוסיף headers.
- לטפל ב-pagination.
- לטפל ב-timeout.
- לטפל בשגיאות.
- לא לחשוף token ללקוח.

התנהגות רצויה:

- `BSD_API_BASE_URL` עם ברירת מחדל `https://sports.bzzoiro.com/api`.
- `BSD_API_TOKEN` חובה בסביבות שמריצות sync.
- `BSD_WORLD_CUP_LEAGUE_ID=27`.
- `BSD_WORLD_CUP_SEASON_ID=188`.
- כל fetch עם `cache: "no-store"` בסקריפטים/Worker.
- retry עדין לשגיאות זמניות.
- לא לעשות retry לשגיאות `401`, `403`, `404`.
- לוגים שלא כוללים token.

### 2. Cloudflare Worker

תפקיד:

- להריץ sync אוטומטי גם כשאף משתמש לא באתר.
- להפריד בין עומס משתמשים לבין עומס API.
- לשמור Supabase מעודכן באופן רציף.

Cron מוצע:

- לפני הטורניר: כל 30 דקות לסנכרון schedule, teams, odds ו-predicted lineups.
- ביום משחק: כל 5 דקות לסנכרון schedule ו-odds.
- בזמן משחקים חיים: כל 15-30 שניות ל-live pulse.
- אחרי סיום משחק: sync מיידי עמוק למשחק, ואז scoring.
- אחרי יום משחק: sync עמוק לכל המשחקים של היום.

Endpoints מוצעים ב-Worker:

```text
POST /sync/schedule
POST /sync/odds
POST /sync/live
POST /sync/event/:bsdEventId
POST /sync/score-finished
GET  /health
```

כל endpoint ידני צריך להיות מוגן ב-secret header, למשל:

```text
X-Sync-Secret: <secret>
```

### 3. Supabase Data Layer

הנתונים הקיימים חשובים ולא מוחקים אותם. מוסיפים שכבת קישור ונתונים חיים מעליהם.

טבלאות קיימות רלוונטיות:

- `matches`
- `teams`
- `players`
- `predictions`
- `tournament_predictions`
- `outright_bets`
- `bets`
- `profiles`
- `leagues`
- `league_members`

הרחבות מוצעות ל-`matches`:

```text
bsd_event_id integer unique
bsd_season_id integer
bsd_league_id integer
bsd_status text
bsd_period text
home_score_ht integer
away_score_ht integer
home_xg_live numeric
away_xg_live numeric
actual_home_xg numeric
actual_away_xg numeric
odds_home numeric
odds_draw numeric
odds_away numeric
odds_updated_at timestamptz
venue jsonb
referee jsonb
home_coach jsonb
away_coach jsonb
unavailable_players jsonb
bsd_last_synced_at timestamptz
bsd_raw_summary jsonb
```

חשוב:

- `status` הפנימי נשאר `scheduled`, `live`, `finished`.
- `bsd_status` שומר את הסטטוס המקורי: `notstarted`, `inprogress`, `1st_half`, `halftime`, `2nd_half`, `finished`, `postponed`, `cancelled`.
- אם BSD מחזיר `postponed` או `cancelled`, לא להכריח את `status` הפנימי ל-`finished`.

טבלאות חדשות מוצעות:

```text
bsd_sync_logs
bsd_event_mappings
match_live_snapshots
match_incidents
match_team_stats
match_lineups
match_predicted_lineups
match_player_stats
match_spatial_data
match_odds_snapshots
prediction_scoring_runs
```

### 4. Public Views ו-Realtime

כיום `/dashboard/tournament` קורא מ-views ציבוריים מצומצמים:

- `public_tournament_matches`
- `public_tournament_teams`

צריך להמשיך את אותו עיקרון:

- Public views חושפים רק מידע ציבורי על משחקים, קבוצות וסטטיסטיקות ציבוריות.
- לא חושפים ניחושים, ליגות פרטיות, פרופילים פרטיים או נתוני avatar פרטיים.
- Realtime פועל דרך טבלת pulse ציבורית או view/טבלה מצומצמת.

טבלת pulse מוצעת:

```text
public_match_pulses
  match_number integer primary key
  status text
  minute integer
  home_score integer
  away_score integer
  home_penalty_score integer
  away_penalty_score integer
  is_extra_time boolean
  updated_at timestamptz
```

הדפדפן מאזין לטבלה זו ב-Supabase Realtime, ואז עושה `router.refresh()` או מעדכן state מקומי.

Fallback:

- אם Realtime לא זמין, polling שקט כל 10-15 שניות בדפי טורניר ומשחקים.
- בזמן live אפשר לרדת ל-5 שניות, אבל רק אם יש משחק חי.

## מיפוי משחקים בין BSD ל-Supabase

אי אפשר להניח שסדר המשחקים תמיד זהה. צריך מנגנון התאמה בטוח.

שדות BSD רלוונטיים:

- `id`
- `home_team`
- `away_team`
- `event_date`
- `round_number`
- `group_name`
- `status`
- `home_team_obj`
- `away_team_obj`

שדות Supabase קיימים:

- `match_number`
- `stage`
- `date_time`
- `home_team_id`
- `away_team_id`
- `home_placeholder`
- `away_placeholder`

אלגוריתם מיפוי מוצע:

1. אם `matches.bsd_event_id` כבר קיים, משתמשים בו.
2. אם לא קיים, מנסים התאמה לפי תאריך, בית, ושמות קבוצות מנורמלים.
3. אם ההתאמה חזקה מאוד, שומרים mapping.
4. אם ההתאמה לא ודאית, שומרים candidate ב-`bsd_event_mappings` עם `confidence`, אבל לא מעדכנים אוטומטית.
5. Dev Tools יציג "צריך אישור ידני" להתאמות גבוליות.

נרמול שמות:

- להסיר accents.
- להפוך lowercase.
- להסיר רווחים וסימנים.
- להשתמש ב-aliases קיימים כמו `USA`, `United States`, `Côte d'Ivoire`, `Ivory Coast`, `Turkiye/Turkey`, `South Korea`.

## מיפוי סטטוסים

```text
BSD notstarted -> internal scheduled
BSD inprogress -> internal live
BSD 1st_half   -> internal live
BSD halftime   -> internal live
BSD 2nd_half   -> internal live
BSD finished   -> internal finished
BSD postponed  -> internal scheduled + bsd_status postponed
BSD cancelled  -> internal scheduled + bsd_status cancelled
```

כללי minute:

- אם `current_minute` קיים, לשמור אותו.
- אם `halftime`, minute יכול להיות `45`.
- אם `finished`, minute יכול להיות `null` או `90/120` לפי החלטת UI.
- לא לשבור constraint קיים של `0..135`; Dev Tools מציג תוספות כ-`45+`, `90+`, ו-`120+` לפי `match_phase`.

## פנדלים והארכה

BSD מחזיר `penalty_shootout` כאובייקט:

```text
{ home: X, away: Y }
```

כללי סנכרון:

- אם `penalty_shootout` קיים, לעדכן `home_penalty_score`, `away_penalty_score`.
- אם משחק נוקאאוט הסתיים בתיקו ויש פנדלים, `is_extra_time=true`.
- אם פנדלים קיימים בזמן live, להציג אותם גם לפני `finished`.
- לא לנקות פנדלים רק כי `status` עדיין לא finished.

## Odds וניקוד

### עיקרון נעילת יחס

היחס ננעל בזמן שמירת הניחוש, לא בזמן kickoff. זה מתגמל משתמש שניחש מוקדם ומונע מצב שבו יחס משתנה אחרי שהמשתמש כבר קיבל החלטה.

כאשר משתמש שומר ניחוש:

1. קוראים מה-DB את odds העדכניים של המשחק.
2. מחשבים outcome שהמשתמש בחר: בית, תיקו או חוץ.
3. שומרים על prediction:
   - `locked_outcome`
   - `locked_decimal_odds`
   - `locked_odds_source`
   - `locked_odds_at`
   - `scoring_version`

אם אין odds:

- הניחוש עדיין נשמר.
- `locked_decimal_odds=null`.
- בונוס יחס יהיה `0`.

### נוסחת ניקוד מוצעת

צריך ניקוד שלם, ברור, ושלא יזרוק פתאום 40 נקודות על יחס גבוה.

ניקוד בסיס:

```text
תוצאה מדויקת: 3 נקודות
כיוון נכון:   1 נקודה
פספוס:        0 נקודות
```

בונוס יחס:

```text
locked odds < 1.80       -> 0 נקודות בונוס
1.80 עד 2.39             -> 1 נקודת בונוס
2.40 עד 3.19             -> 2 נקודות בונוס
3.20 עד 4.49             -> 3 נקודות בונוס
4.50 עד 6.49             -> 4 נקודות בונוס
6.50 ומעלה               -> 5 נקודות בונוס
```

כללים:

- בונוס יחס ניתן רק אם הכיוון נכון.
- אם התוצאה מדויקת, מקבלים גם בונוס יחס לפי אותו outcome.
- ג'וקר מכפיל רק את ניקוד הבסיס, לא את בונוס היחס.
- מקסימום רגיל בלי ג'וקר: `3 + 5 = 8`.
- מקסימום עם ג'וקר: `(3 * 2) + 5 = 11`.
- כל הניקוד שלם.

דוגמאות:

```text
ניחוש 2-1 לספרד, ספרד ניצחה 2-1, יחס ספרד 1.55:
3 בסיס + 0 בונוס = 3

ניחוש 1-0 לאוזבקיסטן, אוזבקיסטן ניצחה 2-1, יחס אוזבקיסטן 6.10:
1 בסיס + 4 בונוס = 5

ניחוש 1-0 לאוזבקיסטן עם ג'וקר, אוזבקיסטן ניצחה 1-0, יחס 6.10:
3 בסיס * 2 + 4 בונוס = 10

ניחוש תיקו 1-1, המשחק נגמר 0-0, יחס תיקו 3.50:
1 בסיס + 3 בונוס = 4

ניחוש 3-1 לקבוצה שהפסידה:
0
```

### נוקאאוט ופנדלים

כרגע המשתמש מנחש תוצאה, לא בוחר מנצחת בפנדלים. לכן:

- ניקוד תוצאה מתייחס לתוצאה לפני פנדלים.
- אם משחק הסתיים 1-1 ואז פנדלים, ניחוש 1-1 הוא פגיעה מדויקת.
- outcome לצורך odds במשחק שנגמר תיקו לפני פנדלים הוא `draw`, גם אם קבוצה אחת עלתה בפנדלים.
- אם בעתיד נוסיף "מי תעלה", זה יהיה שדה נפרד וניקוד נפרד.

## Scoring Pipeline

הניקוד צריך לרוץ אחרי סיום משחק.

תהליך:

1. Worker מזהה משחק שעבר ל-`finished`.
2. מסנכרן detail מלא של המשחק.
3. מריץ `syncTournamentState`.
4. מריץ `scoreMatchPredictions(match_number)`.
5. שומר `prediction_scoring_runs`.
6. מעדכן `predictions.points_earned`.
7. מעדכן גם legacy `bets.points_awarded` אם עדיין צריך תאימות.
8. מפעיל Realtime pulse.
9. מרענן views ציבוריים לפי הצורך.

Idempotency:

- לכל prediction נשמר `scored_match_version`.
- אם תוצאה לא השתנתה, לא מחשבים מחדש.
- אם תוצאה תוקנה, מחשבים מחדש ומעדכנים log.
- לא מוסיפים ניקוד מצטבר; תמיד כותבים את הניקוד הסופי של אותו משחק.

## Player Data

BSD מספק:

- `/api/players/`
- `/api/player-stats/?event=ID`
- תמונות דרך `/img/player/{id}/`

שימושים באתר:

- רשימת מלך שערים בבחירות פתיחה.
- פרופיל שחקן.
- סטטיסטיקות אחרי משחק.
- דירוג שחקנים בטורניר.
- כרטיסי "מי כבש", "מי בישל", "איש המשחק" אם הנתונים זמינים.

החלטה:

- לשמור שחקנים מקומיים ב-`players`.
- להוסיף `bsd_player_id`.
- לא למחוק שחקנים קיימים.
- לעדכן `team_id` לפי מיפוי נבחרות.
- לשמור תמונת שחקן כ-URL ציבורי של BSD או cache פנימי בעתיד.

## Team Stats ו-Live Stats

BSD live endpoint כולל `live_stats` במשחקים חיים. Event detail יכול לכלול:

- `home_xg_live`
- `away_xg_live`
- `actual_home_xg`
- `actual_away_xg`
- `home_form`
- `away_form`
- `head_to_head`
- `incidents`
- `lineups`
- `shotmap`
- `momentum`
- `average_positions`

תכנון שמירה:

- נתונים קטנים וחשובים ישירות על `matches`.
- נתונים עשירים ב-JSONB בטבלאות ייעודיות.
- לא להעמיס על `public_tournament_matches` את כל JSONB.
- דפי detail יכולים לקרוא endpoint ייעודי לנתונים העמוקים.

## Lineups

לפני משחק:

- להשתמש ב-`/api/predicted-lineup/{event_id}/` אם זמין.
- להציג "הרכב משוער" עם תווית ברורה שזה Beta/משוער.

בזמן/אחרי משחק:

- להשתמש ב-`/api/events/{id}/?full=true` ל-lineups בפועל.
- לשמור formation, starters, substitutes, unavailable.

UI עתידי:

- מגרש חזותי עם שחקנים.
- רשימת פותחים/ספסל.
- שחקנים חסרים.
- confidence להרכב משוער.

## Incidents וכרטיסים

Event detail כולל `incidents`. צריך לשמור אותם כדי להציג:

- שערים
- כרטיסים צהובים
- כרטיסים אדומים
- חילופים
- פנדלים
- VAR אם קיים

כל incident צריך לכלול:

```text
bsd_incident_id
match_number
minute
type
team_side
team_id
player_id
player_name
assist_player_id
assist_player_name
raw
```

אם אין ID יציב מה-API:

- לבנות hash לפי `event_id + minute + type + player + team`.

## Spatial Data

נתונים זמינים עם `full=true`:

- `shotmap`
- `momentum`
- `average_positions`
- `lineups`

שימושים עתידיים:

- מפת בעיטות.
- גרף מומנטום לפי דקות.
- מיקום ממוצע של שחקנים.
- Heatmap לשחקן אם יש ב-player stats.

החלטה:

- לא לשים spatial data ב-public list views.
- לשמור ב-`match_spatial_data`.
- לטעון רק בעמוד match detail.

## Social, TV, Broadcasts

BSD כולל:

- `/api/social/`
- `/api/tv-channels/`
- `/api/broadcasts/`

שימושים אפשריים:

- קישורי תקצירים אחרי משחק.
- "איפה משודר המשחק" לפי מדינה.
- תוכן חברתי רשמי.

החלטה לשלב ראשון:

- לא להכניס למסכים הראשיים.
- להשאיר כאפשרות Phase 4.
- להיזהר מזכויות שידור ומקישורים חיצוניים.

## אבטחה

חובה:

- `BSD_API_TOKEN` רק ב-Worker/Server.
- `SUPABASE_SERVICE_ROLE_KEY` רק ב-Worker/Server.
- לא לשים secrets ב-README.
- לא להדפיס secrets בלוגים.
- Dev endpoints נשארים רק ל-localhost או מוגנים חזק.
- Worker manual endpoints מוגנים ב-secret.
- RLS לא נפתח על predictions או league data.
- views ציבוריים מצומצמים בלבד.

סיכוני אבטחה:

- חשיפת odds locked של משתמשים אחרים לפני המשחק יכולה לחשוף אסטרטגיה אם מצרפים לניחוש פרטי. לכן odds locked נשארים פרטיים עד הזמן שבו מותר להציג ניחושים.
- Realtime על טבלאות פנימיות עלול לחשוף payloadים. לכן עדיף pulse ציבורי מצומצם.
- sync endpoint פתוח יכול לאפשר abuse או עלויות. לכן נדרש secret.
- raw JSON מה-API לא מוצג ישירות בלי sanitization.

## ביצועים

בעיות אפשריות:

- קריאה ישירה מ-Client ל-BSD תיצור עומס כפול לפי מספר משתמשים.
- JSONB גדול מדי ב-list pages יכול להאט את האתר.
- polling קצר מדי מכל דפדפן יכול להעמיס על Supabase.

פתרון:

- Worker מרכזי מבצע polling מול BSD.
- Client מקבל Realtime pulse.
- list pages מקבלים רק fields קטנים.
- detail pages טוענים נתונים עמוקים רק לפי משחק.
- cache פנימי לפי match_number ו-updated_at.

## Observability

טבלת `bsd_sync_logs` צריכה לשמור:

```text
id
job_type
started_at
finished_at
status
matches_checked
matches_updated
error_code
error_message
raw_error
```

מסך Admin/Dev עתידי:

- מתי היה sync אחרון.
- כמה משחקים עודכנו.
- כמה mappings דורשים אישור.
- שגיאות אחרונות.
- כפתור retry.
- כפתור dry-run.

## שלבי ביצוע מומלצים

### Phase 0: מסמך והכנות

- להוסיף את המסמך הזה.
- לוודא env variables קיימים.
- לא לשנות DB או UI.

### Phase 1: BSD Client ו-Dry Run

- להוסיף client server-only.
- להוסיף script או route פנימי שמריץ dry-run בלבד.
- להציג כמה משחקים נמצאו, כמה תואמים, וכמה דורשים review.
- לא לעדכן DB אוטומטית בשלב זה.

### Phase 2: מיפוי משחקים

- להוסיף migration ל-`bsd_event_id`.
- להריץ dry-run.
- לאשר mappings.
- לשמור mappings חזקים.
- להוסיף Dev Tools review להתאמות חלשות.

### Phase 3: Schedule ו-Live Scores

- לסנכרן status, scores, minute, periods, penalties.
- לעדכן `syncTournamentState`.
- להפעיל pulse ל-Realtime.
- לבדוק דפדפן רגיל + אינקוגניטו בלי F5.

### Phase 4: Odds ונעילת יחס

- לשמור odds על matches.
- לשמור locked odds בזמן שמירת prediction.
- להציג למשתמש כמה נקודות אפשר לקבל.
- לא לחשב עדיין ניקוד חדש עד שהפורמולה מאושרת סופית.

### Phase 5: Scoring

- להוסיף scoring engine.
- להריץ על משחק אחד בלבד.
- לבדוק exact score, outcome, joker, odds bonus.
- להוסיף scoring logs.
- להפעיל אוטומטית אחרי finished.

### Phase 6: סטטיסטיקות עומק

- incidents.
- team stats.
- player stats.
- lineups.
- predicted lineups.
- shotmap/momentum.

### Phase 7: Cloudflare Worker Production

- להעביר את הסנכרון ל-Worker.
- להגדיר secrets.
- להגדיר cron.
- להוסיף health endpoint.
- להוסיף alerts.

### Phase 8: UI עשיר

- כרטיסי משחק חיים.
- עמוד Match Center משודרג.
- הרכבים.
- סטטיסטיקות.
- גרף מומנטום.
- כרטיסי שחקנים.
- הסבר ניקוד מפורט.

## בדיקות חובה

### בדיקות מיפוי

- 104 משחקי BSD נמצאים.
- אין כפילויות `bsd_event_id`.
- כל match_number מקבל לכל היותר event אחד.
- משחקים עם שמות שונים מקבלים alias תקין.
- התאמה לא בטוחה לא נכתבת אוטומטית.

### בדיקות live

- משחק scheduled הופך ל-live.
- minute מתעדכן.
- score מתעדכן.
- halftime מוצג יפה.
- finished מסיים משחק.
- פנדלים מוצגים גם בזמן live.
- תוצאה לא דורשת F5 בדפדפן שני.

### בדיקות ניקוד

- exact score בלי odds.
- exact score עם odds נמוך.
- exact score עם odds גבוה.
- outcome בלבד.
- הפסד.
- תיקו.
- ג'וקר.
- נוקאאוט עם פנדלים.
- תיקון תוצאה אחרי scoring.

### בדיקות פרטיות

- משתמש לא מחובר רואה רק טורניר ציבורי.
- משתמש לא רואה ניחושים של אחרים לפני הזמן.
- odds locked של משתמש אחר לא חשוף דרך API.
- service role לא מופיע ב-client bundle.
- BSD token לא מופיע ב-client bundle.

### בדיקות עומס

- 10 טאבים פתוחים לא יוצרים 10 קריאות BSD.
- Realtime עובד עם fallback.
- polling לא רץ כשהטאב מוסתר, או רץ בתדירות נמוכה.
- Worker לא מפעיל sync כפול במקביל.

## Acceptance Criteria

היישום העתידי ייחשב מוצלח כאשר:

- כל 104 המשחקים ממופים ל-BSD.
- תוצאה שמתעדכנת ב-BSD מופיעה באתר בלי רענון ידני.
- פנדלים והארכה מוצגים נכון.
- ניקוד משתמשים מתעדכן אוטומטית אחרי משחק.
- בונוס odds נותן ניקוד שלם ומוגבל.
- אין חשיפת secrets.
- אין פגיעה ב-RLS.
- אין פגיעה בהרשמה, onboarding, profile, leagues או predictions.
- יש logs מספיקים כדי להבין למה sync נכשל.

## החלטות שננעלו

- מריץ הסנכרון הראשי יהיה Cloudflare Worker.
- היחס יינעל בזמן שמירת הניחוש.
- הניקוד יהיה שלם ומוגבל.
- Realtime יהיה הערוץ הראשי לעדכון דפדפן, עם polling fallback.
- MCP לא ישמש לסנכרון האתר, אלא לכלי AI/Admin עתידיים בלבד.
- המסמך הזה הוא תכנון בלבד ואינו משנה כרגע שום התנהגות באתר.

## עדכון - 2026-04-26

- צפייה בלייב בליגות נשענת על אותו מצב משחק שאמור להתעדכן מסנכרון BSD: `/game/leagues/[id]` טוען עד שני משחקים עם `status = live` ואת ניחושי חברי הליגה רק עבור אותם match IDs.
- צבע הצ'יפ ב-Leaderboard מחושב מהתוצאה החיה מול הניחוש: סגול ל-Joker exact, ירוק ל-exact, צהוב לכיוון, אדום להחמצה או חוסר ניחוש, וכחול כשאין עדיין תוצאה להערכה.
- התצוגה מוגבלת בכוונה לשני משחקי LIVE, כי במבנה הטורניר לא אמורים להיות יותר משני משחקים חיים במקביל; אם יגיעו יותר נתונים, יוצגו שני הראשונים לפי `match_number`.
- מסך הליגה משתמש ב-polling הקיים של גרסת המשחקים ב-dev, כך שעדכוני sync/dev מקומיים מגיעים ל-Leaderboard בלי רענון ידני.
## Implemented scoring hook - 2026-04-26

- The implemented scorer is `lib/game/scoring.ts` with `calculatePredictionPoints(prediction, match)`.
- The sync-side persistence helper is `lib/game/scoring-sync.ts` with `scoreFinishedMatchPredictions(supabase, matchNumbers)`.
- Odds are stored on `matches.home_odds`, `matches.draw_odds`, and `matches.away_odds` via `supabase/migrations/20260426000024_add_match_odds_columns.sql`.
- Current finished-match routes call the helper after `syncTournamentState`; the future Bzzoiro/Cloudflare Worker should call the same helper immediately after it detects a match moving to `finished`.
- The current scoring formula is `odds base points + stage direction bonus + stage exact-score bonus`, then Joker x2 if active. Direction hits receive only the direction bonus; exact hits receive both the direction bonus and the separate exact-score bonus from the knockout matrix.
- The current UI now consumes those odds: `/game/predictions` shows direction/exact reward totals for home/draw/away, and `/game/leagues/[id]` shows projected live `+N` values without persisting them until `status = finished`.
- Dev Tools can edit the three odds columns locally, seed random 1/X/2 odds for every match, and seed random future predictions for the logged-in dev user only.
- Dev Tools `Clear All Match Data` is a local full reset: matches return to scheduled 0-0, odds become null, prediction/tournament/legacy bet rows are deleted, and profile totals are reset to zero so league scoreboards clear without deleting league memberships.
- Scoring persistence treats `null` and `0` differently: a finished miss is written as `points_earned = 0`, which keeps profile totals and leaderboard state deterministic.
- Joker eligibility is now two total Jokers, both group-stage-only. The sync/scoring path must ignore Joker multipliers on knockout matches even if a legacy prediction row still has `is_joker_applied = true`.
- Group-stage live standings render inline live score from the row team's perspective, with the row team's goals on the visual right side in RTL.
- The global leaderboard at `/game/leaderboard` uses the same league leaderboard UI and data shape as private leagues, but sources members from `profiles`; realtime profile-total refreshes require `supabase/migrations/20260426000025_enable_global_leaderboard_realtime.sql`.
- `supabase/migrations/20260426000027_correct_schedule_from_fifa.sql` corrects `matches.match_number` and `matches.date_time` to FIFA's official match order and kickoff timestamps. It relinks existing `predictions.match_id`/`bets.match_id` references to the same fixture after renumbering, and must not alter team sides, placeholders, statuses, scores or odds.
