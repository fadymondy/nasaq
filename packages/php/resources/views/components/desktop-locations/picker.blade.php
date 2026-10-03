{{-- <x-nq::desktop-locations.picker :locations="$locations" value="l1" requires="write" aria-label="Save to" />
     A select for choosing one of the locations, e.g. where to save or which folder to open. Broken, denied or permission-less ones are
     listed but disabled. value is x-modelable like <x-nq::select>: x-model / wire:model hold the chosen location id.
     requires: the permission a location needs (read, write, index; default read). name adds a hidden input for plain forms. --}}
@props(['locations' => [], 'value' => null, 'requires' => 'read', 'disabled' => false, 'placeholder' => null, 'ariaLabel' => null, 'name' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $locations = array_values(is_array($locations) ? $locations : (array) $locations);
    $usable = fn ($l) => in_array($l['status'] ?? 'ready', ['ready', 'indexing'], true) && ! empty($l['permissions'][$requires]);
    $base = function (string $path): string {
        $parts = array_values(array_filter(preg_split('/[\\\\\/]/', trim($path)), fn ($s) => $s !== ''));
        return $parts === [] ? trim($path) : end($parts);
    };
    $shorten = function (string $path, int $max = 40): string {
        $p = rtrim(trim($path), '\\/') ?: trim($path);
        if (mb_strlen($p) <= $max) return $p;
        $sep = preg_match('/^[a-zA-Z]:[\\\\\/]/', $p) || str_starts_with($p, '\\\\') ? '\\' : '/';
        $parts = preg_split('/[\\\\\/]/', $p);
        $parts = array_values(array_filter($parts, fn ($s, $i) => $s !== '' || $i === 0, ARRAY_FILTER_USE_BOTH));
        if (count($parts) <= 3) return '…'.mb_substr($p, -($max - 1));
        $head = $parts[0] === '' ? $sep.($parts[1] ?? '') : $parts[0];
        return $head.$sep.'…'.$sep.implode($sep, array_slice($parts, -2));
    };
    $any = collect($locations)->contains($usable);
    $placeholder ??= $t::t('Choose a location', 'اختر موقعًا');
@endphp
<div data-slot="desktop-location-picker" class="contents">
    <x-nq::select :value="$value" :name="$name" {{ $attributes->only(['x-model', 'wire:model']) }}>
        <x-nq::select.trigger aria-label="{{ $ariaLabel ?? $t::t('Choose a location', 'اختر موقعًا') }}" {{ $attributes->except(['x-model', 'wire:model']) }} :disabled="$disabled || ! $any">
            <x-nq::select.value :placeholder="$any ? $placeholder : $t::t('No usable locations', 'لا توجد مواقع صالحة')" />
        </x-nq::select.trigger>
        <x-nq::select.content>
            @foreach ($locations as $l)
                @php $nm = isset($l['label']) && trim($l['label']) !== '' ? trim($l['label']) : $base($l['path']); @endphp
                <x-nq::select.item :value="(string) $l['id']" :disabled="! $usable($l)">
                    <span class="flex min-w-0 flex-col">
                        <span class="truncate">
                            <bdi dir="auto">{{ $nm }}</bdi>
                            @unless ($usable($l))<span class="ms-2 text-caption text-muted-foreground">{{ $t::t('unavailable', 'غير متاح') }}</span>@endunless
                        </span>
                        <bdi dir="ltr" class="truncate font-mono text-caption text-muted-foreground">{{ $shorten($l['path']) }}</bdi>
                    </span>
                </x-nq::select.item>
            @endforeach
        </x-nq::select.content>
    </x-nq::select>
</div>
