const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
	const mainWindow = new BrowserWindow({ minWidth: 1080, minHeight: 720, webPreferences: { devTools: false }, center: true, show: false });
	mainWindow.loadURL(`file://${__dirname}/index.html`);
	mainWindow.on('ready-to-show', () => {
		mainWindow.setMenu(null);
		mainWindow.setSize(1080, 720);
		mainWindow.setTitle('Chatron');
		mainWindow.show();
	});
});

app.on('window-all-closed', () => app.quit());