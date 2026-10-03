{{-- Internal. The sub-sidebar of <x-nq::icon-rail-sidebar>: one panel per section, the active one shown. In the sheet there is no hide button. --}}
@props(['sections' => [], 'label', 'hideLabel', 'sheet' => false, 'subId' => null, 'activeItem' => null, 'header' => null, 'footer' => null])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $q = fn (string $v) => '`'.addcslashes($v, '`\$').'`';
    $close = $sheet ? ' ? close() : null' : ''; // not &&: Blade escapes attributes passed through a component twice
    $on = fn (array $link) => 'pickItem('.$q($link['id']).', '.(empty($link['href']) ? 'false' : 'true').', $event)'.$close;
    $aria = fn (array $link) => '(item === '.$q($link['id']).") ? `page` : null";
    $cls = fn (array $link) => '(item === '.$q($link['id']).") ? `bg-nq-selected font-medium text-foreground` : ``";
@endphp
@foreach ($sections as $s)
    @continue (empty($s['groups']))
    @php $title = $s['title'] ?? $s['label']; @endphp
    <nav @if ($subId && ! $sheet) id="{{ $subId }}-{{ $s['id'] }}" @endif aria-label="{{ $label }}: {{ $title }}" data-slot="icon-rail-sub" data-section="{{ $s['id'] }}"
        x-data="{ rail: false, collapsed: false }" x-show="section === {!! $js($s['id']) !!}{{ $sheet ? '' : ' && subOpen' }}"
        class="flex w-60 shrink-0 flex-col gap-2 overflow-hidden border-e border-border bg-background p-shell">
        <div class="flex h-8 shrink-0 items-center gap-1 ps-2">
            <h2 class="min-w-0 flex-1 truncate text-label text-foreground">{{ $title }}</h2>
            @unless ($sheet)
                <x-nq::button variant="ghost" size="icon-sm" type="button" aria-label="{{ $hideLabel }}" title="{{ $hideLabel }}" class="text-muted-foreground" x-on:click="setSub(false)">
                    <x-lucide-panel-left-close aria-hidden="true" class="rtl:-scale-x-100" />
                </x-nq::button>
            @endunless
        </div>
        @if ($header !== null && ! $header->isEmpty()){{ $header }}@endif
        <x-nq::app-shell.sidebar-content>
            @foreach ($s['groups'] as $group)
                <x-nq::app-shell.sidebar-group :label="$group['label'] ?? null">
                    @foreach ($group['items'] as $item)
                        @if (! empty($item['children']))
                            <x-nq::app-shell.sidebar-nest :label="$item['label']" :active="in_array($activeItem, array_column($item['children'], 'id'), true)">
                                <x-slot:icon>@if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" />@endif</x-slot:icon>
                                @foreach ($item['children'] as $child)
                                    @php
                                        $childOn = $on($child);
                                        $childAria = $aria($child);
                                        $childCls = $cls($child);
                                    @endphp
                                    <x-nq::app-shell.sidebar-sub-item :href="$child['href'] ?? '#'" :x-on:click="$childOn" :x-bind:aria-current="$childAria" :x-bind:class="$childCls">{{ $child['label'] }}</x-nq::app-shell.sidebar-sub-item>
                                @endforeach
                            </x-nq::app-shell.sidebar-nest>
                        @elseif (! empty($item['badge']))
                            @php
                                $itemOn = $on($item);
                                $itemAria = $aria($item);
                                $itemCls = $cls($item);
                            @endphp
                            <x-nq::app-shell.sidebar-item :href="$item['href'] ?? '#'" :x-on:click="$itemOn" :x-bind:aria-current="$itemAria" :x-bind:class="$itemCls">
                                <x-slot:icon>@if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" />@endif</x-slot:icon>
                                {{ $item['label'] }}
                                <x-slot:trailing>{{ $item['badge'] }}</x-slot:trailing>
                            </x-nq::app-shell.sidebar-item>
                        @else
                            @php
                                $itemOn = $on($item);
                                $itemAria = $aria($item);
                                $itemCls = $cls($item);
                            @endphp
                            <x-nq::app-shell.sidebar-item :href="$item['href'] ?? '#'" :x-on:click="$itemOn" :x-bind:aria-current="$itemAria" :x-bind:class="$itemCls">
                                <x-slot:icon>@if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" />@endif</x-slot:icon>
                                {{ $item['label'] }}
                            </x-nq::app-shell.sidebar-item>
                        @endif
                    @endforeach
                </x-nq::app-shell.sidebar-group>
            @endforeach
        </x-nq::app-shell.sidebar-content>
        @if ($footer !== null && ! $footer->isEmpty())<div class="shrink-0">{{ $footer }}</div>@endif
    </nav>
@endforeach
