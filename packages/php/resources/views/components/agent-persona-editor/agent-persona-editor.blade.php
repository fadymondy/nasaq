{{-- <x-nq::agent-persona-editor :value="$agent" :models="$models" />
     Edit an AI agent profile: name, tagline, colour, icon, model, traits, greeting and the persona itself as Markdown with a write and preview switch and section shortcuts.
     A live card shows how it will look. It keeps a draft, tells you what is unsaved, and saves the whole persona. Needs the Alpine module (nqAgentPersonaEditor).
     value: ['name', 'tagline', 'color' (hex or "--nq-tag-blue"), 'icon' (lucide name), 'persona' (Markdown), 'traits' => [], 'model', 'greeting'] (the saved baseline).
     models: [['id', 'label']]; leave out to hide the model field. trait-suggestions: words offered while typing a trait. max-length: longest persona text (4000, 0 for no limit).
     hide-preview, disabled, labels (override of the built-in words), locale.
     The page listens on the form: nq-persona-save {persona, wait} (wait(promise): resolve { error } to keep the draft unsaved), nq-persona-change {persona},
     nq-persona-preview {markdown, wait} (optional: wait(Promise<html>) renders edited Markdown; without it the edited text shows as plain text). --}}
@include('nasaq::components.agent-persona-editor._logic')
@props(['value', 'models' => [], 'traitSuggestions' => null, 'maxLength' => 4000, 'hidePreview' => false, 'disabled' => false, 'labels' => [], 'locale' => null])
@php
    $js = fn ($v) => \Illuminate\Support\Js::from($v)->toHtml();
    $locale ??= app()->getLocale();
    $t = nq_ape_words($locale, $labels);
    $p = $value + ['name' => '', 'tagline' => '', 'color' => '', 'icon' => '', 'persona' => '', 'traits' => [], 'model' => null, 'greeting' => ''];
    $p['traits'] = array_values($p['traits']);
    $max = (int) $maxLength;
    $num = fn (int $n) => number_format($n);
    $words = $p['persona'] !== '' && trim($p['persona']) !== '' ? count(preg_split('/\s+/u', trim($p['persona']))) : 0;
    $over = $max > 0 && mb_strlen($p['persona']) > $max;
    $fill = fn (string $tpl, string $a, string $b = '') => str_replace(['%1$s', '%2$s'], [$a, $b], $tpl);
    $config = [
        'value' => $p,
        'maxLength' => $max,
        'locale' => $locale,
        'disabled' => (bool) $disabled,
        'labels' => [
            'saved' => $t['saved'], 'saveFailed' => $t['saveFailed'], 'unsaved' => $t['unsaved'], 'saving' => $t['saving'], 'save' => $t['save'],
            'words' => $t['words'], 'chars' => $t['chars'], 'tooLong' => $t['personaTooLong'], 'unnamed' => $t['unnamed'],
        ],
    ];
