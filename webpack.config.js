
  const path = require('path');
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const { CleanWebpackPlugin } = require('clean-webpack-plugin');

  module.exports = {
   mode: 'development',
   devtool: 'inline-source-map',
   devServer: {
     contentBase: './dist'
   },
    entry: {
      app: './development/index.js'
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        inject: false,
        template: require('html-webpack-template'),
        title: 'bigscreen-player',
        window: { bigscreenPlayer: { playbackStrategy: 'msestrategy'} }
      }),
    ],
    resolve: {
      alias: {
        bigscreenplayer: path.resolve(__dirname, 'script')
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    }
  };