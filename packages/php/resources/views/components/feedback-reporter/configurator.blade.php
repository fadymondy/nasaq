{{-- <x-nq::feedback-reporter.configurator shape="pill" position="bottom-end" label="Feedback" x-on:nq-feedback-config="save($event.detail)" />
     Chooses the launcher's shape, position and text, shows it live in a preview frame, and prints the install code (React next to @nasaq/feedback, or the plain config as JSON).
     The public key is never written into the code: the sample reads it from an environment variable.
     shape, position, label: the starting choice. labels: array overrides, by key (configTitle, configDescription, shape, position, text, preview, shapePill, shapeCircle, shapeTab, posBottomEnd, posBottomStart, posTopEnd, posTopStart, posEdgeEnd, posEdgeStart, install, react, json, copyCode, codeLabel).
     Event on the root whenever the choice changes: nq-feedback-config, detail { shape, position, label }.
     Everything here is live, so it needs the Alpine runtime (@nasaqScripts). The code block is plain text (no syntax colours). --}}
@props(['shape' => 'pill', 'position' => 'bottom-end', 'label' => 'Feedback', 'labels' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $side = str_ends_with($position, 'start') ? 'start' : 'end';
    $effective = $shape === 'tab' ? 'edge-'.$side : (str_starts_with($position, 'edge') ? 'bottom-'.$side : $position);
    $shapes = [
        'pill' => $L('shapePill', 'Pill', 'كبسولة'),
        'circle' => $L('shapeCircle', 'Circle', 'دائرة'),
        'tab' => $L('shapeTab', 'Edge tab', 'لسان جانبي'),
    ];
    $positions = [
        'bottom-end' => $L('posBottomEnd', 'Bottom end', 'أسفل النهاية'),
        'bottom-start' => $L('posBottomStart', 'Bottom start', 'أسفل البداية'),
        'top-end' => $L('posTopEnd', 'Top end', 'أعلى النهاية'),
        'top-start' => $L('posTopStart', 'Top start', 'أعلى البداية'),
        'edge-end' => $L('posEdgeEnd', 'Edge end', 'حافة النهاية'),
        'edge-start' => $L('posEdgeStart', 'Edge start', 'حافة البداية'),
    ];
    // The preview launcher's classes live here so the stylesheet scans them; the Alpine module only picks between them.
    $config = [
        'shape' => $shape,
        'position' => $position,
        'label' => $label,
        'fallback' => \Nasaq\Nasaq::t('Feedback', 'ملاحظات'),
        'classes' => [
            'position' => [
                'bottom-end' => 'bottom-4 end-4',
                'bottom-start' => 'bottom-4 start-4',
                'top-end' => 'top-4 end-4',
                'top-start' => 'top-4 start-4',
                'edge-end' => 'end-0 top-1/2 -translate-y-1/2',
                'edge-start' => 'start-0 top-1/2 -translate-y-1/2',
            ],
            'shape' => [
                'pill' => 'h-control rounded-full px-4',
                'circle' => 'relative size-12 rounded-full',
                'tab' => 'flex-col px-2 py-3',
            ],
            'tabEnd' => 'rounded-s-card',
            'tabStart' => 'rounded-e-card',
            'tabText' => '[writing-mode:vertical-rl] rtl:rotate-180',
        ],
    ];
    $title = $L('configTitle', 'Launcher', 'زر الملاحظات');
    $copyLabel = $L('copyCode', 'Copy code', 'نسخ الكود');
    $codeLabel = $L('codeLabel', 'Install code', 'كود التركيب');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'feedback-configurator') }}" aria-label="{{ $title }}" x-data="nqFeedbackConfigurator(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex w-full max-w-3xl flex-col gap-4 rounded-card border border-border bg-card p-4') }}>
    <header class="flex flex-col gap-1">
        <h2 class="text-h3">{{ $title }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ $L('configDescription', 'Choose how the feedback button looks and where it sits, then copy the install code.', 'اختر شكل الزر ومكانه ثم انسخ كود التركيب.') }}</p>
    </header>
    <div class="grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
                <span class="text-label">{{ $L('shape', 'Shape', 'الشكل') }}</span>
                <x-nq::toggle-group :default-value="[$shape]" x-model="shapeV" aria-label="{{ $L('shape', 'Shape', 'الشكل') }}">
                    @foreach ($shapes as $value => $text)
                        <x-nq::toggle-group.toggle :value="$value">{{ $text }}</x-nq::toggle-group.toggle>
                    @endforeach
                </x-nq::toggle-group>
            </div>
            <div class="flex flex-col gap-1.5">
                <span class="text-label">{{ $L('position', 'Position', 'المكان') }}</span>
                <x-nq::toggle-group :default-value="[$effective]" x-model="posV" class="flex-wrap" aria-label="{{ $L('position', 'Position', 'المكان') }}">
                    @foreach ($positions as $value => $text)
                        <x-nq::toggle-group.toggle :value="$value">{{ $text }}</x-nq::toggle-group.toggle>
                    @endforeach
                </x-nq::toggle-group>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="nq-feedback-text" class="text-label">{{ $L('text', 'Button text', 'نص الزر') }}</label>
                <x-nq::field.input id="nq-feedback-text" :value="$label" maxlength="24" x-model="label" />
            </div>
        </div>
        <div class="flex flex-col gap-1.5">
            <span class="text-label">{{ $L('preview', 'Preview', 'معاينة') }}</span>
            <div class="relative h-56 overflow-hidden rounded-control border border-dashed border-border bg-background hatch" data-slot="feedback-configurator-preview">
                <button type="button" tabindex="-1" data-slot="feedback-launcher" x-bind:data-shape="shape" x-bind:data-position="effective" x-bind:aria-label="shape === 'circle' ? text : null"
                    x-bind:class="launcherClass"
                    class="absolute z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    <x-lucide-message-square-plus aria-hidden="true" class="size-4" />
                    <span x-show="shape !== 'circle'" x-bind:class="shape === 'tab' ? classes.tabText : ''" x-text="text">{{ $label !== '' ? $label : \Nasaq\Nasaq::t('Feedback', 'ملاحظات') }}</span>
                </button>
            </div>
        </div>
    </div>
    <div class="flex flex-col gap-1.5">
        <span class="text-label">{{ $L('install', 'Install', 'التركيب') }}</span>
        <x-nq::tabs default-value="react">
            <x-nq::tabs.list>
                <x-nq::tabs.tab value="react">{{ $L('react', 'React', 'React') }}</x-nq::tabs.tab>
                <x-nq::tabs.tab value="json">{{ $L('json', 'Config', 'الإعداد') }}</x-nq::tabs.tab>
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
            @foreach (['react', 'json'] as $kind)
                <x-nq::tabs.panel :value="$kind">
                    <figure data-slot="feedback-code" class="relative m-0 overflow-hidden rounded-control border border-border bg-secondary">
                        <pre dir="ltr" role="region" aria-label="{{ $codeLabel }}" tabindex="0" class="{{ $kind === 'react' ? 'max-h-72 ' : '' }}overflow-auto p-3 text-left font-mono text-caption"><code x-text="snippet('{{ $kind }}')"></code></pre>
                        <x-nq::button variant="ghost" size="sm" class="absolute end-2 top-2" x-on:click="copy('{{ $kind }}')">{{ $copyLabel }}</x-nq::button>
                    </figure>
                </x-nq::tabs.panel>
            @endforeach
        </x-nq::tabs>
    </div>
</section>
