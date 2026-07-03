// Real-Time Search API integration
// Searches Slack workspace for blocker-related discussions using user token

async function searchBlockerContext(client, blockers) {
  if (!blockers || blockers.length === 0) return null;

  const blockerTerms = blockers
    .filter((b) => b.blockers.toLowerCase() !== 'none')
    .map((b) => b.blockers)
    .join(' OR ');

  if (!blockerTerms) return null;

  try {
    const { WebClient } = require('@slack/web-api');
    const userClient = new WebClient(process.env.SLACK_USER_TOKEN);

    const result = await userClient.search.messages({
      query: blockerTerms,
      count: 5,
      sort: 'timestamp',
      sort_dir: 'desc',
    });

    if (!result.ok || !result.messages?.matches?.length) return null;

    const messages = result.messages.matches
      .slice(0, 3)
      .map((m) => `• *${m.username}* in #${m.channel?.name}: "${m.text?.slice(0, 120)}..."`)
      .join('\n');

    return messages;
  } catch (error) {
    console.error('❌ RTS API error:', error.message);
    return null;
  }
}

module.exports = { searchBlockerContext };