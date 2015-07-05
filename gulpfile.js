var gulp = require('gulp'),
    sass = require('gulp-sass'),
    bower = require('gulp-bower'),
    clean = require('gulp-clean'),
    runSequence = require('run-sequence'),
    concat = require('gulp-concat'),
    ghPages = require('gulp-gh-pages');

var config = {
    srcPath: 'app',
    destPath: 'out',
    bowerDir: './bower_components'
}

gulp.task('build', function(callback) {
  runSequence('clean',
              'bower', 'copy', 'scripts',
              'css', 'fonts',
              callback);
});

gulp.task('watch', function () {
   gulp.watch(config.srcPath + '/**/*.*', ['build']);
});


gulp.task('copy', function() {
    gulp.src(config.srcPath + '/index.html').pipe(gulp.dest(config.destPath));
});

gulp.task('clean', function() {
    return gulp.src(config.destPath, {read: false})
      .pipe(clean());
});

gulp.task('bower', function() {
    return bower().pipe(gulp.dest(config.bowerDir))
});

gulp.task('fonts', function() {
    return gulp.src(config.bowerDir + '/materialize/font/**/*.*')
    .pipe(gulp.dest(config.destPath + '/font'))
});

gulp.task('css', function() {
    return gulp.src(config.srcPath + '/scss/**/style.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(config.destPath + '/css'))
});

gulp.task('scripts', function() {
  return gulp.src([config.bowerDir + '/jquery/dist/jquery.min.js',
  config.bowerDir + '/jquery/dist/jquery.min.js',
  config.bowerDir + '/materialize/dist/js/materialize.min.js',
  config.bowerDir + '/sightglass/index.js',
  config.bowerDir + '/rivets/dist/rivets.min.js',
  config.srcPath + '/js/**/*.js'])
      .pipe(concat('main.js'))
      .pipe(gulp.dest(config.destPath));
});

gulp.task('deploy', function(callback) {
  return  runSequence('build', 'ghpage',
                callback);
});

gulp.task('ghpage', function() {
  return gulp.src('./out/**/*')
        .pipe(ghPages({
        remoteUrl: "git@github.com:DataDecks/datadecks.github.io.git",
        branch: "master"
    }));
});
