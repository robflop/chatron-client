const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller;
const path = require('path');
const { version } = require('./package.json');

getInstallerConfig()
     .then(createWindowsInstaller)
     .catch(error => {
	console.error(error.message || error);
	process.exit(1);
});

function getInstallerConfig() {
	console.log('Creating Windows installer...');
	const appPath = path.join('./', 'dist', 'Chatron-win32-x64');

	return Promise.resolve({
		appDirectory: path.join(appPath),
		authors: 'robflop',
		outputDirectory: path.join(appPath, '..', 'windows-installer'),
		exe: 'Chatron.exe',
		setupExe: `ChatronInstaller-${version}.exe`,
		description: 'Chatron',
		noMsi: true,
		title: 'Chatron',
		iconURL: 'https://github.com/robflop/chatron-client/raw/master/src/icon.ico',
		setupIcon: path.join(appPath, '..', '..', 'src', 'icon.ico')
	});
}