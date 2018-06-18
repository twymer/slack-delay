/**
* @param context {WebtaskContext}
*/

const { WebClient } = require('@slack/client');
const moment = require('moment');

// TODO avoid having to pass client/context constantly?

const sendMessage = (slackClient, messageData) => {
  // TODO Update these success/error conditions
  slackClient.chat.postMessage(messageData.slackMessage)
    .then((res) => {
      // `res` contains information about the posted message
      console.log('Message sent: ', res.ts);
    })
    .catch(console.error);
};

const parseMessage = (message) => {
  // Messages come in the format of how long to delay and then the message
  // Examples:
  // 30 minutes Hey, have you finished your TPS reports yet?
  // 5 hours No I was definitely not working at 4 am, again.
  const messageRegex = /^(\d+) (hours|minutes) (.*)/;
  const splitMessage = messageRegex.exec(message);

  // TODO Handle errors for bad message formatting
  // TODO is this actually idiomatic for checking nulls?
  if (splitMessage !== null) {
     return {
      sendAt: moment().utc().add(splitMessage[1], splitMessage[2]).toDate(),
      text: splitMessage[3],
    };
  }
};

const extractMessageData = (slackClient, context) => {
  // TODO start with a hash and merge later
  // instead of this mess
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
  context.storage.get(function (error, data) {
    if (error) return cb(error);
    data = data || { messages: [] };

    data.messages.push(messageData);

    context.storage.set(data, function (error) {
      if (error) return cb(error);
    });
  });
};

const filterMessages = (messages) => {
};

const sendMessages = (slackClient, context) => {
  // TODO Is there a good way to not have to duplicate this?
  context.storage.get(function (error, data) {
    if (error) return cb(error);
    var messages = data.messages || [];

    // TODO Clean this up, has to be a better way to split the list into
    // the two (those to keep and those to send)
    // TODO Actually, be consistent in usage of new function call style
    // TODO This doesn't wait on the send or check errors before removing the item..
    messages.forEach(function (message) {
      if (moment().utc().isAfter(message.sendAt)) {
        sendMessage(slackClient, message);
        // Remove sent message
        data.messages.splice(messages.indexOf(message), 1);
      } else {
        console.log("Not time to send yet!");
        console.log(message.sendAt);
        console.log(moment().utc().toDate());
      }
    });

    context.storage.set(data, function (error) {
      if (error) return cb(error);
    });
  });
};

module.exports = function(context, cb) {
  const token = context.secrets.SLACK_TOKEN;
  const slackClient = new WebClient(token);

  // Determine if this is a slack command or a post request which
  // we will (naively) assume is coming from the cron job ping.
  if (context.body && context.body.command == '/delay') {
    extractMessageData(slackClient, context)
      .then((res) => {
        saveMessage(slackClient, context, res);
      });
  } else {
    sendMessages(slackClient, context);
  }

  // TODO what should I actually return here?
  cb(null, 'Success!');
};

