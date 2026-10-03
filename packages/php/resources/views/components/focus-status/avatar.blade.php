{{-- <x-nq::focus-status.avatar name="Fady Mondy" state="focus" />   <x-nq::focus-status.avatar name="Acme" src="/a.jpg" state="available" hide-available />
     An avatar with an in-focus presence dot at its inline end. The dot carries an icon (md and lg) and a screen-reader label.
     state: available | focus | break | dnd. hide-available hides the dot while available. name, src, size (xs|sm|md|lg), shape go to the avatar. --}}
@props(['state' => 'available', 'hideAvailable' => false, 'name' => '', 'src' => null, 'size' => 'md', 'shape' => 'circle'])
@php
    $icons = ['available' => 'circle', 'focus' => 'brain', 'break' => 'coffee', 'dnd' => 'bell-off'];
    $words = ['available' => ['Available', 'متاح'], 'focus' => ['In focus', 'في تركيز'], 'break' => ['On a break', 'في استراحة'], 'dnd' => ['Do not disturb', 'عدم الإزعاج']];
    $dotTone = [
        'available' => 'bg-nq-success text-nq-success-text',
        'focus' => 'bg-primary text-primary-foreground',
        'break' => 'bg-nq-success-soft text-nq-success-text',
        'dnd' => 'bg-nq-warning text-background',
    ];
    $state = isset($icons[$state]) ? $state : 'available';
    $label = \Nasaq\Nasaq::t(...$words[$state]);
    $show = ! ($hideAvailable && $state === 'available');
    $big = $size === 'lg' || $size === 'md';
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'focus-avatar') }}" data-state="{{ $state }}" {{ $attributes->except('data-slot')->cn('relative inline-flex shrink-0') }}>
    <x-nq::avatar :name="$name" :src="$src" :size="$size" :shape="$shape" />
    @if ($show)
        <span role="img" aria-label="{{ $label }}" title="{{ $label }}"
            class="{{ \Nasaq\Cn::merge('absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full border-2 border-background', $big ? 'size-4' : 'size-3', $dotTone[$state]) }}">
            @if ($big && $state !== 'available')<x-dynamic-component :component="'lucide-'.$icons[$state]" aria-hidden="true" class="size-2.5" />@endif
        </span>
    @endif
</span>
