{{-- <x-nq::marketplace.publish-form :categories="$categories" :permission-options="$options" cancelable />
     The submission form for a new extension: identity, category, version, source, price, tags and permissions.
     categories: ['id', 'label']. permission-options: [['id', 'label', 'description', 'risk' (low | medium | high)]] the author can declare. summary-max: longest summary (default 140).
     cancelable: shows a Cancel button (it fires `nq-cancel`). labels: overrides for the built-in strings.
     Submitting fires the bubbling `nq-publish` ({ draft, wait(promise) }): call event.detail.wait(promise) to keep the button busy until it settles; resolve to ['error' => 'why'] (an object { error })
     to show a failure. Without wait the form finishes at once. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['categories' => [], 'permissionOptions' => [], 'summaryMax' => 140, 'cancelable' => false, 'labels' => []])
@include('nasaq::components.marketplace._strings')
@php
    $t = nq_marketplace_labels((array) $labels);
    $uid = 'nq-publish-'.\Illuminate\Support\Str::random(6);
    $options = ['summaryMax' => (int) $summaryMax, 'failed' => $t['failed'], 'errors' => $t['errors']];
    $perms = array_values((array) $permissionOptions);
    $options['permissionIds'] = array_map(fn ($p) => (string) $p['id'], $perms);
    $max = number_format((int) $summaryMax);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'publish-form') }}" x-data="nqPublishForm({!! \Illuminate\Support\Js::from($options) !!})" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <div x-show="done" style="display: none" class="flex flex-col gap-3">
        <p role="status" class="rounded-card border border-border bg-card p-4 text-body text-foreground">{{ $t['submitted'] }}</p>
        @if ($cancelable)
            <div><x-nq::button variant="secondary" x-on:click="cancel()">{{ $t['cancel'] }}</x-nq::button></div>
        @endif
    </div>
    <form novalidate x-show="!done" x-on:submit.prevent="submit()" class="flex min-w-0 flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
            <x-nq::field x-model="bad.name">
                <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.name" required autocomplete="off" />
                <x-nq::field.error><span x-text="errText('name')"></span></x-nq::field.error>
            </x-nq::field>
            <x-nq::field x-model="bad.category">
                <x-nq::field.label>{{ $t['categoryLabel'] }}</x-nq::field.label>
                <x-nq::select x-model="draft.category">
                    <x-nq::select.trigger x-bind:data-invalid="bad.category ? '' : null" x-bind:aria-invalid="bad.category ? 'true' : null">
                        <x-nq::select.value :placeholder="$t['categoryPlaceholder']" />
                    </x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($categories as $c)
                            <x-nq::select.item :value="(string) $c['id']">{{ $c['label'] }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <x-nq::field.error><span x-text="errText('category')"></span></x-nq::field.error>
            </x-nq::field>
        </div>
        <x-nq::field x-model="bad.summary">
            <x-nq::field.label>{{ $t['summary'] }}</x-nq::field.label>
            <x-nq::field.input x-model="draft.summary" />
            <x-nq::field.description>{{ str_replace(':n', $max, $t['summaryHint']) }} <bdi class="tabular-nums" x-text="count">0</bdi></x-nq::field.description>
            <x-nq::field.error><span x-text="errText('summary')"></span></x-nq::field.error>
        </x-nq::field>
        <x-nq::field>
            <x-nq::field.label>{{ $t['description'] }}</x-nq::field.label>
            <x-nq::field.textarea x-model="draft.description" rows="4" />
        </x-nq::field>
        <div class="grid gap-4 sm:grid-cols-2">
            <x-nq::field x-model="bad.version">
                <x-nq::field.label>{{ $t['versionLabel'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.version" ltr placeholder="1.0.0" />
                <x-nq::field.error><span x-text="errText('version')"></span></x-nq::field.error>
            </x-nq::field>
            <x-nq::field x-model="bad.repository">
                <x-nq::field.label>{{ $t['repository'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.repository" ltr type="url" placeholder="https://github.com/acme/extension" />
                <x-nq::field.description>{{ $t['repositoryHint'] }}</x-nq::field.description>
                <x-nq::field.error><span x-text="errText('repository')"></span></x-nq::field.error>
            </x-nq::field>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
            <x-nq::field>
                <x-nq::field.label>{{ $t['pricing'] }}</x-nq::field.label>
                <x-nq::toggle-group :default-value="['free']" x-model="pricingSel" aria-label="{{ $t['pricing'] }}">
                    <x-nq::toggle-group.toggle value="free">{{ $t['pricingFree'] }}</x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="paid">{{ $t['pricingPaid'] }}</x-nq::toggle-group.toggle>
                </x-nq::toggle-group>
            </x-nq::field>
            <x-nq::field x-model="bad.price" x-show="paid" style="display: none">
                <x-nq::field.label>{{ $t['priceAmount'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.price" ltr type="number" min="0" step="0.5" />
                <x-nq::field.error><span x-text="errText('price')"></span></x-nq::field.error>
            </x-nq::field>
        </div>
        <div class="flex flex-col gap-1.5">
            <span id="{{ $uid }}-tags" class="text-label text-foreground">{{ $t['tagsLabel'] }}</span>
            <x-nq::tag-input x-model="draft.tags" aria-labelledby="{{ $uid }}-tags" :placeholder="$t['tagsPlaceholder']" :max-tags="6" />
        </div>
        @if (count($perms))
            <fieldset class="flex flex-col gap-2">
                <legend class="mb-1 text-label text-foreground">{{ $t['permissionsLabel'] }}</legend>
                <ul class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                    @foreach ($perms as $p)
                        @php $risk = $p['risk'] ?? 'low'; @endphp
                        <li class="flex items-start gap-3 px-3 py-2">
                            <x-nq::checkbox id="{{ $uid }}-{{ $p['id'] }}" class="mt-0.5" :x-model="'permPicked['.$loop->index.']'" />
                            <label for="{{ $uid }}-{{ $p['id'] }}" class="grid min-w-0 flex-1 cursor-pointer gap-0.5">
                                <span dir="auto" class="text-body-sm text-foreground">{{ $p['label'] }}</span>
                                @if (! empty($p['description']))<span dir="auto" class="text-caption text-muted-foreground">{{ $p['description'] }}</span>@endif
                            </label>
                            <x-nq::badge :variant="nq_marketplace_risk_tone($risk)">{{ $t['risk'][$risk] }}</x-nq::badge>
                        </li>
                    @endforeach
                </ul>
            </fieldset>
        @endif
        <p role="alert" class="text-body-sm text-nq-danger-text" x-show="formError" style="display: none" x-text="formError"></p>
        <div class="flex flex-wrap justify-end gap-2">
            @if ($cancelable)
                <x-nq::button type="button" variant="ghost" x-bind:disabled="pending" x-on:click="cancel()">{{ $t['cancel'] }}</x-nq::button>
            @endif
            <x-nq::button type="submit" variant="primary" x-bind:disabled="pending" x-bind:aria-busy="pending ? 'true' : null">
                <x-lucide-upload aria-hidden="true" />
                <span x-text="pending ? @js($t['submitting']) : @js($t['submit'])">{{ $t['submit'] }}</span>
            </x-nq::button>
        </div>
    </form>
</div>
