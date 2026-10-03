{{-- <x-nq::schema-form :schema="$schema" :relations="['users' => ['options' => [['value' => 'u1', 'label' => 'Layla Hassan']]]]"
         x-on:nq-schema-form-submit="$event.detail.waitUntil(fetch('/api/projects', { method: 'POST', body: JSON.stringify($event.detail.value) }).then(() => ({})))" />
     A form generated from a JSON Schema (a PHP array): text, numbers, enums, booleans, dates, foreign keys, objects nested to any depth, lists of plain values
     (tags, repeated inputs, checkbox groups) and lists of objects (collapsible, reorderable groups). It validates in the browser and shows the server's errors on the right
     nested field. Supported: type, title, description, format (email, uri, tel, date), enum / oneOf with const, minimum, maximum, multipleOf, minLength, maxLength, pattern,
     minItems, maxItems, uniqueItems, default, required, $ref into $defs, and the x- extensions (x-title-ar, x-description-ar, x-placeholder, x-widget, x-unit, x-width,
     x-order, x-title, x-enum-titles, x-relation).
     schema: the JSON Schema of type object. value: the starting values in the shape of the schema. rules: show / hide / require rules by path, as the form builder writes them.
     relations: where each x-relation resource is found, by resource name: ['users' => ['options' => [...], 'searchUrl' => '/api/users', 'resolveUrl' => ..., 'createUrl' => ...]]
     (a JS search function cannot cross from PHP: use options or search-url). submit-label, hide-actions (no Save / Reset buttons), disabled, label (the accessible name),
     labels (overrides of the texts in nq_sf_words()).
     Save fires nq-schema-form-submit ({ value, waitUntil(promise) }) once the form is valid; resolve the promise with { error, fieldErrors } to show the server's errors
     (field errors by path: "email", "address.city", "contacts[1].phone"). A failed submit lists what to fix and moves focus to the first field. The current output is
     x-data's output() and the nq-schema-form-change event ({ value }) fires after every edit. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['schema' => [], 'value' => [], 'rules' => [], 'relations' => [], 'submitLabel' => null, 'hideActions' => false, 'disabled' => false, 'label' => null, 'labels' => []])
@include('nasaq::components.schema-form._logic')
@php
    $rtl = \Nasaq\Nasaq::rtl();
    $t = nq_sf_words((array) $labels);
    $built = nq_sf_tree((array) $schema, $rtl);
    $rels = (array) $relations;
    $config = [
        'tree' => $built['root'],
        'value' => (object) (array) $value,
        'rules' => array_values((array) $rules),
        'ar' => $rtl,
        'disabled' => (bool) $disabled,
        'submitLabel' => $submitLabel ?? $t['submit'],
        'labels' => (object) (array) $labels,
    ];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'schema-form') }}" x-data="nqSchemaForm(@js($config))" novalidate x-on:submit.prevent="submit()" x-on:reset.prevent="reset()"
    @if ($label) aria-label="{{ $label }}" @endif
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-6') }}>
    @include('nasaq::components.schema-form._node', ['node' => $built['root'], 'pre' => null, 'suf' => '', 'depth' => 0, 'lv' => 0])

    <x-nq::alert tone="danger" x-show="formError" style="display: none"><span x-text="formError"></span></x-nq::alert>
    <x-nq::alert tone="danger" data-slot="schema-form-unmatched" x-show="hasUnmatched()" style="display: none">
        <p>{{ $t['unmatched'] }}</p>
        <ul class="mt-1 list-disc ps-5">
            <template x-for="u in unmatched()" :key="u.path"><li x-text="u.path + ': ' + u.message"></li></template>
        </ul>
    </x-nq::alert>
    <x-nq::alert tone="success" x-show="isSaved()" style="display: none">{{ $t['saved'] }}</x-nq::alert>
    <x-nq::alert tone="warning" data-slot="schema-form-summary" x-show="showSummary()" style="display: none">
        <p x-text="t.fix(issueTotal())"></p>
        <ul aria-label="{{ $t['goTo'] }}" class="mt-1 flex flex-col items-start gap-0.5">
            <template x-for="p in summary()" :key="p">
                <li>
                    <button type="button" x-bind:data-path="p" x-on:click="focusPath(p)" x-text="summaryText(p)"
                        class="rounded-control text-start underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"></button>
                </li>
            </template>
        </ul>
    </x-nq::alert>
    @unless ($hideActions)
        <div class="flex flex-wrap items-center gap-2">
            <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busyAttr()" x-bind:disabled="cannotSubmit()"><span x-text="isBusy() ? t.saving : submitLabel">{{ $submitLabel ?? $t['submit'] }}</span></x-nq::button>
            <x-nq::button type="reset" variant="ghost" x-bind:disabled="cannotReset()">{{ $t['reset'] }}</x-nq::button>
        </div>
    @endunless
</form>
