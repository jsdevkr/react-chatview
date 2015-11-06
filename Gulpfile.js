var gulp = require('gulp'),
  given = require('gulp-if'),
  jsx = require('gulp-react'),
  reactify = require('reactify'),
  buffer = require('vinyl-buffer'),
  minifyjs = require('gulp-uglify'),
  browserify = require('browserify'),
  sourcemaps = require('gulp-sourcemaps'),
  sourcestream = require('vinyl-source-stream');

var args = require('yargs').alias('P', 'production')
               .alias('D', 'development')
               .alias('E', 'example').argv,
  production = args.production,
  development = args.development,
  example = args.example;

gulp.task('build', function() {
  // Build standalone bundle for the browser
  var b = browserify({
        entries: './src/react-chatview.js',
        standalone: 'Feed'
      })
      .transform(reactify, {
        es6: true
      })
     .exclude('react')
     .bundle()
     .pipe(sourcestream('react-chatview.' + (production ? 'min.' : '') + 'js'))
     .pipe(buffer())
     .pipe(given(development, sourcemaps.init()))
     .pipe(given(production, minifyjs()))
     .pipe(given(development, sourcemaps.write('.')))
     .pipe(gulp.dest('dist'));

  // Transpile CommonJS files to ES5 with React's tools.
  gulp.src(['./src/**/*.js'])
      .pipe(jsx({
        harmony: true
      }))
      .pipe(gulp.dest('build'))

  if (example) {
    gulp.src('./examples/**/*.jsx')
      .pipe(jsx())
      .pipe(gulp.dest('examples'))
  }
});

gulp.task('default', ['build']);
