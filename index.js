const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const { join } = require('path');

app.get(/.*/, (req, res) => {
	res.sendFile(decodeURIComponent(req.url), {root: __dirname}, err => {
		if (err) {
			res.sendFile("404.html", {root: __dirname});
		}
	});
});

const getFolder = (folder = []) => {
	return {
		folder: folder,
		files: fs.readdirSync(join(__dirname, ...folder)).map(name => {
			return {name: name, type: (fs.lstatSync(join(__dirname, ...folder, name)).isDirectory() ? 'folder' : 'file')};
		})
	};
}

const getNestedFolder = (active, nested) => getFolder(Array.isArray(active) ? active.concat(nested) : []);

const deleteFile = (file) => {
	if (fs.lstatSync(file).isDirectory()) {
		fs.readdirSync(file).map(sub => deleteFile(join(file, sub)));
		fs.rmdirSync(file);
	} else {
		fs.unlinkSync(file);
	}
};

io.on('connection', socket => {
	socket.on('FolderRequest', ({folder, file}) => {
		socket.emit('FolderResponse', getNestedFolder(folder, file));
	});

	socket.on('FileRename', ({folder, file, newName}) => {
		fs.rename(join(__dirname, ...folder, file), join(__dirname, ...folder, newName), err => {
			socket.emit('FolderResponse', getFolder(folder));
		});
	});

	socket.on('FileRemove', ({folder, file}) => {
		deleteFile(join(__dirname, ...folder, file));
		socket.emit('FolderResponse', getFolder(folder));
	});

	socket.emit('ExplorerInit', getFolder());
})

http.listen(8080);