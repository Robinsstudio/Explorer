const socket = io();

class ExplorerView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			folder: props.folder,
			files: props.files
		};

		socket.on('FolderResponse', ({folder, files}) => {
			this.setState({ folder: folder, files: files });
		});
	}
	
	handleDoubleClick(file) {
		if (file.type == 'folder') {
			socket.emit('FolderRequest', { folder: this.state.folder, file: file.name });
		}
	}

	goBack(howMany) {
		const folder = this.state.folder;
		socket.emit('FolderRequest', {
			folder:	(howMany <= folder.length) ? folder.slice(0, -howMany) : null,
			file:	(howMany > 1) ? folder.slice(-howMany, 1-howMany)[0] : folder.slice(-1)
		});
	}
  
	buildFileItem(file) {
		return (
			React.createElement('div', { 'class': file.type, onDoubleClick: () => this.handleDoubleClick(file) },
				React.createElement('div', { 'class': 'label' },
					React.createElement('span', null, file.name)))
		);
	}
	
	render() {
		return (
			React.createElement("div", null,
				React.createElement("div", { id: "path" },
					[].concat(...['Explorer', ...this.state.folder].map((folder, index, self) => [React.createElement('span', {
						onClick: () => this.goBack(self.length - index)
					}, folder), React.createElement('div')])).slice(0, -1)),

				React.createElement("div", { id: "explorer" },
					this.state.files.map(file => this.buildFileItem(file))))
		);
	}
}

socket.on("ExplorerInit", ({folder, files}) => {
	ReactDOM.render(React.createElement(ExplorerView, { folder: folder, files: files }), document.getElementById('root'));
});