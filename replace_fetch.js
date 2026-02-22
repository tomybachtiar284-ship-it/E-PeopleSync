const fs = require('fs'); let c = fs.readFileSync('js/mobile.js', 'utf8'); c = c.split('fetch(${API}').join('fetch(${API}'); console.log(c.includes('fetchApi'));
