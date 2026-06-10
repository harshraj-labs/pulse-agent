const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'pulse.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    tasks_done TEXT NOT NULL,
    blockers TEXT NOT NULL,
    tomorrow TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Save a brief
function saveBrief({ user_id, username, tasks_done, blockers, tomorrow }) {
  const date = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    INSERT INTO briefs (user_id, username, tasks_done, blockers, tomorrow, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(user_id, username, tasks_done, blockers, tomorrow, date);
}

// Get today's briefs
function getTodayBriefs() {
  const date = new Date().toISOString().split('T')[0];
  return db.prepare('SELECT * FROM briefs WHERE date = ?').all(date);
}

// Get briefs by date
function getBriefsByDate(date) {
  return db.prepare('SELECT * FROM briefs WHERE date = ?').all(date);
}

// Check if user already submitted today
function hasSubmittedToday(user_id) {
  const date = new Date().toISOString().split('T')[0];
  const result = db.prepare(
    'SELECT id FROM briefs WHERE user_id = ? AND date = ?'
  ).get(user_id, date);
  return !!result;
}

// Get weekly briefs for a user
function getWeeklyBriefs(user_id) {
  return db.prepare(`
    SELECT * FROM briefs 
    WHERE user_id = ? 
    AND date >= date('now', '-7 days')
    ORDER BY date DESC
  `).all(user_id);
}

// Save team config
function saveTeam({ manager_id, channel_id, team_name }) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO teams (manager_id, channel_id, team_name)
    VALUES (?, ?, ?)
  `);
  return stmt.run(manager_id, channel_id, team_name);
}

// Get all teams
function getAllTeams() {
  return db.prepare('SELECT * FROM teams').all();
}

module.exports = {
  saveBrief,
  getTodayBriefs,
  getBriefsByDate,
  hasSubmittedToday,
  getWeeklyBriefs,
  saveTeam,
  getAllTeams
};