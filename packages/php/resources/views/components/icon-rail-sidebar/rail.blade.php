{{-- Internal. The narrow icon rail of <x-nq::icon-rail-sidebar>, used for the wide layout and again inside the mobile sheet. --}}
@props(['sections' => [], 'label', 'sheet' => false, 'brand' => null, 'footer' => null, 'subId' => null])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $close = $sheet ? ' ? close() : null' : ''; // not &&: Blade escapes attributes passed through a component twice
    $button = implode(' ', [
        'relative flex size-10 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control text-muted-foreground outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-[active=true]:bg-nq-selected data-[active=true]:text-foreground',
        'data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:-start-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-nq-accent',
        '[&_svg]:size-5 [&_svg]:shrink-0',
    ]);
@endphp
<nav aria-label="{{ $label }}" data-slot="icon-rail" class="flex w-14 shrink-0 flex-col items-center gap-3 border-e border-border bg-card py-3">
    @if ($brand !== null && ! $brand->isEmpty())<div data-slot="icon-rail-brand" class="flex size-10 shrink-0 items-center justify-center">{{ $brand }}</div>@endif
    <ul class="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 [scrollbar-width:none]" x-on:keydown="railKey($event)">
        @foreach ($sections as $s)
            @php
                $id = $s['id'];
                $hasGroups = ! empty($s['groups']);
                $pick = 'pickSection('.$js($id).', '.(empty($s['href']) ? 'false' : 'true').', $event, '.($sheet ? 'true' : 'false').')'.$close;
            @endphp
            <li>
                <a data-rail-button href="{{ $s['href'] ?? '#' }}" aria-label="{{ $s['label'] }}" title="{{ $s['label'] }}"
                    x-bind:data-active="section === {!! $js($id) !!}" x-bind:aria-current="section === {!! $js($id) !!} ? 'page' : null"
                    @if ($hasGroups && $subId && ! $sheet) aria-controls="{{ $subId }}-{{ $id }}" x-bind:aria-expanded="section === {!! $js($id) !!} ? subOpen : null" @endif
                    x-on:click="{!! $pick !!}" class="{{ $button }}">
                    <x-dynamic-component :component="'lucide-'.$s['icon']" aria-hidden="true" />
                    @if (! empty($s['badge']))
                        <span class="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-nq-accent px-1 text-caption leading-4 font-medium text-foreground">{{ $s['badge'] }}</span>
                    @endif
                </a>
            </li>
        @endforeach
    </ul>
    @if ($footer !== null && ! $footer->isEmpty())<div data-slot="icon-rail-footer" class="flex shrink-0 flex-col items-center gap-2">{{ $footer }}</div>@endif
</nav>
