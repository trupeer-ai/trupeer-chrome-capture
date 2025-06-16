// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";
// // DEV_MODE
// process.env.NODE_ENV = "development";
process.env.ASSET_PATH = "/";

var webpack = require("webpack"),
  config = require("../webpack.config");

//delete config.chromeExtensionBoilerplate;
delete config.custom;

config.mode = "production";
// // DEV_MODE
// config.mode = "development";

webpack(config, function (err) {
  if (err) throw err;
});
