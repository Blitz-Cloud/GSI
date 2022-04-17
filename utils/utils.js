const crypto = require("crypto");
const blogCheck = function (prop) {
  const propClone = prop;
  prop = prop.toLowerCase();
  if (prop.search("blog_post") !== -1) {
    const title = propClone.slice(propClone.indexOf(":") + 1);
    return {
      title: title,
      isBlog: true,
    };
  }
  return {
    isBlog: false,
  };
};
const hmac = function (key, input) {
  return crypto.Hmac("sha256", key).update(input).digest("hex");
};

module.exports = { blogCheck, hmac };
