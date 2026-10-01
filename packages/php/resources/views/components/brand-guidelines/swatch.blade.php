{{-- <x-nq::brand-guidelines.swatch :color="['id' => 'accent', 'value' => '#C9A227']" />
     One colour: the fill, its name and role, and its value with a button that copies it exactly.
     color: ['id', 'value', 'name'?, 'usage'?, 'onColor'?]. The name falls back to the built-in name for a known id. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['color'])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $names = [
        'brand-light' => $t('Brand, light', 'لون العلامة، فاتح'),
        'brand-dark' => $t('Brand, dark', 'لون العلامة، داكن'),
        'action-light' => $t('Action, light', 'لون الإجراء، فاتح'),
        'action-dark' => $t('Action, dark', 'لون الإجراء، داكن'),
        'accent' => $t('Accent', 'اللون المميّز'),
    ];
    $value = trim((string) $color['value']);
    $name = $color['name'] ?? ($names[$color['id']] ?? $color['id']);
    $copy = str_replace('{value}', $value, $t('Copy {value}', 'نسخ {value}'));
    $copied = str_replace('{value}', $value, $t('Copied {value}', 'تم نسخ {value}'));
    $on = $color['onColor'] ?? null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'brand-swatch') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card') }}>
    <div class="flex h-20 items-end justify-between p-3" style="background-color: {{ $color['value'] }}">
        @if ($on)<span class="text-h3" style="color: {{ $on }}">{{ $t('Aa', 'أبج') }}</span>@endif
    </div>
    <div class="flex items-center justify-between gap-2 p-3">
        <div class="flex min-w-0 flex-col">
            <span class="truncate text-label text-foreground">{{ $name }}</span>
            <bdi dir="ltr" class="font-mono text-caption uppercase text-muted-foreground">{{ $value }}</bdi>
            @if (! empty($color['usage']))<span class="mt-1 text-caption text-muted-foreground">{{ $color['usage'] }}</span>@endif
        </div>
        <x-nq::copy-button :value="$value" :label="$copy" :copied-label="$copied" size="icon-sm" />
    </div>
</div>
