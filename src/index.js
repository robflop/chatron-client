$(document).ready(() => {
	let user, socket, loggedIn = false;

	$('#login').submit(e => {
		if (!$('#username-input').val()) {
			$('#username').html('<span style=\'color:red;\'>Username must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (!$('#channels-input').val()) {
			$('#channels').html('<span style=\'color:red;\'>Channel(s) must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (!$('#server-input').val()) {
			$('#server').html('<span style=\'color:red;\'>Server address must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (loggedIn) {
			$('#login-submit').after('<span style=\'color:red;\'>  Already logged in. </span>');
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
			socket.on('loginSuccess', () => {
				loggedIn = true;
				$('#login-wrapper').css({ display: 'none' });
				$('#chat-wrapper').css({ display: 'block' });
			});
		});

		return e.preventDefault(); // don't refresh the page
	});

	$('#logout').click(() => {
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
		return user.channels.push(channel);
	});

	$('#leave-channel').click(() => {
		const channel = user.channels[Math.floor(Math.random() * user.channels.length)];
		socket.emit('channelLeave', { user, channel });
		return user.channels.splice(user.channels.indexOf(channel), 1);
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', user);
		return socket.disconnect();
	});
});