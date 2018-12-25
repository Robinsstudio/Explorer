const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const { join } = require('path');

app.get(/.*/, (req, res) => {
	res.sendFile(req.url, {root: __dirname}, err => {
		if (err) {
			res.sendFile("404.html", {root: __dirname});
		}
	});
});

const getNestedFolder = (active, nested) => {
	const folder = Array.isArray(active) ? active.concat(nested) : [];
		return {
			folder: folder,
			files: fs.readdirSync(join(__dirname, ...folder)).map(name => {
				return {name: name, type: (fs.lstatSync(join(__dirname, ...folder, name)).isDirectory() ? 'folder' : 'file')};
			})
		}
}

io.on('connection', socket => {
	socket.on('FolderRequest', ({folder, file}) => {
		socket.emit('FolderResponse', getNestedFolder(folder, file));
	});

	socket.emit('ExplorerInit', getNestedFolder(null, '.'));
})

http.listen(8080);