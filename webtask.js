/**
* @param context {WebtaskContext}
*/

const sendMessage = (slackClient, message) => {
  const conversationId = 'DB867N9SR';
  const messageData = {
    channel: conversationId,
    text: 'Vamos Mexico!',
    username: 'twymer',
  };

  slackClient.chat.postMessage(messageData)
    .then((res) => {
      // `res` contains information about the posted message
      console.log('Message sent: ', res.ts);
    })
    .catch(console.error);
};


module.exports = function(context, cb) {
  const { WebClient } = require('@slack/client');
  // TODO change this, but it's like this for testing
  const token = process.env.SLACK_TOKEN || context.secrets.SLACK_TOKEN;
  const slackClient = new WebClient(token);

  console.log(context);

  sendMessage(slackClient, {});

  // TODO what should I actually return here?
  cb(null, 'Success!');
};

