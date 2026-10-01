{{-- <x-nq::auth-layout.footer :links="[['label' => 'Terms', 'href' => '/terms'], ['label' => 'Docs', 'href' => 'https://x', 'external' => true]]"><x-slot:end>...</x-slot:end></x-nq::auth-layout.footer>
     Small print row for the auth layout's footer slot: links at the inline start, the `end` slot (a locale switch) at the end. --}}
@props(['links' => [], 'end' => null])
<div data-slot="{{ $attributes->get('data-slot', 'auth-footer') }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2') }}>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        @foreach ($links as $link)
            <a href="{{ $link['href'] }}" @if (! empty($link['external'])) target="_blank" rel="noreferrer" @endif
                class="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $link['label'] }}</a>
        @endforeach
        {{ $slot }}
    </div>
    @if ($end && ! $end->isEmpty())
        <div class="flex items-center">{{ $end }}</div>
    @endif
</div>
