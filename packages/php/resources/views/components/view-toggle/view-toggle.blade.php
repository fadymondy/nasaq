{{-- <x-nq::view-toggle :views="['table', 'grid']" x-model="view" storage-key="customers:view" />
     Switches how a collection is shown: table, grid of cards, board, list or calendar. One view is always pressed. With storage-key the choice survives reloads.
     views: any of table, grid, board, list, calendar, in order (default table and grid). default-value: the first view when not controlled (default the first of views).
     value is x-modelable: wire:model and x-model work. show-labels: text next to each icon (default icon-only with a tooltip). labels: ['table' => 'Spreadsheet'] overrides the built-in names.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['views' => ['table', 'grid'], 'defaultValue' => null, 'storageKey' => null, 'showLabels' => false, 'labels' => []])
@php
    $views = array_values((array) $views);
    $names = array_merge([
        'label' => \Nasaq\Nasaq::t('View', 'طريقة العرض'),
        'table' => \Nasaq\Nasaq::t('Table', 'جدول'),
        'grid' => \Nasaq\Nasaq::t('Grid', 'شبكة'),
        'board' => \Nasaq\Nasaq::t('Board', 'لوحة'),
        'list' => \Nasaq\Nasaq::t('List', 'قائمة'),
        'calendar' => \Nasaq\Nasaq::t('Calendar', 'تقويم'),
    ], (array) $labels);
    $icons = ['table' => 'table-2', 'grid' => 'layout-grid', 'board' => 'square-kanban', 'list' => 'list', 'calendar' => 'calendar-days'];
    $current = $defaultValue ?? ($views[0] ?? 'table');
    $item = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'view-toggle') }}" x-data="nqViewToggle(@js($current), @js($views), @js($storageKey))" x-modelable="value" {{ $attributes->except('data-slot')->cn('inline-flex') }}>
    <div role="group" aria-label="{{ $names['label'] }}" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" x-bind="group" class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
        @foreach ($views as $view)
            @php
                $on = $view === $current;
            @endphp
            @if ($showLabels)
                <button type="button" data-slot="toggle" data-view="{{ $view }}" aria-pressed="{{ $on ? 'true' : 'false' }}" @if ($on) data-pressed @endif x-bind="item(@js($view))" class="{{ $item }}">
                    <x-dynamic-component :component="'lucide-'.($icons[$view] ?? 'table-2')" aria-hidden="true" />
                    <span>{{ $names[$view] ?? $view }}</span>
                </button>
            @else
                <x-nq::tooltip :content="$names[$view] ?? $view">
                    <button type="button" data-slot="toggle" data-view="{{ $view }}" aria-label="{{ $names[$view] ?? $view }}" aria-pressed="{{ $on ? 'true' : 'false' }}" @if ($on) data-pressed @endif x-bind="item(@js($view))" class="{{ $item }}">
                        <x-dynamic-component :component="'lucide-'.($icons[$view] ?? 'table-2')" aria-hidden="true" />
                    </button>
                </x-nq::tooltip>
            @endif
        @endforeach
    </div>
</div>
