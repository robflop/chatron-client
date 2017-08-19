const { app, BrowserWindow } = require('electron');

app.setName('Chatron Client');

app.on('ready', () => {
	const mainWindow = new BrowserWindow({ minWidth: 1080, minHeight: 720, center: true, show: false });
	mainWindow.loadURL(`file://${__dirname}/index.html`);
	mainWindow.on('ready-to-show', () => {
		mainWindow.setMenu(null);
		mainWindow.setSize(1080, 720);
		mainWindow.show();
	});
	mainWindow.webContents.openDevTools();

	// if (process.env.NODE_ENV !== 'production') {
	// 	require('vue-devtools').install();
	// }
});

app.on('window-all-closed', () => app.quit());