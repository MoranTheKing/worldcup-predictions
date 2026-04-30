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

API-ready stats fields already exposed by the app:

- `teams.outright_odds`, `teams.outright_odds_updated_at`, `teams.coach_name`, `teams.coach_updated_at`.
- `players.goals`, `players.assists`, `players.appearances`, `players.minutes_played`, `players.yellow_cards`, `players.red_cards`.
- `players.top_scorer_odds`, `players.top_scorer_odds_updated_at` from `20260427000031_add_top_scorer_odds.sql`.
- `team_recent_matches` stores the five pre-tournament form matches for team pages.

Visible stat surfaces:

- `/dashboard/stats` is the global prominent tables page for player leaders, card leaders, top-scorer odds, team leaders, and outright odds.
- `/dashboard/teams/[id]/team-stats` is the per-team statistics page.
- `/dashboard/teams/[id]/stats` is the per-team player statistics page.

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
- Leaderboards rank rows by projected live score during LIVE (`profiles.total_score + projected live points`) and use `profiles.created_at` as the current tie-breaker.
- The game hero follows the same final-vs-live split: `profiles.total_score` remains finished-only, while `/api/game/live-score-projection` calculates a temporary signed-in-user `LIVE +N` badge from the two current live matches.
- If a correction moves a match away from `finished`, the sync/dev route must call `clearUnfinishedMatchScoring` so `points_earned` returns to `0` for that match and profile totals are recalculated.
- Dev Tools can edit the three odds columns locally, seed random 1/X/2 odds for every match, and seed random future predictions for the logged-in dev user only.
- Dev Tools `Clear All Match Data` is a local full reset: matches return to scheduled 0-0, odds become null, prediction/tournament/legacy bet rows are deleted, and profile totals are reset to zero so league scoreboards clear without deleting league memberships.
- Scoring persistence treats `null` and `0` differently: a finished miss is written as `points_earned = 0`, which keeps profile totals and leaderboard state deterministic.
- Joker eligibility is now two total Jokers, both group-stage-only. The sync/scoring path must ignore Joker multipliers on knockout matches even if a legacy prediction row still has `is_joker_applied = true`.
- Joker availability in the game header is also phase-aware: unused group-stage Jokers become expired once no scheduled group match remains or a knockout match has started.
- Group-stage live standings render inline live score from the row team's perspective, with the row team's goals on the visual right side in RTL.
- The global leaderboard at `/game/leaderboard` uses the same league leaderboard UI and data shape as private leagues, but sources members from `profiles`; realtime profile-total refreshes require `supabase/migrations/20260426000025_enable_global_leaderboard_realtime.sql`.
- `supabase/migrations/20260426000027_correct_schedule_from_fifa.sql` corrects `matches.match_number` and `matches.date_time` to FIFA's official match order and kickoff timestamps. It relinks existing `predictions.match_id`/`bets.match_id` references to the same fixture after renumbering, and must not alter team sides, placeholders, statuses, scores or odds.
- `supabase/migrations/20260426000028_align_knockout_kickoffs_israel.sql` aligns knockout matches 74-90 to the Israel-time knockout schedule by match number. It is date/time-only and keeps all bracket placeholders and match numbers intact.

## Team profile API fields - 2026-04-27

- `teams.outright_odds` and `teams.outright_odds_updated_at` hold live tournament-winning odds for `/dashboard/teams` and `/dashboard/teams/[id]`.
- `teams.coach_name` and `teams.coach_updated_at` hold the head coach card for squad/profile pages.
- `players.appearances`, `players.minutes_played`, `players.yellow_cards`, and `players.red_cards` support the new team stats route.
- `team_recent_matches` stores five pre-tournament form matches per team, with result, score, opponent, competition, source, and date.
- These fields are introduced by `supabase/migrations/20260427000030_add_team_api_profile_fields.sql`.
- RTL rule for API consumers: when rendering scores from a selected team's perspective, pass team goals first and render them on the visual right side. Do not reuse home-away LTR score order inside team profile cards.

