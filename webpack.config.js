var webpack = require('webpack');
var path = require('path');

module.exports = {
  devtool: 'inline-source-map',
  entry: './src/react-chatview',

  output: {
    path: path.resolve('./dist'),
    filename: 'react-chatview.js',
    libraryTarget: 'umd',
    library: 'ReactChatView',
    publicPath: '/static/'
  },

  resolve: {
    extensions: ['', '.js'],
    root: [
      path.resolve('./src')
    ],
    modulesDirectories: ['node_modules']
  },

  plugins: [
    new webpack.NoErrorsPlugin()
  ],

  module: {
    loaders: [
      {
        test: /\.js$/,
        include: path.resolve('./src'),
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          plugins: ['transform-runtime'],
          presets: ['es2015', 'react']
        }
      }
    ]
  },

  externals: {
    'react': {
      'commonjs': 'react',
      'commonjs2': 'react',
      'amd': 'react',
      // React dep should be available as window.React, not window.react
      'root': 'React'
    },
    'react-dom': {
      'commonjs': 'react-dom',
      'commonjs2': 'react-dom',
      'amd': 'react-dom',
      'root': 'ReactDOM'
    }
  }
};
