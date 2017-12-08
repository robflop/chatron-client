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
		lastMessage: '',
		currentChannel: '',
		channelChoice: ''
	},
	mounted() {
		window.addEventListener('beforeunload', () => {
			if (app.loggedIn && app.socket.readyState === '1') {
				app.socket.send(JSON.stringify({ type: 'logout', user: app.user }));
				if (app.socket) return app.socket.close();
			}
		});
	},
	methods: {
		checkUsername() {
			return this.usernameInput.length >= 2 && this.usernameInput.length <= 32;
		},

		checkChannels(channels) {
			if (!channels) return false;
			return channels.split(' ').every(channel => channel.trim().length >= 2 && channel.trim().length <= 32);
		},

		checkServer() {
			return Boolean(this.serverInput);
		},

		login() {
			if (!this.checkUsername() || !this.checkChannels(this.channelsInput) || !this.checkServer()) return;
			if (this.loggedIn) return this.displayError('You are already logged in.');

			for (const channelName of this.channelsInput.split(' ')) {
				this.user.channels[channelName] = { name: channelName };
			}

			this.user.username = this.usernameInput;

			let host;

			if (this.serverInput.startsWith('https')) host = this.serverInput.replace('https', 'wss');
			else if (this.serverInput.startsWith('http')) host = this.serverInput.replace('http', 'ws');
			else host = `ws://${this.serverInput}`;
			// remove http/https and add ws/wss to properly connect

			this.socket = new WebSocket(host);
			return attachListeners(this.socket);
		},

		joinChannel(channelChoice) {
			if (!this.loggedIn) return;
			if (!this.checkChannels(channelChoice)) return this.displayError('Channel names must be 2-32 characters long.');

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				channels.push({ name: channelName });
			}

			return this.socket.send(JSON.stringify({ type: 'channelJoin', user: this.user, userChannels: channels }));
		},

		leaveChannel(channelChoice) {
			if (!this.loggedIn) return;
			if (!this.checkChannels(channelChoice)) return this.displayError('Channel names must be 2-32 characters long.');

			const currentChannels = Object.keys(this.user.channels);

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				channels.push({ name: channelName });
			}

			if (channelChoice === currentChannels[0] && currentChannels.length === 1) {
				return this.displayError('Cannot leave last channel.');
			}

			if (channels.length > currentChannels.length) {
				return this.displayError('Cannot leave more channels than you are in.');
			}

			return this.socket.send(JSON.stringify({ type: 'channelLeave', user: this.user, userChannels: channels }));
		},

		switchChannel(channel) {
			return this.currentChannel = channel;
		},

		sendMessage(messageContent) {
			if (!this.loggedIn) return;
			if (messageContent.length === 0) return this.displayError('Messages may not be empty.');
			if (messageContent.length > 2000) return this.displayError('Message content may not exceed 2000 characters.');

			const message = {
				content: messageContent,
				author: { username: this.user.username },
				timestamp: Date.now(), // unix timestamp to account for timezones
				channel: { name: this.currentChannel }
			};

			return this.socket.send(JSON.stringify({ type: 'userMessage', message }));
		},

		insertLastMsg() {
			return this.lastMessage ? this.messageContent = this.lastMessage : null;
		},

		logout() {
			if (!this.socket) return this.loggedIn = false;
			return this.socket.send(JSON.stringify({ type: 'logout', user: this.user }));
		},

		displayError(message, duration = 5) {
			this.error = { message };

			setTimeout(() => {
				this.error = '';
			}, duration * 1000);
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
				if (this.socket) this.socket.close(); this.socket = '';
				this.user = { username: '', channels: {} };
				this.messageContent = '';
				this.channelChoice = '';
				// reset all values that may have been used when logged in
			}
		}
	}
});

function attachListeners(emitter) {
	emitter.addEventListener('open', () => {
		emitter.send(JSON.stringify({ type: 'login', user: app.user }));
	});

	emitter.addEventListener('error', error => {
		app.user = { username: '', channels: {} }; // reset to empty user
		if (app.socket) app.socket.close(); app.socket = '';
		// reset socket so it can be properly re-established next try
		return app.displayError('An error occurred connecting to the server.');
	});

	emitter.addEventListener('close', () => {
		app.clearData('logout');
		return app.loggedIn = false;
	});

	emitter.addEventListener('message', message => {
		const data = JSON.parse(message.data);

		if (data.type === 'login') {
			if (data.loginData.error) {
				if (app.socket) app.socket.close();
				// reset socket so it can be properly re-established next try
				app.user = { username: '', channels: {} }; // reset to empty user

				return app.displayError(data.loginData.error);
			}

			Object.values(data.loginData.channels).forEach(channel => {
				app.user.channels[channel.name] = channel;
				app.user.channels[channel.name].messages.forEach(message => {
					message.timestamp = formatUnixTime(message.timestamp);
				});
			});

			app.currentChannel = Object.keys(app.user.channels)[0];
			// set first channel as selected one by default
			app.clearData('login');
			// reset input & errors so it won't display on logout
			return app.loggedIn = true;
		}

		if (data.type === 'channelJoin') {
			if (data.channelData.error) return app.displayError(data.channelData.error.message);

			data.channelData.channels.forEach(channel => {
				app.user.channels[channel.name] = channel;
				app.user.channels[channel.name].messages.forEach(message => {
					message.timestamp = formatUnixTime(message.timestamp);
				});
			});

			app.switchChannel(data.channelData.channels[0].name);
			// switch to first new channel
			return app.channelChoice = '';
		}

		if (data.type === 'channelLeave') {
			if (data.channelData.error) return app.displayError(data.channelData.error.message);

			const channels = Object.keys(app.user.channels);

			data.channelData.channels.forEach(channel => {
				if (app.currentChannel === channel.name) {
					const nextChannel = channels.filter(channel => channel !== app.currentChannel)[0];
					app.switchChannel(nextChannel);
				} // move away from channel being deleted if it's selected
				Vue.delete(app.user.channels, channel.name);
			});

			return app.channelChoice = '';
		}

		if (data.type === 'userMessage') {
			if (data.userMessage.error) return app.displayError(data.userMessage.error.message);
			if (!app.user.channels.hasOwnProperty(data.userMessage.channel.name)) return;
			// in case a message for a channel the user is not on slips through
			data.userMessage.timestamp = formatUnixTime(data.userMessage.timestamp);

			if (data.userMessage.author.username === app.user.username) {
				app.lastMessage = app.messageContent;
				app.messageContent = '';
			} // lastMessage to select via arrow-up key

			app.user.channels[data.userMessage.channel.name].messages.push(data.userMessage);

			return app.$forceUpdate(); // can't seem to get it to update otherwise
		}

		if (data.type === 'channelUserEnter') {
			if (!app.user.channels.hasOwnProperty(data.channel.name)) return;


			app.user.channels[data.channel.name].users[data.user.username] = data.user;
			app.$forceUpdate(); // can't seem to get it to update otherwise
		}

		if (data.type === 'channelUserLeave') {
			if (!app.user.channels.hasOwnProperty(data.channel.name)) return;
			if (data.user.username === app.user.username) return;

			Vue.delete(app.user.channels[data.channel.name].users, data.user.username);
			app.$forceUpdate(); // can't seem to get it to update otherwise
		}

		if (data.type === 'logout') {
			app.clearData('logout');
			return app.loggedIn = false;
		}
	});
}

function formatUnixTime(timestamp) {
	function pad(number) { return (number < 10 ? '0' : '') + number; }

	return `${pad(new Date(timestamp).getHours())}:${pad(new Date(timestamp).getMinutes())}`;
}