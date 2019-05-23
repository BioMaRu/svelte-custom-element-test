<script>
    import { onMount, beforeUpdate, afterUpdate } from 'svelte';

    let el;
    export let appearance = '';
    export let disabled = false;
    export let fluid = false;
    export let icon = '';
    export let intent = '';
    export let label = '';
    export let loading = false;
    export let raised = false;
    export let size = '';
    export let type = '';

    onMount (() => {
        const host = el.parentNode.host
        const type = host.getAttribute('type')
        const targetButton = document.createElement('button')

        targetButton.style.display = 'none'

        if (type) {
            targetButton.type = type
        }

		host.append(targetButton)
    })

    function handleClick () {
        const host = el.parentNode.host
        const targetButton = host.querySelector('button')
        targetButton.click()
    }
</script>

<button
    bind:this={el}
    on:click={handleClick}
    disabled={disabled}
    class:disabled={disabled || disabled === ''}
    class:big={size === 'big'}
    class:small={size === 'small'}
    class:loading={loading || loading === ''}
    class:raised={raised || raised === ''}
    class:fluid={fluid || fluid === ''}
    class:positive={intent === 'positive'}
    class:negative={intent === 'negative'}
    class:warning={intent === 'warning'}
    class:secondary={appearance === 'secondary'}
    class:tertiary={appearance === 'tertiary'}
