{{-- <x-nq::store-products-admin.options-editor :options="$product['options']" x-model="draft.options" />
     The options of one product (Colour, Size, Material), each with its values as chips. Up to three options.
     options: [['id', 'name', 'display', 'values' => [['id', 'label']]]] (x-modelable: x-model reads and writes the array). disabled: read only. labels: override any built-in string by key.
     Fires "nq-options-change" ({ options }) after every change. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['options' => [], 'maxOptions' => 3, 'disabled' => false, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $config = ['options' => array_values($options), 'maxOptions' => $maxOptions, 'disabled' => (bool) $disabled, 'currency' => \Nasaq\Nasaq::currency(), 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'options-editor') }}" aria-label="{{ $t['optionsTitle'] }}" x-data="nqOptionsEditor(@js($config))" x-modelable="options"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="grid gap-0.5">
            <h3 class="text-label text-foreground">{{ $t['optionsTitle'] }}</h3>
            <p class="text-caption text-muted-foreground">{{ $t['optionsHint'] }}</p>
        </div>
        <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="! canAdd" x-on:click="add()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['addOption'] }}
        </x-nq::button>
    </div>
    <div class="grid gap-3">
        <template x-for="o in options" x-bind:key="o.id">
            <div data-slot="option-row" class="grid gap-2 rounded-card border border-border bg-card p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
                x-data="{ labels: [] }" x-effect="labels = reconcile(o, labels)">
                <div class="grid gap-1">
                    <label class="text-caption text-muted-foreground" x-bind:for="`opt-name-` + o.id">{{ $t['optionName'] }}</label>
                    <input type="text" x-bind:id="`opt-name-` + o.id" placeholder="{{ $t['optionNamePlaceholder'] }}" x-bind:value="o.name" x-bind:disabled="off" x-on:input="setName(o.id, $event.target.value)"
                        class="h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:border-nq-focus" />
                </div>
                <div class="grid gap-1">
                    <span class="text-caption text-muted-foreground">{{ $t['optionValues'] }}</span>
                    <x-nq::tag-input aria-label="{{ $t['optionValues'] }}" placeholder="{{ $t['optionValuesPlaceholder'] }}" x-model="labels" />
                </div>
                <x-nq::button type="button" size="icon" variant="ghost" x-bind:disabled="off" x-bind:aria-label="`{{ $t['removeOption'] }}: ${o.name}`" x-on:click="remove(o.id)">
                    <x-lucide-trash-2 aria-hidden="true" />
                </x-nq::button>
            </div>
        </template>
    </div>
</section>
