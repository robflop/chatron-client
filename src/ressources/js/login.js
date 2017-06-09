$(document).ready(() => {
	socket = io.connect('http://localhost:5959');

	let user;
	$('#login').submit(e => {
		if (!$('#usernameInput').val()) {
			$('#username').html('<span style=\'color:red;\'>Username must be filled out.</span><br>');
			return e.preventDefault();
		}
		if (!$('#channelsInput').val()) {
			$('#channels').html('<span style=\'color:red;\'>Channel(s) must be filled out.</span><br>');
			return e.preventDefault();
		}

		e.preventDefault();

		const serialized = $('#login').serializeArray();
		user = { username: serialized[0].value, channels: serialized[1].value.split(', ') };
		console.log(user);

		socket.emit('join', user);
		window.location = '../../pages/index.html';
	});

	$(window).on('beforeunload', () => {
		socket.emit('leave', { username: user.username });
		socket.disconnect();
	});
});