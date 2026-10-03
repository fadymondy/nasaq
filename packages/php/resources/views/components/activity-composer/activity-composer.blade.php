{{-- <x-nq::activity-composer />   <x-nq::activity-composer :kinds="['task']" default-kind="task" />
     A small form to log a note, a call, a meeting or a task: the kind, a text, when (or due) and a duration for calls and meetings.
     kinds: the kinds offered, in order (default note, call, meeting, task). default-kind: the one shown first. when: the starting date and time, a local "Y-m-d\TH:i" (default now).
     labels: override of the built-in words. locale: default the app locale.
     The page listens on the root; detail.wait(promise) resolves { error } to keep the form and show the message (it clears after a good save).
       nq-activity-submit { kind, body, at (a Date), atLocal ("2026-09-29T09:00"), durationMinutes?, wait }.
     The timeline is <x-nq::activity-composer.timeline>. Needs the Alpine module (nqActivityComposer). --}}
@include('nasaq::components.activity-composer._words')
@props(['kinds' => ['note', 'call', 'meeting', 'task'], 'defaultKind' => null, 'when' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ac_words($locale, $labels);
    $kinds = array_values((array) $kinds);
    $kind = $defaultKind ?? ($kinds[0] ?? 'note');
    $icons = nq_ac_icons();
    $timed = $kind === 'call' || $kind === 'meeting';
    $when ??= now()->format('Y-m-d\TH:i');
    $config = [
        'kind' => $kind,
        'when' => $when,
        't' => ['bodyLabel' => $t['bodyLabel'], 'bodyHint' => $t['bodyHint'], 'whenLabel' => $t['whenLabel'], 'submit' => $t['submit'], 'errors' => $t['errors'], 'failed' => $t['failed']],
    ];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'activity-composer') }}" novalidate x-data="nqActivityComposer({{ \Illuminate\Support\Js::from($config) }})" x-on:submit.prevent="submit()"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3') }}>
    <x-nq::tabs :default-value="$kind" x-model="kind">
        <x-nq::tabs.list aria-label="{{ $t['kindPicker'] }}">
            @foreach ($kinds as $k)
                <x-nq::tabs.tab :value="$k">
                    <x-dynamic-component :component="'lucide-'.($icons[$k] ?? 'zap')" aria-hidden="true" />
                    {{ $t['kinds'][$k] ?? $k }}
                </x-nq::tabs.tab>
            @endforeach
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
    </x-nq::tabs>
    <x-nq::field>
        <x-nq::field.label class="sr-only" x-text="t.bodyLabel[kind]">{{ $t['bodyLabel'][$kind] ?? '' }}</x-nq::field.label>
        <x-nq::field.textarea rows="3" dir="auto" x-model="body" x-bind:placeholder="t.bodyHint[kind]" x-bind:disabled="busy" />
    </x-nq::field>
    <div class="flex flex-wrap items-end gap-3">
        <x-nq::field class="min-w-44 flex-1">
            <x-nq::field.label x-text="t.whenLabel[kind]">{{ $t['whenLabel'][$kind] ?? '' }}</x-nq::field.label>
            <x-nq::field.input type="datetime-local" ltr value="{{ $when }}" x-model="when" x-bind:disabled="busy" />
        </x-nq::field>
        <x-nq::field class="w-40" x-show="timed" :style="$timed ? '' : 'display: none'">
            <x-nq::field.label>{{ $t['duration'] }}</x-nq::field.label>
            <x-nq::field.input type="number" ltr min="0" max="1440" inputmode="numeric" x-model="duration" x-bind:disabled="busy" />
        </x-nq::field>
        <x-nq::button type="submit" variant="primary" x-bind:disabled="busy" x-bind:aria-busy="busy || null">
            <x-nq::spinner x-show="busy" style="display: none" />
            <span x-text="t.submit[kind]">{{ $t['submit'][$kind] ?? '' }}</span>
        </x-nq::button>
    </div>
    <p x-show="error" style="display: none" x-text="error" role="alert" class="text-body-sm text-nq-danger-text"></p>
</form>
