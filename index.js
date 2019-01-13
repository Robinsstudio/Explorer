const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const formidable = require('formidable');
const { join } = require('path');
const { promisify } = require('util');
const lstatAsync = promisify(fs.lstat);
const readdirAsync = promisify(fs.readdir);
const rmdirAsync = promisify(fs.rmdir);
const unlinkAsync = promisify(fs.unlink);

const handleError = (error) => {
	console.log(error);
}

app.get(/.*/, (req, res) => {
	res.sendFile(decodeURIComponent(req.url), {root: __dirname}, err => {
		if (err) {
			res.sendFile("404.html", {root: __dirname});
		}
	});
}).post(/.*/, (req, res) => {
	const form = formidable.IncomingForm();
	form.parse(req, (err, fields, files) => {
		const folder = fields.folder.split(',');
		Object.values(files).forEach(({name, path}) => fs.rename(path, join(__dirname, ...folder, name), err => {
			console.log(`${name} successfully uploaded!`);
		}));
		res.status(200).end();
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

const getFolderAsync = async (folder = []) => {
	return {
		folder,
		files: await Promise.all((await readdirAsync(join(__dirname, ...folder))).map(async(name) => {
			return {name: name, type: ((await lstatAsync(join(__dirname, ...folder, name))).isDirectory() ? 'folder' : 'file')};
		}))
	}
}

const getNestedFolder = (active, nested) => getFolder(Array.isArray(active) ? active.concat(nested) : []);

const removeFileAsync = async (file) => {
	if ((await lstatAsync(file)).isDirectory()) {
		await Promise.all((await readdirAsync(file)).map(async(sub) => await removeFileAsync(join(file, sub))))
		await rmdirAsync(file);
	} else {
		await unlinkAsync(file);
	}
}

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
		removeFileAsync(join(__dirname, ...folder, file)).then(() => socket.emit('FolderResponse', getFolder(folder))).catch(handleError);
	});

	socket.emit('ExplorerInit', getFolder());
})

http.listen(8080);