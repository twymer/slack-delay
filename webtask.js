/**
 * @param context {WebtaskContext}
 */

const { WebClient } = require('@slack/client');
const moment = require('moment');

const sendMessage = (slackClient, messageData) => {
  // Should better handle the case where the call to Slack doesn't succeed.
  slackClient.chat.postMessage(messageData.slackMessage)
    .then((res) => {
      console.log('Message sent: ', res.ts);
    })
    .catch(console.error);
};

const parseMessage = (message) => {
  // Messages come in the format of how long to delay and then the message
  // Limited to minutes or hours, because really you shouldn't be queueing
  // a Slack message for days in the future, should you?
  // Examples:
  // 30 minutes Hey, have you finished your TPS reports yet?
  // 5 hours No I was definitely not working at 4 am, again.
  const messageRegex = /^(\d+) (hours|minutes) (.*)/;
  const splitMessage = messageRegex.exec(message);

  if (splitMessage !== null) {
    return {
      sendAt: moment().utc().add(splitMessage[1], splitMessage[2]).toDate(),
      text: splitMessage[3],
    };
  }
};

const extractMessageData = (slackClient, context) => {
  // Take the context object that comes from a Slack post request and
  // extract the data we need to store to be able to later send the message
  // that the user queued.
  const userId = context.body.user_id;
  const userName = context.body.user_name;
  const conversationId = context.body.channel_id;
  const message = parseMessage(context.body.text);

  return slackClient.users.profile.get({user: userId})
    .then((res) => {
      const messageData = {
        slackMessage: {
          channel: conversationId,
          text: message.text,
          username: res.profile.display_name,
          icon_url: res.profile.image_48,
        },
        sendAt: message.sendAt,
      };

      return messageData;
    });
};

const saveMessage = (slackClient, context, messageData) => {
  // Save the parsed message to the queue of messages to be sent via
  // scheduler later.

  // NOTE: Not using a proper database for simplicity here so just keeping a
  // list of objects in the webtask storage for this.

  return context.storage.get((error, data) => {
    if (error) return cb(error);
    data = data || { messages: [] };

    data.messages.push(messageData);

    context.storage.set(data, (error) => {
      if (error) return cb(error);
    });
  });
};

const readyToSend = (message) => {
  // A message is ready to send if the time it is set to send at is
  // in the past.
  return moment().utc().isAfter(message.sendAt);
};

const sendMessages = (slackClient, context) => {
  // This method will go through pending messages and send those that are
  // due to be sent (meaning those whose queued times are now in the past).
  context.storage.get((error, data) => {
    if (error) return cb(error);
    var messages = data.messages || [];

    messages.forEach((message) => {
      if (readyToSend(message)) {
        // This doesn't wait on the Promise to finish before removing
        // but error handling is still a todo in general.
        sendMessage(slackClient, message);

        // Remove sent message
        data.messages.splice(messages.indexOf(message), 1);
      } else {
        console.log("Not time to send yet!");
        console.log(message.sendAt);
        console.log(moment().utc().toDate());
      }
    });

    // We have removed sent messages from the data object so updating
    // the storage will remove these from our queue.
    context.storage.set(data, (error) => {
      if (error) return cb(error);
    });
  });
};

const formatConfirmationMessage = (message) => {
  // Slack provides some nice helpers for formatting dates and times
  // in the users timezone, just have to set up the response string for it.
  // Format here is:
  // `<!date^unixTimeStamp^stringWithFormatTags|backMessageIfCantConvert>`
  const queuedTime = moment(message.sendAt).unix();
  return `<!date^${queuedTime}^Message successfully queued for {date_pretty}\
         at {time}|Message succesfully queued.>`;
};

module.exports = (context, cb) => {
  const token = context.secrets.SLACK_TOKEN;
  const slackClient = new WebClient(token);

  // Determine if this is a slack command or a post request which
  // we will (naively) assume is coming from the cron job ping.
  if (context.body && context.body.command == '/delay') {
    var queuedMessage;

    extractMessageData(slackClient, context)
      .then((res) => {
        queuedMessage = res;
        return saveMessage(slackClient, context, res);
      })
      .then((res) => {
        cb(null, formatConfirmationMessage(queuedMessage));
      });
  } else {
    sendMessages(slackClient, context);
    cb(null, {});
  }
};
