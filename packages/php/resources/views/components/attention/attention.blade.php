{{-- <x-nq::attention :items="[['id' => 'deploy', 'tone' => 'danger', 'title' => 'Deployment failed', 'href' => '/deploys/91']]" view-all-href="/inbox" />
     A short list of things the user should act on now. Products supply the items; Nasaq orders, trims and presents them.
     items: id, title, description, tone (danger | warning | info | neutral), icon (a lucide name that replaces the tone shape),
       count, time, date-time, href (the row becomes a link), attributes (['wire:click' => 'open(1)'] makes the row a button),
       action (['label' => 'Retry', 'href' => '/x'] or ['label' => 'Retry', 'attributes' => ['wire:click' => 'retry']]),
       done (true/false: setup-checklist rows), dismissible (a dismiss button that removes the row and fires nq:dismiss with the id).
     title, heading-level (2), max (5), sort (true), view-all-href, empty (a line shown when there are no items; none: the section disappears),
     loading, labels (title, showMore "Show {n} more", showLess, viewAll, dismiss, done, progress "{done} of {total} done", loading).
     Show more and dismiss need the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'title' => null, 'headingLevel' => 2, 'max' => 5, 'sort' => true, 'viewAllHref' => null, 'empty' => null, 'loading' => false, 'labels' => []])
@php
    $t = array_merge([
        'title' => \Nasaq\Nasaq::t('Needs your attention', 'يحتاج انتباهك'),
        'showMore' => \Nasaq\Nasaq::t('Show {n} more', 'عرض {n} أخرى'),
        'showLess' => \Nasaq\Nasaq::t('Show less', 'عرض أقل'),
        'viewAll' => \Nasaq\Nasaq::t('View all', 'عرض الكل'),
        'dismiss' => \Nasaq\Nasaq::t('Dismiss', 'تجاهل'),
        'done' => \Nasaq\Nasaq::t('Done', 'تم'),
        'progress' => \Nasaq\Nasaq::t('{done} of {total} done', '{done} من {total} مكتملة'),
        'loading' => \Nasaq\Nasaq::t('Loading…', 'جارٍ التحميل…'),
    ], $labels);
    $items = array_values($items);
    $max = (int) $max;
    $level = in_array((int) $headingLevel, [2, 3, 4], true) ? (int) $headingLevel : 2;
    $rank = ['danger' => 0, 'warning' => 1, 'info' => 2, 'neutral' => 3];
    $checklist = count($items) > 0 && collect($items)->every(fn ($i) => array_key_exists('done', $i) && $i['done'] !== null);
    $doneCount = collect($items)->filter(fn ($i) => ! empty($i['done']))->count();
    $ordered = collect($items)->map(fn ($item, $index) => ['item' => $item, 'index' => $index])
        ->sort(function ($a, $b) use ($sort, $checklist, $rank) {
            $done = (int) ! empty($a['item']['done']) <=> (int) ! empty($b['item']['done']);
            if ($done !== 0) {
                return $done;
            }
            if (! $sort || $checklist) {
                return $a['index'] <=> $b['index'];
            }

            return ($rank[$a['item']['tone'] ?? 'neutral'] ?? 3) <=> ($rank[$b['item']['tone'] ?? 'neutral'] ?? 3) ?: $a['index'] <=> $b['index'];
        })
        ->map(fn ($e) => $e['item'])->values();
    $total = $ordered->count();
    $hidden = max(0, $total - $max);
    $open = $checklist ? $total - $doneCount : $total;
    $hasViewAll = filled($viewAllHref);
    $headingId = 'nq-attention-'.substr(md5(json_encode([$title, $items])), 0, 8);
    $ghost = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-foreground hover:bg-nq-hover h-control-sm px-2.5';
@endphp
@if ($loading || $total > 0 || filled($empty))
<section data-slot="{{ $attributes->get('data-slot', 'attention') }}" aria-labelledby="{{ $headingId }}" @if ($loading) aria-busy="true" @endif
    x-data="nqAttention({{ $max }}, {{ $total }})"
    {{ $attributes->except('data-slot')->cn('flex flex-col') }}>
    <header class="flex min-h-control items-center gap-2 pb-2">
        <h{{ $level }} id="{{ $headingId }}" class="text-label text-foreground">{{ $title ?? $t['title'] }}</h{{ $level }}>
        @if (! $loading && $open > 0 && ! $checklist)
            <span data-slot="attention-count" x-text="total" class="text-caption text-muted-foreground tabular-nums">{{ $open }}</span>
        @endif
        @if ($checklist)
            <span class="flex items-center gap-2 text-caption text-muted-foreground tabular-nums">
                <span>{{ str_replace(['{done}', '{total}'], [$doneCount, $total], $t['progress']) }}</span>
                <span aria-hidden="true" class="h-1 w-16 overflow-hidden rounded-full bg-nq-surface-soft">
                    <span class="block h-full rounded-full bg-nq-success transition-[width] duration-300 ease-nq" style="width: {{ $total ? ($doneCount / $total) * 100 : 0 }}%"></span>
                </span>
            </span>
        @endif
        @if ($hasViewAll)
            <a href="{{ $viewAllHref }}" class="{{ \Nasaq\Cn::merge($ghost, 'ms-auto text-muted-foreground') }}">{{ $t['viewAll'] }}</a>
        @endif
    </header>

    @if ($loading)
        <ul class="flex flex-col border-t border-border">
            <li class="sr-only">{{ $t['loading'] }}</li>
            @for ($i = 0; $i < min($max, 3); $i++)
                <li aria-hidden="true" class="flex h-row items-center gap-3 border-b border-border px-1">
                    <span class="size-4 rounded-full bg-nq-surface-soft"></span>
                    <span class="h-3 max-w-64 flex-1 rounded-sm bg-nq-surface-soft motion-safe:animate-pulse"></span>
                </li>
            @endfor
        </ul>
    @elseif ($total === 0)
        <p class="border-t border-border py-3 text-body-sm text-muted-foreground">{{ $empty }}</p>
    @else
        <ul class="flex flex-col border-t border-border">
            @foreach ($ordered as $i => $item)
                <x-nq::attention.row :item="$item" :extra="$i >= $max" :dismiss-label="$t['dismiss']" :done-label="$t['done']" />
            @endforeach
        </ul>
    @endif

    @if (! $loading && $hidden > 0 && ! $hasViewAll)
        <button type="button" aria-expanded="false" :aria-expanded="expanded" x-on:click="toggle()"
            data-more="{{ $t['showMore'] }}" data-less="{{ $t['showLess'] }}"
            x-text="expanded ? $el.dataset.less : $el.dataset.more.replace('{n}', hidden)"
            class="{{ \Nasaq\Cn::merge($ghost, 'mt-1 self-start text-muted-foreground') }}">{{ str_replace('{n}', $hidden, $t['showMore']) }}</button>
    @endif
</section>
@endif
