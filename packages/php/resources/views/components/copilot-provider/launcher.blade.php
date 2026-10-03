{{-- <x-nq::copilot-provider.launcher />   <x-nq::copilot-provider.launcher look="icon" :open-with="['message' => 'Summarise this order', 'autoSend' => true]" />
     A button that toggles the assistant of the nearest copilot provider, for a header or toolbar. Other attributes go to the button.
     look: header (default, an icon and a label for a top bar) | icon (a square icon button). shortcut: shown next to the label ("Ctrl+J"; false hides it). open-with: ['message', 'autoSend', 'context'], what
     opening does. labels: words (label, open, close). variant, size: as the button. Slot: the icon (default sparkles). Must be inside <x-nq::copilot-provider>. --}}
@props(['look' => 'header', 'shortcut' => null, 'openWith' => null, 'labels' => [], 'variant' => null, 'size' => null])
@php
    $en = ['label' => 'Ask AI', 'open' => 'Open assistant', 'close' => 'Close assistant'];
    $ar = ['label' => 'اسأل الذكاء الاصطناعي', 'open' => 'افتح المساعد', 'close' => 'أغلق المساعد'];
    $t = array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $labels);
    $header = $look === 'header';
    $keys = $shortcut === false ? null : ($shortcut ?? 'Ctrl+J');
    $variant ??= $header ? 'secondary' : 'ghost';
    $size ??= $header ? 'sm' : 'icon';
    $lit = function ($v) use (&$lit) {
        if (is_array($v)) {
            return array_is_list($v) ? '['.implode(', ', array_map($lit, $v)).']' : '{ '.implode(', ', array_map(fn ($k, $x) => $k.': '.$lit($x), array_keys($v), $v)).' }';
        }

        return is_bool($v) ? ($v ? 'true' : 'false') : (is_numeric($v) ? (string) $v : (is_null($v) ? 'null' : '`'.strtr((string) $v, ['\\' => '\\\\', '`' => '\\`', '${' => '\\${']).'`'));
    };
    $name = 'isOpen ? '.$lit($t['close']).' : '.$lit($t['open']);
    $title = $keys ? '('.$name.') + '.$lit(' ('.$keys.')') : $name;
    $with = $openWith ? $lit($openWith) : '{}';
    $label = $header ? null : $name;
@endphp
<x-nq::button data-slot="copilot-launcher" :variant="$variant" :size="$size" aria-expanded="false" x-bind:aria-expanded="isOpen ? `true` : `false`" x-bind:title="{{ $title }}"
    x-bind:aria-label="{{ $label ?? 'undefined' }}" x-on:click="launch({{ $with }})" {{ $attributes }}>
    @if (isset($icon) && $icon->isNotEmpty()){{ $icon }}@else<x-lucide-sparkles aria-hidden="true" />@endif
    @if ($header)
        <span>{{ $t['label'] }}</span>
        @if ($keys)<kbd dir="ltr" class="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">{{ $keys }}</kbd>@endif
    @endif
</x-nq::button>
