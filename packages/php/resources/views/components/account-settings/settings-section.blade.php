{{-- <x-nq::account-settings.settings-section title="Profile" description="How you appear to others." footer="Last changed 3 days ago">
         fields
         <x-slot:actions><x-nq::button variant="primary">Save</x-nq::button></x-slot:actions>
     </x-nq::account-settings.settings-section>
     One block of a settings page: a card with a heading, a description, the content and an optional footer with a hint and action buttons.
     The card is a labelled region. Slots: default (the fields), action (inline end of the header), actions (footer buttons).
     footer: small text at the inline start of the footer. tone: default | danger (tints the border). heading-level: 2 (default) | 3 | 4.
     The footer shows only when footer or the actions slot is filled. --}}
@props(['title' => null, 'description' => null, 'footer' => null, 'tone' => 'default', 'headingLevel' => 2, 'action' => null, 'actions' => null])
@php
    $titleId = ($attributes->get('id') ?? 'nq-settings-section-'.substr(md5($title.$description.$tone), 0, 8)).'-title';
    $hasActions = $actions && ! $actions->isEmpty();
    $hasAction = $action && ! $action->isEmpty();
    $hasBody = ! $slot->isEmpty();
@endphp
<div role="region" aria-labelledby="{{ $titleId }}" data-slot="{{ $attributes->get('data-slot', 'settings-section') }}" data-tone="{{ $tone }}"
    {{ $attributes->except(['id', 'data-slot'])->cn(['flex flex-col rounded-card border border-border bg-card py-4 text-card-foreground', 'gap-5', 'border-nq-danger/40' => $tone === 'danger']) }}>
    <x-nq::card.header>
        <x-nq::card.title :as="'h'.$headingLevel" :id="$titleId" :class="$tone === 'danger' ? 'text-h3 text-nq-danger-text' : 'text-h3'">{{ $title }}</x-nq::card.title>
        @if ($description)<x-nq::card.description>{{ $description }}</x-nq::card.description>@endif
        @if ($hasAction)<x-nq::card.action>{{ $action }}</x-nq::card.action>@endif
    </x-nq::card.header>
    @if ($hasBody)<x-nq::card.content>{{ $slot }}</x-nq::card.content>@endif
    @if ($footer || $hasActions)
        <x-nq::card.footer data-slot="settings-section-footer" class="flex-wrap justify-between gap-3 border-t border-border pt-4">
            <div class="min-w-0 text-caption text-muted-foreground">{{ $footer }}</div>
            @if ($hasActions)<div class="flex flex-wrap items-center gap-2">{{ $actions }}</div>@endif
        </x-nq::card.footer>
    @endif
</div>