>
    {#if icon && icon !== ''}
        <span class="material-icons">{icon}</span>
    {/if}
    {#if label && label !== ''}
        {label}
    {:else}
        <slot></slot>
    {/if}
</button>

<style>
    :host {
		--height-default: 2.5rem;
		--font-size-default: 1rem;

		--height-small: 2rem;
		--font-size-small: 0.875rem;

		--height-big: 3.25rem;
		--font-size-big: 1.25rem;

		--border-width: 2px;
		--font-weight: 600;

		display: inline-block;

		-moz-osx-font-smoothing: grayscale;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	button {
		position: relative;

		display: flex;
		align-items: center;
		justify-content: center;

		min-height: var(--height-default, 2.5rem);
		padding: 0 1.25rem;

		font-weight: var(--font-weight);
		font-size: var(--font-size-default, 1rem);
		line-height: 100%;

		color: white;
		background-color: var(--color-primary-500, hsl(227, 75%, 55%));

		border: none;
		border-radius: 3px;

		transition: all 160ms ease-in-out;
		user-select: none;
		cursor: pointer;
		outline: none;

		box-sizing: border-box;
	}

	button.fluid {
		width: 100%;
	}

	button.small {
		min-height: var(--height-small, 2rem);
		font-size: var(--font-size-small, 0.875rem);
	}

	button.big {
		min-height: var(--height-big, 3.25rem);
		font-size: var(--font-size-big, 1.25rem);
	}

	button:hover {
		background-color: var(--color-primary-600, hsl(227, 70%, 49%));
	}

	button:focus {
		background-color: var(--color-primary-600, hsl(227, 70%, 49%));
		box-shadow: 0 0 0 .15rem var(--color-primary-300, hsl(227, 85%, 89%));
	}

	button.loading:after {
		content: '';
		position: absolute;

		left: 0;
		right: 0;

		height: 1rem;
		width: 1rem;

		margin: auto;

		border: 2px solid;
		border-right-color: white;
		border-top-color: white;
		border-radius: 999px;

		animation: spin 480ms infinite linear;
	}

	button.small.loading:after {
		width: 0.75rem;
		height: 0.75rem;
	}

	button.big.loading:after {
		width: 1.25rem;
		height: 1.25rem;
	}

	button.disabled,
	button.positive.disabled,
	button.negative.disabled,
	button.warning.disabled,
	button.positive.disabled:hover,
	button.negative.disabled:hover,
	button.warning.disabled:hover {
		color: hsl(216, 15%, 55%);
		background-color: hsl(216, 15%, 93%);
		cursor: not-allowed;
	}

	button.positive.loading.disabled,
	button.negative.loading.disabled,
	button.warning.loading.disabled {
		background-color: hsl(216, 15%, 93%);
	}

	button.raised:before {
		content: '';
		position: absolute;

		width: 100%;
		height: 100%;

		border-radius: 3px;

		box-shadow: 0 4px 6px rgba(50, 50, 93, .14), 0 1px 3px rgba(0, 0, 0, .08);
	}

	button.positive {
		color: white;
		background-color: var(--color-positive-500, hsl(163, 100%, 31%));
	}

	button.positive:focus {
		box-shadow: 0 0 0 .175rem var(--color-positive-200, hsl(163, 75%, 90%));
	}

	button.positive:hover {
		background-color: var(--color-positive-600, hsl(163, 100%, 28%));
	}

	button.negative {
		color: white;
		background-color: var(--color-negative-500, hsl(5, 80%, 55%));
	}

	button.negative:focus {
		box-shadow: 0 0 0 .175rem var(--color-negative-200, hsl(5, 85%, 93%));
	}

	button.negative:hover {
		background-color: var(--color-negative-600, hsl(5, 80%, 47%));
	}

	button.warning {
		color: white;
		background-color: var(--color-warning-500, hsl(48, 70%, 48%));
	}

	button.warning:focus {
		box-shadow: 0 0 0 .175rem var(--color-warning-200, hsl(48, 100%, 88%));
	}

	button.warning:hover {
		background-color: var(--color-warning-600, hsl(48, 70%, 45%));
	}

	button.secondary {
		color: var(--color-primary-600, hsl(227, 70%, 49%));
		border-width: var(--border-width);
		border-style: solid;
		border-color: var(--color-primary-600, hsl(227, 70%, 49%));
		background: transparent;
	}

	button.secondary:hover {
		background-color: var(--color-primary-100, hsl(227, 85%, 96%));
	}

	button.secondary.loading:after,
	button.tertiary.loading:after {
		border-right-color: var(--color-primary-500, hsl(227, 75%, 55%));
		border-top-color: var(--color-primary-500, hsl(227, 75%, 55%));
	}

	button.secondary.disabled,
	button.secondary.positive.disabled,
	button.secondary.negative.disabled,
	button.secondary.warning.disabled {
		color: hsl(216, 15%, 55%);
		border-color: hsl(216, 15%, 55%);
		background-color: transparent;
	}

	button.secondary.disabled:hover,
	button.secondary.positive.disabled:hover,
	button.secondary.negative.disabled:hover,
	button.secondary.warning.disabled:hover {
		background-color: transparent;
	}

	button.secondary.positive,
	button.tertiary.positive {
		color: var(--color-positive-500, hsl(163, 100%, 31%));
		border-color: var(--color-positive-500, hsl(163, 100%, 31%));
	}

	button.secondary.positive.loading:after,
	button.tertiary.positive.loading:after {
		border-right-color: var(--color-positive-500, hsl(163, 100%, 31%));
		border-top-color: var(--color-positive-500, hsl(163, 100%, 31%));
	}

	button.secondary.positive:hover,
	button.tertiary.positive:hover {
		background-color: var(--color-positive-100, hsl(163, 75%, 95%));
	}

	button.secondary.negative,
	button.tertiary.negative {
		color: var(--color-negative-500, hsl(5, 80%, 55%));
		border-color: var(--color-negative-500, hsl(5, 80%, 55%));
	}

	button.secondary.negative.loading:after,
	button.tertiary.negative.loading:after {
		border-right-color: var(--color-negative-500, hsl(5, 80%, 55%));
		border-top-color: var(--color-negative-500, hsl(5, 80%, 55%));
	}

	button.secondary.negative:hover,
	button.tertiary.negative:hover {
		background-color: var(--color-negative-100, hsl(5, 85%, 97%));
	}

	button.secondary.warning,
	button.tertiary.warning {
		color: var(--color-warning-500, hsl(48, 70%, 48%));
		border-color: var(--color-warning-500, hsl(48, 70%, 48%));
	}

	button.secondary.warning.loading:after,
	button.tertiary.warning.loading:after {
		border-right-color: var(--color-warning-500, hsl(48, 70%, 48%));
		border-top-color: var(--color-warning-500, hsl(48, 70%, 48%));
	}

	button.secondary.warning:hover,
	button.tertiary.warning:hover {
		background-color: var(--color-warning-100, hsl(48, 100%, 93%));
	}

	button.disabled.loading:after,
	button.secondary.disabled.loading:after,
	button.tertiary.disabled.loading:after {
		border-right-color: hsl(216, 15%, 55%);
		border-top-color: hsl(216, 15%, 55%);
	}

	button.tertiary {
		background: transparent;
		color: var(--color-primary-500, hsl(227, 75%, 55%));
	}

	button.tertiary:hover {
		background-color: var(--color-primary-100, hsl(227, 85%, 96%));
	}

	button.tertiary.disabled {
		color: hsl(216, 15%, 55%);
		background-color: transparent;
	}

	button.tertiary.disabled:hover {
		background-color: transparent;
	}

	button.tertiary.loading.disabled {
		background-color: transparent;
	}

	button.loading,
	button.disabled.loading,
	button.secondary.loading,
	button.tertiary.loading,
	button.secondary.disabled.loading,
	button.tertiary.loading.disabled {
		color: transparent;
	}

	button .material-icons {
		display: inline-block;
		overflow: hidden;
		overflow-wrap: normal;

		width: 1.5rem;
		margin-right: .5rem;

		font-family: "Material Icons";
		font-weight: normal;
		font-style: normal;
		font-size: 1.5rem;
		line-height: 1;
		letter-spacing: normal;
		text-transform: none;
		white-space: nowrap;
		direction: ltr;
		font-feature-settings: "liga";
		-webkit-font-smoothing: antialiased;
	}

	button.small .material-icons {
		font-size: 1.125rem;
		width: 1.125rem;
	}

	button.big .material-icons {
		font-size: 1.75rem;
		width: 1.75rem;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
</style>