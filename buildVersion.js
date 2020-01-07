(function () {
  'use strict';
  const fs = require('fs');
  const path = require('path');

  const packagePath = path.resolve() + '/package.json';
  const versionFilePath = path.resolve() + '/script/version.js';

  try {
    const packageVersion = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
    const versionMatches = packageVersion.match(/[0-9]+\.[0-9]+\.[0-9]+/);

    if (versionMatches) {
      var versionFile = fs.readFileSync(versionFilePath, 'utf8');
      versionFile = versionFile.replace(/[0-9]+\.[0-9]+\.[0-9]+/, versionMatches[0]);
      fs.writeFileSync(versionFilePath, versionFile);
    }
  } catch (e) {
    console.log('Error setting version');
  }
})();
