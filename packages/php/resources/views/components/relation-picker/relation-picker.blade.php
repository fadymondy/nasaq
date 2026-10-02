{{-- <x-nq::relation-picker name="customer_id" value="c2" :options="[['value' => 'c1', 'label' => 'Acme']]" search-url="/api/customers" resolve-url="/api/customers" create-url="/api/customers" />
     A field that points at another record: type to search, pick by name, store the id. It is the Combobox with a data source.
     options: records known up front ({ value, label, labelAr?, description? }), filtered on the client. search-url: GET <url>?q=<text> answering a JSON array of records
     (debounced, older requests aborted, also called with an empty q when the list opens). resolve-url: GET <url>?ids[]=a&ids[]=b, to show names for saved ids.
     create-url: POST JSON { name }, answering the new record, adds a "Create text" row. multiple: pick several as chips. value: an id (an array with multiple); it is x-modelable.
     name adds hidden input(s). debounce (ms, default 250), placeholder, invalid, label (the accessible name).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'name' => null, 'multiple' => false, 'options' => [], 'searchUrl' => null, 'resolveUrl' => null, 'createUrl' => null, 'debounce' => 250, 'placeholder' => null, 'invalid' => false, 'label' => null, 'disabled' => false])
@php
    use Nasaq\Nasaq;

    $ar = Nasaq::t('en', 'ar') === 'ar';
    $config = [
        'value' => $value,
        'multiple' => (bool) $multiple,
        'options' => array_values((array) $options),
        'searchUrl' => $searchUrl,
        'resolveUrl' => $resolveUrl,
        'createUrl' => $createUrl,
        'debounce' => (int) $debounce,
        'ar' => $ar,
        't' => [
            'empty' => Nasaq::t('No results', 'لا توجد نتائج'),
            'hint' => Nasaq::t('Type to search', 'اكتب للبحث'),
            'searching' => Nasaq::t('Searching…', 'جارٍ البحث…'),
            'error' => Nasaq::t('Could not load results.', 'تعذر تحميل النتائج.'),
            'create' => $ar ? 'إنشاء «{q}»' : 'Create “{q}”',
            'createFailed' => Nasaq::t('Could not create it.', 'تعذر الإنشاء.'),
        ],
    ];
    $group = 'flex min-h-control min-w-0 w-full items-center gap-1 rounded-control border border-input bg-card text-body text-foreground transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50';
    $inputClass = 'h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]';
    $ph = $placeholder ?? Nasaq::t('Search…', 'ابحث…');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'relation-picker') }}" x-data="nqRelationPicker(@js($config))" x-modelable="value" x-id="['nq-relation']"
    x-bind:data-busy="status === 'loading' || createState === 'busy' ? '' : undefined" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    @if ($multiple)
        <div data-slot="combobox-chips" x-ref="anchor" class="{{ \Nasaq\Cn::merge($group, 'flex-wrap px-1.5 py-1') }}">
            <template x-for="v in selected()" :key="v">
                <span data-slot="combobox-chip" class="inline-flex h-6 max-w-full items-center gap-1 rounded-[4px] border border-border bg-secondary ps-2 pe-0.5 text-body-sm text-foreground outline-none data-highlighted:border-nq-focus">
                    <bdi dir="auto" class="min-w-0 truncate" x-text="labelOf(v)"></bdi>
                    <button type="button" data-slot="combobox-chip-remove" tabindex="-1" :aria-label="@js(Nasaq::t('Remove', 'إزالة')) + ' ' + labelOf(v)" @click.stop="remove(v)"
                        class="flex size-5 shrink-0 cursor-default items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground [&_svg]:size-3"><x-lucide-x /></button>
                </span>
            </template>
            <input data-slot="combobox-input" x-ref="input" x-bind="input" :placeholder="hasValue() ? undefined : @js($ph)" aria-label="{{ $label }}"
                @if ($invalid) data-invalid aria-invalid="true" @endif
                @if ($disabled) disabled @endif
                class="{{ \Nasaq\Cn::merge($inputClass, 'h-6 min-w-16 ps-1.5') }}">
        </div>
    @else
        <div data-slot="combobox-input-group" x-ref="anchor" class="{{ \Nasaq\Cn::merge($group, 'h-control ps-3 pe-1.5') }}">
            <input data-slot="combobox-input" x-ref="input" x-bind="input" placeholder="{{ $ph }}" aria-label="{{ $label }}"
                @if ($invalid) data-invalid aria-invalid="true" @endif
                @if ($disabled) disabled @endif
                class="{{ $inputClass }}">
            <button data-slot="combobox-clear" x-bind="clear" aria-label="{{ Nasaq::t('Clear', 'مسح') }}"
                class="flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4 data-[hidden]:hidden"><x-lucide-x /></button>
            <button data-slot="combobox-trigger" x-bind="trigger" aria-label="{{ Nasaq::t('Open list', 'فتح القائمة') }}"
                class="flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-chevrons-up-down /></button>
        </div>
    @endif
    <template x-teleport="body">
        <div data-slot="combobox-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor"
            class="z-50 w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div data-slot="combobox-empty" x-bind="emptyState" class="px-2.5 py-2 text-body-sm text-muted-foreground">
                <span class="flex items-center justify-center gap-2" role="status">
                    <span x-show="status === 'loading'" x-cloak class="contents"><x-lucide-loader-circle aria-hidden="true" class="size-4 animate-spin" /></span>
                    <span x-show="status === 'error'" x-cloak class="contents"><x-lucide-triangle-alert aria-hidden="true" class="size-4 text-nq-danger-text" /></span>
                    <span x-text="emptyText()"></span>
                    <button type="button" x-show="status === 'error'" x-cloak x-on:click="refresh(true)" class="text-foreground underline underline-offset-2">{{ Nasaq::t('Try again', 'حاول مرة أخرى') }}</button>
                </span>
            </div>
            <template x-for="o in rows()" :key="o.value">
                <div data-slot="combobox-item" x-bind="row(o)"
                    class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                        <span x-show="isSelected(o.value)" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
                    </span>
                    <span data-slot="combobox-item-text" class="min-w-0 flex-1 truncate">
                        <template x-if="isCreate(o)">
                            <span class="flex items-center gap-2 text-foreground"><x-lucide-plus aria-hidden="true" class="size-4 shrink-0" /><bdi dir="auto" class="truncate" x-text="o.label"></bdi></span>
                        </template>
                        <template x-if="!isCreate(o)">
                            <span class="flex min-w-0 flex-col leading-tight">
                                <bdi dir="auto" class="truncate" x-text="text(o)"></bdi>
                                <bdi x-show="o.description" dir="auto" class="truncate text-caption text-muted-foreground" x-text="o.description"></bdi>
                            </span>
                        </template>
                    </span>
                </div>
            </template>
        </div>
    </template>
    <p x-show="createState === 'failed'" x-cloak role="alert" class="mt-1.5 text-caption text-nq-danger-text">{{ Nasaq::t('Could not create it.', 'تعذر الإنشاء.') }}</p>
    @if ($name)
        @if ($multiple)
            <template x-for="v in selected()" :key="v"><input type="hidden" name="{{ $name }}[]" :value="v"></template>
        @else
            <input type="hidden" name="{{ $name }}" :value="value ?? ''">
        @endif
    @endif
</div>
