{{-- <x-nq::section-header title="Essentials" description="The apps most businesses install first.">
         <x-slot:action><x-nq::button variant="link">See all</x-nq::button></x-slot:action>
     </x-nq::section-header>
     as: h1 | h2 | h3 (the look stays the same). heading-id: for aria-labelledby. --}}
@props(['title' => null, 'description' => null, 'as' => 'h2', 'headingId' => null, 'action' => null])
@php $heading = in_array($as, ['h1', 'h2', 'h3'], true) ? $as : 'h2'; @endphp
<div data-slot="section-header" {{ $attributes->cn('flex items-end justify-between gap-4') }}>
    <div class="flex min-w-0 flex-col gap-1">
        <{{ $heading }} @if ($headingId) id="{{ $headingId }}" @endif class="text-h2 text-foreground">{{ $title ?? $slot }}</{{ $heading }}>
        @if ($description)
            <p class="text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
        @endif
    </div>
    @if ($action && ! $action->isEmpty())
        <div class="shrink-0">{{ $action }}</div>
    @endif
</div>
