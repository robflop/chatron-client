$(document).ready(() => {
	let user, socket, loggedIn = false;

	$('#login').submit(e => {
		if (loggedIn) {
			// TODO: make this only tell the user they aren't logged in once
			$('#login-submit').after('<span style=\'color:red;\'> You are already logged in. </span>');
			return e.preventDefault();
		}

		const serialized = $('#login').serializeArray();
		const host = serialized[2].value.match(/^https?:\/\//) ? serialized[2].value : `http://${serialized[2].value}`;
		user = { username: serialized[0].value, channels: serialized[1].value.split(', ') };

		socket = io.connect(host);

		socket.on('connect', () => {
			socket.emit('login', user);
			socket.on('duplicateUsernameError', error => {
				null;
			});
			socket.on('usernameLengthError', error => {
				null;
			});
			socket.on('channelLengthError', error => {
				null;
			});
			socket.on('loginSuccess', () => {
				loggedIn = true;
				$('#login-wrapper, #chat-wrapper').toggleClass('hide');

				const channelList = new Vue({
					el: '#channel-list',
					data: {
						channels: []
					}
				});

				for (const channel of user.channels) {
					channelList.channels.push({ name: channel });
				}
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
		socket.emit('channelJoin', { user, channel });
		socket.on('duplicateChannelError', error => {
			null;
		});
		socket.on('channelLengthError', error => {
			null;
		});
		socket.on('channelJoinSuccess', (user, channel) => {
			return user.channels.push(channel);
			// add the html elements for new channel
		});
	});

	$('#leave-channel').click(() => {
		const channel = user.channels[Math.floor(Math.random() * user.channels.length)];
		socket.emit('channelLeave', { user, channel });
		socket.on('missingChannelError', error => {
			null;
		});
		socket.on('channelLeaveSuccess', (user, channel) => {
			return user.channels.splice(user.channels.indexOf(channel), 1);
			// delete the html elements for the channel
		});
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', user);
		return socket.disconnect();
	});
});