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
    modules: [
      path.join(__dirname, "src"),
      "node_modules"
    ]
  },

  plugins: [
    new webpack.NoEmitOnErrorsPlugin()
  ],

  module: {
    rules: [
      { test: /\.js$/, use: ['babel-loader'], include: path.resolve('./src') }
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
