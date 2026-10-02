{{-- One row of <x-nq::attention>: <x-nq::attention.row :item="['id' => 'a', 'title' => 'Approve MH-721', 'tone' => 'warning']" />
     The title is the row's link or button and stretches over the row, so the whole row is clickable while the action and dismiss
     buttons stay separate tab stops. See attention for the item keys. extra: a row past `max`, hidden until "Show more". --}}
@props(['item', 'extra' => false, 'dismissLabel' => null, 'doneLabel' => null])
@php
    $item = (array) $item;
    $icons = ['danger' => 'circle-x', 'warning' => 'circle-alert', 'info' => 'circle-dot', 'neutral' => 'circle'];
    $text = ['danger' => 'text-nq-danger-text', 'warning' => 'text-nq-warning-text', 'info' => 'text-nq-info-text', 'neutral' => 'text-muted-foreground'];
    $done = ! empty($item['done']);
    $tone = $done ? 'neutral' : ($item['tone'] ?? 'neutral');
    $tone = isset($icons[$tone]) ? $tone : 'neutral';
    $href = $item['href'] ?? null;
    $titleAttrs = (array) ($item['attributes'] ?? []);
    $interactive = $href || $titleAttrs;
    $titleClass = \Nasaq\Cn::merge(
        'min-w-0 truncate text-body-sm text-start outline-none',
        $done ? 'text-muted-foreground' : 'text-foreground',
        $interactive ? 'after:absolute after:inset-0 after:rounded-control focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-nq-focus' : '',
    );
    $secondary = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-border bg-card text-foreground hover:bg-nq-hover h-control-sm px-2.5 relative z-10';
    $action = $item['action'] ?? null;
    $actionAttrs = new \Illuminate\View\ComponentAttributeBag((array) ($action['attributes'] ?? []));
    $dismissLabel ??= \Nasaq\Nasaq::t('Dismiss', 'تجاهل');
    $doneLabel ??= \Nasaq\Nasaq::t('Done', 'تم');
@endphp
<li data-slot="{{ $attributes->get('data-slot', 'attention-item') }}" data-tone="{{ $tone }}" @if ($done) data-done="true" @endif data-id="{{ $item['id'] ?? '' }}"
    @if ($extra) style="display: none" @endif
    {{ $attributes->except('data-slot')->cn([
        'group/attention relative flex min-h-row items-center gap-3 border-b border-border px-1 py-2',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover' => $interactive,
    ]) }}>
    <span class="relative flex size-5 shrink-0 items-center justify-center [&>svg]:size-4">
        @if ($done)
            <x-lucide-circle-check aria-hidden="true" class="size-4 text-nq-success-text" />
        @else
            <x-dynamic-component :component="'lucide-'.($item['icon'] ?? $icons[$tone])" aria-hidden="true" class="size-4 {{ $text[$tone] }}" />
        @endif
        @if (! empty($item['icon']) && ! $done && $tone !== 'neutral')
            <span data-slot="attention-tone" class="absolute -end-1 -bottom-1 flex rounded-full bg-background">
                <x-dynamic-component :component="'lucide-'.$icons[$tone]" aria-hidden="true" class="size-2.5 {{ $text[$tone] }}" stroke-width="3" />
            </span>
        @endif
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
        @if ($href)
            <a href="{{ $href }}" class="{{ $titleClass }}">{{ $item['title'] ?? '' }}</a>
        @elseif ($titleAttrs)
            <button type="button" {{ (new \Illuminate\View\ComponentAttributeBag($titleAttrs))->merge(['class' => $titleClass]) }}>{{ $item['title'] ?? '' }}</button>
        @else
            <span class="{{ $titleClass }}">{{ $item['title'] ?? '' }}</span>
        @endif
        @if (! empty($item['description']))
            <span class="truncate text-caption text-muted-foreground">{{ $item['description'] }}</span>
        @endif
        @if ($done)
            <span class="sr-only">{{ $doneLabel }}</span>
        @endif
    </span>
    @if (isset($item['count']))
        <span data-slot="attention-item-count" class="shrink-0 rounded-full border border-border px-1.5 text-caption text-foreground tabular-nums">{{ $item['count'] }}</span>
    @endif
    @if (! empty($item['time']))
        <time @if (! empty($item['dateTime'])) datetime="{{ $item['dateTime'] }}" @endif class="shrink-0 text-caption text-muted-foreground tabular-nums">{{ $item['time'] }}</time>
    @endif
    @if ($action && ! $done)
        @if (! empty($action['href']))
            <a href="{{ $action['href'] }}" class="{{ $secondary }}">{{ $action['label'] ?? '' }}</a>
        @else
            <button type="button" {{ $actionAttrs->merge(['class' => $secondary]) }}>{{ $action['label'] ?? '' }}</button>
        @endif
    @endif
    @if (! empty($item['dismissible']))
        <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $dismissLabel }}" x-on:click="dismiss($el.closest('li'))"
            class="relative z-10 text-muted-foreground opacity-0 group-hover/attention:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5"><x-lucide-x aria-hidden="true" /></x-nq::button>
    @endif
</li>