@endphp
<form data-slot="agent-persona-editor" aria-label="{{ $t['label'] }}" novalidate x-data="nqAgentPersonaEditor(@js($config))" x-on:submit.prevent="submit()"
    {{ $attributes->cn(['grid min-w-0 gap-6', 'lg:grid-cols-[minmax(0,1fr)_18rem]' => ! $hidePreview])->except('data-slot') }}>
    <div class="flex min-w-0 flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
            <x-nq::field class="sm:col-span-2" x-model="nameInvalid">
                <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
                <x-nq::field.input dir="auto" x-model="draft.name" value="{{ $p['name'] }}" placeholder="{{ $t['namePlaceholder'] }}" :disabled="$disabled" />
                <x-nq::field.error>{{ $t['nameRequired'] }}</x-nq::field.error>
            </x-nq::field>
            <x-nq::field class="sm:col-span-2">
                <x-nq::field.label>{{ $t['tagline'] }}</x-nq::field.label>
                <x-nq::field.input dir="auto" x-model="draft.tagline" value="{{ $p['tagline'] }}" placeholder="{{ $t['taglinePlaceholder'] }}" :disabled="$disabled" />
            </x-nq::field>
            <x-nq::field :disabled="$disabled">
                <span class="text-label text-foreground">{{ $t['color'] }}</span>
                <x-nq::color-picker :value="$p['color'] ?: null" :locale="$locale" aria-label="{{ $t['color'] }}" x-on:color-change="draft.color = $event.detail.value ?? ''" />
            </x-nq::field>
            <div class="flex flex-col gap-1.5">
                <span class="text-label text-foreground">{{ $t['icon'] }}</span>
                <div>
                    <x-nq::icon-picker :value="$p['icon'] ?: null" x-model="draft.icon" :disabled="$disabled" recent-key="" />
                </div>
            </div>
            @if ($models)
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <span class="text-label text-foreground">{{ $t['model'] }}</span>
                    <x-nq::ai-model-picker.select :models="$models" :value="$p['model']" x-model="draft.model" :disabled="$disabled" :label="$t['model']" />
                </div>
            @endif
        </div>

        <x-nq::field>
            <x-nq::field.label>{{ $t['traits'] }}</x-nq::field.label>
            <x-nq::tag-input :value="$p['traits']" x-model="draft.traits" :suggestions="$traitSuggestions" :max-tags="8" :disabled="$disabled" placeholder="{{ $t['traitsPlaceholder'] }}" />
            <x-nq::field.description>{{ $t['traitsHint'] }}</x-nq::field.description>
        </x-nq::field>

        <x-nq::field>
            <x-nq::field.label>{{ $t['greeting'] }}</x-nq::field.label>
            <x-nq::field.input dir="auto" x-model="draft.greeting" value="{{ $p['greeting'] }}" :disabled="$disabled" />
            <x-nq::field.description>{{ $t['greetingHint'] }}</x-nq::field.description>
        </x-nq::field>

        <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-end justify-between gap-2">
                <div class="min-w-0">
                    <span class="text-label text-foreground">{{ $t['persona'] }}</span>
                    <p class="text-caption text-muted-foreground">{{ $t['personaHint'] }}</p>
                </div>
            </div>
            <x-nq::tabs default-value="write">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <x-nq::tabs.list>
                        <x-nq::tabs.tab value="write">{{ $t['write'] }}</x-nq::tabs.tab>
                        <x-nq::tabs.tab value="preview">{{ $t['preview'] }}</x-nq::tabs.tab>
                        <x-nq::tabs.indicator />
                    </x-nq::tabs.list>
                    <div x-show="value === 'write'" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="{{ $t['insert'] }}">
                        @foreach ($t['sections'] as $s)
                            <x-nq::button type="button" size="sm" variant="ghost" class="h-7 px-2 text-caption" :disabled="$disabled" x-on:click="addSection({!! $js($s) !!})">
                                <x-lucide-plus aria-hidden="true" />
                                {{ $s }}
                            </x-nq::button>
                        @endforeach
                    </div>
                </div>
                <x-nq::tabs.panel value="write" class="mt-2">
                    <x-nq::field.textarea dir="auto" rows="12" x-model="draft.persona" aria-label="{{ $t['persona'] }}" spellcheck="true" :disabled="$disabled"
                        x-bind:aria-invalid="over ? 'true' : null" class="min-h-56 font-mono text-body-sm">{{ $p['persona'] }}</x-nq::field.textarea>
                </x-nq::tabs.panel>
                <x-nq::tabs.panel value="preview" class="mt-2 min-h-56 rounded-control border border-border bg-card p-4" x-effect="value === 'preview' && showPreview()">
                    <div x-show="draft.persona.trim() && draft.persona === config.value.persona" @if (trim($p['persona']) === '') style="display: none" @endif>
                        <x-nq::markdown :source="$p['persona']" />
                    </div>
                    <div x-show="draft.persona !== config.value.persona && rendered && rendered.source === draft.persona" style="display: none" x-html="rendered ? rendered.html : ''"></div>
                    <div x-show="draft.persona.trim() && draft.persona !== config.value.persona && ! (rendered && rendered.source === draft.persona)" style="display: none"
                        dir="auto" class="whitespace-pre-wrap text-body-sm text-foreground" x-text="draft.persona"></div>
                    <p x-show="! draft.persona.trim()" @if (trim($p['persona']) !== '') style="display: none" @endif class="text-body-sm text-muted-foreground">{{ $t['previewEmpty'] }}</p>
                </x-nq::tabs.panel>
            </x-nq::tabs>
            <p class="flex flex-wrap justify-between gap-2 text-caption" x-bind:class="over ? 'text-nq-danger-text' : 'text-muted-foreground'" data-state-over="{{ $over ? 'true' : 'false' }}">
                <span x-text="wordsLine">{{ $over ? $fill($t['personaTooLong'], $num($max)) : $fill($t['words'], $num($words)) }}</span>
                @if ($max > 0)
                    <span class="tabular-nums" x-text="charsLine">{{ $fill($t['chars'], $num(mb_strlen($p['persona'])), $num($max)) }}</span>
                @endif
            </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <x-nq::button type="submit" variant="primary" :disabled="true" x-bind:disabled="config.disabled || cannotSave" x-bind:data-disabled="(config.disabled || cannotSave) ? '' : null" x-bind:aria-busy="saving">
                <x-nq::spinner x-show="saving" x-cloak class="size-3.5" />
                <span x-text="saveLabel">{{ $t['save'] }}</span>
            </x-nq::button>
            <x-nq::button type="button" variant="ghost" :disabled="true" x-bind:disabled="config.disabled || saving || ! dirty" x-bind:data-disabled="(config.disabled || saving || ! dirty) ? '' : null" x-on:click="revert()">
                <x-lucide-rotate-ccw aria-hidden="true" />
                {{ $t['revert'] }}
            </x-nq::button>
            <span role="status" aria-live="polite" class="text-body-sm text-muted-foreground" x-text="status"
                x-bind:class="message && message.tone === 'error' ? 'text-nq-danger-text' : 'text-muted-foreground'"></span>
        </div>
    </div>

    @unless ($hidePreview)
        <aside aria-label="{{ $t['previewTitle'] }}" class="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
            <h3 class="text-caption text-muted-foreground">{{ $t['previewTitle'] }}</h3>
            <x-nq::agent-persona-editor.preview :persona="$p" :labels="$labels" :locale="$locale" live />
        </aside>
    @endunless
</form>
