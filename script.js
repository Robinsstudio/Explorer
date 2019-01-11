const socket = io();

class ExplorerView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			folder: props.folder,
			files: props.files,
			contextMenu: { visible: false },
			dropZone: { visible: false }
		};

		socket.on('FolderResponse', ({folder, files}) => {
			this.setState({ folder: folder, files: files, contextMenu: false });
		});

		this.handleClick = this.handleClick.bind(this);
		this.handleDragOver = this.handleDragOver.bind(this);
		this.handleDragLeave = this.handleDragLeave.bind(this);
		this.open = this.open.bind(this);
		this.rename = this.rename.bind(this);
		this.remove = this.remove.bind(this);
		this.hideContextMenu = this.hideContextMenu.bind(this);
		this.updateContextMenu = this.updateContextMenu.bind(this);
	}

	handleClick() {
		this.hideContextMenu();
	}

	handleDragLeave() {
		this.setState({ dropZone: {  visible: false } });
	}

	handleDragOver() {
		this.setState({ dropZone: { visible: true } });
	}

	handleDrop(event) {
		const formData = Array.from(event.dataTransfer.files).reduce((data, file) => {
			data.append(file.name, file);
			return data;
		}, new FormData());

		formData.append('folder', this.state.folder);
	
		$.ajax({
			url: 'upload',
			type: 'POST',
			data: formData,
			success: () => this.goBack(1),
			processData: false,
			contentType: false
		});

		this.setState({ dropZone: { visible: false } });
		event.preventDefault();
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
		const { open, rename, remove, updateContextMenu, state: { folder } } = this;
		return React.createElement(File, { folder, file, open, rename, remove, updateContextMenu});
	}

	buildMenuItems(items) {
		return items;
	}
	
	render() {
		const { contextMenu, dropZone } = this.state;
		return (
			<React.Fragment>
				<div id='path'>
					{[].concat(...['Explorer', ...this.state.folder].map((folder, index, self) => {
						return [
							<span onClick={() => this.goBack(self.length - index)}>{folder}</span>,
							<div/>
						]
					})).slice(0, -1)}
				</div>

				<div id='explorer' onClick={this.handleClick} onContextMenu={e => this.updateContextMenu(e)} onDragOver={this.handleDragOver}>
					{this.state.files.map(file => this.buildFileItem(file))}
				</div>

				{dropZone.visible && <div id='dropZone' onDrop={e => this.handleDrop(e)} onDragLeave={this.handleDragLeave} onDragOver={e => e.preventDefault()}/>}

				{contextMenu.visible && <ContextMenu {...contextMenu}/>}
			</React.Fragment>
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
		const { folder, file: { name, type } } = this.props;
		this.props.updateContextMenu(event, [
			{ label: 'Ouvrir', onClick: this.open },
			{ label: 'Renommer', onClick: this.startRenaming },
			{ label: 'Supprimer', onClick: () => {
				showModal({ title: 'Supprimer un fichier', body: `Voulez-vous vraiment supprimer ${name} ?`, onConfirm: this.remove });
			}},
			{ label: 'Télécharger', href: [...folder, name].map(encodeURIComponent).join('/'), download: name}
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
		const { props: { file: { type, name } }, state: { renaming } } = this;
		return (
			<div className={type} onDoubleClick={this.open} onContextMenu={e => this.handleContextMenu(e)}>
				<div className='fileName'>
					{(renaming) ? <AutoFocusInput value={name} onStopEditing={e => this.stopRenaming(e)}/> : <span>{name}</span>}
				</div>
			</div>
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
		return <input type='text' spellCheck='false' onBlur={this.handleBlur} onKeyDown={e => this.handleKeyDown(e)} ref={this.input}/>
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
			<div id='contextMenu' onClick={this.props.onClick} ref={this.element}>
				{this.props.items.map(item => <a {...item}>{item.label}</a>)}
			</div>
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
			<div id='myModal' className='modal fade' role='dialog'>
				<div className='modal-dialog'>
					<div className='modal-content'>
						<div className='modal-header'>
							<button type='button' className='close' data-dismiss='modal'>&times;</button>
							<h4 className='modal-title'>{this.state.title}</h4>
						</div>
						<div className='modal-body'>
							<p>{this.state.body}</p>
						</div>
						<div className='modal-footer'>
							<button type='button' className='btn btn-primary' data-dismiss='modal' onClick={this.state.onConfirm}>Oui</button>
							<button type='button' className='btn btn-secondary' data-dismiss='modal'>Non</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

socket.on("ExplorerInit", data => {
	ReactDOM.render(<ExplorerView {...data}/>, document.getElementById('app-root'));
	ReactDOM.render(<Modal/>, document.getElementById('modal-root'));
});