// const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
// const webpack = require('webpack');
// const webpackMerge = require('webpack-merge');

const webpackConfig = {
  context: path.resolve(__dirname, 'src'),
  entry: {
    main: './main.js'
  },
  output: {
    publicPath: '',
    path: path.resolve(__dirname, './dist'),
    filename: '[name].bundle.js',
    sourceMapFilename: '[name].map',
    chunkFilename: '[id].chunk.js'
  },
  // plugins: [
  //   new HtmlWebpackPlugin({
  //     template: 'index.html',
  //     filename: 'index.html',
  //     inject: 'body'
  //   }),
  // ],
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader'
          },
        ]
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]'
          },
          {
            loader: 'sass-loader'
          }
        ]
      }
    ]
  },
  resolve: {
    alias: {
      styles: path.resolve(__dirname, 'src/styles/'),
    }
  },
  mode: process.env.WEBPACK_SERVE ? 'development' : 'production',
  devServer: {
    port: 3001,
    // contentBase: path.resolve(__dirname, 'src'),
  },
};

module.exports = webpackConfig;
