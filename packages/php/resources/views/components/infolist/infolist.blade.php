{{-- <x-nq::infolist :columns="2" :items="[['id' => 'name', 'label' => 'Name', 'labelAr' => 'الاسم', 'value' => 'Acme Trading'], ['id' => 'status', 'label' => 'Status', 'type' => 'enum', 'value' => 'active', 'options' => ['active' => ['label' => 'Active', 'labelAr' => 'نشط', 'variant' => 'success']]]]" />
     A read-only description list: label and value pairs for a record's detail page. Booleans and enums become badges, emails and links are
     clickable, codes and ids can be copied, missing values say so, and sections group the rows.
     items: flat rows. sections: groups of [id, title, titleAr, description, descriptionAr, items]. An item is [id, label, labelAr, value, type,
     options, copyable, unit, wide, html, hint, hintAr]. type: text | number | date | datetime | boolean | enum | email | url | tel | code | list.
     options (enum and list) is keyed by the stored value: [label, labelAr, variant, icon] where icon is a lucide name ('check'). html replaces the
     rendering of the value (trusted markup). columns: 1 | 2 (default) | 3 from the sm breakpoint. layout: stacked (default) | inline.
     show-empty (true) shows "Not set" for missing values; false hides the row. label names the list. labels: ['empty', 'yes', 'no', 'copy'].
     Copy buttons need the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'sections' => null, 'columns' => 2, 'layout' => 'stacked', 'showEmpty' => true, 'label' => null, 'locale' => null, 'labels' => []])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $words = [
        'en' => ['empty' => 'Not set', 'yes' => 'Yes', 'no' => 'No', 'copy' => 'Copy'],
        'ar' => ['empty' => 'غير محدد', 'yes' => 'نعم', 'no' => 'لا', 'copy' => 'نسخ'],
    ];
    $t = array_merge($words[$ar ? 'ar' : 'en'], $labels);
    $groups = $sections !== null ? array_values($sections) : [['id' => '_', 'items' => $items]];
    $pick = fn (array $row, string $key) => $ar ? (($row[$key.'Ar'] ?? null) ?: ($row[$key] ?? null)) : ($row[$key] ?? null);
    $isBlank = fn ($v) => $v === null || $v === '' || (is_array($v) && count($v) === 0);
    $grid = (int) $columns === 3 ? 'sm:grid-cols-3' : ((int) $columns === 2 ? 'sm:grid-cols-2' : '');
    $span = (int) $columns === 3 ? 'sm:col-span-3' : ((int) $columns === 2 ? 'sm:col-span-2' : '');
    $optLabel = fn (array $item, string $key) => isset($item['options'][$key]) ? $pick($item['options'][$key], 'label') : $key;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'infolist') }}" role="group" @if ($label) aria-label="{{ $label }}" @endif {{ $attributes->except('data-slot')->cn('flex flex-col gap-8') }}>
    @foreach ($groups as $group)
        @php
            $title = $pick($group, 'title');
            $description = $pick($group, 'description');
        @endphp
        <section @if ($title) aria-label="{{ $title }}" @endif class="flex flex-col gap-4">
            @if ($title || $description)
                <header class="flex flex-col gap-0.5 border-b border-border pb-2">
                    @if ($title)<h3 class="text-h4 font-semibold text-foreground">{{ $title }}</h3>@endif
                    @if ($description)<p class="text-caption text-muted-foreground">{{ $description }}</p>@endif
                </header>
            @endif
            <dl class="{{ \Nasaq\Cn::merge('grid grid-cols-1 gap-x-8 gap-y-4', $grid) }}">
                @foreach ($group['items'] as $item)
                    @php
                        $skip = ! $showEmpty && $isBlank($item['value'] ?? null);
                    @endphp
                    @continue($skip)
                    @php
                        $value = $item['value'] ?? null;
                        $type = $item['type'] ?? 'text';
                        $blank = $isBlank($value) && ! ($type === 'boolean' && $value === false);
                        $copy = ! empty($item['copyable']) && ! $isBlank($value) ? (is_array($value) ? implode(', ', $value) : (string) $value) : null;
                        $hint = $pick($item, 'hint');
                        $inline = $layout === 'inline';
                        $enumKey = is_scalar($value) ? (string) (is_bool($value) ? (int) $value : $value) : '';
                        $enumOpt = $item['options'][$enumKey] ?? null;
                    @endphp
                    <div data-slot="infolist-item" class="{{ \Nasaq\Cn::merge('min-w-0', $inline ? 'flex items-baseline justify-between gap-4 border-b border-border pb-3' : 'flex flex-col gap-1', ! empty($item['wide']) ? $span : '') }}">
                        <dt class="{{ \Nasaq\Cn::merge('text-caption text-muted-foreground', $inline ? 'shrink-0' : '') }}">
                            <bdi dir="auto">{{ $pick($item, 'label') }}</bdi>
                        </dt>
                        <dd class="{{ \Nasaq\Cn::merge('m-0 flex min-w-0 items-center gap-1.5 text-body text-foreground', $inline ? 'justify-end text-end' : '') }}">
                            @if ($blank)
                                <span class="inline-flex items-center gap-1 text-muted-foreground">
                                    <x-lucide-minus aria-hidden="true" class="size-3.5" />
                                    {{ $t['empty'] }}
                                </span>
                            @elseif (isset($item['html']))
                                {!! $item['html'] !!}
                            @elseif ($type === 'boolean')
                                @if ($value)
                                    <x-nq::badge variant="success"><x-lucide-check aria-hidden="true" />{{ $t['yes'] }}</x-nq::badge>
                                @else
                                    <x-nq::badge variant="neutral"><x-lucide-x aria-hidden="true" />{{ $t['no'] }}</x-nq::badge>
                                @endif
                            @elseif ($type === 'enum')
                                <x-nq::badge :variant="$enumOpt['variant'] ?? 'neutral'">
                                    @if (! empty($enumOpt['icon']))<x-dynamic-component :component="'lucide-'.$enumOpt['icon']" aria-hidden="true" />@endif
                                    <bdi dir="auto">{{ $optLabel($item, $enumKey) }}</bdi>
                                </x-nq::badge>
                            @elseif ($type === 'number')
                                <span class="inline-flex items-baseline gap-1">
                                    <x-nq::numeric :value="(float) $value" :locale="$locale" />
                                    @if (! empty($item['unit']))<bdi dir="auto" class="text-muted-foreground">{{ $item['unit'] }}</bdi>@endif
                                </span>
                            @elseif ($type === 'date')
                                <x-nq::numeric.date-time :value="$value" :locale="$locale" />
                            @elseif ($type === 'datetime')
                                <x-nq::numeric.date-time :value="$value" relative :locale="$locale" />
                            @elseif ($type === 'email')
                                <a href="mailto:{{ $value }}" dir="ltr" class="break-all text-foreground underline underline-offset-2">{{ $value }}</a>
                            @elseif ($type === 'tel')
                                <a href="tel:{{ preg_replace('/\s+/', '', (string) $value) }}" dir="ltr" class="text-foreground underline underline-offset-2">{{ $value }}</a>
                            @elseif ($type === 'url')
                                @if (preg_match('#^https?://#i', (string) $value))
                                    <a href="{{ $value }}" target="_blank" rel="noreferrer noopener" dir="ltr" class="break-all text-foreground underline underline-offset-2">{{ $value }}</a>
                                @else
                                    <span dir="ltr" class="break-all">{{ $value }}</span>
                                @endif
                            @elseif ($type === 'code')
                                <code dir="ltr" class="rounded-control bg-muted px-1.5 py-0.5 font-mono text-caption break-all">{{ $value }}</code>
                            @elseif ($type === 'list')
                                <span class="flex flex-wrap gap-1">
                                    @foreach ((array) $value as $entry)
                                        <x-nq::badge :variant="$item['options'][(string) $entry]['variant'] ?? 'outline'">
                                            <bdi dir="auto">{{ $optLabel($item, (string) $entry) }}</bdi>
                                        </x-nq::badge>
                                    @endforeach
                                </span>
                            @else
                                <bdi dir="auto" class="whitespace-pre-line">{{ $value }}</bdi>
                            @endif
                            @if ($copy !== null)
                                <x-nq::copy-button :value="$copy" :label="$t['copy']" size="icon-sm" />
                            @endif
                        </dd>
                        @if ($hint)<p class="text-caption text-muted-foreground">{{ $hint }}</p>@endif
                    </div>
                @endforeach
            </dl>
        </section>
    @endforeach
</div>
