{{-- <x-nq::hotkey-recorder value="Mod+K" require-modifier reset-to="Mod+K" label="Command palette" />
     Records a keyboard shortcut. Click it (or focus it and press Enter), then press the keys. It reads the physical key, so it works on an Arabic layout,
     refuses shortcuts the browser keeps, and warns when another action already uses the keys. Esc cancels, Backspace clears.
     value: "Mod+Shift+K" or "G I", or null. name: a hidden input carries the value. sequence: allow "G I" (keys add until Enter). require-modifier: refuse a bare key.
     allow-reserved: let people record Ctrl+W and friends. reset-to: shows a reset button when the value differs. platform: auto | mac | windows. label: the accessible name (what it does).
     bindings: other shortcuts as [['id' => 'save', 'shortcut' => 'Mod+S', 'label' => 'Save']] to warn about clashes; bindings-js: a JS expression returning that list live. binding-id: this one's id inside it.
     x-model works (x-modelable="value"); every change bubbles "nq-hotkey-change" ({ value }). Extra attributes (id) land on the button. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'name' => null, 'sequence' => false, 'requireModifier' => false, 'allowReserved' => false, 'resetTo' => null, 'platform' => 'auto', 'disabled' => false, 'label' => '', 'bindings' => null, 'bindingsJs' => null, 'bindingId' => null])
@php
    $strings = [
        'notSet' => \Nasaq\Nasaq::t('Not set', 'غير محدد'),
        'press' => \Nasaq\Nasaq::t('Press the keys', 'اضغط المفاتيح'),
        'pressSequence' => \Nasaq\Nasaq::t('Press the keys, then Enter', 'اضغط المفاتيح ثم Enter'),
        'escHint' => \Nasaq\Nasaq::t('Esc cancels', 'Esc للإلغاء'),
        'record' => \Nasaq\Nasaq::t('Record a shortcut', 'سجّل اختصارًا'),
        'change' => \Nasaq\Nasaq::t('Change shortcut', 'غيّر الاختصار'),
        'clear' => \Nasaq\Nasaq::t('Clear shortcut', 'امسح الاختصار'),
        'reset' => \Nasaq\Nasaq::t('Reset to default', 'إعادة إلى الافتراضي'),
        'saved' => \Nasaq\Nasaq::t('Shortcut set to {shortcut}', 'تم تعيين الاختصار إلى {shortcut}'),
        'cleared' => \Nasaq\Nasaq::t('Shortcut cleared', 'تم مسح الاختصار'),
        'recording' => \Nasaq\Nasaq::t('Recording. Press the shortcut you want.', 'جارٍ التسجيل. اضغط الاختصار الذي تريده.'),
        'duplicate' => \Nasaq\Nasaq::t('Already used by {label}.', 'مستخدم بالفعل في {label}.'),
        'shadows' => \Nasaq\Nasaq::t('Would block {label}, which starts the same way.', 'سيعطّل {label} لأنه يبدأ بالمفاتيح نفسها.'),
        'shadowed' => \Nasaq\Nasaq::t('Would never run: {label} uses the first keys.', 'لن يعمل أبدًا: {label} يستخدم المفاتيح الأولى.'),
        'browser' => \Nasaq\Nasaq::t('The browser keeps this shortcut. Choose another.', 'المتصفح يحتفظ بهذا الاختصار. اختر غيره.'),
        'system' => \Nasaq\Nasaq::t('The operating system keeps this shortcut. Choose another.', 'نظام التشغيل يحتفظ بهذا الاختصار. اختر غيره.'),
        'modifierRequired' => \Nasaq\Nasaq::t('Add Ctrl, Alt or Command: a bare key would fire while you type.', 'أضف Ctrl أو Alt أو Command: المفتاح وحده يعمل أثناء الكتابة.'),
        'invalid' => \Nasaq\Nasaq::t('That is not a usable shortcut.', 'هذا اختصار غير صالح.'),
        'sequenceNotAllowed' => \Nasaq\Nasaq::t('Use one key combination, not a sequence.', 'استخدم مجموعة مفاتيح واحدة وليس تسلسلًا.'),
        'tooLong' => \Nasaq\Nasaq::t('That sequence is too long.', 'التسلسل طويل جدًا.'),
        'empty' => \Nasaq\Nasaq::t('Press a key to record it.', 'اضغط مفتاحًا لتسجيله.'),
        'then' => \Nasaq\Nasaq::t('then', 'ثم'),
        'defaultIs' => \Nasaq\Nasaq::t('Default', 'الافتراضي'),
    ];
    $options = array_filter([
        'sequence' => $sequence ?: null,
        'requireModifier' => $requireModifier ?: null,
        'allowReserved' => $allowReserved ?: null,
        'resetTo' => $resetTo,
        'platform' => $platform !== 'auto' ? $platform : null,
        'disabled' => $disabled ?: null,
        'bindingId' => $bindingId,
        'bindings' => $bindings,
        'strings' => $strings,
    ], fn ($v) => $v !== null);
    $optionsJs = \Illuminate\Support\Js::from((object) $options)->toHtml();
    if ($bindingsJs) {
        $optionsJs = 'Object.assign('.$optionsJs.', { bindings: () => ('.$bindingsJs.') })';
    }
    $btn = 'flex min-h-control min-w-0 flex-1 items-center gap-2 rounded-control border bg-card px-3 text-start text-body text-foreground outline-none transition-colors duration-150 ease-nq focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50';
    $cap = 'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground';
