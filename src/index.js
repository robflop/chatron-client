const app = new Vue({
	el: '#app',
	data: {
		usernameInput: '',
		channelsInput: '',
		serverInput: '',
		socket: null,
		loggedIn: false,
		error: '',
		user: { username: '', channels: {} },
		messageContent: '',
		currentChannel: '',
		channelChoice: '',
		messages: {
			abc: [
				{
					timestamp: '13:37',
					author: 'someone',
					content: 'very very very very long test message that may overflow the area it has, or maybe not i do not know'
				},
				{
					timestamp: '13:38',
					author: 'system',
					content: 'ban incoming'
				},
				{
					timestamp: '22:04',
					author: 'someonewithareallylongusername',
					content: 'nothin\' to say to you',
				}
			],
			def: [
				{
					timestamp: '04:46',
					author: 'dudey',
					content: 'hi am dudey nice 2 meet u'
				},
				{
					timestamp: '04:50',
					author: 'rudey',
					content: 'lol go away nerd, kthxbye'
				}
			]
		}
	},
	mounted: () => {
		window.addEventListener('beforeunload', () => {
			if (app.loggedIn && app.socket) {
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

			if (!this.socket) this.socket = io.connect(host);

			this.socket.on('connect_error', error => {
				this.user = { username: '', channels: {} }; // reset to empty user
				if (this.socket) { this.socket.disconnect(); this.socket = null; }
				// reset socket so it can be properly re-established next try
				return this.error = { message: 'An error occurred connecting to the server.' };
			});

			this.socket.on('connect', () => {
				this.socket.emit('login', this.user);
				this.socket.on('login', loginData => {
					if (loginData.error) {
						this.user = { username: '', channels: {} }; // reset to empty user
						if (this.socket) { this.socket.disconnect(); this.socket = null; }
						// reset socket so it can be properly re-established next try
						return this.error = loginData.error;
					}
					Object.values(loginData.channels).forEach(channel => this.user.channels[channel.name] = channel);
					this.currentChannel = Object.keys(this.user.channels)[0];
					// set first channel as selected one by default
					this.clearData();
					// reset input & errors so it won't display on logout
					return this.loggedIn = true;
				});
				this.socket.on('channelUserEnter', user => {
					// soon
				});
				this.socket.on('channelUserLeave', user => {
					// soon
				});
			});
		},

		joinChannel(channelChoice) {
			if (!this.loggedIn) return;
			if (!this.checkChannels(channelChoice)) return this.error = { message: 'Channel names must be 2-32 characters long.' };

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				channels.push({ name: channelName });
			}

			this.socket.emit('channelJoin', this.user, channels);
			this.socket.on('channelJoin', channelData => {
				console.log(channelData);
				if (channelData.error) return this.error = channelData.error;
				channelData.channels.forEach(channel => this.user.channels[channel.name] = channel);
				this.switchChannel(channelData.channels[0].name);
				// switch to first new channel
				return this.channelChoice = '';
			});
		},

		leaveChannel(channelChoice) {
			if (!this.loggedIn) return;

			const channels = [];
			for (const channelName of channelChoice.split(' ')) {
				if (!this.user.channels.hasOwnProperty(channelName)) continue;
				// skip channels the user isn't in
				channels.push({ name: channelName });
			}

			this.socket.emit('channelLeave', this.user, channels);
			this.socket.on('channelLeave', channelData => {
				console.log(channelData);
				if (channelData.error) return this.error = channelData.error;
				channelData.channels.forEach(channel => {
					if (this.currentChannel === channel.name) this.switchChannel(Object.keys(this.user.channels)[0]);
					// move away from channel being deleted if it's selected
					Vue.delete(this.user.channels, channel.name);
				});

				return this.channelChoice = '';
			});
		},

		switchChannel(channel) {
			this.currentChannel = channel;
			console.log(`Switched to channel '${channel}'.`);
			const container = this.$el.querySelector('#messages');
			container.scrollTop = container.scrollHeight;
		},

		sendMessage(messageContent) {
			if (!this.loggedIn) return;

			function currentTime() {
				function pad(number) { return (number < 10 ? '0' : '') + number; }

				return `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
			}

			const message = {
				content: messageContent,
				author: this.user,
				timestamp: currentTime(),
				channel: this.currentChannel
			};

			this.socket.emit('message', message);
			this.socket.on('message', message => {
				if (!this.user.channels.hasOwnProperty(message.channel.name)) return;
				// in case a message the user is not on slips through
				if (this.messages[message.channel.name].includes(message)) return;
				// avoid duplicate messages
				this.messageContent = '';
				return this.messages[message.channel.name].push(message);
			});
		},

		logout() {
			if (!this.socket) return this.loggedIn = false;
			this.socket.emit('logout', this.user);
			this.socket.on('logout', () => {
				this.socket.disconnect(); this.socket = null;
				this.user = { username: '', channels: {} }; // reset to empty user
				this.error = ''; // reset error if there was any while logged in
				return this.loggedIn = false;
			});
		},

		clearData() {
			this.usernameInput = '';
			this.channelsInput = '';
			this.serverInput = '';
			this.error = '';
		}
	}
});