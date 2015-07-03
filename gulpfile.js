var gulp = require('gulp'),
    sass = require('gulp-sass');

var config = {
    srcPath: 'app',
    destPath: 'build'
}

gulp.task('build', function() {
    return gulp.src(config.srcPath).pipe(gulp.dest(config.destPath));
})
