const app = new Vue({
	el: '#app',
	data: {
		usernameInput: '',
		channelsInput: '',
		serverInput: '',
		socket: '',
		loggedIn: false,
		error: '',
		user: { username: '', channels: {} },
		messageContent: '',
		currentChannel: '',
		channelChoice: '',
		messages: {}
	},
	mounted() {
		window.addEventListener('beforeunload', () => {
			if (app.loggedIn && app.socket.connected) {
				app.socket.emit('logout', app.user);
				return app.socket.disconnect();
			}
		});
	},
	methods: {
		checkUsername() {
			return this.usernameInput.length >= 2 && this.usernameInput.length <= 32;
		},

		checkChannels(input) {
			if (!input) return false;
			return input.split(' ').every(channel => channel.trim().length >= 2 && channel.trim().length <= 32);
		},

		checkServer() {
			return Boolean(this.serverInput);
		},

		login() {
			if (!this.checkUsername() || !this.checkChannels(this.channelsInput) || !this.checkServer()) return;
			if (this.loggedIn) return this.error = { message: 'You are already logged in.' };

			for (const channelName of this.channelsInput.split(' ')) {
				this.user.channels[channelName] = { name: channelName };
			}
			this.user.username = this.usernameInput;
			const host = this.serverInput.match(/^https?:\/\//) ? this.serverInput : `http://${this.serverInput}`;
			// prepend http if not present to connect properly

			this.socket = io(host);
			attachListeners(this.socket);
		},

		joinChannel(channelChoice) {
			if (!this.loggedIn) return;
			if (!this.checkChannels(channelChoice)) return this.error = { message: 'Channel names must be 2-32 characters long.' };

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				channels.push({ name: channelName });
			}

			this.socket.emit('channelJoin', this.user, channels);
		},

		leaveChannel(channelChoice) {
			if (!this.loggedIn) return;
			if (!this.checkChannels(channelChoice)) return this.error = { message: 'Channel names must be 2-32 characters long.' };
			if (channelChoice === Object.keys(this.user.channels)[0] && Object.keys(this.user.channels).length === 1) {
				return this.error = { message: 'Cannot leave last channel.' };
			}

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				channels.push({ name: channelName });
			}

			this.socket.emit('channelLeave', this.user, channels);
		},

		switchChannel(channel) {
			this.currentChannel = channel;
			console.log(`Switched to channel '${channel}'.`);
		},

		sendMessage(messageContent) {
			if (!this.loggedIn) return;
			if (messageContent.length === 0) return this.error = { message: 'Messges may not be empty.' };
			if (messageContent.length > 2000) return this.error = { message: 'Message content may not exceed 2000 characters.' };

			function currentTime() {
				function pad(number) { return (number < 10 ? '0' : '') + number; }

				return `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
			}

			const message = {
				content: messageContent,
				author: { username: this.user.username },
				timestamp: currentTime(),
				channel: { name: this.currentChannel }
			};

			this.socket.emit('message', message);
		},

		logout() {
			if (!this.socket) return this.loggedIn = false;
			this.socket.emit('logout', this.user);
		},

		clearData(procedure) {
			if (procedure === 'login') {
				this.usernameInput = '';
				this.channelsInput = '';
				this.serverInput = '';
				this.error = '';
				// reset all values that were used during login
			}
			else if (procedure === 'logout') {
				this.socket.disconnect();
				this.user = { username: '', channels: {} };
				this.error = '';
				this.messageContent = '';
				this.channelChoice = '';
				// reset all values that may have been used when logged in
			}
		}
	}
});

function attachListeners(emitter) {
	emitter.on('connect', () => {
		emitter.emit('login', app.user);
	});

	emitter.on('connect_error', error => {
		app.user = { username: '', channels: {} }; // reset to empty user
		app.socket.disconnect();
		// reset socket so it can be properly re-established next try
		return app.error = { message: 'An error occurred connecting to the server.' };
	});

	emitter.on('disconnect', () => {
		app.clearData('logout');
		app.error = { message: 'Lost connection to the server.' };
		return app.loggedIn = false;
	});

	emitter.on('login', loginData => {
		if (loginData.error) {
			app.user = { username: '', channels: {} }; // reset to empty user
			if (app.socket) { app.socket.disconnect(); }
			// reset socket so it can be properly re-established next try
			return app.error = loginData.error;
		}
		Object.values(loginData.channels).forEach(channel => {
			app.user.channels[channel.name] = channel;
			app.messages[channel.name] = [];
		});
		app.currentChannel = Object.keys(app.user.channels)[0];
		// set first channel as selected one by default
		app.clearData('login');
		// reset input & errors so it won't display on logout
		return app.loggedIn = true;
	});

	emitter.on('channelJoin', channelData => {
		if (channelData.error) return app.error = channelData.error;
		channelData.channels.forEach(channel => {
			app.user.channels[channel.name] = channel;
			if (!app.messages[channel.name]) app.messages[channel.name] = [];
		});
		app.switchChannel(channelData.channels[0].name);
		// switch to first new channel
		return app.channelChoice = '';
	});

	emitter.on('channelLeave', channelData => {
		if (channelData.error) return app.error = channelData.error;
		channelData.channels.forEach(channel => {
			if (app.currentChannel === channel.name) app.switchChannel(Object.keys(app.user.channels)[0]);
			// move away from channel being deleted if it's selected
			Vue.delete(app.user.channels, channel.name);
			// keeping messages in case user joins back or so
		});

		return app.channelChoice = '';
	});

	emitter.on('message', message => {
		if (!app.user.channels.hasOwnProperty(message.channel.name)) return;
		// in case a message for a channel the user is not on slips through
		if (message.error) return app.error = message.error;
		app.messageContent = '';
		app.messages[message.channel.name].push(message);
		return app.$forceUpdate(); // can't seem to get it to update otherwise
	});

	emitter.on('channelUserEnter', (user, channel) => {
		if (!app.user.channels.hasOwnProperty(channel.name)) return;

		app.user.channels[channel.name].users.push(user.username);
		app.$forceUpdate(); // can't seem to get it to update otherwise
	});
	emitter.on('channelUserLeave', (user, channel) => {
		if (!app.user.channels.hasOwnProperty(channel.name)) return;

		const index = app.user.channels[channel.name].users.indexOf(user.username);
		app.user.channels[channel.name].users.splice(index, 1);
		app.$forceUpdate(); // can't seem to get it to update otherwise
	});

	emitter.on('logout', () => {
		app.clearData('logout');
		return app.loggedIn = false;
	});
}