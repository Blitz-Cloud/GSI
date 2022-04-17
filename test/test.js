const blogCheck = function (prop) {
  const propClone = prop;
  prop = prop.toLowerCase();
  if (prop.search("blog_post") !== -1) {
    const title = propClone.slice(propClone.indexOf(":") + 1);
    return title;
  }
};
