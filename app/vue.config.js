const path = require('path')
const webpack = require('webpack')
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })
    ],
    resolve: {
      symlinks: false,
      alias: {
        vue: path.resolve('./node_modules/vue')
      },
      fallback: {
        crypto: false,
        fs: false,
        assert: false,
        process: false,
        util: false,
        path: false,
        stream: false,
      }
    }
  } 
})
