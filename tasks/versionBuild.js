
module.exports = function (grunt) {
  grunt.registerTask('build', ['buildBigscreenVersion', 'copy:bigscreenversion']);
};
