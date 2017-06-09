$(document).ready(() => {
	let user, socket;

	$('#login').submit(e => {
		if (!$('#usernameInput').val()) {
			$('#username').html('<span style=\'color:red;\'>Username must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (!$('#channelsInput').val()) {
			$('#channels').html('<span style=\'color:red;\'>Channel(s) must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (!$('#serverInput').val()) {
			$('#server').html('<span style=\'color:red;\'>Server address must be filled out.</span><br>');
			return e.preventDefault();
		}

		const serialized = $('#login').serializeArray();
		const host = serialized[2].value.match(/^https?:\/\//) ? serialized[2].value : `http://${serialized[2].value}`;
		user = { username: serialized[0].value, channels: serialized[1].value.split(', ') };
		console.log(user, serialized[2].value);

		socket = io.connect(host);

		socket.on('connect', () => {
			socket.emit('join', user);
			socket.on('duplicateUsernameError', error => {
				null;
			});
			// window.location = '../../pages/index.html';
		});

		e.preventDefault(); // don't refresh the page
	});

	$('#logout').click(() => {
		socket.emit('leave', user);
		socket.disconnect();
	});

	function randomChannel() {
		let name = '';
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 5; i++) {
			name += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return name;
	}

	$('#joinChannel').click(() => {
		const channel = randomChannel();
		socket.emit('channelJoin', { user, channel });
		user.channels.push(channel);
	});

	$('#leaveChannel').click(() => {
		const channel = user.channels[Math.floor(Math.random() * user.channels.length)];
		socket.emit('channelLeave', { user, channel });
		user.channels.splice(user.channels.indexOf(channel), 1);
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', user);
		socket.disconnect();
	});
});