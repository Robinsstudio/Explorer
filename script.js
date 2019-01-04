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
		this.open = this.open.bind(this);
		this.rename = this.rename.bind(this);
		this.remove = this.remove.bind(this);
		this.hideContextMenu = this.hideContextMenu.bind(this);
		this.updateContextMenu = this.updateContextMenu.bind(this);
	}

	handleClick() {
		this.hideContextMenu();
	}

	open(file) {
		if (file.type == 'folder') {
			socket.emit('FolderRequest', { folder: this.state.folder, file: file.name });
		}
	}

	rename(file, newName) {
		socket.emit('FileRename', { folder: this.state.folder, file: file.name, newName });
	}

	remove(file) {
		socket.emit('FileRemove', { folder: this.state.folder, file: file.name });
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

	updateContextMenu(event, items = []) {
		const { pageX, pageY, screenX, screenY } = event;
		const x = screenX - window.screenX;
		const y = screenY - window.screenY;
		const offset = { x: pageX - x, y: pageY - y };
		this.setState({ contextMenu: { visible: true, x: x, y: y, offset: offset, items: this.buildMenuItems(items), onClick: this.hideContextMenu } });
		event.stopPropagation();
		event.preventDefault();
	}
  
	buildFileItem(file) {
		const { open, rename, remove, updateContextMenu } = this;
		return React.createElement(File, { file, open, rename, remove, updateContextMenu});
	}

	buildMenuItems(items) {
		return items;
	}
	
	render() {
		const { contextMenu } = this.state;
		return (
			React.createElement('div', null,
				React.createElement('div', { id: 'path'},
					[].concat(...['Explorer', ...this.state.folder].map((folder, index, self) => [React.createElement('span', {
						onClick: () => this.goBack(self.length - index)
					}, folder), React.createElement('div')])).slice(0, -1)),

				React.createElement('div', { id: 'explorer', onClick: this.handleClick, onContextMenu: e => this.updateContextMenu(e) },
					this.state.files.map(file => this.buildFileItem(file))),
					
				contextMenu.visible && React.createElement(ContextMenu, contextMenu))
		);
	}
}

class File extends React.Component {
	constructor(props) {
		super(props);
		this.state = { renaming: false };

		this.open = this.open.bind(this);
		this.remove = this.remove.bind(this);
		this.handleContextMenu = this.handleContextMenu.bind(this);
		this.startRenaming = this.startRenaming.bind(this);
	}

	open() {
		this.props.open(this.props.file);
	}

	remove() {
		this.props.remove(this.props.file);
	}

	handleContextMenu(event) {
		this.props.updateContextMenu(event, [
			{ label: 'Ouvrir', onClick: this.open },
			{ label: 'Renommer', onClick: this.startRenaming },
			{ label: 'Supprimer', onClick: () => {
				showModal({ title: 'Supprimer un fichier', body: `Voulez-vous vraiment supprimer ${this.props.file.name} ?`, onConfirm: this.remove });
			}}
		]);
	}

	startRenaming() {
		this.setState({ renaming: true });
	}

	stopRenaming(newName) {
		if (newName) {
			this.props.rename(this.props.file, newName);
		}
		this.setState({ renaming: false });
	}

	render() {
		const { file } = this.props;
		const { renaming } = this.state;
		return (
			React.createElement('div', { 'class': file.type, onDoubleClick: this.open, onContextMenu: e => this.handleContextMenu(e) },
				React.createElement('div', { 'class': 'fileName' },
					(renaming) ? React.createElement(AutoFocusInput, { value: file.name, onStopEditing: e => this.stopRenaming(e) }) : React.createElement('span', null, file.name)))
		);
	}
}

class AutoFocusInput extends React.Component {
	constructor(props) {
		super(props);
		this.input = React.createRef();
		this.handleBlur = this.handleBlur.bind(this);
	}

	handleBlur() {
		this.props.onStopEditing(this.input.current.value);
	}

	handleKeyDown(event) {
		if (event.key == 'Enter') {
			this.props.onStopEditing(this.input.current.value);
		} else if (event.key == 'Escape') {
			this.props.onStopEditing(null);
		}
	}

	componentDidMount() {
		const input = this.input.current;
		input.value = this.props.value;
		input.select();
		input.focus();
	}

	render() {
		return React.createElement('input', { type: 'text', onBlur: this.handleBlur, onKeyDown: e => this.handleKeyDown(e), ref: this.input});
	}
}

class ContextMenu extends React.Component {
	constructor(props) {
		super(props);
		this.element = React.createRef();
	}

	computePosition() {
		const { x, y, offset } = this.props;
		const element = this.element.current;
		element.style.left = `${(element.offsetWidth < window.innerWidth - x) ? x + offset.x : x - element.offsetWidth + offset.x}px`;
		element.style.top = `${(element.offsetHeight < window.innerHeight - y) ? y + offset.y : y - element.offsetHeight + offset.y}px`;
	}
	
	componentDidMount() {
		this.computePosition();
	}
	
	componentDidUpdate() {
		this.computePosition();
	}
	
	render() {
		return (
			React.createElement('div', { id: 'contextMenu', ref: this.element, onClick: this.props.onClick },
				this.props.items.map(item => React.createElement('div', item, item.label)))
		);
	}
}

const showModal = ({title, body, onConfirm}) => {
	document.dispatchEvent(new CustomEvent('showModal', { detail: { title, body, onConfirm } }));
}

class Modal extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		document.addEventListener('showModal', ({detail: {title, body, onConfirm}}) => {
			this.setState({ title, body, onConfirm });
			$('#myModal').modal(true);
		});
	}

	render() {
		return (
			React.createElement('div', { id: 'myModal', 'class': 'modal fade', role: 'dialog' },
				React.createElement('div', { 'class': 'modal-dialog' },
					React.createElement('div', { 'class': 'modal-content' },
						React.createElement('div', { 'class': 'modal-header' },
							React.createElement('button', { type: 'button', 'class': 'close', 'data-dismiss': 'modal' }, '\xD7'),
							React.createElement('h4', { 'class': 'modal-title' }, this.state.title)),
	
						React.createElement('div', { 'class': 'modal-body' },
							React.createElement('p', null, this.state.body)),
	
						React.createElement('div', { 'class': 'modal-footer' },
							React.createElement('button', { type: 'button', 'class': 'btn btn-primary', 'data-dismiss': 'modal', onClick: this.state.onConfirm }, 'Oui'),
							React.createElement('button', { type: 'button', 'class': 'btn btn-secondary', 'data-dismiss': 'modal' }, 'Non')))))
		);
	}
}

socket.on("ExplorerInit", ({folder, files}) => {
	ReactDOM.render(React.createElement(ExplorerView, { folder: folder, files: files }), document.getElementById('app-root'));
	ReactDOM.render(React.createElement(Modal), document.getElementById('modal-root'));
});