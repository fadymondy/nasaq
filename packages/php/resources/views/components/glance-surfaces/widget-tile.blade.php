{{-- <x-nq::glance-surfaces.widget-tile size="small" title="Steps" icon="footprints" value="8,200" caption="of 10,000" :progress="82" tone="success" />
     A home or lock-screen widget. size: circular | inline | small (default) | medium | large.  surface: home (default) | lock (translucent).
     progress 0-100 draws a ring (circular) or a bar. The slot shows in medium and large. openable makes it a button that
     dispatches a bubbling "nq-open" event. icon is a lucide name. --}}
@props(['size' => 'small', 'surface' => 'home', 'title', 'icon' => null, 'value' => null, 'caption' => null, 'progress' => null, 'tone' => 'neutral', 'openable' => false])
@php
    $toneText = ['neutral' => 'text-foreground', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text', 'info' => 'text-nq-info-text'];
    $toneFill = ['neutral' => 'bg-primary', 'success' => 'bg-nq-success', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger', 'info' => 'bg-nq-info'];
    $toneStroke = ['neutral' => 'stroke-primary', 'success' => 'stroke-nq-success', 'warning' => 'stroke-nq-warning', 'danger' => 'stroke-nq-danger', 'info' => 'stroke-nq-info'];
    $tone = isset($toneText[$tone]) ? $tone : 'neutral';
    $sizeClass = [
        'circular' => 'size-16 rounded-full p-0',
        'inline' => 'h-8 w-56 rounded-full px-3',
        'small' => 'size-38 rounded-3xl p-4',
        'medium' => 'h-38 w-80 rounded-3xl p-4',
        'large' => 'size-80 rounded-3xl p-5',
    ];
    $size = isset($sizeClass[$size]) ? $size : 'small';
    $surfaceClass = $surface === 'lock' ? 'border border-border/40 bg-card/55 backdrop-blur-md' : 'border border-border bg-card shadow-sm';
    $label = implode(', ', array_filter([$title, is_string($value) || is_numeric($value) ? (string) $value : '', $caption], fn ($p) => $p !== null && $p !== ''));
    $pct = $progress === null ? 0 : max(0, min(100, (float) $progress));
    $r = 26;
    $c = 2 * M_PI * $r;
    $base = 'relative flex shrink-0 overflow-hidden text-foreground';
    $layout = $size === 'circular' ? 'items-center justify-center' : ($size === 'inline' ? 'items-center' : 'flex-col');
    $classes = [$base, $layout, $surfaceClass, $sizeClass[$size]];
    $buttonExtra = 'text-start outline-none transition-transform duration-150 ease-nq active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
@endphp
@if ($openable)
<div data-slot="widget-tile" data-size="{{ $size }}" data-surface="{{ $surface }}" class="contents">
    <button type="button" x-on:click="$dispatch('nq-open')" aria-label="{{ $label }}" {{ $attributes->cn(array_merge($classes, [$buttonExtra])) }}>
@else
<div data-slot="widget-tile" data-size="{{ $size }}" data-surface="{{ $surface }}" role="group" aria-label="{{ $label }}" {{ $attributes->cn($classes) }}>
@endif
    @if ($size === 'circular')
        @if ($progress !== null)
            <svg aria-hidden="true" viewBox="0 0 64 64" class="absolute inset-0 size-full -rotate-90 rtl:scale-y-[-1]">
                <circle cx="32" cy="32" r="{{ $r }}" fill="none" stroke-width="5" class="stroke-nq-line-strong/60" />
                <circle cx="32" cy="32" r="{{ $r }}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="{{ $c }}" stroke-dashoffset="{{ $c * (1 - $pct / 100) }}" class="{{ $toneStroke[$tone] }}" />
            </svg>
        @endif
        <span class="relative flex flex-col items-center leading-none">
            @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="mb-0.5 size-3.5 text-muted-foreground" />@endif
            <span class="{{ \Nasaq\Cn::merge('text-label font-semibold tabular-nums', $toneText[$tone]) }}">{{ $value }}</span>
        </span>
    @elseif ($size === 'inline')
        <span class="flex w-full items-center gap-2 text-label">
            @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />@endif
            <span class="min-w-0 flex-1 truncate">{{ $title }}</span>
            <span class="{{ \Nasaq\Cn::merge('shrink-0 font-medium tabular-nums', $toneText[$tone]) }}">{{ $value }}</span>
        </span>
    @else
        <div class="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
            @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-4 shrink-0" />@endif
            <span class="truncate">{{ $title }}</span>
        </div>
        <div class="{{ \Nasaq\Cn::merge('mt-auto', $size === 'large' ? 'mt-3' : '') }}">
            @if ($value !== null)<p class="{{ \Nasaq\Cn::merge('tabular-nums leading-none font-semibold', $size === 'small' ? 'text-h1' : 'text-display', $toneText[$tone]) }}">{{ $value }}</p>@endif
            @if ($caption)<p class="mt-1 truncate text-caption text-muted-foreground">{{ $caption }}</p>@endif
            @if ($progress !== null)
                <div role="presentation" class="mt-2 h-1.5 overflow-hidden rounded-full bg-nq-line-strong/50">
                    <div class="h-full rounded-full {{ $toneFill[$tone] }}" style="width: {{ $pct }}%"></div>
                </div>
            @endif
        </div>
        @if ($size !== 'small' && ! $slot->isEmpty())
            <div class="mt-3 min-h-0 flex-1 overflow-hidden">{{ $slot }}</div>
        @endif
    @endif
@if ($openable)
    </button>
</div>
@else
</div>
@endif
