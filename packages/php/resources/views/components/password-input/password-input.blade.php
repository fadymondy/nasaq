{{-- <x-nq::password-input name="password" autocomplete="new-password" show-strength :rules="true" />
     A password field with a show/hide toggle and an optional strength meter, built as an input group. Native input attributes
     (name, placeholder, autocomplete, id, required, wire:model …) fall through to the <input>; class goes on the wrapper, input-class on the input.
     value: initial text; it is x-modelable (x-model / wire:model). visible: start with the text shown.
     show-strength: the meter, from a built-in estimate; or pass score (0 to 4) to drive it yourself, and strength-levels (five words).
     rules: true for the default policy (12 characters, upper, lower, digit, symbol), or ['minLength' => 8, 'require' => ['digit']]; rule-labels overrides the words.
     Inside <x-nq::field> give the input an id (and aria-describedby) yourself, the field cannot see the input-group input.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'visible' => false, 'showStrength' => false, 'score' => null, 'strengthLabel' => null, 'strengthLevels' => null, 'rules' => null, 'ruleLabels' => [], 'disabled' => false, 'invalid' => false, 'inputClass' => null, 'toggleLabel' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $value = (string) $value;
    $policy = is_array($rules) ? $rules : [];
    $minLength = $policy['minLength'] ?? 12;
    $require = $policy['require'] ?? ['upper', 'lower', 'digit', 'symbol'];
    $classes = ['upper' => '/\p{Lu}/u', 'lower' => '/\p{Ll}/u', 'digit' => '/\p{Nd}/u', 'symbol' => '/[^\p{L}\p{Nd}]/u'];
    $words = [
        'length' => $t::t("At least {$minLength} characters", "{$minLength} حرفًا على الأقل"),
        'upper' => $t::t('An uppercase letter', 'حرف كبير'),
        'lower' => $t::t('A lowercase letter', 'حرف صغير'),
        'digit' => $t::t('A number', 'رقم'),
        'symbol' => $t::t('A symbol', 'رمز'),
    ];
    $checklist = $rules ? array_merge([['id' => 'length', 'met' => mb_strlen($value) >= $minLength]], array_map(fn ($id) => ['id' => $id, 'met' => (bool) preg_match($classes[$id], $value)], $require)) : [];
    $estimate = function (string $p): int {
        $chars = preg_split('//u', $p, -1, PREG_SPLIT_NO_EMPTY);
        if (count($chars) < 6 || count(array_unique($chars)) <= 3) {
            return 0;
        }
        $variety = (int) (bool) preg_match('/\p{Ll}/u', $p) + (int) (bool) preg_match('/\p{Lu}/u', $p) + (int) (bool) preg_match('/\p{Nd}/u', $p) + (int) (bool) preg_match('/[^\p{L}\p{Nd}]/u', $p) + (int) (bool) preg_match('/\p{Lo}/u', $p);
        $n = count($chars);

        return ($n >= 16 && $variety >= 3) || ($n >= 12 && $variety >= 4) ? 4 : ($n >= 10 && $variety >= 3 ? 3 : ($n >= 8 && $variety >= 2 ? 2 : 1));
    };
    $shown = max(0, min(4, (int) round($score ?? $estimate($value))));
    $hasStrength = $value !== '' || $score !== null;
    $levels = $strengthLevels ?? [$t::t('Very weak', 'ضعيفة جدًا'), $t::t('Weak', 'ضعيفة'), $t::t('Fair', 'مقبولة'), $t::t('Good', 'جيدة'), $t::t('Strong', 'قوية')];
    $tones = ['bg-nq-danger', 'bg-nq-danger', 'bg-nq-warning', 'bg-nq-info', 'bg-nq-success'];
    $strengthName = $strengthLabel ?? $t::t('Password strength', 'قوة كلمة المرور');
    $init = ['visible' => (bool) $visible, 'score' => $score, 'rules' => $rules ? ['minLength' => $minLength, 'require' => array_values($require)] : null, 'levels' => array_values($levels)];
@endphp
<div data-slot="password-input" x-data="nqPasswordInput(@js($value), @js($init))" x-modelable="value"
    {{ $attributes->only('class')->cn('flex w-full flex-col gap-2') }}>
    <x-nq::input-group>
        <x-nq::input-group.input {{ $attributes->except('class') }} x-model="value" x-bind:type="shown ? 'text' : 'password'" :type="$visible ? 'text' : 'password'"
            :value="$value" autocapitalize="none" autocorrect="off" spellcheck="false" :disabled="$disabled" :class="$inputClass"
            :data-invalid="$invalid ? true : null" :aria-invalid="$invalid ? 'true' : null" />
        <x-nq::input-group.addon align="end" class="pe-1.5">
            <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="password-input-toggle" :disabled="$disabled" x-bind="toggle"
                aria-label="{{ $toggleLabel ?? $t::t('Show password', 'إظهار كلمة المرور') }}" aria-pressed="{{ $visible ? 'true' : 'false' }}">
                <x-lucide-eye-off x-show="shown" x-cloak :style="$visible ? '' : 'display: none'" aria-hidden="true" />
                <x-lucide-eye x-show="!shown" x-cloak :style="$visible ? 'display: none' : ''" aria-hidden="true" />
            </x-nq::button>
        </x-nq::input-group.addon>
    </x-nq::input-group>
    @if ($showStrength)
        <div data-slot="password-input-strength" data-score="{{ $shown }}" class="flex flex-col gap-1 {{ $hasStrength ? '' : 'opacity-60' }}" x-bind="strengthBox">
            <div data-slot="meter" role="meter" aria-label="{{ $strengthName }}" aria-valuemin="0" aria-valuemax="4" aria-valuenow="{{ $hasStrength ? $shown : 0 }}"
                data-tone="{{ ['danger', 'danger', 'warning', 'info', 'success'][$shown] }}" x-bind="meter" class="flex w-full flex-col gap-1.5">
                <div data-slot="meter-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                    <div data-slot="meter-indicator" style="inset-inline-start:0;width:{{ $hasStrength ? $shown * 25 : 0 }}%" x-bind="meterFill"
                        class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none {{ $tones[$shown] }}"></div>
                </div>
            </div>
            <div class="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
                <span>{{ $strengthName }}</span>
                <span aria-live="polite" class="text-foreground" x-text="levelText()">{{ $hasStrength ? $levels[$shown] : '' }}</span>
            </div>
        </div>
    @endif
    @if ($rules)
        <ul data-slot="password-input-rules" aria-label="{{ $t::t('Password requirements', 'متطلبات كلمة المرور') }}" class="grid gap-1 sm:grid-cols-2">
            @foreach ($checklist as $r)
                <li @if ($r['met']) data-met @endif x-bind="rule('{{ $r['id'] }}')"
                    class="flex items-center gap-1.5 text-caption transition-colors duration-150 ease-nq {{ $r['met'] ? 'text-nq-success-text' : 'text-muted-foreground' }}">
                    <x-lucide-check x-show="met('{{ $r['id'] }}')" x-cloak :style="$r['met'] ? '' : 'display: none'" aria-hidden="true" class="size-3.5 shrink-0" />
                    <x-lucide-minus x-show="!met('{{ $r['id'] }}')" x-cloak :style="$r['met'] ? 'display: none' : ''" aria-hidden="true" class="size-3.5 shrink-0" />
                    <span>{{ $ruleLabels[$r['id']] ?? $words[$r['id']] ?? $r['id'] }}</span>
                    <span class="sr-only" x-text="met('{{ $r['id'] }}') ? @js(', '.$t::t('met', 'مستوفى')) : @js(', '.$t::t('not met', 'غير مستوفى'))">, {{ $r['met'] ? $t::t('met', 'مستوفى') : $t::t('not met', 'غير مستوفى') }}</span>
                </li>
            @endforeach
        </ul>
    @endif
</div>
