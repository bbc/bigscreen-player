const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: path.resolve(__dirname, 'script/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'index.js',
    libraryTarget: 'amd'
  },
  resolve: {
    alias: {
      bigscreenplayer: path.resolve(__dirname, 'node_modules/bigscreen-player/script')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          presets: [
            'env'
          ]
        }
      }
    ]
  }
};
