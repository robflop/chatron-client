const { app, BrowserWindow } = require('electron');
const { join } = require('path');

app.setName('Chatron Client');

app.on('ready', () => {
	const mainWindow = new BrowserWindow({});
	mainWindow.loadURL(`file://${__dirname}/index.html`);
	mainWindow.setMenu(null);

	mainWindow.on('close', () => process.exit());
});