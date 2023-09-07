const { copyFileSync }  = require('node:fs');

copyFileSync('example/index.html', 'dist/index.html');
