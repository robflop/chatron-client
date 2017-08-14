const { app, BrowserWindow } = require('electron');
const { join } = require('path');

app.setName('Chatron Client');

app.on('ready', () => {
	const mainWindow = new BrowserWindow({});
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	if (process.env.NODE_ENV !== 'production') {
		require('vue-devtools').install();
	}
});

app.on('window-all-closed', () => app.quit());