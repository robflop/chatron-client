const { createWindowsInstaller } = require('electron-winstaller');
const { join } = require('path');
const { version } = require('./package.json');

const arch = process.argv[2] || 'ia32';
const distPath = join(__dirname, 'dist');

const platformPhrase = `for version ${version} on win32-${arch}`;

console.log(`Now creating Installer ${platformPhrase}... (This might take a while)`);

const appDirectory = join(distPath, `Chatron-win32-${arch}`);

const settings = {
	appDirectory,
	authors: 'robflop',
	outputDirectory: join(appDirectory, '..', 'windows-installer'),
	exe: 'Chatron.exe',
	setupExe: `ChatronInstaller-${version}-${arch}.exe`,
	description: 'Chatron',
	noMsi: true,
	title: 'Chatron',
	iconURL: 'https://github.com/robflop/chatron-client/raw/master/src/icon.ico',
	setupIcon: join(appDirectory, '..', '..', 'src', 'icon.ico')
};

return createWindowsInstaller(settings)
	.then(() => {
		console.log(`Installer successfully created ${platformPhrase}`);
		process.exit();
	})
	.catch(e => {
		console.log(`An error occurred creating the installer ${platformPhrase}:\n${e.message}`);
		process.exit();
	});