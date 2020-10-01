require('dotenv').config({path: 'www/.env'});
const { src, dest, parallel, series, watch } = require('gulp'),
		gulpSass = require('gulp-sass'),
		autoprefixer = require('gulp-autoprefixer'),
		browserSync = require('browser-sync').create(),
		concat = require('gulp-concat'),
		rename = require('gulp-rename'),
		gulpClean = require('gulp-clean-css'),
		gulpUglify = require('gulp-uglify'),
		webpack = require('webpack'),
		webpackStream = require('webpack-stream'),
		named = require('vinyl-named'),
		svgSprite = require("gulp-svg-sprites"),
		svgmin = require('gulp-svgmin'),
		cheerio = require('gulp-cheerio'),
		replace = require('gulp-replace'),
		gulpImagemin = require('gulp-imagemin'),
		rev = require('gulp-rev'),
		del = require('del'),
		tmpDir = 'www/assets',
		cssBuildDir =  tmpDir + '/css',
		cssFiles = cssBuildDir + '/**/*.css',
		cssMinFiles = cssBuildDir + '/**/*.min.css',
		jsBuildDir = tmpDir + '/js',
		jsFiles = jsBuildDir + '/**/*.js',
		jsMinFiles = jsBuildDir + '/**/*.min.js',
		assetRevisionNeeded = JSON.parse(process.env.ASSET_REV || false);


function sprites() {
	return src(tmpDir + '/svg/*.svg')
			.pipe(svgmin({
				plugins: [
					{
						removeViewBox: false
					}
				],
				js2svg: {
					pretty: true
				}
			}))
			.pipe(cheerio({
				run: function ($) {
					$('[fill]').removeAttr('fill');
					$('[stroke]').removeAttr('stroke');
					$('[style]').removeAttr('style');
					$('[opacity]').removeAttr('opacity');
				},
				parserOptions: {xmlMode: true}
			}))
			.pipe(replace('&gt;', '>'))
			.pipe(svgSprite({
				mode: 'symbols',
				preview: false,
				svg: {
					symbols: 'svg.symbols/symbols.svg'
				}
			}))
			.pipe(dest(tmpDir));
}

function imagemin() {
	src([tmpDir + '/img/**/*.jpg', tmpDir + '/img/**/*.png'])
			.pipe(gulpImagemin([
				gulpImagemin.gifsicle({interlaced: true}),
				gulpImagemin.jpegtran({progressive: true}),
				gulpImagemin.optipng({optimizationLevel: 5})
			]))
			.pipe(dest(tmpDir + '/img/min'));
}

function sass() {
	return src('src/sass/*.sass')
			.pipe(gulpSass().on('error', gulpSass.logError))
			.pipe(autoprefixer())
			.pipe(dest(cssBuildDir));
}

function minifyCSS() {
	const min = src([cssFiles, '!' + cssMinFiles])
			.pipe(gulpClean())
			.pipe(rename({
				suffix: '.min'
			}));
	if (assetRevisionNeeded) {
		return revision(min, cssBuildDir);
	} else {
		return min.pipe(dest(cssBuildDir));
	}
}

function minifyJS() {
	const min = src([jsFiles, '!' + jsMinFiles])
			.pipe(gulpUglify())
			.pipe(rename({
				suffix: '.min'
			}));
	if (assetRevisionNeeded) {
		return revision(min, jsBuildDir);
	} else {
		return min.pipe(dest(jsBuildDir));
	}
}

function revision(stream, buildDir) {
	return stream
			.pipe(rev())
			.pipe(dest(buildDir))
			.pipe(rev.manifest())
			.pipe(dest(buildDir));
}

function revisionCSS() {
	return src([cssMinFiles])
			.pipe(rev())
			.pipe(dest(cssBuildDir))
			.pipe(rev.manifest())
			.pipe(dest(cssBuildDir));
}

function revisionJS() {
	return src([jsMinFiles])
			.pipe(rev())
			.pipe(dest(jsBuildDir))
			.pipe(rev.manifest())
			.pipe(dest(jsBuildDir));
}

function js() {
	return src('src/js/entry/*.js')
			.pipe(named())
			.pipe(webpackStream(require('./webpack.config'), webpack))
			.pipe(dest(jsBuildDir));
}

function vendorJs() {
	return src([
		'src/lib/jquery/dist/jquery.js'
	])
			.pipe(concat('vendor.js'))
			.pipe(dest(jsBuildDir));
}

function cleanCssBuild() {
	return del([cssMinFiles, cssBuildDir + '/rev-manifest.json']);
}

function cleanJsBuild() {
	return del([jsMinFiles, jsBuildDir + '/rev-manifest.json']);
}

function startWatch() {
	const sassInPath = 'src/sass/*.sass',
			jsPath = ['src/js/**/*.js', 'src/js/**/*.vue'],
			mainJSPath = tmpDir + '/js/**/*.js',
			cssPath = tmpDir + '/css/**/*.css',
			allPath = ['src/**/*', '!src/sass/**/*', '!src/css/**/*', '!src/js/**/*', '!src/lib/**/*'];

	browserSync.init({
		proxy: 'stroytest.loc',
		notify: false,
		open: false
	});

	watch(sassInPath, sass);
	watch(cssPath).on('change', browserSync.reload);
	watch(jsPath, js);
	watch(mainJSPath).on('change', browserSync.reload);
	watch(allPath).on('change', browserSync.reload);

}

exports.sprites = sprites;
exports.imagemin = imagemin;
exports.sass = sass;
exports.revisionCSS = revisionCSS;
exports.revisionJS = revisionJS;
exports.minifyCSS = series(cleanCssBuild, minifyCSS);
exports.minifyJS = series(cleanJsBuild, minifyJS);
exports.js = js;
exports.vendorJs = vendorJs;
exports.minify = parallel(exports.minifyCSS, exports.minifyJS);
exports.build = series(parallel(sass, js, vendorJs), exports.minify);
exports.watch = series(parallel(sass, js, vendorJs), startWatch);