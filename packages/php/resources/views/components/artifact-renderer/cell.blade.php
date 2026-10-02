{{-- Internal: one value in a card field, list row or table cell: a dash for null, a locale number, Yes or No, or the text. --}}
@props(['value' => null, 'words', 'locale'])
@if ($value === null)<span class="text-muted-foreground">—</span>@elseif (is_int($value) || is_float($value))<x-nq::numeric :value="$value" :locale="$locale" />@elseif (is_bool($value))<span>{{ $value ? $words['yes'] : $words['no'] }}</span>@else{{ $value }}@endif
