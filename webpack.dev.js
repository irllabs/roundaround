// const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
// const webpack = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

const webpackConfig = merge(common, {
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
  mode: 'development',
  devServer: {
    port: 3001,
    host: '0.0.0.0'
    // contentBase: path.resolve(__dirname, 'src'),
  },
});

module.exports = webpackConfig;
