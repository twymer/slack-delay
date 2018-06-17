/**
* @param context {WebtaskContext}
*/

const sendMessage = (slackClient, messageData) => {
  slackClient.chat.postMessage(messageData)
    .then((res) => {
      // `res` contains information about the posted message
      console.log('Message sent: ', res.ts);
    })
    .catch(console.error);
};


const extractMessageData = (slackClient, context) => {
  console.log('#### 3');
  console.log(context);
  const userId = context.body.user_id;
  const userName = context.body.user_name;
  const conversationId = context.body.channel_id;

  return slackClient.users.profile.get({user: userId})
    .then((res) => {
      console.log('#### 2');
      console.log(res.profile);
      return {
        channel: conversationId,
        text: 'Vamos Mexico!',
        username: res.profile.display_name,
        icon_url: res.profile.image_48,
      };
    });
};


module.exports = function(context, cb) {
  const { WebClient } = require('@slack/client');
  const token = context.secrets.SLACK_TOKEN;
  const slackClient = new WebClient(token);

  extractMessageData(slackClient, context)
    .then((res) => {
      console.log('#### 1');
      sendMessage(slackClient, res);
    });

  // TODO what should I actually return here?
  cb(null, 'Success!');
};

