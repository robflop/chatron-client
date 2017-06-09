const { app, BrowserWindow } = require('electron');
const { join } = require('path');

app.setName('Chatron Client');

app.on('ready', () => {
	const mainWindow = new BrowserWindow();
	const index = join('file://', __dirname, 'pages', '/login.html');
	mainWindow.loadURL(index);
});