## Team roster visuals and odds controls - 2026-04-27

- `supabase/migrations/20260427000032_add_player_roster_visual_fields.sql` adds `players.photo_url` and `players.shirt_number` for the squad page. The API sync should fill those fields together with player position and stats.
- `/dashboard/teams/[id]/squad` now renders a coach card, formation pitch, player avatars/photos, shirt numbers, and compact player stats. If the API lacks a photo, the UI falls back to initials.
- Team and global stats tables should render goal totals as explicit `זכות` and `חובה`, not `GF:GA` or `10:5`, to avoid RTL ambiguity.
- Dev Tools now has manual team outright odds editing and reset via `/api/dev/outright-odds/teams`. Top-scorer odds remain random/API-fed until the external player feed is connected.
- API sync can start with a source-ID mapping phase: store external team, match, and player identifiers, then sync match clocks/scores, odds, rosters, coach data, recent form, and player stats into Supabase. Browser UI should continue reading Supabase only.

## Dev odds and sync execution note - 2026-04-27

- `/api/dev/outright-odds/teams` now updates existing team rows instead of upserting. This prevents a partial Dev Tools save from creating a `teams` row without the required `name` column.
- Dev Tools includes a team-only random outright-odds action for all existing national teams. The existing combined randomizer still seeds team outright odds and top-scorer odds, but both paths are update-only.
- The BSD migration only adds storage for external IDs, coach images, and sync timestamps. Data appears only after the server route `POST /api/dev/bzzoiro/sync-teams` runs successfully.
- Current visible BSD fields after a successful sync are team external IDs/images, coach name/photo, player external IDs/photos/shirt numbers, and refreshed squad/team pages. Live match clocks and score syncing remain a later Worker slice.
- The browser calls only local app routes. BSD API requests and the BSD token stay on the server route, so ordinary users do not create per-visit BSD traffic.
- The sync also cleans the initial 49 mock top-scorer players. Exact BSD matches overwrite the mock row in place with image and source IDs; stale mock rows that duplicate an already-synced BSD player or have no BSD source match are removed after legacy `outright_bets.predicted_top_scorer_player_id` references are migrated.

## Implemented team sync foundation - 2026-04-27

- Added localhost-only `POST /api/dev/bzzoiro/sync-teams` as the first BSD sync slice. It is intentionally dev-only and still Supabase-first.
- The route uses BSD's documented `Authorization: Token` header and reads from `/api/teams/`, `/api/players/?national_team=...`, `/api/managers/?team_id=...`, plus public `/img/team|player|manager/{id}/` image URLs.
- Added `supabase/migrations/20260427000033_add_bzzoiro_sync_fields.sql` for `teams.bzzoiro_team_id`, `teams.coach_bzzoiro_id`, `teams.coach_photo_url`, `players.bzzoiro_player_id`, and sync timestamps.
- The configured World Cup league currently returns placeholder teams as well as real teams, so the sync paginates and matches local teams by alias-normalized names. The checked alias set maps all 48 local teams, including `Czech Republic/Czechia` and `Bosnia and Herzegovina/Bosnia & Herzegovina`.
- Dev Tools exposes this as `סנכרון נבחרות BSD`; it should be run only after the new migration exists in Supabase.
- This foundation does not alter match scores/clocks yet. The production Worker should reuse the same server-side client pattern later for events/live/odds.

## Implemented recent-form sync slice - 2026-04-27

