const path = require('path')
const ChromeManifestPlugin = require('./index.js')

module.exports = {
  target: 'web',
  entry: {
    "default": './lib/js/src/scripts/default.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" }
        ]
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'url-loader',
      },
    ],
  },
  plugins: [
    new ChromeManifestPlugin({
      name: 'Youtube Collections',
      package: pkg
    }),
  ],
  output: {
    path: path.join(__dirname, "dist"),
    filename: '[name].js',
  },
}
