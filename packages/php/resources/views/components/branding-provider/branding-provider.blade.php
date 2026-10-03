{{-- <x-nq::branding-provider brand="#0A7C66" name="Acme Clinic" :logo-url="$org->logo_url"> ... </x-nq::branding-provider>
     Applies a tenant's brand colours at runtime (an org's settings, a white-label customer) over the configured brand, with readable on-brand text and a derived dark step.
     brand, brand-dark, action, action-dark, accent: "#RRGGBB" or "#RGB"; invalid values are skipped. logo-url, name: shared with everything inside through the Alpine scope
     (logoUrl, name, brand...), a blank logo-url becomes null. target: a CSS selector to scope the colours to one element instead of <html> (needs the Alpine runtime).
     Without a target the variables are also printed in a <style> on :root, so there is no flash before Alpine starts. Renders a `contents` wrapper, not a box. --}}
@props(['brand' => null, 'brandDark' => null, 'action' => null, 'actionDark' => null, 'accent' => null, 'logoUrl' => null, 'name' => null, 'target' => null])
@php
    $norm = function ($v) {
        $v = is_string($v) ? trim($v) : '';
        $v = str_starts_with($v, '#') ? $v : '#'.$v;
        if (! preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i', $v)) {
            return null;
        }
        $d = strtoupper(substr($v, 1));

        return '#'.(strlen($d) === 3 ? $d[0].$d[0].$d[1].$d[1].$d[2].$d[2] : $d);
    };
    $lum = function (string $hex): float {
        $ch = function (int $i) use ($hex): float {
            $c = hexdec(substr($hex, $i, 2)) / 255;

            return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * $ch(1) + 0.7152 * $ch(3) + 0.0722 * $ch(5);
    };
    $contrast = function (string $a, string $b) use ($lum): float {
        [$x, $y] = [$lum($a), $lum($b)];

        return (max($x, $y) + 0.05) / (min($x, $y) + 0.05);
    };
    $readable = fn (string $bg): string => $contrast($bg, '#0E1A3C') >= $contrast($bg, '#F0EBE1') ? '#0E1A3C' : '#F0EBE1';
    $round = fn (float $v): int => (int) floor($v + 0.5);
    $dark = function (string $hex) use ($round): string {
        [$r, $g, $b] = [hexdec(substr($hex, 1, 2)) / 255, hexdec(substr($hex, 3, 2)) / 255, hexdec(substr($hex, 5, 2)) / 255];
        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $l = ($max + $min) / 2;
        if ($max == $min) {
            $h = 0;
            $s = 0;
        } else {
            $d = $max - $min;
            $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);
            if ($max == $r) {
                $h = ($g - $b) / $d + ($g < $b ? 6 : 0);
            } elseif ($max == $g) {
                $h = ($b - $r) / $d + 2;
            } else {
                $h = ($r - $g) / $d + 4;
            }
            $h *= 60;
        }
        $h = $round($h);
        $sat = min($round($s * 100), 70) / 100;
        $lig = max($round($l * 100), 62) / 100;
        $a = $sat * min($lig, 1 - $lig);
        $f = function (int $n) use ($h, $lig, $a, $round): string {
            $k = fmod($n + $h / 30, 12);
            $c = $lig - $a * max(-1, min($k - 3, 9 - $k, 1));

            return str_pad(dechex($round($c * 255)), 2, '0', STR_PAD_LEFT);
        };

        return strtoupper('#'.$f(0).$f(8).$f(4));
    };
    $b = $norm($brand);
    $bd = $norm($brandDark) ?? ($b ? $dark($b) : null);
    $a = $norm($action) ?? $b;
    $ad = $norm($actionDark) ?? $bd;
    $vars = array_filter([
        '--nq-brand-l' => $b,
        '--nq-brand-d' => $bd,
        '--nq-action-l' => $a,
        '--nq-action-d' => $ad,
        '--nq-on-action-l' => $a ? $readable($a) : null,
        '--nq-on-action-d' => $ad ? $readable($ad) : null,
        '--nq-accent-brand' => $norm($accent),
    ]);
    $info = [
        'brand' => $brand, 'brandDark' => $brandDark, 'action' => $action, 'actionDark' => $actionDark, 'accent' => $accent,
        'logoUrl' => is_string($logoUrl) && trim($logoUrl) !== '' ? $logoUrl : null, 'name' => $name,
    ];
@endphp
@if (! $target && $vars)
    <style data-slot="branding-provider-style">:root{ {{ collect($vars)->map(fn ($v, $k) => $k.':'.$v)->implode(';') }} }</style>
@endif
<div data-slot="{{ $attributes->get('data-slot', 'branding-provider') }}" x-data="nqBrandingProvider({!! \Illuminate\Support\Js::from($info) !!}, {!! \Illuminate\Support\Js::from($target) !!})"
    {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
</div>
