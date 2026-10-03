{{-- Internal: the card every artifact sits in: title and description, then the content, then an optional footer slot and note. --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['artifact', 'locale', 'note' => null, 'footer' => null])
@php
    $title = nq_art_localize($artifact['title'] ?? null, $locale);
    $description = nq_art_localize($artifact['description'] ?? null, $locale);
    $hasFooter = ($footer && ! $footer->isEmpty()) || filled($note);
@endphp
<x-nq::card data-slot="artifact" data-kind="{{ $artifact['kind'] }}" class="min-w-0">
    @if ($title !== '' || $description !== '')
        <x-nq::card.header>
            @if ($title !== '')<x-nq::card.title dir="auto">{{ $title }}</x-nq::card.title>@endif
            @if ($description !== '')<x-nq::card.description dir="auto">{{ $description }}</x-nq::card.description>@endif
        </x-nq::card.header>
    @endif
    <x-nq::card.content class="flex flex-col gap-3">{{ $slot }}</x-nq::card.content>
    @if ($hasFooter)
        <x-nq::card.footer class="flex flex-col items-stretch gap-3">
            @if ($footer){{ $footer }}@endif
            @if (filled($note))<p data-slot="artifact-note" dir="auto" class="text-caption text-muted-foreground">{{ $note }}</p>@endif
        </x-nq::card.footer>
    @endif
</x-nq::card>
