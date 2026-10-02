{{-- Internal: a row of action buttons. A button with confirm asks in a dialog first. State lives in nqArtifactActions (Alpine): it dispatches
     nq-artifact-action from this element; resolve { error } or reject to show a failure. --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['actions', 'artifactId' => null, 'words', 'locale'])
@php
    $config = [
        'artifactId' => $artifactId,
        'failed' => $words['failed'],
        'actions' => array_map(fn ($a) => [
            'id' => $a['id'],
            'label' => nq_art_localize($a['label'], $locale),
            'confirm' => isset($a['confirm']) ? nq_art_localize($a['confirm'], $locale) : null,
            'danger' => ($a['variant'] ?? null) === 'danger',
        ], $actions),
    ];
@endphp
<div data-slot="artifact-actions" x-data="nqArtifactActions(@js($config))" class="contents">
    <div class="flex flex-wrap items-center gap-2">
        @foreach ($actions as $i => $a)
            <x-nq::button :variant="$a['variant'] ?? 'secondary'" x-on:click="press({{ $i }})" x-bind:disabled="blocked({{ $i }})" x-bind:aria-busy="busy === {{ $i }} ? 'true' : null">
                <x-nq::spinner x-show="busy === {{ $i }}" style="display: none" />
                {{ nq_art_localize($a['label'], $locale) }}
            </x-nq::button>
        @endforeach
    </div>
    <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
    <x-nq::dialog x-model="confirmOpen">
        <x-nq::dialog.content data-slot="artifact-confirm">
            <x-nq::dialog.header>
                <x-nq::dialog.title x-text="ask.label"></x-nq::dialog.title>
                <x-nq::dialog.description x-text="ask.confirm"></x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::dialog.footer>
                <x-nq::button variant="ghost" x-on:click="cancel()">{{ $words['cancel'] }}</x-nq::button>
                <x-nq::button variant="primary" x-show="! ask.danger" x-on:click="confirmed()">{{ $words['confirm'] }}</x-nq::button>
                <x-nq::button variant="danger" x-show="ask.danger" style="display: none" x-on:click="confirmed()">{{ $words['confirm'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
