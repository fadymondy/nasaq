{{-- Internal: an avatar for a value known only to Alpine (inside an x-for). name, src: Alpine expressions. size: xs | sm | md | lg. Same classes as x-nq::avatar. --}}
@php
    $sizes = ['xs' => 'size-5 text-[9px]', 'sm' => 'size-6 text-[10px]', 'md' => 'size-8 text-caption', 'lg' => 'size-10 text-label'];
@endphp
<span data-slot="avatar" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary align-middle font-medium text-secondary-foreground {{ $sizes[$size ?? 'md'] }} {{ $class ?? '' }}">
    <img data-slot="avatar-image" x-show="{{ $src }}" x-bind:src="{{ $src }}" x-bind:alt="{{ $name }}" class="size-full object-cover" style="display: none">
    <span data-slot="avatar-fallback" x-show="!({{ $src }})" role="img" x-bind:aria-label="{{ $name }}" x-text="initials({{ $name }})" class="flex size-full items-center justify-center"></span>
</span>
