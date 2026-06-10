require('dotenv').config();
const { App } = require('@slack/bolt');
const { 
  saveBrief, 
  getTodayBriefs, 
  hasSubmittedToday,
  getWeeklyBriefs
} = require('./db');
const { 
  buildBriefModal, 
  buildConfirmationMessage 
} = require('./modal');
const { 
  initScheduler, 
  triggerManualDigest 
} = require('./scheduler');

// Initialize Slack Bolt app with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Manager config — update channelId and teamMembers after setup
const managerConfig = {
  channelId: process.env.MANAGER_CHANNEL_ID || '',
  teamMembers: process.env.TEAM_MEMBERS ? process.env.TEAM_MEMBERS.split(',') : [],
};

// ─────────────────────────────────────────
// SLASH COMMAND: /pulse
// Opens the daily brief modal
// ─────────────────────────────────────────
app.command('/pulse', async ({ command, ack, client, respond }) => {
  await ack();

  // Check if already submitted today
  if (hasSubmittedToday(command.user_id)) {
    await respond({
      response_type: 'ephemeral',
      text: '✅ You already submitted your brief today! Check back tomorrow.',
    });
    return;
  }

  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: buildBriefModal(),
    });
  } catch (error) {
    console.error('❌ Failed to open modal:', error.message);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Something went wrong. Please try again.',
    });
  }
});

// ─────────────────────────────────────────
// SLASH COMMAND: /pulse-status
// Shows who has and hasn't submitted today
// ─────────────────────────────────────────
app.command('/pulse-status', async ({ command, ack, respond }) => {
  await ack();

  const briefs = getTodayBriefs();

  if (briefs.length === 0) {
    await respond({
      response_type: 'ephemeral',
      text: '📊 No briefs submitted yet today.',
    });
    return;
  }

  const submittedList = briefs
    .map((b) => `• *${b.username}* — submitted at ${new Date(b.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
    .join('\n');

  await respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 PULSE Status — Today's Briefs (${briefs.length} submitted)*\n\n${submittedList}`,
        },
      },
    ],
  });
});

// ─────────────────────────────────────────
// SLASH COMMAND: /pulse-report
// Manually triggers the AI manager digest
// ─────────────────────────────────────────
app.command('/pulse-report', async ({ command, ack, respond }) => {
  await ack();

  await respond({
    response_type: 'ephemeral',
    text: '⏳ Generating digest... this will take a few seconds.',
  });

  const success = await triggerManualDigest(command.channel_id);

  if (!success) {
    await respond({
      response_type: 'ephemeral',
      text: '❌ Failed to generate digest. Make sure briefs have been submitted today.',
    });
  }
});

// ─────────────────────────────────────────
// SLASH COMMAND: /pulse-blockers  
// Shows all blockers reported today
// ─────────────────────────────────────────
app.command('/pulse-blockers', async ({ command, ack, respond }) => {
  await ack();

  const briefs = getTodayBriefs();
  const blockers = briefs.filter(
    (b) => b.blockers.toLowerCase() !== 'none' && b.blockers.trim() !== ''
  );

  if (blockers.length === 0) {
    await respond({
      response_type: 'ephemeral',
      text: '✅ No blockers reported today. Team is unblocked!',
    });
    return;
  }

  const blockerList = blockers
    .map((b) => `• *${b.username}:* ${b.blockers}`)
    .join('\n');

  await respond({
    response_type: 'in_channel',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚧 Active Blockers — ${blockers.length} reported today*\n\n${blockerList}`,
        },
      },
    ],
  });
});

// ─────────────────────────────────────────
// BUTTON ACTION: open_brief_modal
// Handles the "Submit Brief Now" button in reminders
// ─────────────────────────────────────────
app.action('open_brief_modal', async ({ body, ack, client }) => {
  await ack();

  if (hasSubmittedToday(body.user.id)) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: '✅ You already submitted your brief today!',
    });
    return;
  }

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildBriefModal(),
    });
  } catch (error) {
    console.error('❌ Failed to open modal from button:', error.message);
  }
});

// ─────────────────────────────────────────
// MODAL SUBMISSION: brief_submission
// Handles when employee submits their brief
// ─────────────────────────────────────────
app.view('brief_submission', async ({ ack, body, view, client }) => {
  await ack();

  const userId = body.user.id;
  const username = body.user.name;

  // Extract values from modal fields
  const values = view.state.values;
  const tasksDone = values.tasks_done_block.tasks_done.value;
  const blockers = values.blockers_block.blockers.value;
  const tomorrow = values.tomorrow_block.tomorrow.value;

  try {
    // Save to database
    saveBrief({
      user_id: userId,
      username,
      tasks_done: tasksDone,
      blockers,
      tomorrow,
    });

    console.log(`✅ Brief saved for ${username}`);

    // Send confirmation DM to employee
    const confirmation = buildConfirmationMessage(username);
    await client.chat.postMessage({
      channel: userId,
      text: `✅ Brief received, ${username}!`,
      ...confirmation,
    });

  } catch (error) {
    console.error('❌ Failed to save brief:', error.message);
  }
});

// ─────────────────────────────────────────
// APP MENTION: @PULSE help
// Basic help message when bot is mentioned
// ─────────────────────────────────────────
app.event('app_mention', async ({ event, say }) => {
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👋 *Hey <@${event.user}>! I'm PULSE.*\n\nHere's what I can do:`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '• */pulse* — Submit your daily brief',
            '• */pulse-status* — See who submitted today',
            '• */pulse-report* — Generate AI team digest now',
            '• */pulse-blockers* — See all active blockers',
          ].join('\n'),
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Automated briefs fire at 5 PM IST every weekday. Digest goes to managers at 6 PM._',
          },
        ],
      },
    ],
  });
});

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
(async () => {
  try {
    await app.start();
    console.log('⚡ PULSE is running!');
    console.log('📋 Daily briefs: 5:00 PM IST');
    console.log('🔔 Reminders:    5:45 PM IST');
    console.log('📊 Digest:       6:00 PM IST');
    console.log('📅 Schedule:     Monday — Friday');

    // Initialize the scheduler with the app instance
    initScheduler(app, managerConfig);

  } catch (error) {
    console.error('❌ Failed to start PULSE:', error);
    process.exit(1);
  }
})();