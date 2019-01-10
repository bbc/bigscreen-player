module.exports = function (grunt) {
  grunt.config('copy', {
    bigscreenversion: {
      expand: true,
      cwd: 'script/build/',
      src: 'bigscreenversion.json',
      dest: 'script/debugger/config/',
      rename: function (dest, src) {
        return dest + src.replace(/json$/, 'js');
      },
      options: {
        process: function (contents, filePath) {
          return '/*eslint-disable*/\ndefine(\'bigscreenplayer/debugger/config/bigscreenversion\', function () { return ' + JSON.stringify(JSON.parse(contents)) + '; });';
        }
      }
    }
  });
};
