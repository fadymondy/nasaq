{{-- <x-nq::ai-model-picker :models="[['id' => 'opus', 'label' => 'Opus 5.5', 'tier' => 'flagship', 'efforts' => ['low', 'medium', 'high']]]" :value="['model' => 'opus', 'effort' => 'high']" name="run" />
     Picks what runs an AI task: the model (tier, context window, price), the reasoning effort that model supports and, when given, the agent that runs it.
     Changing the model keeps the effort if the new model supports it. Model names are not translated; everything around them is.
     models: id, label, description?, provider?, tier? (flagship | balanced | fast), efforts? (lowest first), contextWindow?, price? ['input' => 5, 'output' => 25] per million tokens, disabled?
     value: the starting ['model' =>, 'effort' =>, 'agent' =>]. It is x-modelable (x-model / wire:model get that object). name adds hidden inputs name[model], name[effort], name[agent].
     agents: [['id' => 'review', 'label' => 'Code review', 'description' => '…']]; omit to hide the field. agent-required marks it required (an alert shows once the select is left empty).
     variant: cards (default) | compact (one row for a toolbar). currency: ISO 4217 code, default USD (SAR in Arabic). effort-labels names ids other than low / medium / high / max.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['models' => [], 'value' => [], 'agents' => [], 'agentRequired' => false, 'effortLabels' => [], 'variant' => 'cards', 'currency' => null, 'disabled' => false, 'name' => null])
@php
    use Illuminate\Support\HtmlString;
    use Nasaq\Nasaq;

    $models = array_values((array) $models);
    $agents = array_values((array) $agents);
    $currency ??= Nasaq::currency();
    $first = $value['model'] ?? ($models[0]['id'] ?? null);
    $current = collect($models)->firstWhere('id', $first);
    $efforts = $current['efforts'] ?? [];
    $effort = $value['effort'] ?? null;
    $effort = ! $efforts ? null : (in_array($effort, $efforts, true) ? $effort : (in_array('medium', $efforts, true) ? 'medium' : $efforts[0]));
    $agent = $value['agent'] ?? null;
    $names = array_merge([
        'low' => Nasaq::t('Low', 'منخفض'),
        'medium' => Nasaq::t('Medium', 'متوسط'),
        'high' => Nasaq::t('High', 'مرتفع'),
        'max' => Nasaq::t('Max', 'أقصى'),
    ], (array) $effortLabels);
    $tiers = ['flagship' => Nasaq::t('Most capable', 'الأقوى'), 'balanced' => Nasaq::t('Balanced', 'متوازن'), 'fast' => Nasaq::t('Fastest', 'الأسرع')];
    $money = fn ($n) => preg_replace('/[.,٫]00(?=\D*$)/u', '', Nasaq::money($n, $currency));
    $compact = function ($n) {
        if ($n >= 1000000) {
            return rtrim(rtrim(number_format($n / 1000000, 1, '.', ''), '0'), '.').Nasaq::t('M', ' مليون');
        }

        return $n >= 1000 ? rtrim(rtrim(number_format($n / 1000, 1, '.', ''), '0'), '.').Nasaq::t('K', ' ألف') : (string) $n;
    };
    $config = [
        'models' => array_map(fn ($m) => ['id' => $m['id'], 'efforts' => array_values($m['efforts'] ?? [])], $models),
        'value' => ['model' => $first, 'effort' => $effort, 'agent' => $agent],
        'agentRequired' => (bool) $agentRequired,
        'effortNames' => $names,
        'agents' => collect($agents)->mapWithKeys(fn ($a) => [$a['id'] => $a['description'] ?? ''])->all(),
    ];
    $agentLabel = Nasaq::t('Agent', 'الوكيل');
    $agentMissing = Nasaq::t('Choose the agent that will run this.', 'اختر الوكيل الذي سينفّذ هذا.');
    $agentPlaceholder = Nasaq::t('Choose an agent', 'اختر وكيلًا');
    $effortTitle = Nasaq::t('Reasoning effort', 'جهد التفكير');
    $toggleClass = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
    $trackClass = 'flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5';
@endphp
<div data-slot="ai-model-picker" data-variant="{{ $variant }}" x-data="nqAiModelPicker(@js($config))" x-modelable="sel" x-id="['nq-ai-model']"
    x-on:click.capture="if ($event.target.closest('[data-slot=ai-agent-select]')) started = true"
    x-on:pointerdown.document="if (started && ! $el.contains($event.target) && ! $event.target.closest('[data-slot=select-content]')) touched = true"
    {{ $attributes->cn($variant === 'compact' ? 'flex flex-wrap items-center gap-2' : 'flex flex-col gap-5') }}>
    @if ($variant === 'compact')
        <x-nq::ai-model-picker.select :models="$models" :value="$first" :disabled="$disabled" x-model="sel.model" class="h-control-sm w-auto min-w-40" />
        <div role="group" aria-label="{{ $effortTitle }}" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" x-show="efforts().length" @unless ($efforts) style="display: none" @endunless
            @if ($disabled) data-disabled @endif class="{{ $trackClass }}">
            <template x-for="e in efforts()" :key="e">
                <button type="button" data-slot="toggle" x-bind="effortToggle(e)" @if ($disabled) disabled data-disabled @endif class="{{ $toggleClass }}"></button>
            </template>
        </div>
        @if ($agents)
            <div data-slot="field" class="flex w-auto min-w-40 flex-col gap-1.5" x-bind:data-invalid="agentInvalid() ? '' : undefined">
                <x-nq::select :value="$agent" x-model="sel.agent">
                    <x-nq::select.trigger data-slot="ai-agent-select" aria-label="{{ $agentLabel }}" class="h-control-sm" x-bind:data-invalid="agentInvalid() ? '' : undefined">
                        <x-nq::select.value :placeholder="$agentPlaceholder" />
                    </x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($agents as $a)
                            <x-nq::select.item :value="$a['id']">{{ $a['label'] }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <span role="alert" x-show="agentInvalid()" style="display: none" class="inline-flex items-center gap-1 text-caption text-nq-danger-text"><x-lucide-triangle-alert aria-hidden="true" class="size-3.5" />{{ $agentMissing }}</span>
            </div>
        @endif
    @else
        <x-nq::radio-group :default-value="$first" aria-label="{{ Nasaq::t('Models', 'النماذج') }}" x-model="sel.model" class="grid gap-2 sm:grid-cols-2">
            @foreach ($models as $m)
                @php
                    $extra = collect([
                        ! empty($m['provider']) ? '<bdi dir="ltr">'.e($m['provider']).'</bdi>' : null,
                        ! empty($m['contextWindow']) ? '<span>'.e(Nasaq::t($compact($m['contextWindow']).' context', 'سياق '.$compact($m['contextWindow']))).'</span>' : null,
                        ! empty($m['price']) ? '<span>'.e(Nasaq::t($money($m['price']['input']).' in, '.$money($m['price']['output']).' out per 1M tokens', $money($m['price']['input']).' للإدخال، '.$money($m['price']['output']).' للإخراج لكل مليون رمز')).'</span>' : null,
                    ])->filter()->implode('');
                    $desc = new HtmlString(
                        '<span class="flex flex-col gap-1">'
                        .(! empty($m['description']) ? '<span>'.e($m['description']).'</span>' : '')
                        .($extra ? '<span class="flex flex-wrap gap-x-3 text-caption text-muted-foreground">'.$extra.'</span>' : '')
                        .'</span>'
                    );
                @endphp
                <x-nq::radio-group.card :value="$m['id']" :description="$desc" x-bind:disabled="{{ ($disabled || ! empty($m['disabled'])) ? 'true' : 'false' }}" :data-disabled="($disabled || ! empty($m['disabled'])) ? '' : null">
                    <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <bdi dir="ltr">{{ $m['label'] }}</bdi>
                        @if (! empty($m['tier']))
                            <x-nq::badge :variant="$m['tier'] === 'flagship' ? 'accent' : 'neutral'">{{ $tiers[$m['tier']] ?? $m['tier'] }}</x-nq::badge>
                        @endif
                    </span>
                </x-nq::radio-group.card>
            @endforeach
        </x-nq::radio-group>
        <div class="flex flex-col gap-1.5" x-show="efforts().length" @unless ($efforts) style="display: none" @endunless>
            <span class="text-label text-foreground">{{ $effortTitle }}</span>
            <div role="group" aria-label="{{ $effortTitle }}" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal"
                @if ($disabled) data-disabled @endif class="{{ $trackClass }}">
                <template x-for="e in efforts()" :key="e">
                    <button type="button" data-slot="toggle" x-bind="effortToggle(e)" @if ($disabled) disabled data-disabled @endif class="{{ $toggleClass }}"></button>
                </template>
            </div>
            <span class="text-caption text-muted-foreground">{{ Nasaq::t('Higher effort thinks longer and costs more.', 'الجهد الأعلى يفكّر أطول ويكلّف أكثر.') }}</span>
        </div>
        @if ($agents)
            <div data-slot="field" class="flex flex-col gap-1.5" x-bind:data-invalid="agentInvalid() ? '' : undefined">
                <label data-slot="field-label" x-bind:for="$id('nq-ai-model', 'agent')" class="text-label text-foreground">{{ $agentLabel }}@if ($agentRequired)<span class="ms-1.5 text-caption text-muted-foreground">({{ Nasaq::t('Required', 'مطلوب') }})</span>@endif</label>
                <x-nq::select :value="$agent" x-model="sel.agent">
                    <x-nq::select.trigger data-slot="ai-agent-select" aria-label="{{ $agentLabel }}" x-bind:id="$id('nq-ai-model', 'agent')" x-bind:data-invalid="agentInvalid() ? '' : undefined">
                        <x-nq::select.value :placeholder="$agentPlaceholder" />
                    </x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($agents as $a)
                            <x-nq::select.item :value="$a['id']">{{ $a['label'] }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <span role="alert" x-show="agentInvalid()" style="display: none" class="inline-flex items-center gap-1 text-caption text-nq-danger-text"><x-lucide-triangle-alert aria-hidden="true" class="size-3.5" />{{ $agentMissing }}</span>
                <span x-show="! agentInvalid()" class="text-caption text-muted-foreground" x-text="agentDescription()"></span>
            </div>
        @endif
    @endif
    @if ($name)
        <input type="hidden" name="{{ $name }}[model]" x-bind:value="sel.model ?? ''" value="{{ $first }}">
        <input type="hidden" name="{{ $name }}[effort]" x-bind:value="sel.effort ?? ''" x-bind:disabled="! sel.effort" value="{{ $effort }}" @unless ($effort) disabled @endunless>
        <input type="hidden" name="{{ $name }}[agent]" x-bind:value="sel.agent ?? ''" x-bind:disabled="! sel.agent" value="{{ $agent }}" @unless ($agent) disabled @endunless>
    @endif
</div>
