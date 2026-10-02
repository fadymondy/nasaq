{{-- <x-nq::focus-status state="focus" :seconds="754" />   <x-nq::focus-status state="dnd" text="Design review" @click="open = true" />
     A compact header chip: the state's icon and word, and the time left (mm:ss) while focusing or on a break. Parts:
     <x-nq::focus-status.avatar name="Fady Mondy" state="focus" />  <x-nq::focus-status.do-not-disturb until="6:00 PM" />
     state: available | focus | break | dnd. seconds: time left, shown for focus and break only. text replaces the word.
     A click handler (@click, x-on:click, wire:click) or clickable renders a button. Derive the state from a pomodoro with the
     same rule as focusStateOf: do not disturb wins; running or paused focus is focus; a running or paused break is break. --}}
@props(['state' => 'available', 'seconds' => null, 'text' => null, 'clickable' => false])
@php
    $icons = ['available' => 'circle', 'focus' => 'brain', 'break' => 'coffee', 'dnd' => 'bell-off'];
    $words = ['available' => ['Available', 'متاح'], 'focus' => ['In focus', 'في تركيز'], 'break' => ['On a break', 'في استراحة'], 'dnd' => ['Do not disturb', 'عدم الإزعاج']];
    $chipTone = [
        'available' => 'border-border bg-secondary text-muted-foreground',
        'focus' => 'border-primary/40 bg-[color-mix(in_oklab,var(--nq-action)_12%,transparent)] text-foreground',
        'break' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'dnd' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
    ];
    $iconTone = ['available' => 'text-nq-success-text', 'focus' => 'text-primary', 'break' => 'text-nq-success-text', 'dnd' => 'text-nq-warning-text'];
    $state = isset($icons[$state]) ? $state : 'available';
    $handlers = $attributes->whereStartsWith(['@click', 'x-on:click', 'wire:click', 'onclick']);
    $interactive = $clickable || $handlers->isNotEmpty();
    $shown = $seconds !== null && ($state === 'focus' || $state === 'break');
    if ($shown) {
        $whole = max(0, (int) floor($seconds));
        $h = intdiv($whole, 3600);
        $m = intdiv($whole % 3600, 60);
        $time = $h > 0 ? sprintf('%d:%02d:%02d', $h, $m, $whole % 60) : sprintf('%02d:%02d', $m, $whole % 60);
        $left = \Nasaq\Nasaq::t($time.' left', 'متبقٍ '.$time);
    }
    $tag = $interactive ? 'button' : 'span';
@endphp
<{{ $tag }} data-slot="{{ $attributes->get('data-slot', 'focus-status') }}" data-state="{{ $state }}" @if ($interactive) type="button" @endif
    {{ $attributes->except('data-slot')->cn([
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium',
        $chipTone[$state],
        'cursor-pointer outline-none transition-colors duration-150 ease-nq hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus' => $interactive,
    ]) }}>
    <x-dynamic-component :component="'lucide-'.$icons[$state]" aria-hidden="true" class="{{ \Nasaq\Cn::merge('size-3.5 shrink-0', $iconTone[$state], $state === 'available' ? 'fill-current' : '') }}" />
    <span class="truncate">{{ $text ?? \Nasaq\Nasaq::t(...$words[$state]) }}</span>
    @if ($shown)<span dir="ltr" class="tabular-nums text-muted-foreground" aria-label="{{ $left }}">{{ $time }}</span>@endif
</{{ $tag }}>
