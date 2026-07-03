const cron = require('node-cron');
const { getTodayBriefs, hasSubmittedToday } = require('./db');
const { generateTeamSummary, flagUrgentBlockers, buildManagerDigest } = require('./summary');
const { buildReminderMessage } = require('./modal');

// Store app reference (set when scheduler is initialized)
let slackApp = null;
let managerConfig = null;

// Initialize scheduler with the Slack app instance
function initScheduler(app, config) {
  slackApp = app;
  managerConfig = config;

  // 5:00 PM - trigger brief modal for all team members
  cron.schedule('0 17 * * 1-5', async () => {
    console.log('⏰ 5 PM trigger - sending brief reminders...');
    await sendBriefReminders();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 5:45 PM - send reminder to anyone who hasn't submitted yet
  cron.schedule('45 17 * * 1-5', async () => {
    console.log('⏰ 5:45 PM - sending follow-up reminders...');
    await sendFollowUpReminders();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 6:00 PM - send manager digest
  cron.schedule('0 18 * * 1-5', async () => {
    console.log('⏰ 6 PM - generating manager digest...');
    await sendManagerDigest();
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ PULSE scheduler initialized (IST timezone, Mon-Fri)');
}

// Send brief reminder DM to all team members
async function sendBriefReminders() {
  if (!managerConfig || !managerConfig.teamMembers) return;

  for (const userId of managerConfig.teamMembers) {
    try {
      const alreadySubmitted = hasSubmittedToday(userId);
      if (!alreadySubmitted) {
        await slackApp.client.chat.postMessage({
          channel: userId, // DM by user ID
          text: '📋 Time to submit your daily brief!',
          ...buildReminderMessage(),
        });
        console.log(`✅ Reminder sent to ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${userId}:`, error.message);
    }
  }
}

// Send follow-up reminder to people who STILL haven't submitted
async function sendFollowUpReminders() {
  if (!managerConfig || !managerConfig.teamMembers) return;

  for (const userId of managerConfig.teamMembers) {
    try {
      const alreadySubmitted = hasSubmittedToday(userId);
      if (!alreadySubmitted) {
        await slackApp.client.chat.postMessage({
          channel: userId,
          text: '⚠️ Last call! Submit your daily brief before the 6 PM digest.',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '⚠️ *Last call!* The manager digest goes out in 15 minutes. Submit your brief now so your work gets counted.',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📋 Submit Now',
                  },
                  action_id: 'open_brief_modal',
                  style: 'danger',
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error(`❌ Failed to send follow-up to ${userId}:`, error.message);
    }
  }
}

// Generate and send the manager digest to the team channel
async function sendManagerDigest() {
  if (!managerConfig || !managerConfig.channelId) {
    console.log('⚠️ No manager config found, skipping digest');
    return;
  }

  try {
    const briefs = getTodayBriefs();

    if (briefs.length === 0) {
      await slackApp.client.chat.postMessage({
        channel: managerConfig.channelId,
        text: '📊 PULSE Digest: No briefs submitted today.',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '📊 *PULSE Daily Digest*\n\nNo briefs were submitted today. Consider following up with your team.',
            },
          },
        ],
      });
      return;
    }

    // Generate AI summary and flag blockers in parallel
    const [summary, urgentBlockers] = await Promise.all([
      generateTeamSummary(briefs),
      flagUrgentBlockers(briefs),
    ]);

    const digest = buildManagerDigest(summary, briefs, urgentBlockers);

    await slackApp.client.chat.postMessage({
      channel: managerConfig.channelId,
      text: '📊 PULSE Daily Team Digest',
      ...digest,
    });

    console.log(`✅ Manager digest sent to ${managerConfig.channelId}`);
  } catch (error) {
    console.error('❌ Failed to send manager digest:', error.message);
  }
}

// Manually trigger digest (used by /pulse report command)
async function triggerManualDigest(channelId) {
  try {
    const briefs = getTodayBriefs();

    const [summary, urgentBlockers] = await Promise.all([
      generateTeamSummary(briefs),
      flagUrgentBlockers(briefs),
    ]);

    const digest = buildManagerDigest(summary, briefs, urgentBlockers);

    await slackApp.client.chat.postMessage({
      channel: channelId,
      text: '📊 PULSE Daily Team Digest (Manual)',
      ...digest,
    });

    return true;
  } catch (error) {
    console.error('❌ Manual digest failed:', error.message);
    return false;
  }
}

module.exports = {
  initScheduler,
  sendBriefReminders,
  sendManagerDigest,
  triggerManualDigest,
};