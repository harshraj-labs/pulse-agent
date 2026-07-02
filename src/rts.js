// Real-Time Search API integration
// Searches Slack workspace for blocker-related discussions

async function searchBlockerContext(client, blockers) {
  if (!blockers || blockers.length === 0) return null;

  // Build query from today's blockers
  const blockerTerms = blockers
    .filter((b) => b.blockers.toLowerCase() !== 'none')
    .map((b) => b.blockers)
    .join(' OR ');

  if (!blockerTerms) return null;

  try {
    const result = await client.apiCall('assistant.search.context', {
      query: `What are the latest discussions about: ${blockerTerms}?`,
      content_types: ['messages'],
      channel_types: ['public_channel'],
      limit: 5,
    });

    if (!result.ok || !result.results?.messages?.length) return null;

    // Format results for Slack Block Kit
    const messages = result.results.messages
      .slice(0, 3)
      .map((m) => `• *${m.author_name}* in #${m.channel_name}: "${m.content?.slice(0, 120)}..."`)
      .join('\n');

    return messages;
  } catch (error) {
    console.error('❌ RTS API error:', error.message);
    return null;
  }
}

module.exports = { searchBlockerContext };