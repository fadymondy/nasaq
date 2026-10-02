{{-- <x-nq::keyboard-shortcuts.keys shortcut="Mod+Shift+K" />   <x-nq::keyboard-shortcuts.keys shortcut="G I" platform="mac" />
     A shortcut as key caps, drawn for the platform: ⌘ ⇧ K on a Mac, Ctrl Shift K elsewhere. Always left to right, one role="img" with a spoken name.
     shortcut: "Mod+Shift+K" or "G I" (a sequence). platform: auto (default: the reader's device, decided in the browser) | mac | windows.
     then-label: the word between the steps of a sequence (then / ثم). inherit: used inside <x-nq::keyboard-shortcuts>, which owns the platform.
     Needs the Alpine runtime for platform auto (@nasaqScripts); without it the Windows keys show. --}}
@props(['shortcut' => '', 'platform' => 'auto', 'thenLabel' => null, 'inherit' => false])
@php
    $then = $thenLabel ?? \Nasaq\Nasaq::t('then', 'ثم');
    $modifiers = ['mod' => 'mod', 'cmdorctrl' => 'mod', 'commandorcontrol' => 'mod', 'ctrl' => 'ctrl', 'control' => 'ctrl', 'meta' => 'meta', 'cmd' => 'meta', 'command' => 'meta', 'win' => 'meta', 'super' => 'meta', 'alt' => 'alt', 'option' => 'alt', 'opt' => 'alt', 'shift' => 'shift'];
    $aliases = ['esc' => 'Escape', 'escape' => 'Escape', 'return' => 'Enter', 'enter' => 'Enter', 'space' => 'Space', 'spacebar' => 'Space', 'tab' => 'Tab', 'backspace' => 'Backspace', 'del' => 'Delete', 'delete' => 'Delete', 'up' => 'ArrowUp', 'down' => 'ArrowDown', 'left' => 'ArrowLeft', 'right' => 'ArrowRight', 'arrowup' => 'ArrowUp', 'arrowdown' => 'ArrowDown', 'arrowleft' => 'ArrowLeft', 'arrowright' => 'ArrowRight', 'home' => 'Home', 'end' => 'End', 'pageup' => 'PageUp', 'pagedown' => 'PageDown', 'insert' => 'Insert', 'plus' => 'Plus'];
    $normalize = function (string $raw) use ($aliases): string {
        if ($raw === ' ') {
            return 'Space';
        }
        if ($raw === '+') {
            return 'Plus';
        }
        $text = trim($raw);
        if ($text === '') {
            return '';
        }
        if (isset($aliases[strtolower($text)])) {
            return $aliases[strtolower($text)];
        }
        if (preg_match('/^f([1-9]|1\d|2[0-4])$/i', $text)) {
            return strtoupper($text);
        }

        return mb_strlen($text) === 1 ? mb_strtoupper($text) : '';
    };
    // "Mod+Shift+K" or "G I" into steps; null when it is not a usable shortcut (at most three steps).
    $parse = function (string $input) use ($modifiers, $normalize): ?array {
        if (trim($input) === '') {
            return null;
        }
        $steps = [];
        foreach (preg_split('/\s+/', trim($input)) as $token) {
            $step = ['mod' => false, 'ctrl' => false, 'meta' => false, 'alt' => false, 'shift' => false, 'key' => ''];
            foreach ($token === '+' ? ['+'] : explode('+', $token) as $part) {
                $modifier = $modifiers[strtolower($part)] ?? null;
                if ($modifier) {
                    if ($step[$modifier]) {
                        return null;
                    }
                    $step[$modifier] = true;
                } else {
                    if ($step['key'] !== '') {
                        return null;
                    }
                    $step['key'] = $normalize($part);
                    if ($step['key'] === '') {
                        return null;
                    }
                }
            }
            if ($step['key'] === '') {
                return null;
            }
            $steps[] = $step;
        }

        return $steps && count($steps) <= 3 ? $steps : null;
    };
    $keyCap = function (string $key, bool $apple): string {
        return match ($key) {
            'ArrowUp' => '↑', 'ArrowDown' => '↓', 'ArrowLeft' => '←', 'ArrowRight' => '→',
            'Enter' => $apple ? '↵' : 'Enter',
            'Escape' => 'Esc',
            'Backspace' => $apple ? '⌫' : 'Backspace',
            'Delete' => $apple ? '⌦' : 'Del',
            'Plus' => '+',
            'Tab' => $apple ? '⇥' : 'Tab',
            default => $key,
        };
    };
    $caps = function (array $step, bool $apple) use ($keyCap): array {
        $out = [];
        if ($step['ctrl']) { $out[] = $apple ? '⌃' : 'Ctrl'; }
        if ($step['alt']) { $out[] = $apple ? '⌥' : 'Alt'; }
        if ($step['shift']) { $out[] = $apple ? '⇧' : 'Shift'; }
        if ($step['mod']) { $out[] = $apple ? '⌘' : 'Ctrl'; }
        if ($step['meta']) { $out[] = $apple ? '⌘' : 'Win'; }
        $out[] = $keyCap($step['key'], $apple);

        return $out;
    };
    $spokenCap = ['⌘' => 'Command', '⌃' => 'Control', '⌥' => 'Option', '⇧' => 'Shift', '↑' => 'Up arrow', '↓' => 'Down arrow', '←' => 'Left arrow', '→' => 'Right arrow', '↵' => 'Return', '⌫' => 'Delete', '⌦' => 'Forward delete', '⇥' => 'Tab', '/' => 'slash', '?' => 'question mark', ',' => 'comma', '.' => 'period', '+' => 'plus', '-' => 'minus', '=' => 'equals', '\\' => 'backslash', '[' => 'left bracket', ']' => 'right bracket'];
    $steps = $parse((string) $shortcut);
    $variants = [];
    if ($steps) {
        foreach (($platform === 'mac' ? [true] : ($platform === 'windows' ? [false] : [false, true])) as $apple) {
            $bySteps = array_map(fn ($s) => $caps($s, $apple), $steps);
            $spoken = implode(' '.$then.' ', array_map(fn ($c) => implode(' ', array_map(fn ($k) => $spokenCap[$k] ?? $k, $c)), $bySteps));
            $variants[] = ['apple' => $apple, 'steps' => $bySteps, 'spoken' => $spoken];
        }
    }
    $both = $platform !== 'mac' && $platform !== 'windows';
    $own = $both && ! $inherit;
@endphp
@if (! $steps)
    <span dir="ltr">{{ $shortcut }}</span>
@else
    @if ($own)<span class="contents" x-data="nqShortcutKeys('auto')">@endif
    @foreach ($variants as $variant)
        <span data-slot="{{ $attributes->get('data-slot', 'shortcut-keys') }}" dir="ltr" role="img" aria-label="{{ $variant['spoken'] }}"
            @if ($both) x-show="{{ $variant['apple'] ? 'apple' : '! apple' }}" @if ($variant['apple']) style="display: none;" @endif @endif
            {{ $attributes->except('data-slot')->cn('inline-flex flex-wrap items-center gap-x-1.5 gap-y-1') }}>
            @foreach ($variant['steps'] as $i => $stepCaps)
                @if ($i > 0)<span aria-hidden="true" class="text-caption text-muted-foreground">{{ $then }}</span>@endif
                <span aria-hidden="true" class="inline-flex items-center gap-0.5">
                    @foreach ($stepCaps as $cap)<x-nq::text.kbd>{{ $cap }}</x-nq::text.kbd>@endforeach
                </span>
            @endforeach
        </span>
    @endforeach
    @if ($own)</span>@endif
@endif
