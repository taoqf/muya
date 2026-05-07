import type Format from '../../block/base/format';
import type { Muya } from '../../index';
import type { ImageToken } from '../../inlineRenderer/types';

import { isMouseEvent } from '../../utils';
import BaseFloat from '../baseFloat';
import './index.css';

const VERTICAL_BAR = ['left', 'right'];

const CIRCLE_RADIO = 5;
const BAR_HEIGHT = 50;

export class ImageResizeBar extends BaseFloat {
	public pluginName = 'transformer';
	private _reference: HTMLElement | null = null;
	private _block: Format | null = null;
	private _imageInfo: {
		token: ImageToken;
		imageId: string;
	} | null = null;

	private _movingAnchor: string | null = null;
	private _width: number | null = null;
	private _eventId: string[] = [];
	private _resizing: boolean = false;

	constructor(muya: Muya, options = {}) {
		const name = 'mu-transformer';
		super(muya, name, options);

		// const container = (this.container = document.createElement('div'));
		// container.classList.add('mu-transformer');
		// document.body.appendChild(container);

		this.listen();
	}

	override listen() {
		const { eventCenter, domNode } = this.muya;

		const scrollHandler = (event: Event) => {
			if (typeof this.lastScrollTop !== 'number') {
				this.lastScrollTop = (event.target as HTMLElement).scrollTop;

				return;
			}

			// only when scroll distance great than 50px, then hide the float box.
			if (
				!this._resizing
				&& this.status
				&& Math.abs((event.target as HTMLElement).scrollTop - this.lastScrollTop) > 50
			) {
				this.hide();
			}
		};

		eventCenter.on('muya-transformer', ({ block, reference, imageInfo }) => {
			this._reference = reference;
			if (reference) {
				this._block = block;
				this._imageInfo = imageInfo;
				setTimeout(() => {
					this.render();
				});
			}
			else {
				this.hide();
			}
		});

		eventCenter.attachDOMEvent(document, 'click', this.hide.bind(this));
		eventCenter.attachDOMEvent(domNode.parentElement!, 'scroll', scrollHandler);
		eventCenter.attachDOMEvent(this.container, 'dragstart', event =>
			event.preventDefault());
		eventCenter.attachDOMEvent(document.body, 'mousedown', this.mouseDown);
	}

	render() {
		const { eventCenter } = this.muya;
		if (this.status)
			this.hide();

		this.status = true;

		this.createElements();
		this.update();
		eventCenter.emit('muya-float', this, true);
	}

	createElements() {
		VERTICAL_BAR.forEach((c) => {
			const bar = document.createElement('div');
			bar.classList.add('bar');
			bar.classList.add(c);
			bar.setAttribute('data-position', c);
			this.container.appendChild(bar);
		});
	}

	update() {
		const rect = this._reference!.getBoundingClientRect();
		VERTICAL_BAR.forEach((c) => {
			const bar: HTMLDivElement = this.container.querySelector(`.${c}`)!;

			switch (c) {
				case 'left':
					bar.style.left = `${rect.left - CIRCLE_RADIO}px`;
					bar.style.top = `${rect.top + rect.height / 2 - BAR_HEIGHT / 2}px`;
					break;

				case 'right':
					bar.style.left = `${rect.left + rect.width - CIRCLE_RADIO}px`;
					bar.style.top = `${rect.top + rect.height / 2 - BAR_HEIGHT / 2}px`;
					break;
			}
		});
	}

	mouseDown = (event: Event) => {
		const target = event.target as HTMLElement;
		if (!target.closest('.bar'))
			return;

		const { eventCenter } = this.muya;
		this._movingAnchor = target.getAttribute('data-position');
		const mouseMoveId = eventCenter.attachDOMEvent(
			document.body,
			'mousemove',
			this.mouseMove,
		);
		const mouseUpId = eventCenter.attachDOMEvent(
			document.body,
			'mouseup',
			this.mouseUp,
		);
		this._resizing = true;
		// Hide image toolbar
		eventCenter.emit('muya-image-toolbar', { reference: null });
		this._eventId.push(mouseMoveId, mouseUpId);
	};

	mouseMove = (event: Event) => {
		if (!isMouseEvent(event))
			return;

		event.preventDefault();
		const { clientX } = event;
		let width: number | string = '';
		let relativeAnchor: HTMLDivElement;
		const image = this._reference!.querySelector('img');
		if (!image)
			return;

		switch (this._movingAnchor) {
			case 'left':
				relativeAnchor = this.container.querySelector('.right')!;
				width = Math.max(
					relativeAnchor.getBoundingClientRect().left + CIRCLE_RADIO - clientX,
					50,
				);
				break;

			case 'right':
				relativeAnchor = this.container.querySelector('.left')!;
				width = Math.max(
					clientX - relativeAnchor.getBoundingClientRect().left - CIRCLE_RADIO,
					50,
				);
				break;
		}
		// Image width/height attribute must be an integer.
		width = Number.parseInt(String(width));
		this._width = width;
		image.setAttribute('width', String(width));
		this.update();
	};

	mouseUp = (event: Event) => {
		event.preventDefault();
		const { eventCenter } = this.muya;
		if (this._eventId.length) {
			for (const id of this._eventId)
				eventCenter.detachDOMEvent(id);

			this._eventId = [];
		}

		if (typeof this._width === 'number' && this._block && this._imageInfo) {
			this._block.updateImage(this._imageInfo, 'width', String(this._width));
			this.hide();
		}

		this._width = null;
		this._resizing = false;
		this._movingAnchor = null;
	};

	override hide() {
		const { eventCenter } = this.muya;
		const circles = this.container.querySelectorAll('.bar');
		Array.from(circles).forEach(c => c.remove());
		this.status = false;
		eventCenter.emit('muya-float', this, false);
	}
}
