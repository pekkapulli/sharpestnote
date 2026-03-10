<script lang="ts">
	import { page } from '$app/stores';
	import type { ResolvedPathname } from '$app/types';
	import homeIcon from '$lib/assets/The Sharpest Note Logo Square Bg.png';

	type Breadcrumb = {
		label: string;
		to?: ResolvedPathname;
		icon?: string;
	};

	type BreadcrumbData = {
		breadcrumbs?: Breadcrumb[];
		unit?: { title?: string };
		piece?: { label?: string };
	};

	const toTitleCase = (segment: string) => {
		const safeSegment = (() => {
			try {
				return decodeURIComponent(segment);
			} catch (err) {
				console.warn(`Failed to decode URI segment: ${segment}`, err);
				return segment;
			}
		})();
		const cleaned = safeSegment.replace(/[-_]+/g, ' ').trim();

		if (!cleaned) return segment;

		return cleaned
			.split(' ')
			.filter(Boolean)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const currentPage = $derived($page);
	const params = $derived(currentPage.params ?? {});
	const path = $derived(currentPage.url.pathname);
	const segments = $derived(path.split('/').filter(Boolean));
	const isHome = $derived(path === '/');
	const dataBreadcrumbs = $derived((currentPage.data as BreadcrumbData | undefined)?.breadcrumbs);
	const derivedBreadcrumbs = $derived([
		{ label: 'Home', to: '/', icon: homeIcon },
		...segments.reduce((crumbs, segment, index) => {
			if (index === 0 && segment === 'unit') {
				crumbs.push({ label: 'Units', to: '/units' });
				return crumbs;
			}

			const isUnitSegment = segment === params.code;
			const isPieceSegment = segment === params.piece;
			const segmentLabel = isUnitSegment
				? (currentPage.data.unit?.title ?? toTitleCase(segment))
				: isPieceSegment
					? (currentPage.data.piece?.label ?? toTitleCase(segment))
					: toTitleCase(segment);

			const to = '/' + segments.slice(0, index + 1).join('/');
			crumbs.push({
				label: segmentLabel,
				to: index === segments.length - 1 ? undefined : (to as ResolvedPathname)
			});
			return crumbs;
		}, [] as Breadcrumb[])
	] as Breadcrumb[]);
	const fullBreadcrumbs = $derived<Breadcrumb[]>(
		dataBreadcrumbs?.length ? dataBreadcrumbs : derivedBreadcrumbs
	);
	const visibleBreadcrumbs = $derived<Breadcrumb[]>(fullBreadcrumbs.slice(-2));
	const breadcrumbs = $derived<Breadcrumb[]>(
		(() => {
			if (!visibleBreadcrumbs.length) return [] as Breadcrumb[];
			const first = visibleBreadcrumbs[0];
			const hasHomeFirst = first.to === '/' || first.label.toLowerCase() === 'home';
			if (hasHomeFirst) return visibleBreadcrumbs;
			return [{ label: 'Home', to: '/', icon: homeIcon }, ...visibleBreadcrumbs];
		})()
	);
	const showBreadcrumbs = $derived(!isHome && breadcrumbs.length > 0);
</script>

{#if showBreadcrumbs}
	<nav aria-label="Breadcrumb" class="breadcrumb">
		<ol>
			{#each breadcrumbs as crumb, index (crumb.to ?? `${crumb.label}-${index}`)}
				<li>
					{#if crumb.to !== undefined && index < breadcrumbs.length - 1}
						<a href={crumb.to}>
							{#if crumb.icon}
								<img src={crumb.icon} alt="Home" class="crumb-icon" />
							{/if}
							<span>{crumb.label}</span>
						</a>
					{:else}
						<span
							class="current"
							aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
						>
							{#if crumb.icon}
								<img src={crumb.icon} alt="Home" class="crumb-icon" />
							{/if}
							{crumb.label}
						</span>
					{/if}
					{#if index < breadcrumbs.length - 1}
						<span class="separator" aria-hidden="true">/</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	.breadcrumb {
		position: relative;
		z-index: 20;
		padding: 0.75rem 1rem 0;
	}

	ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin: 0 0 1rem;
		padding: 0;
		list-style: none;
		font-size: 0.95rem;
		color: var(--color-dark-blue);
	}

	li {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		text-decoration: none;
		color: var(--color-dark-blue);
		padding: 0.15rem 0.4rem;
		border-radius: 9999px;
		background: rgba(48, 61, 83, 0.08);
		transition:
			background-color 0.15s ease,
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	a:hover {
		background: rgba(48, 61, 83, 0.14);
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
	}

	.crumb-icon {
		width: 28px;
		height: 28px;
		border-radius: 9999px;
		object-fit: cover;
		box-shadow: 0 0 0 1px rgba(48, 61, 83, 0.08);
	}

	span[aria-current='page'],
	span.current {
		font-weight: 600;
		color: var(--color-brand-green);
	}

	.separator {
		color: rgba(48, 61, 83, 0.6);
	}
</style>
