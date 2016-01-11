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
      {test: /\.js$/, loaders: ['babel'], include: path.resolve('./src')}
    ]
  },

  //externals: [
  //  { react: { root: "React", commonjs: ["react"], amd: "react" } },
  //  { 'react-dom': { root: "ReactDOM", commonjs: "react", amd: "react" }}
  //],
  externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  }
};
