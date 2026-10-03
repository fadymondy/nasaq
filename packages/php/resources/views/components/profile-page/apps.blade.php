{{-- <x-nq::profile-page.apps :apps="[['id' => 'mahaam', 'brand' => 'mahaam', 'name' => 'Mahaam', 'href' => '…', 'plan' => 'Pro', 'role' => 'Owner', 'org' => '3x1', 'lastUsed' => '2026-09-28']]" browse-href="/apps" />
     The apps the member uses, with their official marks. An empty list shows the empty state. --}}
@props(['apps' => [], 'browseHref' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $apps = array_values(array_map(fn ($x) => (array) $x, (array) $apps));
    $datePattern = str_starts_with($locale, 'ar') ? 'd MMM' : 'MMM d';
    $cls = 'flex min-w-0 flex-1 items-start gap-3 rounded-card border border-border bg-card p-4';
@endphp
<x-nq::profile-page.section :title="$t['apps']" :description="$t['appsHint']" :count="count($apps)" :locale="$locale" {{ $attributes }}>
    @if ($apps && $browseHref)
        <x-slot:action><x-nq::button variant="ghost" size="sm" :href="$browseHref"><x-nq::icon name="store" />{{ $t['browseApps'] }}</x-nq::button></x-slot:action>
    @endif
    @if ($apps)
        <ul class="grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2">
            @foreach ($apps as $app)
                @php
                    $meta = array_filter([$app['org'] ?? null, ! empty($app['lastUsed']) ? nq_pp_fill($t['lastUsed'], ['date' => nq_pp_date($app['lastUsed'], $locale, $datePattern)]) : null]);
                    $tag = ! empty($app['href']) ? 'a' : 'div';
                @endphp
                <li class="flex">
                    <{{ $tag }} @if ($tag === 'a') href="{{ $app['href'] }}" @endif class="{{ $cls }}{{ $tag === 'a' ? ' transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' : '' }}">
                        <x-nq::product-switcher.product-icon :product="$app" :size="36" />
                        <span class="flex min-w-0 flex-1 flex-col gap-1">
                            <span class="flex min-w-0 items-center gap-2">
                                <span class="truncate text-label text-foreground">{{ $app['name'] }}</span>
                                @if (! empty($app['plan']))<x-nq::badge variant="accent">{{ $app['plan'] }}</x-nq::badge>@endif
                                @if (! empty($app['role']))<x-nq::badge variant="neutral">{{ $app['role'] }}</x-nq::badge>@endif
                            </span>
                            @if (! empty($app['description']))<span class="truncate text-body-sm text-muted-foreground">{{ $app['description'] }}</span>@endif
                            @if ($meta)<span class="truncate text-caption text-muted-foreground">{{ implode(' · ', $meta) }}</span>@endif
                        </span>
                        @if (isset($app['badge']) && $app['badge'] !== '')<x-nq::badge variant="neutral" class="shrink-0 tabular-nums">{{ $app['badge'] }}</x-nq::badge>@endif
                    </{{ $tag }}>
                </li>
            @endforeach
        </ul>
    @else
        <x-nq::states.empty icon="blocks" :title="$t['noApps']" :description="$t['noAppsHint']" class="rounded-card border border-border bg-card py-12">
            @if ($browseHref)
                <x-slot:actions><x-nq::button variant="ghost" size="sm" :href="$browseHref"><x-nq::icon name="store" />{{ $t['browseApps'] }}</x-nq::button></x-slot:actions>
            @endif
        </x-nq::states.empty>
    @endif
</x-nq::profile-page.section>
