{{-- <x-nq::markdown-extras.frontmatter :data="['title' => 'Plan', 'tags' => ['a', 'b'], 'draft' => false]" />
     The frontmatter of a document as a two-column table: label, then the value (tags as badges, ISO dates formatted, links clickable).
     data: pairs [[key, value], ...] in display order, or a plain array key => value. Values are text, numbers, booleans or lists.
     title: heading above the table ("Properties" / "الخصائص"). labels: yes, no, properties overrides. Renders nothing for empty data. --}}
@props(['data' => [], 'title' => null, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $L = array_merge(['properties' => $t('Properties', 'الخصائص'), 'yes' => $t('Yes', 'نعم'), 'no' => $t('No', 'لا')], (array) $labels);
    $pairs = [];
    foreach ($data as $k => $v) {
        $pairs[] = is_int($k) && is_array($v) && count($v) === 2 && array_key_exists(0, $v) && is_string($v[0]) ? [$v[0], $v[1]] : [(string) $k, $v];
    }
    $label = fn (string $key) => (function () use ($key) {
        $words = mb_strtolower(trim(preg_replace('/[_-]+/', ' ', preg_replace('/([a-z\d])([A-Z])/', '$1 $2', $key))));

        return mb_strtoupper(mb_substr($words, 0, 1)).mb_substr($words, 1);
    })();
    $iso = '/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/';
    $heading = $title ?? $L['properties'];
@endphp
@if ($pairs)
    <section data-slot="{{ $attributes->get('data-slot', 'frontmatter-table') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
        <p class="eyebrow">{{ $heading }}</p>
        <div class="overflow-hidden rounded-card border border-border">
            <x-nq::table :label="$heading">
                <x-nq::table.body>
                    @foreach ($pairs as [$key, $value])
                        <x-nq::table.row>
                            <x-nq::table.head scope="row" class="h-auto w-1/3 max-w-48 py-2 align-top whitespace-normal"><bdi>{{ $label($key) }}</bdi></x-nq::table.head>
                            <x-nq::table.cell class="h-auto py-2 whitespace-normal text-foreground">
                                @if (is_array($value))
                                    <span class="flex flex-wrap gap-1">@foreach ($value as $v)<x-nq::badge variant="outline"><bdi>{{ $v }}</bdi></x-nq::badge>@endforeach</span>
                                @elseif (is_bool($value))
                                    {{ $value ? $L['yes'] : $L['no'] }}
                                @elseif (is_int($value) || is_float($value))
                                    <bdi class="tabular-nums">{{ $value }}</bdi>
                                @elseif (preg_match($iso, (string) $value))
                                    <x-nq::numeric.date-time :value="$value" date-style="medium" />
                                @elseif (preg_match('/^https?:\/\/\S+$/i', (string) $value))
                                    <a href="{{ $value }}" target="_blank" rel="noopener noreferrer" dir="ltr" class="break-all rounded-[2px] underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $value }}</a>
                                @else
                                    <span dir="auto">{{ $value }}</span>
                                @endif
                            </x-nq::table.cell>
                        </x-nq::table.row>
                    @endforeach
                </x-nq::table.body>
            </x-nq::table>
        </div>
    </section>
@endif
