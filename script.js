const socket = io();

class ExplorerView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			folder: props.folder,
			files: props.files,
			contextMenu: { visible: false }
		};

		this.handleClick = this.handleClick.bind(this);

		socket.on('FolderResponse', ({folder, files}) => {
			this.setState({ folder: folder, files: files, contextMenu: false });
		});
	}

	handleClick() {
		this.setState({ contextMenu: { visible: false } });
	}
	
	handleDoubleClick(file) {
		this.open(file);
	}

	open(file) {
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

	updateContextMenu(event, file) {
		const { pageX, pageY, screenX, screenY } = event;
		const x = screenX - window.screenX;
		const y = screenY - window.screenY;
		const offset = { x: pageX - x, y: pageY - y };
		this.setState({ contextMenu: { visible: true, x: x, y: y, offset: offset, items: this.buildMenuItems(file) } });
		event.stopPropagation();
		event.preventDefault();
	}
  
	buildFileItem(file) {
		return (
			React.createElement('div', { 'class': file.type, onDoubleClick: () => this.handleDoubleClick(file), onContextMenu: e => this.updateContextMenu(e, file) },
				React.createElement('div', { 'class': 'label' },
					React.createElement('span', null, file.name)))
		);
	}

	buildMenuItems(file) {
		const menuItems = [];
		menuItems.push({ label: "Ouvrir", onClick: () => this.open(file) });
		return menuItems;
	}
	
	render() {
		const contextMenu = this.state.contextMenu;
		return (
			React.createElement("div", null,
				React.createElement("div", { id: "path" },
					[].concat(...['Explorer', ...this.state.folder].map((folder, index, self) => [React.createElement('span', {
						onClick: () => this.goBack(self.length - index)
					}, folder), React.createElement('div')])).slice(0, -1)),

				React.createElement("div", { id: "explorer", onClick: this.handleClick },
					this.state.files.map(file => this.buildFileItem(file))),
					
				contextMenu.visible && React.createElement(ContextMenu, { x: contextMenu.x, y: contextMenu.y, offset: contextMenu.offset, items: contextMenu.items}))
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
			React.createElement("div", { id: "contextMenu", ref: ref => this.element = ref },
				this.props.items.map(item => React.createElement('div', { onClick: item.onClick }, item.label)))
		);
	}
}

socket.on("ExplorerInit", ({folder, files}) => {
	ReactDOM.render(React.createElement(ExplorerView, { folder: folder, files: files }), document.getElementById('root'));
});