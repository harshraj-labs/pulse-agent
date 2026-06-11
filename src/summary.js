const Groq = require('groq-sdk');
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Summarize all briefs for the manager digest
async function generateTeamSummary(briefs) {
  if (!briefs || briefs.length === 0) {
    return 'No briefs submitted today.';
  }

  const briefsText = briefs
    .map(
      (b, i) => `
Employee ${i + 1}: ${b.username}
- Tasks Done: ${b.tasks_done}
- Blockers: ${b.blockers}
- Tomorrow: ${b.tomorrow}
`
    )
    .join('\n---\n');

  const prompt = `You are an AI assistant that helps managers understand their team's daily progress.

Here are today's end-of-day briefs from the team:

${briefsText}

Generate a concise manager digest with these sections:
1. 📊 TEAM OVERVIEW — 2-3 sentence summary of overall team progress today
2. ✅ KEY WINS — bullet points of the most important things accomplished
3. 🚧 BLOCKERS TO ADDRESS — list any blockers that need manager attention (if none, say "None reported")
4. 📅 TOMORROW'S FOCUS — what the team is collectively working on tomorrow

Keep it sharp, actionable, and under 300 words. No fluff.`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}

// Flag urgent blockers that need immediate attention
async function flagUrgentBlockers(briefs) {
  if (!briefs || briefs.length === 0) return [];

  const blockersText = briefs
    .filter((b) => b.blockers.toLowerCase() !== 'none')
    .map((b) => `${b.username}: ${b.blockers}`)
    .join('\n');

  if (!blockersText) return [];

  const prompt = `You are a project manager assistant. Review these blockers reported by team members:

${blockersText}

Return a JSON array of urgent blockers that need immediate manager attention.
Each item should have: { "employee": "name", "blocker": "description", "urgency": "high/medium/low" }
Only include blockers that are genuinely blocking work progress.
Return ONLY the JSON array, nothing else, no markdown backticks. If there are no real blockers from the list above, return an empty array [].`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
  });

  try {
    const text = response.choices[0].message.content.trim();
    const parsed = JSON.parse(text);
    const validNames = briefs.map(b => b.username.toLowerCase());
    return parsed.filter(b =>
      validNames.some(name => 
        b.employee.toLowerCase().includes(name) || 
        name.includes(b.employee.toLowerCase())
      )
    );
  } catch {
    return [];
  }
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