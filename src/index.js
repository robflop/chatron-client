$(document).ready(() => {
	let user, socket, loggedIn = false;

	$('#login').submit(e => {
		const serializedInput = $('#login').serializeArray();

		const username = serializedInput[0].value, channelInput = serializedInput[1].value;
		const host = serializedInput[2].value.match(/^https?:\/\//) ? serializedInput[2].value : `http://${serializedInput[2].value}`;

		if (username.length < 2 || username.length > 32) {
			$('#username-notification').html('<div style=\'color:red;\'> Username must be between 2 and 32 characters. </div>');
			// return e.preventDefault();
		}
		else { $('#username-notification').html(''); }

		if (channelInput.length < 2 || channelInput.length > 32) {
			$('#channel-notification').html('<div style=\'color:red;\'> At least one channel must be provided, names must be 2 to 32 characters long. </div>');
			// return e.preventDefault();
		}
		else { $('#channel-notification').html(''); }

		if (host === 'http://') {
			$('#server-notification').html('<div style=\'color:red;\'> Server address must be provided. </div>');
			// return e.preventDefault();
		}
		else { $('#server-notification').html(''); }

		if (loggedIn) {
			// TODO: make this only tell the user they aren't logged in once
			$('#login-notification').html('<div style=\'color:red;\'> You are already logged in. </div>');
			return e.preventDefault();
		}
		else { $('#login-notification').html(''); }

		user = { username: username, channels: {} };
		const channelNames = channelInput.split(', ');


		for (const channelName of channelNames) {
			user.channels[channelName] = { name: channelName, users: [] };
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
			socket.on('channelNameLengthError', error => {
				null; // todo
			});
			socket.on('channelData', channelsData => {
				Object.values(channelsData).forEach(channel => {
					if (user.channels[channel.name]) user.channels[channel.name].users = channel.users;
				});
			});
			socket.on('loginSuccess', () => {
				loggedIn = true;
				// $('#login-wrapper, #chat-wrapper').toggleClass('hide');

				// const channelList = new Vue({
				// 	el: '#channel-list',
				// 	data: {
				// 		channels: {}
				// 	}
				// });

				// Object.values(user.channels).forEach(channel => {
				// 	channelList.channels[channel.name] = channel;
				// });
			});
		});

		return e.preventDefault(); // don't refresh the page
	});

	$('#logout').click(e => {
		if (!loggedIn) {
			$('#logout-notification').html('<div style=\'color:red\'>  You are not logged in.</div>');
			$('#login-notification').html('');
			return e.preventDefault();
		}
		else { $('#logout-notification').html(''); }
		socket.emit('logout', user);
		socket.on('logoutSuccess', () => {
			loggedIn = false;
			user = {};
			return socket.disconnect();
		});
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
		socket.on('channelJoinSuccess', channel => {
			user.channels[channel.name] = channel;
		});
	});

	$('#leave-channel').click(() => {
		const channel = user.channels[Math.floor(Math.random() * user.channels.length)];
		socket.emit('channelLeave', user, channel);
		socket.on('missingChannelError', error => {
			null; // todo
		});
		socket.on('channelLeaveSuccess', channel => {
			delete user.channels[channel.name];
		});
	});

	$(window).on('beforeunload', () => {
		if (loggedIn) {
			socket.emit('logout', user);
			socket.disconnect();
		}
		return process.exit();
	});
});