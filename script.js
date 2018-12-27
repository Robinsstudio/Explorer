const socket = io();

class ExplorerView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			folder: props.folder,
			files: props.files,
			contextMenu: { visible: false }
		};

		socket.on('FolderResponse', ({folder, files}) => {
			this.setState({ folder: folder, files: files, contextMenu: false });
		});

		this.handleClick = this.handleClick.bind(this);
		this.hideContextMenu = this.hideContextMenu.bind(this);
	}

	handleClick() {
		this.hideContextMenu();
	}
	
	handleDoubleClick(file) {
		this.open(file);
	}

	open(file) {
		if (file.type == 'folder') {
			socket.emit('FolderRequest', { folder: this.state.folder, file: file.name });
		}
	}

	delete(file) {
		socket.emit('FileDelete', { folder: this.state.folder, file: file.name });
	}

	goBack(howMany) {
		const folder = this.state.folder;
		socket.emit('FolderRequest', {
			folder:	(howMany <= folder.length) ? folder.slice(0, -howMany) : null,
			file:	(howMany > 1) ? folder.slice(-howMany, 1-howMany)[0] : folder.slice(-1)
		});
	}
	
	hideContextMenu() {
		this.setState({ contextMenu: { visible: false } });
	}

	updateContextMenu(event, file) {
		const { pageX, pageY, screenX, screenY } = event;
		const x = screenX - window.screenX;
		const y = screenY - window.screenY;
		const offset = { x: pageX - x, y: pageY - y };
		this.setState({ contextMenu: { visible: true, x: x, y: y, offset: offset, items: this.buildMenuItems(file), onClick: this.hideContextMenu } });
		event.stopPropagation();
		event.preventDefault();
	}
  
	buildFileItem(file) {
		return (
			React.createElement('div', { 'class': file.type, onDoubleClick: () => this.handleDoubleClick(file), onContextMenu: e => this.updateContextMenu(e, file) },
				React.createElement('div', { 'class': 'fileName' },
					React.createElement('span', null, file.name)))
		);
	}

	buildMenuItems(file) {
		const menuItems = [];
		menuItems.push({ label: 'Ouvrir', onClick: () => this.open(file) });
		menuItems.push({ label: 'Supprimer', 'data-toggle': 'modal', 'data-target': '#myModal', onClick: () => {
			this.state.modal = { title: 'Supprimer un fichier', body: `Voulez-vous vraiment supprimer ${file.name} ?`, onConfirm: () => this.delete(file) };
		}});
		return menuItems;
	}
	
	render() {
		const contextMenu = this.state.contextMenu;
		const modal = this.state.modal;
		return (
			React.createElement('div', null,
				React.createElement('div', { id: 'path'},
					[].concat(...['Explorer', ...this.state.folder].map((folder, index, self) => [React.createElement('span', {
						onClick: () => this.goBack(self.length - index)
					}, folder), React.createElement('div')])).slice(0, -1)),

				React.createElement('div', { id: 'explorer', onClick: this.handleClick },
					this.state.files.map(file => this.buildFileItem(file))),
					
				contextMenu.visible && React.createElement(ContextMenu, contextMenu),
				React.createElement(Modal, modal))
		);
	}
}

class ContextMenu extends React.Component {
	constructor(props) {
		super(props);
	}

	computePosition() {
		const { x, y, offset } = this.props;
		this.element.style.left = `${(this.element.offsetWidth < window.innerWidth - x) ? x + offset.x : x - this.element.offsetWidth + offset.x}px`;
		this.element.style.top	= `${(this.element.offsetHeight < window.innerHeight - y) ? y + offset.y : y - this.element.offsetHeight + offset.y}px`;
	}
	
	componentDidMount() {
		this.computePosition();
	}
	
	componentDidUpdate() {
		this.computePosition();
	}
	
	render() {
		return (
			React.createElement('div', { id: 'contextMenu', ref: ref => this.element = ref, onClick: this.props.onClick },
				this.props.items.map(item => React.createElement('div', item, item.label)))
		);
	}
}

function Modal(props) {
	return (
		React.createElement('div', { id: 'myModal', 'class': 'modal fade', role: 'dialog' },
			React.createElement('div', { 'class': 'modal-dialog' },
				React.createElement('div', { 'class': 'modal-content' },
					React.createElement('div', { 'class': 'modal-header' },
						React.createElement('button', { type: 'button', 'class': 'close', 'data-dismiss': 'modal' }, '\xD7'),
						React.createElement('h4', { 'class': 'modal-title' }, props.title)),

					React.createElement('div', { 'class': 'modal-body' },
						React.createElement('p', null, props.body)),

					React.createElement('div', { 'class': 'modal-footer' },
						React.createElement('button', { type: 'button', 'class': 'btn btn-primary', 'data-dismiss': 'modal', onClick: props.onConfirm }, 'Oui'),
						React.createElement('button', { type: 'button', 'class': 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Non')))))
	);
}

socket.on("ExplorerInit", ({folder, files}) => {
	ReactDOM.render(React.createElement(ExplorerView, { folder: folder, files: files }), document.getElementById('root'));
});