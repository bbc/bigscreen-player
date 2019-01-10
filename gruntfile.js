var path = require('path');

module.exports = function (grunt) {
  grunt.config('jasmine', {
    src: 'script/**/*.js',
    options: {
      customBootFile: 'spec/support/boot.js',
      keepRunner: true,
      specs: 'script-test/**/*.js',
      vendor: [
        'spec/lib/require-2_0_0.js'
      ],
      template: 'spec/support/test-runner/SpecRunner.html',
      outfile: 'spec/support/test-runner/WebRunner.html',
      templateOptions: {
        scriptRoot: '../../..',
        projectRoot: '../../..'
      },
      display: 'full',
      summary: true
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-copy');

  function getFilteredSpecs () {
    var fileName = grunt.option('specs');
    if (fileName) {
      if (!grunt.file.isPathAbsolute(fileName)) {
        fileName = path.join(__dirname, '/../', fileName);
      }
      if (grunt.file.exists(fileName)) {
        grunt.config.set('jasmine.options.templateOptions.specs', require(fileName));
      } else {
        grunt.log.error(fileName, 'does not exist');
        grunt.fail.fatal(fileName, 'does not exist');
      }
    }
  }

  grunt.registerTask('buildSpec', function () {
    getFilteredSpecs();
    grunt.task.run('jasmine');
  });

  grunt.registerTask('openspec', 'Open the generated Jasmine spec file', function () {
    var childProcess = require('child_process');
    var outfile = grunt.config('jasmine.options.outfile');
    grunt.log.writeln('Opening ' + outfile + '...');
    childProcess.exec('open ' + outfile);
  });

  grunt.loadTasks('tasks');

  grunt.registerTask('spec', ['buildSpec']);
  grunt.registerTask('spec-web', ['buildSpec', 'openspec']);
  grunt.registerTask('build', ['buildBigscreenVersion', 'copy:bigscreenversion']);
};
