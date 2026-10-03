{{-- <x-nq::icon-picker.by-name :name="$icon" class="size-6" />   <x-nq::icon-picker.by-name name="bx:home" />   <x-nq::icon-picker.by-name :name="$maybe">fallback</x-nq::icon-picker.by-name>
     name: a lucide name (users, Users, lucide:users), a Boxicons name (bx:home, bxs:star, bxl:github, or the legacy bx-home; needs the Boxicons CSS on the page)
     or an image URL (https://…, /…, data:image/…). Unknown or empty names render the slot. icons: [['name' => 'users'], …] (default: the picker catalog). size: pixels. --}}
@props(['name' => null, 'icons' => null, 'size' => null])
@php
    $raw = is_string($name) ? trim($name) : '';
    $isUrl = $raw !== '' && preg_match('#^(https?://|/|data:image/)#', $raw) === 1;
    $bx = $raw !== '' && preg_match('/^(bx|bxs|bxl)[:-]([a-z0-9-]+)$/i', $raw, $m) === 1 ? strtolower($m[1]).'-'.strtolower($m[2]) : null;
    $key = null;
    if ($raw !== '' && ! $isUrl && ! $bx) {
        $bare = preg_replace('/^lucide:/', '', $raw);
        $key = preg_match('/[A-Z]/', $bare) === 1 ? \Illuminate\Support\Str::kebab($bare) : $bare;
        $names = $icons !== null
            ? array_map(fn ($r) => is_array($r) ? ($r['name'] ?? $r[0] ?? '') : (string) $r, $icons)
            : array_column(require app('view')->getFinder()->find('nasaq::components.icon-picker.catalog'), 0);
        if (! in_array($key, $names, true)) {
            $key = null;
        }
    }
    $plain = $attributes;
    $attributes = $attributes->merge($size ? ["width" => $size, "height" => $size] : []);
@endphp
@if ($isUrl)
<img src="{{ $raw }}" alt="" aria-hidden="true" data-slot="icon-image" @if ($size) width="{{ $size }}" height="{{ $size }}" @endif {{ $plain->cn(['inline-block shrink-0 object-contain', $size ? '' : 'size-4']) }}>
@elseif ($bx)
<i aria-hidden="true" data-slot="icon-boxicon" style="font-size: {{ $size ? $size.'px' : '1em' }}; line-height: 1" {{ $plain->cn('bx inline-block shrink-0 not-italic '.$bx) }}></i>
@elseif ($key)
<x-nq::icon :name="$key" aria-hidden="true" {{ $attributes }} />
@else
{{ $slot }}
@endif
