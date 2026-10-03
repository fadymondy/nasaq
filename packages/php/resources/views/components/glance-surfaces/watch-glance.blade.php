{{-- <x-nq::glance-surfaces.watch-glance title="10:09" shape="round"> dense glance rows </x-nq::glance-surfaces.watch-glance>
     A watch-face frame with a title line and dense rows. shape: square (default) | round. <x-slot:header-end> is a complication. --}}
@props(['title', 'shape' => 'square', 'headerEnd' => null])
<div data-slot="{{ $attributes->get('data-slot', 'watch-glance') }}" data-shape="{{ $shape }}"
    {{ $attributes->except('data-slot')->cn([
        'flex aspect-[4/5] w-48 flex-col overflow-hidden border-4 border-nq-line-strong bg-background text-foreground',
        $shape === 'round' ? 'aspect-square rounded-full px-6 py-5' : 'rounded-[2rem] px-2 py-3',
    ]) }}>
    <div class="{{ \Nasaq\Cn::merge('flex items-center justify-between gap-2 px-2 text-caption', $shape === 'round' ? 'justify-center' : '') }}">
        <span class="font-semibold tabular-nums">{{ $title }}</span>
        @if ($headerEnd && ! $headerEnd->isEmpty())<span class="text-muted-foreground">{{ $headerEnd }}</span>@endif
    </div>
    <div class="mt-1 flex min-h-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">{{ $slot }}</div>
</div>
