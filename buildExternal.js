const fs = require('fs');
const smpImscDistPath = require.resolve('smp-imsc/dist/imsc.min.js')
const externalPath = process.cwd() + '/script/external/smp-imsc.js'

console.log(process.cwd())

if (smpImscDistPath) {
  fs.copyFile(smpImscDistPath, externalPath, function (error) {
    if (error) throw error;
    console.log('smp-imsc dist copied to script/external');
  });
}