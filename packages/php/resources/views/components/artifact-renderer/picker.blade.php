{{-- Internal: the picker kind: one option (radio) or several (checkbox), then a Send button. State lives in nqArtifactPicker (Alpine): it dispatches
     nq-artifact-pick from this element with the chosen values; resolve { error } or reject to show a failure. --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['artifact', 'words', 'locale'])
@php
    $tx = fn ($v) => nq_art_localize($v, $locale);
    $multiple = ($artifact['mode'] ?? 'single') === 'multiple';
    $default = $artifact['defaultValue'] ?? [];
    $name = $tx($artifact['title'] ?? null) ?: $words['choose'];
    $row = 'flex cursor-pointer items-start gap-3 rounded-control border border-border bg-background p-3 text-start';
    $config = [
        'artifactId' => $artifact['id'] ?? null,
        'multiple' => $multiple,
        'options' => array_column($artifact['options'], 'value'),
        'value' => $default,
        'failed' => $words['failed'],
    ];
@endphp
<div data-slot="artifact-picker" x-data="nqArtifactPicker(@js($config))" class="flex flex-col gap-3">
    <div x-bind:inert="locked" x-bind:class="locked ? 'opacity-70' : ''">
        @if ($multiple)
            <ul aria-label="{{ $name }}" class="flex flex-col gap-2">
                @foreach ($artifact['options'] as $i => $o)
                    <li>
                        <label x-bind:class="sel[{{ $i }}] ? 'border-primary bg-nq-selected' : ''" class="{{ $row }}">
                            <x-nq::checkbox :checked="in_array($o['value'], $default, true)" x-model="sel[{{ $i }}]" class="mt-0.5" />
                            <span class="flex min-w-0 flex-col">
                                <span dir="auto" class="text-body-sm text-foreground">{{ $tx($o['label']) }}</span>
                                @if (isset($o['description']))<span dir="auto" class="text-caption text-muted-foreground">{{ $tx($o['description']) }}</span>@endif
                            </span>
                        </label>
                    </li>
                @endforeach
            </ul>
        @else
            <x-nq::radio-group :default-value="$default[0] ?? null" x-model="one" aria-label="{{ $name }}">
                @foreach ($artifact['options'] as $o)
                    <label x-bind:class="one === {{ \Illuminate\Support\Js::from($o['value']) }} ? 'border-primary bg-nq-selected' : ''" class="{{ $row }}">
                        <x-nq::radio-group.radio :value="$o['value']" class="mt-0.5" />
                        <span class="flex min-w-0 flex-col">
                            <span dir="auto" class="text-body-sm text-foreground">{{ $tx($o['label']) }}</span>
                            @if (isset($o['description']))<span dir="auto" class="text-caption text-muted-foreground">{{ $tx($o['description']) }}</span>@endif
                        </span>
                    </label>
                @endforeach
            </x-nq::radio-group>
        @endif
    </div>
    <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
    <div class="flex items-center gap-2">
        <x-nq::button variant="primary" x-on:click="submit()" x-bind:disabled="cannotSend">
            <x-nq::spinner x-show="busy" style="display: none" />
            <span x-show="sent" style="display: none" class="inline-flex items-center gap-2"><x-lucide-check aria-hidden="true" />{{ $words['sent'] }}</span>
            <span x-show="! sent">{{ isset($artifact['submitLabel']) ? $tx($artifact['submitLabel']) : $words['send'] }}</span>
        </x-nq::button>
    </div>
</div>
