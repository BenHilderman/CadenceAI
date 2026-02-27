const path = require("path");

module.exports = {
  entry: {
    sidepanel: "./src/sidepanel.tsx",
  },
  output: {
    path: path.resolve(__dirname),
    filename: "[name].bundle.js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
};
