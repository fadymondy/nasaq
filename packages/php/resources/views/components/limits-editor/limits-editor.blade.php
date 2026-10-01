{{-- <x-nq::limits-editor :resources="[['key' => 'seats', 'label' => 'Seats', 'unit' => 'seats']]" :value="['seats' => ['mode' => 'limit', 'value' => 25]]" :inherited="['seats' => 10]" saveable />
     A per-resource limits table as a form: each resource is Limit (a number), Unlimited or Inherit, with optional price and overage price, and per-key rate and spend limits.
     resources: [key, label, description?, unit?] (localise label and unit). value: rules keyed by resource key, each { mode: limit | unlimited | inherit, value?, price?, overage?, rateLimit?, spendLimit? };
     a missing key means Inherit. inherited: what Inherit resolves to per key (a number, or null for unlimited), shown on the row.
     show-pricing, show-key-limits, currency (ISO code for prices and the spend cap; default USD, or SAR in Arabic), disabled. name adds a hidden input carrying the rules as JSON.
     saveable adds the Save / Discard footer. Nothing is checked until the first save; then a missing or negative number shows its error under the field.
     @limits-save fires with detail { rules, done }: handle it synchronously and the editor is saved; call $event.preventDefault() to answer later, then $event.detail.done() or done("message") on failure.
     @limits-change fires on every edit. x-model / wire:model work on the rules (x-modelable="rules"). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['resources' => [], 'value' => [], 'inherited' => [], 'showPricing' => false, 'showKeyLimits' => false, 'currency' => null, 'saveable' => false, 'disabled' => false, 'name' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $resources = array_values(array_map(fn ($r) => (array) $r, (array) $resources));
    $fields = ['value'];
    if ($showPricing) {
        array_push($fields, 'price', 'overage');
    }
    if ($showKeyLimits) {
        array_push($fields, 'rateLimit', 'spendLimit');
    }
    $options = [
        'keys' => array_column($resources, 'key'),
        'fields' => $fields,
        'inherited' => (object) $inherited,
        'units' => (object) collect($resources)->filter(fn ($r) => ! empty($r['unit']))->mapWithKeys(fn ($r) => [$r['key'] => $r['unit']])->all(),
    ];
    $extra = [];
    if ($showPricing) {
        $extra[] = ['price', \Nasaq\Nasaq::t('Price', 'السعر').' ('.$code.')', null];
        $extra[] = ['overage', \Nasaq\Nasaq::t('Overage price', 'سعر التجاوز').' ('.$code.')', \Nasaq\Nasaq::t('per extra unit', 'لكل وحدة إضافية')];
    }
    if ($showKeyLimits) {
        $extra[] = ['rateLimit', \Nasaq\Nasaq::t('Rate limit', 'حد المعدل'), \Nasaq\Nasaq::t('requests per minute', 'طلب في الدقيقة')];
        $extra[] = ['spendLimit', \Nasaq\Nasaq::t('Spend cap', 'سقف الإنفاق').' ('.$code.')', \Nasaq\Nasaq::t('per key per month', 'لكل مفتاح شهريًا')];
    }
    $modes = ['limit' => \Nasaq\Nasaq::t('Limit', 'حد'), 'unlimited' => \Nasaq\Nasaq::t('Unlimited', 'غير محدود'), 'inherit' => \Nasaq\Nasaq::t('Inherit', 'وراثة')];
    $input = 'h-control w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px] text-start';
    $toggle = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
    $initialRules = (object) $value;
@endphp
<form data-slot="limits-editor" novalidate x-data="nqLimitsEditor({!! \Illuminate\Support\Js::from($initialRules) !!}, {!! \Illuminate\Support\Js::from($options) !!})" x-modelable="rules" x-id="['nq-limits']" x-on:submit.prevent="submit()"
    {{ $attributes->cn('flex flex-col gap-4') }}>
    <ul data-slot="limits-editor-list" aria-label="{{ \Nasaq\Nasaq::t('Limits', 'الحدود') }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        @foreach ($resources as $res)
            @php
                $key = $res['key'];
                $rule = (array) ($value[$key] ?? ['mode' => 'inherit']);
                $mode = $rule['mode'] ?? 'inherit';
                $inh = $inherited[$key] ?? null;
                $unit = $res['unit'] ?? null;
                $inheritText = array_key_exists($key, (array) $inherited)
                    ? ($inh === null ? \Nasaq\Nasaq::t('Inherits unlimited', 'يرث غير محدود') : \Nasaq\Nasaq::t('Inherits ', 'يرث ').number_format($inh).($unit ? ' '.$unit : ''))
                    : \Nasaq\Nasaq::t('Inherits the default', 'يرث القيمة الافتراضية');
            @endphp
            <li data-slot="limits-editor-row" data-key="{{ $key }}" :data-mode="rule(@js($key)).mode" :data-changed="changed(@js($key)) ? '' : null" class="flex flex-col gap-3 p-4">
                <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div class="flex min-w-0 flex-col">
                        <span class="flex items-center gap-2 text-label text-foreground">
                            {{ $res['label'] }}
                            <span x-show="changed(@js($key))" x-cloak style="display: none" aria-hidden="true" class="size-1.5 rounded-full bg-primary"></span>
                        </span>
                        @if (! empty($res['description']))
                            <span class="text-caption text-muted-foreground">{{ $res['description'] }}</span>
                        @endif
                    </div>
                    <div role="group" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" aria-label="{{ $res['label'].' '.\Nasaq\Nasaq::t('limits', 'حدود') }}" @if ($disabled) data-disabled @endif
                        class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
                        @foreach ($modes as $m => $label)
                            <button type="button" data-slot="toggle" x-bind="modeButton(@js($key), @js($m))" @if ($disabled) disabled data-disabled @endif class="{{ $toggle }}">{{ $label }}</button>
                        @endforeach
                    </div>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div data-slot="field" x-show="rule(@js($key)).mode === 'limit'" @unless ($mode === 'limit') style="display: none" @endunless class="flex min-w-0 flex-col gap-1.5">
                        <label data-slot="field-label" :for="$id('nq-limits', @js($key.'-value'))" class="text-label text-foreground">{{ $unit ? \Nasaq\Nasaq::t('Limit', 'الحد')." ({$unit})" : \Nasaq\Nasaq::t('Limit', 'الحد') }}</label>
                        <input data-slot="input" dir="ltr" type="number" inputmode="decimal" min="0" step="any" :id="$id('nq-limits', @js($key.'-value'))" x-bind="numberField(@js($key), 'value')" @disabled($disabled) class="{{ $input }}">
                        <div data-slot="field-error" role="alert" x-show="err(@js($key), 'value')" x-text="err(@js($key), 'value')" style="display: none" class="text-caption text-nq-danger-text"></div>
                    </div>
                    <div data-slot="limits-editor-effective" x-show="rule(@js($key)).mode !== 'limit'" @if ($mode === 'limit') style="display: none" @endif class="flex min-w-0 flex-col justify-end gap-1 pb-2 text-body-sm text-muted-foreground">
                        <span x-show="rule(@js($key)).mode === 'unlimited'" @unless ($mode === 'unlimited') style="display: none" @endunless>
                            <x-nq::badge variant="neutral" class="w-fit">{{ \Nasaq\Nasaq::t('Unlimited', 'غير محدود') }}</x-nq::badge>
                        </span>
                        <bdi x-show="rule(@js($key)).mode === 'inherit'" x-text="inheritText(@js($key))" @unless ($mode === 'inherit') style="display: none" @endunless>{{ $inheritText }}</bdi>
                    </div>
                    @foreach ($extra as [$field, $fieldLabel, $hint])
                        <div data-slot="field" class="flex min-w-0 flex-col gap-1.5">
                            <label data-slot="field-label" :for="$id('nq-limits', @js($key.'-'.$field))" class="text-label text-foreground">{{ $fieldLabel }}</label>
                            <input data-slot="input" dir="ltr" type="number" inputmode="decimal" min="0" step="any" :id="$id('nq-limits', @js($key.'-'.$field))" x-bind="numberField(@js($key), @js($field))" @disabled($disabled) class="{{ $input }}">
                            @if ($hint)
                                <span class="text-caption text-muted-foreground">{{ $hint }}</span>
                            @endif
                            <div data-slot="field-error" role="alert" x-show="err(@js($key), @js($field))" x-text="err(@js($key), @js($field))" style="display: none" class="text-caption text-nq-danger-text"></div>
                        </div>
                    @endforeach
                </div>
            </li>
        @endforeach
    </ul>
    <div data-slot="alert" data-tone="danger" role="alert" x-show="failure" x-cloak style="display: none" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-danger/30 bg-nq-danger-soft p-3 text-start">
        <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
        <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-description" class="text-body-sm text-foreground" x-text="failure"></div></div>
    </div>
    <div data-slot="alert" data-tone="warning" role="alert" x-show="!failure && blocked()" x-cloak style="display: none" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border border-nq-warning/30 bg-nq-warning-soft p-3 text-start">
        <x-lucide-circle-alert aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-warning-text" />
        <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5"><div data-slot="alert-description" class="text-body-sm text-foreground">{{ \Nasaq\Nasaq::t('Fix the highlighted fields to save.', 'صحّح الحقول المظلّلة لتتمكن من الحفظ.') }}</div></div>
    </div>
    @if ($saveable)
        <div data-slot="limits-editor-footer" class="flex flex-wrap items-center justify-end gap-2">
            <span role="status" x-text="status()" class="me-auto text-body-sm text-muted-foreground"></span>
            <x-nq::button variant="ghost" x-bind:disabled="dirty().length === 0 || busy || {{ $disabled ? 'true' : 'false' }}" x-on:click="discard()">
                <x-lucide-undo-2 />
                {{ \Nasaq\Nasaq::t('Discard changes', 'تجاهل التغييرات') }}
            </x-nq::button>
            <x-nq::button type="submit" variant="primary" x-bind:disabled="dirty().length === 0 || {{ $disabled ? 'true' : 'false' }}" x-bind:aria-busy="busy ? 'true' : null">
                <x-lucide-save />
                {{ \Nasaq\Nasaq::t('Save limits', 'حفظ الحدود') }}
            </x-nq::button>
        </div>
    @endif
    @if ($name)
        <input type="hidden" name="{{ $name }}" :value="JSON.stringify(rules)">
    @endif
</form>
