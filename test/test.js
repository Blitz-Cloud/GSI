const TwitterApi = require("twitter-api-v2").default;
require("dotenv").config();
const TwitterClient = new TwitterApi({
  clientId: process.env["TWITTER_CLIENT_ID"],
  clientSecret: process.env["TWITTER_CLIENT_SECRET"],
});

const callback = "https://hp.blitzcloud.ml/wh/callback";
