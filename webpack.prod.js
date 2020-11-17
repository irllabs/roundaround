const path = require('path')
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
context: path.resolve(__dirname, 'src'),
  entry: {
    main: './main.js'
  },
//   externals: [nodeExternals()],
  output: {
    publicPath: '',
    path: path.resolve(__dirname, './public'),
    filename: 'bundle.js',
  },
//   plugins: [new CleanWebpackPlugin()],

  resolve: {
    extensions: [ '.tsx', '.ts', '.js', '.png' ],
    alias: {
      styles: path.resolve(__dirname, 'src/styles/'),
    }
  },
});