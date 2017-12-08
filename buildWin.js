const packager = require('electron-packager');

console.log('Now building... (This might take a while)');

const buildOptions = {
	dir: './',
	appCopyright: 'Copyright (C) 2017 robflop',
	platform: 'win32',
	arch: process.argv[2] || 'ia32',
	asar: true,
	icon: './src/icon.ico',
	ignore: /(buildWin|makeInstallers|vscode|eslintrc|gitattributes|gitignore|htmlhintrc|travis)/,
	out: 'dist/',
	overwrite: true,
	prune: true,
	win32metadata: {
		CompanyName: 'robflop',
		ProductName: 'Chatron',
		FileDescription: 'A chatroom client built with electron and vuejs.',
		OriginalFilename: 'Chatron.exe'
	}
};

packager(buildOptions).then(appPaths => console.log('Successfully built into the following folder:', appPaths.join('\n')));