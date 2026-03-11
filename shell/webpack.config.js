  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
  const path = require('path');

  module.exports = {
    entry: './src/index.js',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
      publicPath: 'http://localhost:3000/',
    },

    mode: 'development',

    devServer: {                                                                                                                                                                                                                                                                     historyApiFallback: true,
    port: 3000,
    hot: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
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
    new ModuleFederationPlugin({                                                                                                                                                                                                                                                     name: 'shell',
      filename: 'remoteEntry.js',                                                                                                                                                                                                                                                    exposes: {
        './store': './src/store',
      },
      remotes: {
        auth: 'auth@http://localhost:3001/remoteEntry.js',
        dashboard: 'dashboard@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, eager: true, requiredVersion: false },
        'react-dom': { singleton: true, eager: true, requiredVersion: false },
        zustand: { singleton: true, eager: true, requiredVersion: false },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  };