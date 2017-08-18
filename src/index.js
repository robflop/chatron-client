const app = new Vue({
	el: '#app',
	data: {
		username: '',
		channels: '',
		server: '',
		socket: null,
		loggedIn: false,
		user: { username: '', channels: {} },
		selectedChannel: ''
	},
	mounted: () => {
		window.addEventListener('beforeunload', () => {
			if (app.loggedIn) {
				app.socket.emit('logout', app.user);
				app.socket.disconnect();
			}
			return process.exit();
		});
	},
	methods: {
		checkUsername() {
			return this.username.length >= 2 && this.username.length <= 32;
		},

		checkChannels() {
			if (!this.channels) return false;
			return this.channels.split(' ').every(channel => channel.trim().length >= 2 && channel.trim().length <= 32);
		},

		checkServer() {
			return Boolean(this.server);
		},

		login() {
			if (!this.checkUsername() || !this.checkChannels() || !this.checkServer()) return;
			if (this.loggedIn) return;

			for (const channelName of this.channels.split(' ')) {
				this.user.channels[channelName] = { name: channelName };
			}
			this.user.username = this.username;
			const host = this.server.match(/^https?:\/\//) ? this.server : `http://${this.server}`;
			// prepend http if not present to connect properly

			this.socket = io.connect(host);

			this.socket.on('connect', () => {
				this.socket.emit('login', this.user);
				this.socket.on('login', loginData => {
					if (loginData.error) return console.log(loginData.error);
					Object.values(loginData.channels).forEach(channel => {
						this.user.channels[channel.name] = channel;
					});
					this.selectedChannel = Object.keys(this.user.channels)[0];
					// set first channel as selected one by default
					return this.loggedIn = true;
				});
			});
		},

		logout() {
			if (!this.loggedIn) return;
			this.socket.emit('logout', this.user);
			this.socket.on('logout', () => {
				this.loggedIn = false;
				this.user = { username: '', channels: {} }; // reset to empty user
				return this.socket.disconnect();
			});
		},

		joinChannel() {
			if (!this.loggedIn) return;
			const channel = this.randomChannel();
			this.socket.emit('channelJoin', this.user, { name: channel });
			this.socket.on('channelJoin', channel => {
				this.user.channels[channel.name] = channel;
			});
		},

		leaveChannel() {
			if (!this.loggedIn) return;
			const channel = this.user.channels[Math.floor(Math.random() * user.channels.length)];
			this.socket.emit('channelLeave', this.user, { name: channel });
			this.socket.on('channelLeave', channel => {
				delete this.user.channels[channel.name];
			});
		},

		switchChannel(channel) {
			console.log(channel + " pls, ty");
			this.selectedChannel = channel;
		},

		randomChannel() {
			let name = '';
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			for (let i = 0; i < 5; i++) {
				name += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return name;
		}
	}
});