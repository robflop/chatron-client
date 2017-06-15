$(document).ready(() => {
	let user, socket, loggedIn = false;

	$('#login').submit(e => {
		if (loggedIn) {
			// TODO: make this only tell the user they aren't logged in once
			$('#login-submit').after('<span style=\'color:red;\'> You are already logged in. </span>');
			return e.preventDefault();
		}

		const serializedInput = $('#login').serializeArray();

		const host = serializedInput[2].value.match(/^https?:\/\//) ? serializedInput[2].value : `http://${serializedInput[2].value}`;

		const channelInput = serializedInput[1].value.split(', ');

		user = { username: serializedInput[0].value, channels: {} };

		for (const channel of channelInput) {
			user.channels[channel] = { name: channel, users: [] };
			// at this point "channel" still refers only to the name
		}

		socket = io.connect(host);

		socket.on('connect', () => {
			socket.emit('login', user);
			socket.on('duplicateUsernameError', error => {
				null; // todo
			});
			socket.on('usernameLengthError', error => {
				null; // todo
			});
			socket.on('channelLengthError', error => {
				null; // todo
			});
			socket.on('channelData', channelsData => {
				Object.values(channelsData).forEach(channel => {
					if (user.channels[channel.name]) user.channels[channel.name].users = channel.users;
				});
			});
			socket.on('loginSuccess', () => {
				loggedIn = true;
				$('#login-wrapper, #chat-wrapper').toggleClass('hide');

				const channelList = new Vue({
					el: '#channel-list',
					data: {
						channels: {}
					}
				});

				Object.values(user.channels).forEach(channel => {
					channelList.channels[channel.name] = channel;
				});
			});
		});

		return e.preventDefault(); // don't refresh the page
	});

	$('#logout').click(() => {
		// TODO: make this only tell the user they aren't logged in once
		if (!socket) return $('#logout').after('<span style=\'color:red\'>  You are not logged in.</span>');
		socket.emit('logout', user);
		socket.on('logoutSuccess', () => {
			loggedIn = false;
			user = {};
		});
		return socket.disconnect();
	});

	function randomChannel() {
		let name = '';
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 5; i++) {
			name += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return name;
	}

	$('#join-channel').click(() => {
		const channel = randomChannel();
		socket.emit('channelJoin', user, channel);
		socket.on('duplicateChannelError', error => {
			null; // todo
		});
		socket.on('channelLengthError', error => {
			null; // todo;
		});
		socket.on('channelJoinSuccess', user, channel => user.channels.push(channel));
	});

	$('#leave-channel').click(() => {
		const channel = user.channels[Math.floor(Math.random() * user.channels.length)];
		socket.emit('channelLeave', user, channel);
		socket.on('missingChannelError', error => {
			null; // todo
		});
		socket.on('channelLeaveSuccess', (user, channel) => user.channels.splice(user.channels.indexOf(channel), 1));
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', user);
		return socket.disconnect();
	});
});