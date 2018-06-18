# Slack Delay

### Why?
This was created to play with Auth0's [Webtasks](https://webtask.io/).

### What is it? 

My goal here was to create a sort of [Boomerang for Gmail](https://www.boomeranggmail.com/) type clone, as this is something I often want as a remote worker. My schedule really varies sometimes for when I'm working or maybe I'm just on a very different timezone and I like to try to not encourage my teammates to pick back up work if my message happens to come to them at, say, 9pm on a Sunday evening. I would like to be able to have a Slack message that will send in the morning. This way I don't disturb them, but I have the best chance of getting an answer by the time I'm online next.

### What state is it in?

This was more of a proof of concept than a final product, so it's a little rough
around the edges. I also haven't worked on a proper Node project before, so it
is likely not great on conventions.

The three top things I would be working on if I was to spend more time on this:

1 - Using Webtasks built in storage is super convenient, but has a lot of
downsides for this type of project. Mainly, it's very hacky to be looping
through an array of messages to figure out which ones to send rather than
being able to query a proper datastore. I saw that using Mongo in Webtasks
was well documented but as I haven't used Mongo before I didn't want to go
down this path for a quick hack.

2 - The app has basically no error or exception handling. If you enter invalid
data you'll just get a 500 in Slack. If one of the two calls per request
to Slack error, it doesn't retry or give a helpful message to the user. Neither
are a pleasant experience.

3 - No tests. I feel guilty writing code without tests, even if it's "throwaway".

### How do I use it?

#### Configuring Slack

Ok, this is a bit tricky. I tried a lot of things to get Slack to give me the right permissions to do what I needed to do. The weird parts were being able to "spoof" messages as users (I could never get rid of the "app" badge it puts on messages, though) and to be able to send to public and private channels as well as direct messages.

If you'd like to try this out, you'll need to set up a Slack app that has those permissions, so may require some experimentation. This bot will also need to accept a slash command that forwards to your Webtask endpoint.

#### Configuring Webtask

When developing I used the Webtask web UI rather than the CLI because it was easier when experimenting with the cron scheduler and required packages.

To configure this you will need to add the following two npm dependencies:

- `@slack/client`
- `moment`

Then you will need to add the Slack API key you got from the first part to the Webtask secrets as `SLACK_TOKEN`.

Lastly, you can turn on the scheduler to ping the application as frequently as you would like. This is when queued messages get sent.

#### Interacting with Slack app

You can opt to queue messages by setting either the number of minutes or hours in the future you would like it to send, and then the message itself. It will send to whichever channel you called the app command from.

Examples:

`/delay 45 minutes Hey Amy, hope you had a peaceful lunch! Do you have time this afternoon to review the pull request I assigned you on?`

`/delay 8 hours Good morning Alex! I have some questions about the ticket you assigned me. Should the bike shed be blue or red?`

Adding a new delay to Slack:  
<img src="https://github.com/twymer/slack-delay/raw/master/screenshots/adding-delay.gif" width=50% />

How it looks 5 minutes later:  
<img src="https://github.com/twymer/slack-delay/raw/master/screenshots/end-result.png" width=50% />
