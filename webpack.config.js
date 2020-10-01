require('dotenv').config({path: 'www/.env'});

var path = require('path'),
		webpack = require('webpack');

module.exports = {
	watch: false,
	module: {
		rules: [
			{
				test: /\.vue$/,
				use: 'vue-loader'
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.js', '.vue'],
		alias: {
			'vue$': 'vue/dist/vue.esm.js',
			'@': path.resolve(__dirname, './src/js'),
			'app': path.resolve(__dirname, './src/js/app')
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(process.env.APP_ENV)
		})
	]
};