- The dev sync route now also reads BSD `/api/events/` with a server-side token for each matched national team.
- Only finished events whose home or away team name exactly matches the local/BSD team aliases are inserted. This prevents broad API searches such as `United States` from saving unrelated club fixtures.
- Synced recent matches are stored in `team_recent_matches` with `source = 'bzzoiro-events'`; each sync deletes and replaces only that source for the team, leaving any future manual source rows untouched.
- The current manual run synced 96 recent-form rows across 35 teams. Teams without rows generally mean BSD returned no finished national-team events for the exact team alias, not a UI bug.
- This remains Supabase-first: dashboard pages read `team_recent_matches`; regular browsers do not call BSD `/api/events/` directly.
- BSD image URLs such as `/img/player/{id}/` and `/img/manager/{id}/` are public image fetches, not authenticated JSON API calls. They still hit BSD's image host from the browser, so a later production optimization can proxy/cache them through Next image optimization, Supabase Storage, or Cloudflare R2.

## Implemented odds/outrights sync slice - 2026-04-27

- Added `POST /api/admin/bzzoiro/sync-odds`, protected by localhost in dev or a bearer admin/cron secret in production. It fetches BSD `/api/events/` server-side, matches events to local teams by BSD IDs or normalized names, and writes `matches.home_odds`, `matches.draw_odds`, and `matches.away_odds` when all three odds are present.
- A manual run checked 104 local matches and updated 24 match-odds rows; 48 matched events had no odds yet and 32 had no event match, which is expected while the provider feed is incomplete.
- The browser never calls BSD for odds. Dev Tools triggers the local route, and public pages continue to consume Supabase.
- Product decision as of 2026-04-30: match odds remain 1X2-only for the prediction game. Do not sync over/under, BTTS, double chance, draw-no-bet, bookmaker snapshots or Polymarket markets into the scoring path unless the product explicitly changes.
- The odds route can now receive `date_from` and `date_to` for active-window cron runs. Calling it without dates intentionally remains a full 104-match 1X2 refresh.
- Outright prediction odds are locked at save time from Supabase (`teams.outright_odds`, `players.top_scorer_odds`) and finalized by `POST /api/admin/finalize-tournament`.
- The recent-form sync now translates opponent names before writing `team_recent_matches`; verified sample: Jordan's recent-form row stores `ניגריה` instead of `Nigeria`.

## Implemented live cron and BSD model predictions - 2026-04-30

- Added protected `POST /api/admin/bzzoiro/sync-live` for the production cron path. It merges BSD `/events/` for the requested date window with BSD `/live/`, then updates local match status, score, minute, penalties and 1X2 odds while keeping Supabase as the UI source of truth.
- `sync-live` calls `syncTournamentState` after updates, runs `scoreFinishedMatchPredictions` for matches that are now finished, and calls `clearUnfinishedMatchScoring` if an API correction moves a match away from finished.
- Added protected `POST /api/admin/bzzoiro/sync-predictions` for BSD's model predictions feed. These fields are stored on `matches` as BSD model data only and do not touch user `predictions`, `bets`, private leagues or locked odds.
- Added `supabase/migrations/20260430000038_add_bsd_match_prediction_fields.sql` for BSD model probabilities, expected goals, confidence, most-likely score, model version, raw JSON and sync timestamp.
- Added `cloudflare/bzzoiro-cron-worker.js` plus `cloudflare/wrangler.bzzoiro-cron.example.toml`. With the sample one-minute trigger, live sync runs immediately and then again after `LIVE_SECOND_PULSE_SECONDS` seconds, active-window 1X2 odds every 5 minutes, full 1X2 odds every 30 minutes, and BSD model predictions every 15 minutes.
- Match pages now treat pre-match preview as pre-match only. Once a match is live or finished, form/H2H/coaches preview, broadcasts and 1X2 odds are hidden so the screen is focused on live score, stats, incidents, lineups, player stats, shots and momentum.
- Added local-only `GET /api/dev/bzzoiro/live-match/[id]` for inspecting a live BSD event without writing to Supabase.
- Added local-only `/dashboard/matches/bsd-live/[id]` as a visual match-page preview for a real BSD event. It renders through the normal match detail UI without writing to Supabase.
- Live UX priority is now event-first: the event timeline renders immediately below the hero, period-only API rows are filtered out, timeline score chips use the same visual RTL order as the hero, and momentum/shotmap stays lower on the page.
- During live matches, predicted-lineup data is labeled as a temporary BSD model until actual lineups arrive. API incidents are mapped back onto lineup/bench players by id, full name, and last-name fallback so goals, assists and cards appear on the squad UI as the feed updates.
- Formation pitches now use fixed per-line grids instead of card wrapping, so mobile keeps formations such as `4-2-3-1` visually faithful across match and squad pages.
- Lineup rating badges now use a performance color scale, while each team's top-rated player keeps a distinct star treatment instead of sharing the same dark badge style.
- The separate featured-player panel was removed from the match page to reduce visual duplication; per-player ratings and events remain available on the lineup, timeline and shot panels.

