const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const commonConfig = {
   entry: "./src/background.ts",
   devtool: "cheap-source-map",
   module: {
      rules: [
         {
            test: /\.ts$/,
            use: "ts-loader",
            exclude: /node_modules/,
         },
      ],
   },
   resolve: {
      extensions: [".ts", ".js"],
   },
};

module.exports = [
   {
      ...commonConfig,
      name: "chromium",
      output: {
         path: path.resolve(__dirname, "..", "build", "chromium"),
         filename: "background.js",
      },
      plugins: [
         new CopyWebpackPlugin({
            patterns: [
               { from: "public/common", to: "." },
               { from: "public/chromium", to: "." },
            ],
         }),
      ],
   },
   {
      ...commonConfig,
      name: "firefox",
      output: {
         path: path.resolve(__dirname, "..", "build", "firefox"),
         filename: "background.js",
      },
      plugins: [
         new CopyWebpackPlugin({
            patterns: [
               { from: "public/common", to: "." },
               { from: "public/firefox", to: "." },
            ],
         }),
      ],
   },
];
