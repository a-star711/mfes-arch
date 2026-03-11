 const HtmlWebpackPlugin = require('html-webpack-plugin');
  const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
  const path = require('path');

  module.exports = {
    entry: './src/index.js',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
      publicPath: 'http://localhost:3001/',
    },

    mode: 'development',

    devServer: {
      port: 3001,
      hot: true,
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        name: 'auth',
        filename: 'remoteEntry.js',
        exposes: {
          './App': './src/App',
        },
        remotes: {
          shell: 'shell@http://localhost:3000/remoteEntry.js',
        },
        shared: {
          react: { singleton: true, eager: true, requiredVersion: false },
          'react-dom': { singleton: true, eager: true, requiredVersion: false },
        },
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
    ],
  };