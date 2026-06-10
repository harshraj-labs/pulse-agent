// The Slack modal that appears when an employee runs /pulse or gets prompted
function buildBriefModal() {
  return {
    type: 'modal',
    callback_id: 'brief_submission',
    title: {
      type: 'plain_text',
      text: '📋 Daily Brief — PULSE',
    },
    submit: {
      type: 'plain_text',
      text: 'Submit Brief',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*End of day check-in* — takes 60 seconds. Your manager gets a digest, not a meeting. 🎯',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'input',
        block_id: 'tasks_done_block',
        label: {
          type: 'plain_text',
          text: '✅ What did you get done today?',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'tasks_done',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'e.g. Finished the login page, reviewed 3 PRs, fixed the auth bug...',
          },
        },
      },
      {
        type: 'input',
        block_id: 'blockers_block',
        label: {
          type: 'plain_text',
          text: '🚧 Any blockers or issues?',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'blockers',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'e.g. Waiting on API keys from DevOps, unclear requirements on feature X... or type "None"',
          },
        },
      },
      {
        type: 'input',
        block_id: 'tomorrow_block',
        label: {
          type: 'plain_text',
          text: '🗓️ What\'s the plan for tomorrow?',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'tomorrow',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'e.g. Start on the dashboard component, sync with design team...',
          },
        },
      },
    ],
  };
}

// Confirmation message sent to employee after submission
function buildConfirmationMessage(username) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Brief received, ${username}!*\nYour manager will get a digest at 6 PM. No meeting needed. Keep shipping. 🚀`,
        },
      },
    ],
  };
}

// Message sent to employees who haven't submitted yet (reminder)
function buildReminderMessage() {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Daily Brief Reminder — PULSE*\nTake 60 seconds to submit your end-of-day brief. Your team is counting on it.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 Submit Brief Now',
            },
            action_id: 'open_brief_modal',
            style: 'primary',
          },
        ],
      },
    ],
  };
}

module.exports = {
  buildBriefModal,
  buildConfirmationMessage,
  buildReminderMessage,
};