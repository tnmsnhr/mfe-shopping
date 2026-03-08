const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

module.exports = {
  mode: "development",
  output: {
    publicPath: "http://localhost:3004/",
  },
  devServer: {
    port: 3004,
    historyApiFallback: {
      index: "/",
      disableDotRule: true,
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  resolve: {
    extensions: [".jsx", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.m?js/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react"],
          },
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "navRemote",
      filename: "remoteEntry.js",
      exposes: {
        "./Navigation": "./src/Navigation",
      },
      remotes: {
        searchRemote: "searchRemote@http://localhost:3005/remoteEntry.js",
        authRemote:   "authRemote@http://localhost:3006/remoteEntry.js",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "^18.2.0",
          eager: false,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^18.2.0",
          eager: false,
        },
        "react-router-dom": {
          singleton: true,
          requiredVersion: "^6.20.0",
          eager: false,
        },
        firebase:           { singleton: true, requiredVersion: "^10.7.0",  eager: false },
        "@mui/material":    { singleton: true, requiredVersion: "^5.15.6",  eager: false },
        "@emotion/react":   { singleton: true, requiredVersion: "^11.11.4", eager: false },
        "@emotion/styled":  { singleton: true, requiredVersion: "^11.11.0", eager: false },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
