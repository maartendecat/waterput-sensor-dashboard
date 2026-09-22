import Database from "better-sqlite3";

const DB_PATH = process.env.WATERPUT_DB_PATH ?? "/data/waterput.db";

let db: Database.Database | null = null;

/**
 * De metingentabel gebruikt `ts` (unix-seconden, UTC) als primaire sleutel.
 * Dat maakt het herafspelen van de buffer in de poller idempotent: een meting
 * die al binnen is, wordt door INSERT OR IGNORE gewoon genegeerd in plaats van
 * dat ze de reeks dubbel telt.
 */
function migrate(handle: Database.Database): void {
  handle.exec(`
    CREATE TABLE IF NOT EXISTS measurements (
      ts          INTEGER PRIMARY KEY,
      distance_mm INTEGER,
      error       TEXT
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  // WAL laat de lezende webserver en de schrijvende ingest-route naast elkaar
  // werken zonder dat de een de ander blokkeert.
  db.pragma("journal_mode = WAL");
  // Wacht liever even op een lock dan meteen SQLITE_BUSY terug te geven.
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  migrate(db);

  return db;
}
