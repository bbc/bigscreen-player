'use strict';
const fs = require('fs');
const path = require('path');
const packagePath = path.resolve() + '/package.json';
const versionFilePath = path.resolve() + '/script/version.js';

fs.readFile(packagePath, (packageReadError, data) => {
  if (packageReadError) throw packageReadError;
  const packageVersion = JSON.parse(data).version;
  const versionMatches = packageVersion.match(/^[0-9]+\.[0-9]+\.[0-9]+$/);

  if (versionMatches) {
    fs.readFile(versionFilePath, (versionReadError, data) => {
      if (versionReadError) throw versionReadError;
      var versionFile = data.toString().replace(/[0-9]+\.[0-9]+\.[0-9]/, versionMatches[0]);

      fs.writeFile(versionFilePath, versionFile, (writeError) => {
        if (writeError) throw writeError;
        console.log(`version updated to: ${versionMatches[0]} `);
      });
    });
  }
});