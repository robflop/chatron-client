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

		// e.preventDefault();

		const serialized = $('#login').serializeArray();
		user = { username: serialized[0].value, channels: serialized[1].value.split(', ') };
		console.log(user, serialized[2].value);

		socket = io(serialized[2].value);

		socket.on('connect', () => {
			socket.emit('join', user);
			// window.location = '../../pages/index.html';
		});
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', { username: user.username });
		socket.disconnect();
	});
});