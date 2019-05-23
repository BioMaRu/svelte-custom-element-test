
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function toggle_class(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	let SvelteElement;
	if (typeof HTMLElement !== 'undefined') {
		SvelteElement = class extends HTMLElement {
			constructor() {
				super();
				this.attachShadow({ mode: 'open' });
			}

			connectedCallback() {
				for (const key in this.$$.slotted) {
					this.appendChild(this.$$.slotted[key]);
				}
			}

			attributeChangedCallback(attr$$1, oldValue, newValue) {
				this[attr$$1] = newValue;
			}

			$destroy() {
				destroy(this, true);
				this.$destroy = noop;
			}

			$on(type, callback) {
				// TODO should this delegate to addEventListener?
				const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
				callbacks.push(callback);

				return () => {
					const index = callbacks.indexOf(callback);
					if (index !== -1) callbacks.splice(index, 1);
				};
			}

			$set() {
				// overridden by instance, if it has props
			}
		};
	}

	/* src/App.svelte generated by Svelte v3.4.2 */

	const file = "src/App.svelte";

	// (53:4) {#if icon && icon !== ''}
	function create_if_block_1(ctx) {
		var span, t;

		return {
			c: function create() {
				span = element("span");
				t = text(ctx.icon);
				span.className = "material-icons";
				add_location(span, file, 53, 8, 1458);
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},

			p: function update(changed, ctx) {
				if (changed.icon) {
					set_data(t, ctx.icon);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (58:4) {:else}
	function create_else_block(ctx) {
		var slot;

		return {
			c: function create() {
				slot = element("slot");
				add_location(slot, file, 58, 8, 1579);
			},

			m: function mount(target, anchor) {
				insert(target, slot, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(slot);
				}
			}
		};
	}

	// (56:4) {#if label && label !== ''}
	function create_if_block(ctx) {
		var t;

		return {
			c: function create() {
				t = text(ctx.label);
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.label) {
					set_data(t, ctx.label);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var button, t, dispose;

		var if_block0 = (ctx.icon && ctx.icon !== '') && create_if_block_1(ctx);

		function select_block_type(ctx) {
			if (ctx.label && ctx.label !== '') return create_if_block;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block1 = current_block_type(ctx);

		return {
			c: function create() {
				button = element("button");
				if (if_block0) if_block0.c();
				t = space();
				if_block1.c();
				this.c = noop;
				button.disabled = ctx.disabled;
				toggle_class(button, "disabled", ctx.disabled || ctx.disabled === '');
				toggle_class(button, "big", ctx.size === 'big');
				toggle_class(button, "small", ctx.size === 'small');
				toggle_class(button, "loading", ctx.loading || ctx.loading === '');
				toggle_class(button, "raised", ctx.raised || ctx.raised === '');
				toggle_class(button, "fluid", ctx.fluid || ctx.fluid === '');
				toggle_class(button, "positive", ctx.intent === 'positive');
				toggle_class(button, "negative", ctx.intent === 'negative');
				toggle_class(button, "warning", ctx.intent === 'warning');
				toggle_class(button, "secondary", ctx.appearance === 'secondary');
				toggle_class(button, "tertiary", ctx.appearance === 'tertiary');
				add_location(button, file, 36, 0, 873);
				dispose = listen(button, "click", ctx.handleClick);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);
				if (if_block0) if_block0.m(button, null);
				append(button, t);
				if_block1.m(button, null);
				add_binding_callback(() => ctx.button_binding(button, null));
			},

			p: function update(changed, ctx) {
				if (ctx.icon && ctx.icon !== '') {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_1(ctx);
						if_block0.c();
						if_block0.m(button, t);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type(ctx);
					if (if_block1) {
						if_block1.c();
						if_block1.m(button, null);
					}
				}

				if (changed.items) {
					ctx.button_binding(null, button);
					ctx.button_binding(button, null);
				}

				if (changed.disabled) {
					button.disabled = ctx.disabled;
					toggle_class(button, "disabled", ctx.disabled || ctx.disabled === '');
				}

				if (changed.size) {
					toggle_class(button, "big", ctx.size === 'big');
					toggle_class(button, "small", ctx.size === 'small');
				}

				if (changed.loading) {
					toggle_class(button, "loading", ctx.loading || ctx.loading === '');
				}

				if (changed.raised) {
					toggle_class(button, "raised", ctx.raised || ctx.raised === '');
				}

				if (changed.fluid) {
					toggle_class(button, "fluid", ctx.fluid || ctx.fluid === '');
				}

				if (changed.intent) {
					toggle_class(button, "positive", ctx.intent === 'positive');
					toggle_class(button, "negative", ctx.intent === 'negative');
					toggle_class(button, "warning", ctx.intent === 'warning');
				}

				if (changed.appearance) {
					toggle_class(button, "secondary", ctx.appearance === 'secondary');
					toggle_class(button, "tertiary", ctx.appearance === 'tertiary');
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(button);
				}

				if (if_block0) if_block0.d();
				if_block1.d();
				ctx.button_binding(null, button);
				dispose();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let el;
	    let { appearance = '', disabled = false, fluid = false, icon = '', intent = '', label = '', loading = false, raised = false, size = '', type = '' } = $$props;

	    onMount (() => {
	        const host = el.parentNode.host;
	        const type = host.getAttribute('type');
	        const targetButton = document.createElement('button');

	        targetButton.style.display = 'none';

	        if (type) {
	            targetButton.type = type;
	        }

			host.append(targetButton);
	    });

	    function handleClick () {
	        const host = el.parentNode.host;
	        const targetButton = host.querySelector('button');
	        targetButton.click();
	    }

		function button_binding($$node, check) {
			el = $$node;
			$$invalidate('el', el);
		}

		$$self.$set = $$props => {
			if ('appearance' in $$props) $$invalidate('appearance', appearance = $$props.appearance);
			if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
			if ('fluid' in $$props) $$invalidate('fluid', fluid = $$props.fluid);
			if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
			if ('intent' in $$props) $$invalidate('intent', intent = $$props.intent);
			if ('label' in $$props) $$invalidate('label', label = $$props.label);
			if ('loading' in $$props) $$invalidate('loading', loading = $$props.loading);
			if ('raised' in $$props) $$invalidate('raised', raised = $$props.raised);
			if ('size' in $$props) $$invalidate('size', size = $$props.size);
			if ('type' in $$props) $$invalidate('type', type = $$props.type);
		};

		return {
			el,
			appearance,
			disabled,
			fluid,
			icon,
			intent,
			label,
			loading,
			raised,
			size,
			type,
			handleClick,
			button_binding
		};
	}

	class App extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>:host{--height-default:2.5rem;--font-size-default:1rem;--height-small:2rem;--font-size-small:0.875rem;--height-big:3.25rem;--font-size-big:1.25rem;--border-width:2px;--font-weight:600;display:inline-block;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}button{position:relative;display:flex;align-items:center;justify-content:center;min-height:var(--height-default, 2.5rem);padding:0 1.25rem;font-weight:var(--font-weight);font-size:var(--font-size-default, 1rem);line-height:100%;color:white;background-color:var(--color-primary-500, hsl(227, 75%, 55%));border:none;border-radius:3px;transition:all 160ms ease-in-out;user-select:none;cursor:pointer;outline:none;box-sizing:border-box}button.fluid{width:100%}button.small{min-height:var(--height-small, 2rem);font-size:var(--font-size-small, 0.875rem)}button.big{min-height:var(--height-big, 3.25rem);font-size:var(--font-size-big, 1.25rem)}button:hover{background-color:var(--color-primary-600, hsl(227, 70%, 49%))}button:focus{background-color:var(--color-primary-600, hsl(227, 70%, 49%));box-shadow:0 0 0 .15rem var(--color-primary-300, hsl(227, 85%, 89%))}button.loading:after{content:'';position:absolute;left:0;right:0;height:1rem;width:1rem;margin:auto;border:2px solid;border-right-color:white;border-top-color:white;border-radius:999px;animation:spin 480ms infinite linear}button.small.loading:after{width:0.75rem;height:0.75rem}button.big.loading:after{width:1.25rem;height:1.25rem}button.disabled,button.positive.disabled,button.negative.disabled,button.warning.disabled,button.positive.disabled:hover,button.negative.disabled:hover,button.warning.disabled:hover{color:hsl(216, 15%, 55%);background-color:hsl(216, 15%, 93%);cursor:not-allowed}button.positive.loading.disabled,button.negative.loading.disabled,button.warning.loading.disabled{background-color:hsl(216, 15%, 93%)}button.raised:before{content:'';position:absolute;width:100%;height:100%;border-radius:3px;box-shadow:0 4px 6px rgba(50, 50, 93, .14), 0 1px 3px rgba(0, 0, 0, .08)}button.positive{color:white;background-color:var(--color-positive-500, hsl(163, 100%, 31%))}button.positive:focus{box-shadow:0 0 0 .175rem var(--color-positive-200, hsl(163, 75%, 90%))}button.positive:hover{background-color:var(--color-positive-600, hsl(163, 100%, 28%))}button.negative{color:white;background-color:var(--color-negative-500, hsl(5, 80%, 55%))}button.negative:focus{box-shadow:0 0 0 .175rem var(--color-negative-200, hsl(5, 85%, 93%))}button.negative:hover{background-color:var(--color-negative-600, hsl(5, 80%, 47%))}button.warning{color:white;background-color:var(--color-warning-500, hsl(48, 70%, 48%))}button.warning:focus{box-shadow:0 0 0 .175rem var(--color-warning-200, hsl(48, 100%, 88%))}button.warning:hover{background-color:var(--color-warning-600, hsl(48, 70%, 45%))}button.secondary{color:var(--color-primary-600, hsl(227, 70%, 49%));border-width:var(--border-width);border-style:solid;border-color:var(--color-primary-600, hsl(227, 70%, 49%));background:transparent}button.secondary:hover{background-color:var(--color-primary-100, hsl(227, 85%, 96%))}button.secondary.loading:after,button.tertiary.loading:after{border-right-color:var(--color-primary-500, hsl(227, 75%, 55%));border-top-color:var(--color-primary-500, hsl(227, 75%, 55%))}button.secondary.disabled,button.secondary.positive.disabled,button.secondary.negative.disabled,button.secondary.warning.disabled{color:hsl(216, 15%, 55%);border-color:hsl(216, 15%, 55%);background-color:transparent}button.secondary.disabled:hover,button.secondary.positive.disabled:hover,button.secondary.negative.disabled:hover,button.secondary.warning.disabled:hover{background-color:transparent}button.secondary.positive,button.tertiary.positive{color:var(--color-positive-500, hsl(163, 100%, 31%));border-color:var(--color-positive-500, hsl(163, 100%, 31%))}button.secondary.positive.loading:after,button.tertiary.positive.loading:after{border-right-color:var(--color-positive-500, hsl(163, 100%, 31%));border-top-color:var(--color-positive-500, hsl(163, 100%, 31%))}button.secondary.positive:hover,button.tertiary.positive:hover{background-color:var(--color-positive-100, hsl(163, 75%, 95%))}button.secondary.negative,button.tertiary.negative{color:var(--color-negative-500, hsl(5, 80%, 55%));border-color:var(--color-negative-500, hsl(5, 80%, 55%))}button.secondary.negative.loading:after,button.tertiary.negative.loading:after{border-right-color:var(--color-negative-500, hsl(5, 80%, 55%));border-top-color:var(--color-negative-500, hsl(5, 80%, 55%))}button.secondary.negative:hover,button.tertiary.negative:hover{background-color:var(--color-negative-100, hsl(5, 85%, 97%))}button.secondary.warning,button.tertiary.warning{color:var(--color-warning-500, hsl(48, 70%, 48%));border-color:var(--color-warning-500, hsl(48, 70%, 48%))}button.secondary.warning.loading:after,button.tertiary.warning.loading:after{border-right-color:var(--color-warning-500, hsl(48, 70%, 48%));border-top-color:var(--color-warning-500, hsl(48, 70%, 48%))}button.secondary.warning:hover,button.tertiary.warning:hover{background-color:var(--color-warning-100, hsl(48, 100%, 93%))}button.disabled.loading:after,button.secondary.disabled.loading:after,button.tertiary.disabled.loading:after{border-right-color:hsl(216, 15%, 55%);border-top-color:hsl(216, 15%, 55%)}button.tertiary{background:transparent;color:var(--color-primary-500, hsl(227, 75%, 55%))}button.tertiary:hover{background-color:var(--color-primary-100, hsl(227, 85%, 96%))}button.tertiary.disabled{color:hsl(216, 15%, 55%);background-color:transparent}button.tertiary.disabled:hover{background-color:transparent}button.tertiary.loading.disabled{background-color:transparent}button.loading,button.disabled.loading,button.secondary.loading,button.tertiary.loading,button.secondary.disabled.loading,button.tertiary.loading.disabled{color:transparent}button .material-icons{display:inline-block;overflow:hidden;overflow-wrap:normal;width:1.5rem;margin-right:.5rem;font-family:"Material Icons";font-weight:normal;font-style:normal;font-size:1.5rem;line-height:1;letter-spacing:normal;text-transform:none;white-space:nowrap;direction:ltr;font-feature-settings:"liga";-webkit-font-smoothing:antialiased}button.small .material-icons{font-size:1.125rem;width:1.125rem}button.big .material-icons{font-size:1.75rem;width:1.75rem}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICAgIGltcG9ydCB7IG9uTW91bnQsIGJlZm9yZVVwZGF0ZSwgYWZ0ZXJVcGRhdGUgfSBmcm9tICdzdmVsdGUnO1xuXG4gICAgbGV0IGVsO1xuICAgIGV4cG9ydCBsZXQgYXBwZWFyYW5jZSA9ICcnO1xuICAgIGV4cG9ydCBsZXQgZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IGZsdWlkID0gZmFsc2U7XG4gICAgZXhwb3J0IGxldCBpY29uID0gJyc7XG4gICAgZXhwb3J0IGxldCBpbnRlbnQgPSAnJztcbiAgICBleHBvcnQgbGV0IGxhYmVsID0gJyc7XG4gICAgZXhwb3J0IGxldCBsb2FkaW5nID0gZmFsc2U7XG4gICAgZXhwb3J0IGxldCByYWlzZWQgPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IHNpemUgPSAnJztcbiAgICBleHBvcnQgbGV0IHR5cGUgPSAnJztcblxuICAgIG9uTW91bnQgKCgpID0+IHtcbiAgICAgICAgY29uc3QgaG9zdCA9IGVsLnBhcmVudE5vZGUuaG9zdFxuICAgICAgICBjb25zdCB0eXBlID0gaG9zdC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKVxuICAgICAgICBjb25zdCB0YXJnZXRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuXG4gICAgICAgIHRhcmdldEJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgIHRhcmdldEJ1dHRvbi50eXBlID0gdHlwZVxuICAgICAgICB9XG5cblx0XHRob3N0LmFwcGVuZCh0YXJnZXRCdXR0b24pXG4gICAgfSlcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUNsaWNrICgpIHtcbiAgICAgICAgY29uc3QgaG9zdCA9IGVsLnBhcmVudE5vZGUuaG9zdFxuICAgICAgICBjb25zdCB0YXJnZXRCdXR0b24gPSBob3N0LnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbicpXG4gICAgICAgIHRhcmdldEJ1dHRvbi5jbGljaygpXG4gICAgfVxuPC9zY3JpcHQ+XG5cbjxidXR0b25cbiAgICBiaW5kOnRoaXM9e2VsfVxuICAgIG9uOmNsaWNrPXtoYW5kbGVDbGlja31cbiAgICBkaXNhYmxlZD17ZGlzYWJsZWR9XG4gICAgY2xhc3M6ZGlzYWJsZWQ9e2Rpc2FibGVkIHx8IGRpc2FibGVkID09PSAnJ31cbiAgICBjbGFzczpiaWc9e3NpemUgPT09ICdiaWcnfVxuICAgIGNsYXNzOnNtYWxsPXtzaXplID09PSAnc21hbGwnfVxuICAgIGNsYXNzOmxvYWRpbmc9e2xvYWRpbmcgfHwgbG9hZGluZyA9PT0gJyd9XG4gICAgY2xhc3M6cmFpc2VkPXtyYWlzZWQgfHwgcmFpc2VkID09PSAnJ31cbiAgICBjbGFzczpmbHVpZD17Zmx1aWQgfHwgZmx1aWQgPT09ICcnfVxuICAgIGNsYXNzOnBvc2l0aXZlPXtpbnRlbnQgPT09ICdwb3NpdGl2ZSd9XG4gICAgY2xhc3M6bmVnYXRpdmU9e2ludGVudCA9PT0gJ25lZ2F0aXZlJ31cbiAgICBjbGFzczp3YXJuaW5nPXtpbnRlbnQgPT09ICd3YXJuaW5nJ31cbiAgICBjbGFzczpzZWNvbmRhcnk9e2FwcGVhcmFuY2UgPT09ICdzZWNvbmRhcnknfVxuICAgIGNsYXNzOnRlcnRpYXJ5PXthcHBlYXJhbmNlID09PSAndGVydGlhcnknfVxuPlxuICAgIHsjaWYgaWNvbiAmJiBpY29uICE9PSAnJ31cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJtYXRlcmlhbC1pY29uc1wiPntpY29ufTwvc3Bhbj5cbiAgICB7L2lmfVxuICAgIHsjaWYgbGFiZWwgJiYgbGFiZWwgIT09ICcnfVxuICAgICAgICB7bGFiZWx9XG4gICAgezplbHNlfVxuICAgICAgICA8c2xvdD48L3Nsb3Q+XG4gICAgey9pZn1cbjwvYnV0dG9uPlxuXG48c3R5bGU+XG4gICAgOmhvc3Qge1xuXHRcdC0taGVpZ2h0LWRlZmF1bHQ6IDIuNXJlbTtcblx0XHQtLWZvbnQtc2l6ZS1kZWZhdWx0OiAxcmVtO1xuXG5cdFx0LS1oZWlnaHQtc21hbGw6IDJyZW07XG5cdFx0LS1mb250LXNpemUtc21hbGw6IDAuODc1cmVtO1xuXG5cdFx0LS1oZWlnaHQtYmlnOiAzLjI1cmVtO1xuXHRcdC0tZm9udC1zaXplLWJpZzogMS4yNXJlbTtcblxuXHRcdC0tYm9yZGVyLXdpZHRoOiAycHg7XG5cdFx0LS1mb250LXdlaWdodDogNjAwO1xuXG5cdFx0ZGlzcGxheTogaW5saW5lLWJsb2NrO1xuXG5cdFx0LW1vei1vc3gtZm9udC1zbW9vdGhpbmc6IGdyYXlzY2FsZTtcblx0XHQtd2Via2l0LWZvbnQtc21vb3RoaW5nOiBhbnRpYWxpYXNlZDtcblx0XHR0ZXh0LXJlbmRlcmluZzogb3B0aW1pemVMZWdpYmlsaXR5O1xuXHR9XG5cblx0YnV0dG9uIHtcblx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cblx0XHRkaXNwbGF5OiBmbGV4O1xuXHRcdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdFx0anVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG5cblx0XHRtaW4taGVpZ2h0OiB2YXIoLS1oZWlnaHQtZGVmYXVsdCwgMi41cmVtKTtcblx0XHRwYWRkaW5nOiAwIDEuMjVyZW07XG5cblx0XHRmb250LXdlaWdodDogdmFyKC0tZm9udC13ZWlnaHQpO1xuXHRcdGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLWRlZmF1bHQsIDFyZW0pO1xuXHRcdGxpbmUtaGVpZ2h0OiAxMDAlO1xuXG5cdFx0Y29sb3I6IHdoaXRlO1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLXByaW1hcnktNTAwLCBoc2woMjI3LCA3NSUsIDU1JSkpO1xuXG5cdFx0Ym9yZGVyOiBub25lO1xuXHRcdGJvcmRlci1yYWRpdXM6IDNweDtcblxuXHRcdHRyYW5zaXRpb246IGFsbCAxNjBtcyBlYXNlLWluLW91dDtcblx0XHR1c2VyLXNlbGVjdDogbm9uZTtcblx0XHRjdXJzb3I6IHBvaW50ZXI7XG5cdFx0b3V0bGluZTogbm9uZTtcblxuXHRcdGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG5cdH1cblxuXHRidXR0b24uZmx1aWQge1xuXHRcdHdpZHRoOiAxMDAlO1xuXHR9XG5cblx0YnV0dG9uLnNtYWxsIHtcblx0XHRtaW4taGVpZ2h0OiB2YXIoLS1oZWlnaHQtc21hbGwsIDJyZW0pO1xuXHRcdGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLXNtYWxsLCAwLjg3NXJlbSk7XG5cdH1cblxuXHRidXR0b24uYmlnIHtcblx0XHRtaW4taGVpZ2h0OiB2YXIoLS1oZWlnaHQtYmlnLCAzLjI1cmVtKTtcblx0XHRmb250LXNpemU6IHZhcigtLWZvbnQtc2l6ZS1iaWcsIDEuMjVyZW0pO1xuXHR9XG5cblx0YnV0dG9uOmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1wcmltYXJ5LTYwMCwgaHNsKDIyNywgNzAlLCA0OSUpKTtcblx0fVxuXG5cdGJ1dHRvbjpmb2N1cyB7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tY29sb3ItcHJpbWFyeS02MDAsIGhzbCgyMjcsIDcwJSwgNDklKSk7XG5cdFx0Ym94LXNoYWRvdzogMCAwIDAgLjE1cmVtIHZhcigtLWNvbG9yLXByaW1hcnktMzAwLCBoc2woMjI3LCA4NSUsIDg5JSkpO1xuXHR9XG5cblx0YnV0dG9uLmxvYWRpbmc6YWZ0ZXIge1xuXHRcdGNvbnRlbnQ6ICcnO1xuXHRcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblxuXHRcdGxlZnQ6IDA7XG5cdFx0cmlnaHQ6IDA7XG5cblx0XHRoZWlnaHQ6IDFyZW07XG5cdFx0d2lkdGg6IDFyZW07XG5cblx0XHRtYXJnaW46IGF1dG87XG5cblx0XHRib3JkZXI6IDJweCBzb2xpZDtcblx0XHRib3JkZXItcmlnaHQtY29sb3I6IHdoaXRlO1xuXHRcdGJvcmRlci10b3AtY29sb3I6IHdoaXRlO1xuXHRcdGJvcmRlci1yYWRpdXM6IDk5OXB4O1xuXG5cdFx0YW5pbWF0aW9uOiBzcGluIDQ4MG1zIGluZmluaXRlIGxpbmVhcjtcblx0fVxuXG5cdGJ1dHRvbi5zbWFsbC5sb2FkaW5nOmFmdGVyIHtcblx0XHR3aWR0aDogMC43NXJlbTtcblx0XHRoZWlnaHQ6IDAuNzVyZW07XG5cdH1cblxuXHRidXR0b24uYmlnLmxvYWRpbmc6YWZ0ZXIge1xuXHRcdHdpZHRoOiAxLjI1cmVtO1xuXHRcdGhlaWdodDogMS4yNXJlbTtcblx0fVxuXG5cdGJ1dHRvbi5kaXNhYmxlZCxcblx0YnV0dG9uLnBvc2l0aXZlLmRpc2FibGVkLFxuXHRidXR0b24ubmVnYXRpdmUuZGlzYWJsZWQsXG5cdGJ1dHRvbi53YXJuaW5nLmRpc2FibGVkLFxuXHRidXR0b24ucG9zaXRpdmUuZGlzYWJsZWQ6aG92ZXIsXG5cdGJ1dHRvbi5uZWdhdGl2ZS5kaXNhYmxlZDpob3Zlcixcblx0YnV0dG9uLndhcm5pbmcuZGlzYWJsZWQ6aG92ZXIge1xuXHRcdGNvbG9yOiBoc2woMjE2LCAxNSUsIDU1JSk7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogaHNsKDIxNiwgMTUlLCA5MyUpO1xuXHRcdGN1cnNvcjogbm90LWFsbG93ZWQ7XG5cdH1cblxuXHRidXR0b24ucG9zaXRpdmUubG9hZGluZy5kaXNhYmxlZCxcblx0YnV0dG9uLm5lZ2F0aXZlLmxvYWRpbmcuZGlzYWJsZWQsXG5cdGJ1dHRvbi53YXJuaW5nLmxvYWRpbmcuZGlzYWJsZWQge1xuXHRcdGJhY2tncm91bmQtY29sb3I6IGhzbCgyMTYsIDE1JSwgOTMlKTtcblx0fVxuXG5cdGJ1dHRvbi5yYWlzZWQ6YmVmb3JlIHtcblx0XHRjb250ZW50OiAnJztcblx0XHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cblx0XHR3aWR0aDogMTAwJTtcblx0XHRoZWlnaHQ6IDEwMCU7XG5cblx0XHRib3JkZXItcmFkaXVzOiAzcHg7XG5cblx0XHRib3gtc2hhZG93OiAwIDRweCA2cHggcmdiYSg1MCwgNTAsIDkzLCAuMTQpLCAwIDFweCAzcHggcmdiYSgwLCAwLCAwLCAuMDgpO1xuXHR9XG5cblx0YnV0dG9uLnBvc2l0aXZlIHtcblx0XHRjb2xvcjogd2hpdGU7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tY29sb3ItcG9zaXRpdmUtNTAwLCBoc2woMTYzLCAxMDAlLCAzMSUpKTtcblx0fVxuXG5cdGJ1dHRvbi5wb3NpdGl2ZTpmb2N1cyB7XG5cdFx0Ym94LXNoYWRvdzogMCAwIDAgLjE3NXJlbSB2YXIoLS1jb2xvci1wb3NpdGl2ZS0yMDAsIGhzbCgxNjMsIDc1JSwgOTAlKSk7XG5cdH1cblxuXHRidXR0b24ucG9zaXRpdmU6aG92ZXIge1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLXBvc2l0aXZlLTYwMCwgaHNsKDE2MywgMTAwJSwgMjglKSk7XG5cdH1cblxuXHRidXR0b24ubmVnYXRpdmUge1xuXHRcdGNvbG9yOiB3aGl0ZTtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1uZWdhdGl2ZS01MDAsIGhzbCg1LCA4MCUsIDU1JSkpO1xuXHR9XG5cblx0YnV0dG9uLm5lZ2F0aXZlOmZvY3VzIHtcblx0XHRib3gtc2hhZG93OiAwIDAgMCAuMTc1cmVtIHZhcigtLWNvbG9yLW5lZ2F0aXZlLTIwMCwgaHNsKDUsIDg1JSwgOTMlKSk7XG5cdH1cblxuXHRidXR0b24ubmVnYXRpdmU6aG92ZXIge1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLW5lZ2F0aXZlLTYwMCwgaHNsKDUsIDgwJSwgNDclKSk7XG5cdH1cblxuXHRidXR0b24ud2FybmluZyB7XG5cdFx0Y29sb3I6IHdoaXRlO1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLXdhcm5pbmctNTAwLCBoc2woNDgsIDcwJSwgNDglKSk7XG5cdH1cblxuXHRidXR0b24ud2FybmluZzpmb2N1cyB7XG5cdFx0Ym94LXNoYWRvdzogMCAwIDAgLjE3NXJlbSB2YXIoLS1jb2xvci13YXJuaW5nLTIwMCwgaHNsKDQ4LCAxMDAlLCA4OCUpKTtcblx0fVxuXG5cdGJ1dHRvbi53YXJuaW5nOmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci13YXJuaW5nLTYwMCwgaHNsKDQ4LCA3MCUsIDQ1JSkpO1xuXHR9XG5cblx0YnV0dG9uLnNlY29uZGFyeSB7XG5cdFx0Y29sb3I6IHZhcigtLWNvbG9yLXByaW1hcnktNjAwLCBoc2woMjI3LCA3MCUsIDQ5JSkpO1xuXHRcdGJvcmRlci13aWR0aDogdmFyKC0tYm9yZGVyLXdpZHRoKTtcblx0XHRib3JkZXItc3R5bGU6IHNvbGlkO1xuXHRcdGJvcmRlci1jb2xvcjogdmFyKC0tY29sb3ItcHJpbWFyeS02MDAsIGhzbCgyMjcsIDcwJSwgNDklKSk7XG5cdFx0YmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHRidXR0b24uc2Vjb25kYXJ5OmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1wcmltYXJ5LTEwMCwgaHNsKDIyNywgODUlLCA5NiUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkubG9hZGluZzphZnRlcixcblx0YnV0dG9uLnRlcnRpYXJ5LmxvYWRpbmc6YWZ0ZXIge1xuXHRcdGJvcmRlci1yaWdodC1jb2xvcjogdmFyKC0tY29sb3ItcHJpbWFyeS01MDAsIGhzbCgyMjcsIDc1JSwgNTUlKSk7XG5cdFx0Ym9yZGVyLXRvcC1jb2xvcjogdmFyKC0tY29sb3ItcHJpbWFyeS01MDAsIGhzbCgyMjcsIDc1JSwgNTUlKSk7XG5cdH1cblxuXHRidXR0b24uc2Vjb25kYXJ5LmRpc2FibGVkLFxuXHRidXR0b24uc2Vjb25kYXJ5LnBvc2l0aXZlLmRpc2FibGVkLFxuXHRidXR0b24uc2Vjb25kYXJ5Lm5lZ2F0aXZlLmRpc2FibGVkLFxuXHRidXR0b24uc2Vjb25kYXJ5Lndhcm5pbmcuZGlzYWJsZWQge1xuXHRcdGNvbG9yOiBoc2woMjE2LCAxNSUsIDU1JSk7XG5cdFx0Ym9yZGVyLWNvbG9yOiBoc2woMjE2LCAxNSUsIDU1JSk7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHRidXR0b24uc2Vjb25kYXJ5LmRpc2FibGVkOmhvdmVyLFxuXHRidXR0b24uc2Vjb25kYXJ5LnBvc2l0aXZlLmRpc2FibGVkOmhvdmVyLFxuXHRidXR0b24uc2Vjb25kYXJ5Lm5lZ2F0aXZlLmRpc2FibGVkOmhvdmVyLFxuXHRidXR0b24uc2Vjb25kYXJ5Lndhcm5pbmcuZGlzYWJsZWQ6aG92ZXIge1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xuXHR9XG5cblx0YnV0dG9uLnNlY29uZGFyeS5wb3NpdGl2ZSxcblx0YnV0dG9uLnRlcnRpYXJ5LnBvc2l0aXZlIHtcblx0XHRjb2xvcjogdmFyKC0tY29sb3ItcG9zaXRpdmUtNTAwLCBoc2woMTYzLCAxMDAlLCAzMSUpKTtcblx0XHRib3JkZXItY29sb3I6IHZhcigtLWNvbG9yLXBvc2l0aXZlLTUwMCwgaHNsKDE2MywgMTAwJSwgMzElKSk7XG5cdH1cblxuXHRidXR0b24uc2Vjb25kYXJ5LnBvc2l0aXZlLmxvYWRpbmc6YWZ0ZXIsXG5cdGJ1dHRvbi50ZXJ0aWFyeS5wb3NpdGl2ZS5sb2FkaW5nOmFmdGVyIHtcblx0XHRib3JkZXItcmlnaHQtY29sb3I6IHZhcigtLWNvbG9yLXBvc2l0aXZlLTUwMCwgaHNsKDE2MywgMTAwJSwgMzElKSk7XG5cdFx0Ym9yZGVyLXRvcC1jb2xvcjogdmFyKC0tY29sb3ItcG9zaXRpdmUtNTAwLCBoc2woMTYzLCAxMDAlLCAzMSUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkucG9zaXRpdmU6aG92ZXIsXG5cdGJ1dHRvbi50ZXJ0aWFyeS5wb3NpdGl2ZTpob3ZlciB7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tY29sb3ItcG9zaXRpdmUtMTAwLCBoc2woMTYzLCA3NSUsIDk1JSkpO1xuXHR9XG5cblx0YnV0dG9uLnNlY29uZGFyeS5uZWdhdGl2ZSxcblx0YnV0dG9uLnRlcnRpYXJ5Lm5lZ2F0aXZlIHtcblx0XHRjb2xvcjogdmFyKC0tY29sb3ItbmVnYXRpdmUtNTAwLCBoc2woNSwgODAlLCA1NSUpKTtcblx0XHRib3JkZXItY29sb3I6IHZhcigtLWNvbG9yLW5lZ2F0aXZlLTUwMCwgaHNsKDUsIDgwJSwgNTUlKSk7XG5cdH1cblxuXHRidXR0b24uc2Vjb25kYXJ5Lm5lZ2F0aXZlLmxvYWRpbmc6YWZ0ZXIsXG5cdGJ1dHRvbi50ZXJ0aWFyeS5uZWdhdGl2ZS5sb2FkaW5nOmFmdGVyIHtcblx0XHRib3JkZXItcmlnaHQtY29sb3I6IHZhcigtLWNvbG9yLW5lZ2F0aXZlLTUwMCwgaHNsKDUsIDgwJSwgNTUlKSk7XG5cdFx0Ym9yZGVyLXRvcC1jb2xvcjogdmFyKC0tY29sb3ItbmVnYXRpdmUtNTAwLCBoc2woNSwgODAlLCA1NSUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkubmVnYXRpdmU6aG92ZXIsXG5cdGJ1dHRvbi50ZXJ0aWFyeS5uZWdhdGl2ZTpob3ZlciB7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tY29sb3ItbmVnYXRpdmUtMTAwLCBoc2woNSwgODUlLCA5NyUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkud2FybmluZyxcblx0YnV0dG9uLnRlcnRpYXJ5Lndhcm5pbmcge1xuXHRcdGNvbG9yOiB2YXIoLS1jb2xvci13YXJuaW5nLTUwMCwgaHNsKDQ4LCA3MCUsIDQ4JSkpO1xuXHRcdGJvcmRlci1jb2xvcjogdmFyKC0tY29sb3Itd2FybmluZy01MDAsIGhzbCg0OCwgNzAlLCA0OCUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkud2FybmluZy5sb2FkaW5nOmFmdGVyLFxuXHRidXR0b24udGVydGlhcnkud2FybmluZy5sb2FkaW5nOmFmdGVyIHtcblx0XHRib3JkZXItcmlnaHQtY29sb3I6IHZhcigtLWNvbG9yLXdhcm5pbmctNTAwLCBoc2woNDgsIDcwJSwgNDglKSk7XG5cdFx0Ym9yZGVyLXRvcC1jb2xvcjogdmFyKC0tY29sb3Itd2FybmluZy01MDAsIGhzbCg0OCwgNzAlLCA0OCUpKTtcblx0fVxuXG5cdGJ1dHRvbi5zZWNvbmRhcnkud2FybmluZzpob3Zlcixcblx0YnV0dG9uLnRlcnRpYXJ5Lndhcm5pbmc6aG92ZXIge1xuXHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLXdhcm5pbmctMTAwLCBoc2woNDgsIDEwMCUsIDkzJSkpO1xuXHR9XG5cblx0YnV0dG9uLmRpc2FibGVkLmxvYWRpbmc6YWZ0ZXIsXG5cdGJ1dHRvbi5zZWNvbmRhcnkuZGlzYWJsZWQubG9hZGluZzphZnRlcixcblx0YnV0dG9uLnRlcnRpYXJ5LmRpc2FibGVkLmxvYWRpbmc6YWZ0ZXIge1xuXHRcdGJvcmRlci1yaWdodC1jb2xvcjogaHNsKDIxNiwgMTUlLCA1NSUpO1xuXHRcdGJvcmRlci10b3AtY29sb3I6IGhzbCgyMTYsIDE1JSwgNTUlKTtcblx0fVxuXG5cdGJ1dHRvbi50ZXJ0aWFyeSB7XG5cdFx0YmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG5cdFx0Y29sb3I6IHZhcigtLWNvbG9yLXByaW1hcnktNTAwLCBoc2woMjI3LCA3NSUsIDU1JSkpO1xuXHR9XG5cblx0YnV0dG9uLnRlcnRpYXJ5OmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci1wcmltYXJ5LTEwMCwgaHNsKDIyNywgODUlLCA5NiUpKTtcblx0fVxuXG5cdGJ1dHRvbi50ZXJ0aWFyeS5kaXNhYmxlZCB7XG5cdFx0Y29sb3I6IGhzbCgyMTYsIDE1JSwgNTUlKTtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcblx0fVxuXG5cdGJ1dHRvbi50ZXJ0aWFyeS5kaXNhYmxlZDpob3ZlciB7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHRidXR0b24udGVydGlhcnkubG9hZGluZy5kaXNhYmxlZCB7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHRidXR0b24ubG9hZGluZyxcblx0YnV0dG9uLmRpc2FibGVkLmxvYWRpbmcsXG5cdGJ1dHRvbi5zZWNvbmRhcnkubG9hZGluZyxcblx0YnV0dG9uLnRlcnRpYXJ5LmxvYWRpbmcsXG5cdGJ1dHRvbi5zZWNvbmRhcnkuZGlzYWJsZWQubG9hZGluZyxcblx0YnV0dG9uLnRlcnRpYXJ5LmxvYWRpbmcuZGlzYWJsZWQge1xuXHRcdGNvbG9yOiB0cmFuc3BhcmVudDtcblx0fVxuXG5cdGJ1dHRvbiAubWF0ZXJpYWwtaWNvbnMge1xuXHRcdGRpc3BsYXk6IGlubGluZS1ibG9jaztcblx0XHRvdmVyZmxvdzogaGlkZGVuO1xuXHRcdG92ZXJmbG93LXdyYXA6IG5vcm1hbDtcblxuXHRcdHdpZHRoOiAxLjVyZW07XG5cdFx0bWFyZ2luLXJpZ2h0OiAuNXJlbTtcblxuXHRcdGZvbnQtZmFtaWx5OiBcIk1hdGVyaWFsIEljb25zXCI7XG5cdFx0Zm9udC13ZWlnaHQ6IG5vcm1hbDtcblx0XHRmb250LXN0eWxlOiBub3JtYWw7XG5cdFx0Zm9udC1zaXplOiAxLjVyZW07XG5cdFx0bGluZS1oZWlnaHQ6IDE7XG5cdFx0bGV0dGVyLXNwYWNpbmc6IG5vcm1hbDtcblx0XHR0ZXh0LXRyYW5zZm9ybTogbm9uZTtcblx0XHR3aGl0ZS1zcGFjZTogbm93cmFwO1xuXHRcdGRpcmVjdGlvbjogbHRyO1xuXHRcdGZvbnQtZmVhdHVyZS1zZXR0aW5nczogXCJsaWdhXCI7XG5cdFx0LXdlYmtpdC1mb250LXNtb290aGluZzogYW50aWFsaWFzZWQ7XG5cdH1cblxuXHRidXR0b24uc21hbGwgLm1hdGVyaWFsLWljb25zIHtcblx0XHRmb250LXNpemU6IDEuMTI1cmVtO1xuXHRcdHdpZHRoOiAxLjEyNXJlbTtcblx0fVxuXG5cdGJ1dHRvbi5iaWcgLm1hdGVyaWFsLWljb25zIHtcblx0XHRmb250LXNpemU6IDEuNzVyZW07XG5cdFx0d2lkdGg6IDEuNzVyZW07XG5cdH1cblxuXHRAa2V5ZnJhbWVzIHNwaW4ge1xuXHRcdGZyb20geyB0cmFuc2Zvcm06IHJvdGF0ZSgwZGVnKTsgfVxuXHRcdHRvICAgeyB0cmFuc2Zvcm06IHJvdGF0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 */</style>`;

			init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["appearance", "disabled", "fluid", "icon", "intent", "label", "loading", "raised", "size", "type"]);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}

				if (options.props) {
					this.$set(options.props);
					flush();
				}
			}
		}

		static get observedAttributes() {
			return ["appearance","disabled","fluid","icon","intent","label","loading","raised","size","type"];
		}

		get appearance() {
			return this.$$.ctx.appearance;
		}

		set appearance(appearance) {
			this.$set({ appearance });
			flush();
		}

		get disabled() {
			return this.$$.ctx.disabled;
		}

		set disabled(disabled) {
			this.$set({ disabled });
			flush();
		}

		get fluid() {
			return this.$$.ctx.fluid;
		}

		set fluid(fluid) {
			this.$set({ fluid });
			flush();
		}

		get icon() {
			return this.$$.ctx.icon;
		}

		set icon(icon) {
			this.$set({ icon });
			flush();
		}

		get intent() {
			return this.$$.ctx.intent;
		}

		set intent(intent) {
			this.$set({ intent });
			flush();
		}

		get label() {
			return this.$$.ctx.label;
		}

		set label(label) {
			this.$set({ label });
			flush();
		}

		get loading() {
			return this.$$.ctx.loading;
		}

		set loading(loading) {
			this.$set({ loading });
			flush();
		}

		get raised() {
			return this.$$.ctx.raised;
		}

		set raised(raised) {
			this.$set({ raised });
			flush();
		}

		get size() {
			return this.$$.ctx.size;
		}

		set size(size) {
			this.$set({ size });
			flush();
		}

		get type() {
			return this.$$.ctx.type;
		}

		set type(type) {
			this.$set({ type });
			flush();
		}
	}

	customElements.define("aet-button", App);

	return app;

}());
//# sourceMappingURL=aet-button.js.map
