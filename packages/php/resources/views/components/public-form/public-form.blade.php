{{-- <x-nq::public-form :form="$definition" action="/contact" x-on:nq-public-form="$event.detail.waitUntil(send($event.detail.data))" />
     The visitor side of a form built with the form builder: draws the fields from a definition, applies the rules (show, hide, require) as answers
     change, checks the answers in the visitor's language, drops bot submissions quietly and shows a thank-you. For a ready contact form use
     <x-nq::public-form.contact>.
     form: { name, kind (contact | subscribe | inquiry | testimonial), fields [ { id, kind (text | email | phone | number | textarea | select | radio | checkbox), label,
     labelAr?, help?, helpAr?, placeholder?, placeholderAr?, required?, options? [ { value, label, labelAr? } ] } ], rules [ { conditions, actions } ], allowedOrigins,
     enabled, thanksEn, thanksAr, honeypot }.
     Listen for nq-public-form on it ({ data, waitUntil(promise) }): data holds the visible answers, trimmed. Resolve nothing for success or { error } to keep the
     form and show the message; a rejection shows "Something went wrong". Spam (honeypot filled) never fires it; the visitor still sees the thank-you. With no
     listener and an action attribute it submits natively (fields named by id, plus the honeypot website_url).
     default-values: { id: value }. submit-label: the button text. preview: validates but never sends (the builder's live preview). labels: array overriding
     the built-in texts (submit, choose, optional, closed, another, failed, honeypot, preview, errors { required, email, phone, number }).
     A form with enabled false shows a closed notice. When it is done the root gets data-state="done" and the thank-you panel (data-slot="public-form-done") shows.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['form', 'defaultValues' => [], 'submitLabel' => null, 'preview' => false, 'labels' => []])
@include('nasaq::components.public-form._logic')
@php
    $def = (array) $form;
    $def['fields'] = array_map(fn ($f) => (array) $f, (array) ($def['fields'] ?? []));
    $def['rules'] = (array) ($def['rules'] ?? []);
    $t = nq_pf_words((array) $labels);
    $values = (array) $defaultValues;
    $states = nq_pf_states($def, $values);
    $answers = [];
    foreach ($def['fields'] as $f) {
        $answers[$f['id']] = $f['kind'] === 'checkbox' ? ($values[$f['id']] ?? false) === true : (string) ($values[$f['id']] ?? '');
    }
    $honeypot = ! empty($def['honeypot']);
    $answers['website_url'] = (string) ($values['website_url'] ?? '');
    $config = [
        'fields' => array_map(fn ($f) => ['id' => $f['id'], 'kind' => $f['kind'], 'required' => ! empty($f['required'])], $def['fields']),
        'rules' => $def['rules'], 'honeypot' => $honeypot, 'preview' => (bool) $preview, 'defaults' => $answers,
        'errors' => $t['errors'], 'failed' => $t['failed'],
    ];
    $closed = empty($def['enabled']) && ! $preview;
@endphp
@if ($closed)
    <p data-slot="{{ $attributes->get('data-slot', 'public-form') }}" data-state="closed" role="status" {{ $attributes->except(['data-slot', 'action'])->cn('rounded-card border border-border bg-nq-surface-soft p-4 text-body-sm text-muted-foreground') }}>{{ $t['closed'] }}</p>
@else
    <form data-slot="{{ $attributes->get('data-slot', 'public-form') }}" data-kind="{{ $def['kind'] ?? 'contact' }}" novalidate x-data="nqPublicForm(@js($config))" x-bind:data-state="done ? 'done' : null"
        x-on:submit.prevent="onSubmit()" {{ $attributes->except('data-slot')->cn('relative flex w-full flex-col gap-4') }}>
        <div x-show="! done" class="flex flex-col gap-4">
        @foreach ($def['fields'] as $f)
            @php
                $id = $f['id'];
                $state = $states[$id];
                $label = nq_pf_text($f['label'] ?? '', $f['labelAr'] ?? '');
                $help = nq_pf_text($f['help'] ?? '', $f['helpAr'] ?? '');
                $placeholder = nq_pf_text($f['placeholder'] ?? '', $f['placeholderAr'] ?? '') ?: null;
                $kind = $f['kind'];
                $text = is_string($answers[$id]) ? $answers[$id] : '';
            @endphp
            <x-nq::field x-model="bad[`{{ $id }}`]" data-field="{{ $id }}" x-show="isVisible(`{{ $id }}`)" style="{{ $state['visible'] ? '' : 'display: none' }}">
                @if ($kind === 'checkbox')
                    <label class="flex items-start gap-2 text-body">
                        <x-nq::checkbox name="{{ $id }}" value="1" :checked="$answers[$id] === true" x-model="answers[`{{ $id }}`]" class="mt-1" />
                        <span>{{ $label }}</span>
                    </label>
                @else
                    <x-nq::field.label>
                        {{ $label }}
                        <span class="ms-1 font-normal text-muted-foreground" x-show="! isRequired(`{{ $id }}`)" style="{{ $state['required'] ? 'display: none' : '' }}">({{ $t['optional'] }})</span>
                    </x-nq::field.label>
                @endif
                @if ($kind === 'textarea')
                    <x-nq::field.textarea name="{{ $id }}" rows="4" :placeholder="$placeholder" x-model="answers[`{{ $id }}`]" x-bind:required="isRequired(`{{ $id }}`) ? true : null">{{ $text }}</x-nq::field.textarea>
                @elseif ($kind === 'phone')
                    <x-nq::phone-input name="{{ $id }}" :value="$text" x-model="answers[`{{ $id }}`]" />
                @elseif ($kind === 'select')
                    <x-nq::select name="{{ $id }}" :value="$text ?: null" x-model="answers[`{{ $id }}`]">
                        <x-nq::select.trigger>
                            <x-nq::select.value :placeholder="$placeholder ?? $t['choose']" />
                        </x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ((array) ($f['options'] ?? []) as $o)
                                <x-nq::select.item :value="$o['value']">{{ nq_pf_text($o['label'] ?? '', $o['labelAr'] ?? '') }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                @elseif ($kind === 'radio')
                    <x-nq::radio-group name="{{ $id }}" :default-value="$text ?: null" x-model="answers[`{{ $id }}`]">
                        @foreach ((array) ($f['options'] ?? []) as $o)
                            <label class="flex items-center gap-2 text-body">
                                <x-nq::radio-group.radio :value="$o['value']" />
                                {{ nq_pf_text($o['label'] ?? '', $o['labelAr'] ?? '') }}
                            </label>
                        @endforeach
                    </x-nq::radio-group>
                @elseif ($kind !== 'checkbox')
                    <x-nq::field.input name="{{ $id }}" type="text" :ltr="in_array($kind, ['email', 'number'], true)" :placeholder="$placeholder" value="{{ $text }}"
                        :inputmode="$kind === 'email' ? 'email' : ($kind === 'number' ? 'decimal' : null)" :autocomplete="$kind === 'email' ? 'email' : null"
                        x-model="answers[`{{ $id }}`]" x-bind:required="isRequired(`{{ $id }}`) ? true : null" />
                @endif
                @if ($help)
                    <x-nq::field.description>{{ $help }}</x-nq::field.description>
                @endif
                <x-nq::field.error><span x-text="fe[`{{ $id }}`]"></span></x-nq::field.error>
            </x-nq::field>
        @endforeach

        @if ($honeypot)
            <div aria-hidden="true" class="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
                <label>
                    {{ $t['honeypot'] }}
                    <input type="text" name="website_url" tabindex="-1" autocomplete="off" value="{{ $answers['website_url'] }}" x-model="answers.website_url">
                </label>
            </div>
        @endif

        <p role="alert" class="text-body-sm text-nq-danger-text" x-show="error" style="display: none" x-text="error"></p>
        <div class="flex flex-wrap items-center gap-3">
            <x-nq::button type="submit" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                <template x-if="pending"><x-nq::spinner /></template>
                {{ $submitLabel ?? $t['submit'] }}
            </x-nq::button>
            @if ($preview)
                <span class="text-caption text-muted-foreground">{{ $t['preview'] }}</span>
            @endif
        </div>
        </div>

        <div data-slot="public-form-done" data-state="done" role="status" x-show="done" style="display: none" class="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5">
            <x-lucide-circle-check class="size-6 text-nq-success" aria-hidden="true" />
            <p class="text-body">{{ nq_pf_text($def['thanksEn'] ?? '', $def['thanksAr'] ?? '') }}</p>
            <x-nq::button type="button" variant="link" class="px-0" x-on:click="again()">{{ $t['another'] }}</x-nq::button>
        </div>
    </form>
@endif
