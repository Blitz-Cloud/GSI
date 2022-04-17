const express = require("express");
require("dotenv").config();
const app = express();
const morgan = require("morgan");
const mongoose = require("mongoose");
const User = require("./models/models");
const hmac = require("./test/test");
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
  console.log();
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
  console.log("Main page hit");
  res.send("<h1>Hello World</h1>");
});
app.post("/wh", checkSource, (req, res) => {
  res.send("Post route triggered");
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
  console.log(req.query);
  const { state: storedState, codeVerifier } = await User.findOne({});
  if (state != storedState) {
    return res.status(401).send("Get aut");
  }
  const {
    client: twitterClient,
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
