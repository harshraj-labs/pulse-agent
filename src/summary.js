const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Summarize all briefs for the manager digest
// async function generateTeamSummary(briefs) {
//   if (!briefs || briefs.length === 0) {
//     return 'No briefs submitted today.';
//   }

//   const briefsText = briefs
//     .map(
//       (b, i) => `
// Employee ${i + 1}: ${b.username}
// - Tasks Done: ${b.tasks_done}
// - Blockers: ${b.blockers}
// - Tomorrow: ${b.tomorrow}
// `
//     )
//     .join('\n---\n');

//   const prompt = `You are an AI assistant that helps managers understand their team's daily progress.

// Here are today's end-of-day briefs from the team:

// ${briefsText}

// Generate a concise manager digest with these sections:
// 1. 📊 TEAM OVERVIEW — 2-3 sentence summary of overall team progress today
// 2. ✅ KEY WINS — bullet points of the most important things accomplished
// 3. 🚧 BLOCKERS TO ADDRESS — list any blockers that need manager attention (if none, say "None reported")
// 4. 📅 TOMORROW'S FOCUS — what the team is collectively working on tomorrow

// Keep it sharp, actionable, and under 300 words. No fluff.`;

//   const result = await model.generateContent(prompt);
//   return result.response.text();
// }
async function generateTeamSummary(briefs) {
  if (!briefs || briefs.length === 0) return 'No briefs submitted today.';
  
  return `📊 *TEAM OVERVIEW*\nTeam made solid progress today with ${briefs.length} member(s) submitting briefs.\n\n✅ *KEY WINS*\n${briefs.map(b => `• ${b.username}: ${b.tasks_done}`).join('\n')}\n\n🚧 *BLOCKERS TO ADDRESS*\n${briefs.filter(b => b.blockers.toLowerCase() !== 'none').map(b => `• ${b.username}: ${b.blockers}`).join('\n') || 'None reported'}\n\n📅 *TOMORROW\'S FOCUS*\n${briefs.map(b => `• ${b.username}: ${b.tomorrow}`).join('\n')}`;
}

// Flag urgent blockers that need immediate attention
// async function flagUrgentBlockers(briefs) {
//   if (!briefs || briefs.length === 0) return [];

//   const blockersText = briefs
//     .filter((b) => b.blockers.toLowerCase() !== 'none')
//     .map((b) => `${b.username}: ${b.blockers}`)
//     .join('\n');

//   if (!blockersText) return [];

//   const prompt = `You are a project manager assistant. Review these blockers reported by team members:

// ${blockersText}

// Return a JSON array of urgent blockers that need immediate manager attention.
// Each item should have: { "employee": "name", "blocker": "description", "urgency": "high/medium/low" }
// Only include blockers that are genuinely blocking work progress.
// Return ONLY the JSON array, nothing else, no markdown backticks.`;

//   const result = await model.generateContent(prompt);

//   try {
//     const text = result.response.text().trim();
//     return JSON.parse(text);
//   } catch {
//     return [];
//   }
// }
async function flagUrgentBlockers(briefs) {
  return [];
}

// Format the manager digest as a Slack Block Kit message
function buildManagerDigest(summary, briefs, urgentBlockers) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const submittedNames = briefs.map((b) => `• ${b.username}`).join('\n');

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 PULSE — Daily Team Digest',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*${date}* — ${briefs.length} brief${briefs.length !== 1 ? 's' : ''} submitted`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: summary,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*👥 Submitted Today:*\n${submittedNames}`,
      },
    },
  ];

  if (urgentBlockers && urgentBlockers.length > 0) {
    const blockerText = urgentBlockers
      .map(
        (b) => `• *${b.employee}* — ${b.blocker} _(${b.urgency} urgency)_`
      )
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔴 Urgent Blockers Flagged:*\n${blockerText}`,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '_Powered by PULSE — eliminating unnecessary meetings, one digest at a time._',
      },
    ],
  });

  return { blocks };
}

module.exports = {
  generateTeamSummary,
  flagUrgentBlockers,
  buildManagerDigest,
};