## Outright picker and player-feed pagination - 2026-04-27

- Tournament-winner and top-scorer pickers display their current possible reward inline as `+N`; missing odds intentionally render as `+0`.
- Player-based top-scorer lists and Dev randomization endpoints must paginate `players` in batches so synced rosters above 1000 rows are not silently truncated.
- Picker UI reads player photos from `players.photo_url`; the browser still reads Supabase data only and does not call BSD JSON APIs directly.

## Implemented coach profile pages - 2026-04-29

- Added `/dashboard/coaches/[id]` as a national-team coach page keyed by the local team id.
- The page reads the local team from Supabase and then calls BSD server-side through `lib/bzzoiro/managers.ts`: first `/api/managers/?team_id=...`, then `/api/managers/{id}/` when a manager id is available.
- The coach page displays manager identity, country, preferred formation, formation usage, tactical profile, team style, pressing intensity, defensive line, top tactical styles, record, win percentage, goals, xG, possession, shots, cards, fouls, clean sheets and goals-market percentages when BSD returns them.
- Existing coach cards/rows on `/dashboard/teams/[id]`, `/dashboard/teams/[id]/squad`, and `/dashboard/teams/[id]/stats` now link to the coach page through `components/CoachLink.tsx`.
- No new SQL was needed for this slice. The existing `teams.bzzoiro_team_id`, `teams.coach_bzzoiro_id`, `teams.coach_name`, and `teams.coach_photo_url` columns are enough for routing and fallback display; the richer coach profile is live server-side API data.
- Manual sync after this change refreshed 48 matched teams, 47 coaches, 1087 player roster rows, 16 legacy player enrichments, and 96 recent-form rows across 35 teams.

## Implemented lineup/player data refinement - 2026-04-29

- `lib/bzzoiro/lineups.ts` now adds a server-side helper for BSD `GET /api/predicted-lineup/{event_id}/`. The squad page first searches the upcoming World Cup events for the team's BSD id and uses the predicted lineup when BSD has generated it.
- When BSD has no predicted lineup yet, `/dashboard/teams/[id]/squad` still uses API data instead of a hard-coded formation: manager `preferred_formation` drives the shape, and the projected XI is selected by role using position, minutes, appearances, shirt number and top-scorer odds.
- `lib/bzzoiro/players.ts` now wraps BSD `GET /api/players/{id}/` and `GET /api/player-stats/?player=...` for server components. The player page presents local World Cup 2026 stats separately from broader BSD match-history aggregates.
- The current BSD player-stat rows do not carry a World Cup-only season/league discriminator in the page helper. The UI therefore avoids calling those rows World Cup data unless they are the local Supabase tournament columns.
- No new SQL was needed. The existing `players.bzzoiro_player_id`, `players.photo_url`, `players.shirt_number`, `players.top_scorer_odds`, and team BSD id columns are enough for these live server-side reads.
- Global and team player-stat tables now use odds as the first tie-breaker while all tournament stats are zero. This makes pre-tournament tables line up with betting-market order until actual goals, assists, cards or points exist.
