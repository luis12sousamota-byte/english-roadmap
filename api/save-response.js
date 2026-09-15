// Vercel Serverless Function — receives a completed diagnosis and appends
// it as a row in a Google Sheet via SheetDB (https://sheetdb.io).
//
// Required environment variable (set in Vercel → Project → Settings → Environment Variables):
//   SHEETDB_API_URL  — the endpoint URL SheetDB gives you after connecting your Google Sheet
//                       (looks like https://sheetdb.io/api/v1/xxxxxxxxxxxxx)

const MAX_LEN = 500;

function clean(value) {
  if (value == null) return "";
  return String(value).slice(0, MAX_LEN);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sheetUrl = process.env.SHEETDB_API_URL;
  if (!sheetUrl) {
    res.status(500).json({ error: "SHEETDB_API_URL is not configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const row = {
    timestamp: new Date().toISOString(),
    name: clean(body.name),
    location: clean(body.location),
    job: clean(body.job),
    hobbies: clean(body.hobbies),
    brazil_recommendation: clean(body.brazilRecommendation),
    listening_reply: clean(body.listeningReply),
    listening_skipped: clean(body.listeningSkipped),
    pain: clean(body.pain),
    goals: clean(Array.isArray(body.goals) ? body.goals.join(", ") : body.goals),
    goal_other: clean(body.goalOther),
    obstacle: clean(body.obstacle),
    obstacle_other: clean(body.obstacleOther),
    boss1: clean(body.boss1),
    boss2: clean(body.boss2),
    boss3: clean(body.boss3),
    score_communication: clean(body.scoreCommunication),
    score_vocabulary: clean(body.scoreVocabulary),
    score_listening: clean(body.scoreListening),
    score_spontaneity: clean(body.scoreSpontaneity),
    profile_key: clean(body.profileKey),
    profile_title: clean(body.profileTitle),
    estimated_level: clean(body.estimatedLevel),
  };

  try {
    const sheetRes = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [row] }),
    });
    if (!sheetRes.ok) {
      const text = await sheetRes.text().catch(() => "");
      res.status(502).json({ error: "Failed to save to sheet", detail: text.slice(0, 300) });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Unexpected error", detail: String(err).slice(0, 300) });
  }
};