@endphp
<div data-slot="hotkey-recorder" x-id="['nq-hotkey']" x-data="nqHotkeyRecorder(@js($value), {!! $optionsJs !!})" x-modelable="value" x-bind="rootAttrs"
    {{ $attributes->only(['class', 'x-model', 'x-on:nq-hotkey-change', '@nq-hotkey-change'])->cn('flex min-w-0 flex-col gap-1.5') }}>
    <div class="flex items-center gap-1.5">
        <button type="button" x-bind="button(@js($label))"
            {{ $attributes->except(['class', 'x-model', 'x-on:nq-hotkey-change', '@nq-hotkey-change'])->merge(['class' => $btn]) }}>
            <span aria-hidden="true" class="flex shrink-0 text-muted-foreground [&_svg]:size-4"><x-lucide-keyboard /></span>
            <span x-show="recording" x-cloak style="display: none" class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span x-show="steps.length > 0" x-cloak style="display: none" dir="ltr" class="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <template x-for="(caps, i) in capSteps(stepsShortcut())">
                        <span class="inline-flex items-center gap-1.5">
                            <span x-show="i > 0" aria-hidden="true" class="text-caption text-muted-foreground" x-text="t('then')"></span>
                            <span aria-hidden="true" class="inline-flex items-center gap-0.5">
                                <template x-for="cap in caps"><kbd data-slot="kbd" dir="ltr" class="{{ $cap }}" x-text="cap"></kbd></template>
                            </span>
                        </span>
                    </template>
                </span>
                <span class="text-body-sm text-muted-foreground">{{ $sequence ? $strings['pressSequence'] : $strings['press'] }}</span>
            </span>
            <span x-show="! recording && value" x-cloak @if (! $value) style="display: none" @endif role="img" :aria-label="spoken(value)" dir="ltr" data-slot="shortcut-keys" class="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <template x-for="(caps, i) in capSteps(value)">
                    <span class="inline-flex items-center gap-1.5">
                        <span x-show="i > 0" aria-hidden="true" class="text-caption text-muted-foreground" x-text="t('then')"></span>
                        <span aria-hidden="true" class="inline-flex items-center gap-0.5">
                            <template x-for="cap in caps"><kbd data-slot="kbd" dir="ltr" class="{{ $cap }}" x-text="cap"></kbd></template>
                        </span>
                    </span>
                </template>
            </span>
            <span x-show="! recording && ! value" x-cloak @if ($value) style="display: none" @endif class="text-muted-foreground">{{ $strings['notSet'] }}</span>
            <span x-show="recording" x-cloak style="display: none" class="ms-auto shrink-0 text-caption text-muted-foreground">{{ $strings['escHint'] }}</span>
        </button>
        @unless ($disabled)
            <x-nq::button type="button" variant="ghost" size="icon" x-show="value" x-cloak aria-label="{{ $strings['clear'] }}" @click="clear()">
                <x-lucide-x aria-hidden="true" />
            </x-nq::button>
            @if ($resetTo !== null)
                <x-nq::button type="button" variant="ghost" size="icon" x-show="canReset()" x-cloak aria-label="{{ $strings['reset'] }}" x-bind:title="resetTitle()" @click="reset()">
                    <x-lucide-rotate-ccw aria-hidden="true" />
                </x-nq::button>
            @endif
        @endunless
    </div>
    <ul x-show="hasProblems()" x-cloak style="display: none" :id="errorId()" role="list" class="flex flex-col gap-0.5">
        <li x-show="error" x-cloak style="display: none" role="alert" class="flex items-start gap-1.5 text-caption text-nq-danger-text">
            <span aria-hidden="true" class="mt-0.5 flex shrink-0 [&_svg]:size-3.5"><x-lucide-triangle-alert /></span>
            <span x-text="error"></span>
        </li>
        <template x-for="c in conflicts()" :key="c.id">
            <li :data-conflict="c.kind" class="flex items-start gap-1.5 text-caption text-nq-warning-text">
                <span aria-hidden="true" class="mt-0.5 flex shrink-0 [&_svg]:size-3.5"><x-lucide-triangle-alert /></span>
                <span x-text="conflictText(c)"></span>
            </li>
        </template>
    </ul>
    <span role="status" aria-live="polite" class="sr-only" x-text="announce"></span>
    @if ($name)<input type="hidden" name="{{ $name }}" :value="value ?? ''">@endif
</div>
