const express = require("express");
require("dotenv").config();
const app = express();
const morgan = require("morgan");
const mongoose = require("mongoose");
const User = require("./models/models");
const { hmac, blogCheck } = require("./utils/utils");
const { cookie } = require("express/lib/response");

const port = process.env.PORT || 8080;
const db = "twitt-git";

//some twitter api setup
const TwitterApi = require("twitter-api-v2").default;
const TwitterClient = new TwitterApi({
  clientId: process.env["TWITTER_CLIENT_ID"],
  clientSecret: process.env["TWITTER_CLIENT_SECRET"],
});

const callback = "https://hp.blitzcloud.ml/wh/callback";

//middleware
app.use(express.json());
app.use(morgan("dev"));

//config
app.listen(port, () => {
  console.log(`App is listening on port: ${port}`);
});
app.set("view engine", "ejs");

//mongoose connection
mongoose.connect(`mongodb://localhost:27017/${db}`).then(() => {
  console.log("Connection establish");
});

//customMiddleware
const checkSource = (req, res, next) => {
  const payload = req;
  const header = req.headers;
  const signature =
    "sha256=" +
    hmac(process.env["GITHUB_SECRET"], `${JSON.stringify(payload.body)}`);
  const signatureCheck = header["x-hub-signature-256"];
  if (
    process.env["NODE_ENV"] === "production" &&
    signature === signatureCheck
  ) {
    return next();
  } else {
    return res.status(401).send("<h1>You are not GitHub. Get out !!!</h1>");
  }
};

app.get("/", (req, res) => {
  res.send("<h1>Hello World</h1>");
});

app.post("/wh", checkSource, async (req, res) => {
  const commit = req.body["head_commit"]["message"];
  const commitProp = blogCheck(commit);
  if (commitProp.isBlog) {
    const { refreshToken } = await User.findOne({});
    const {
      client: twitterUser,
      accessToken,
      refreshToken: newRefreshToken,
    } = await TwitterClient.refreshOAuth2Token(refreshToken);
    await User.findOneAndUpdate({
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    });
    const { data } = await twitterUser.v2.tweet(commitProp.title);
    return res.send(data);
  }

  res.send("NO TWEET FOR NOW");
});

app.get("/wh/auth", async (req, res) => {
  const { url, codeVerifier, state } = TwitterClient.generateOAuth2AuthLink(
    callback,
    {
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    }
  );
  const data = new User({
    codeVerifier: codeVerifier,
    state: state,
  });
  await data.save();

  res.redirect(url);
});

app.get("/wh/callback", async (req, res) => {
  const { state, code } = req.query;
  const { state: storedState, codeVerifier } = await User.findOne({});
  if (state != storedState) {
    return res.status(401).send("Get aut");
  }
  const {
    client: twitterUser,
    accessToken,
    refreshToken,
  } = await TwitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callback,
  });

  await User.findOneAndUpdate({
    accessToken: accessToken,
    refreshToken: refreshToken,
  });

  res.redirect("/");
});

// app.get("/wh/me", async (req, res) => {
//   const { refreshToken } = await User.findOne({});
//   const {
//     client: twitterUser,
//     accessToken,
//     refreshToken: newRefreshToken,
//   } = await TwitterClient.refreshOAuth2Token(refreshToken);
//   await User.findOneAndUpdate({
//     accessToken: accessToken,
//     refreshToken: newRefreshToken,
//   });
//   const data = await twitterUser.v2.me();

//   res.send(data);
// });
