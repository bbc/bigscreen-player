var fs = require('fs');

var packagePath = 'package.json';
var outputPath = 'script/build/bigscreenversion.json';

module.exports = function (grunt) {
  'use strict';

  grunt.registerTask('buildBigscreenVersion', function () {
    var packageVersions = {};
    try {
      packageVersions['bigscreen'] = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
      packageVersions['dash'] = JSON.parse(fs.readFileSync(packagePath, 'utf8')).dependencies.dashjs;

      grunt.log.writeln('Writing file with versions: \n BSP: ' + packageVersions.bigscreen + '\n dash: ' + packageVersions.dash);

      fs.writeFileSync(outputPath, JSON.stringify(packageVersions));
    } catch (e) {
      grunt.log.writeln('Error writing versions to file', e);
    }
  });
};
