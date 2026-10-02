{{-- <x-nq::install-prompt x-model="showInstall" app-name="Nasaq Courier" />
     The dialog that asks someone to install the web app. It explains the benefit before the browser's own prompt, walks iPhone and iPad through Share, then Add to Home Screen,
     and confirms when the app is installed. You decide when to open it (after a useful moment, not on first load) and remember "Not now".
     Open it with x-model (or wire:model) on a boolean; it is x-modelable. open starts it open.
     app-name: the app's name, in the title. platform: auto (default: detected in the browser from the user agent, display-mode: standalone, beforeinstallprompt and appinstalled)
     | prompt | ios | installed | unsupported to pin a path. benefits: array replacing the three default benefit lines. snooze-days: how long "Not now" stays quiet (default 14).
     <x-slot:icon> replaces the brand mark. labels: array overriding the words.
     Events (bubbling, from the root): nq-install { outcome: accepted | dismissed | none } after Install; nq-install-dismiss { nextAskAt } on "Not now" (the dialog then closes).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.install-prompt._words')
@props(['open' => false, 'appName', 'platform' => 'auto', 'benefits' => null, 'snoozeDays' => 14, 'icon' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ip_words($locale, $labels);
    $platforms = ['prompt', 'ios', 'installed', 'unsupported'];
    $pinned = in_array($platform, $platforms, true) ? $platform : 'auto';
    $initial = $pinned === 'auto' ? 'prompt' : $pinned;
    $lines = $benefits ?? [$t['benefitFast'], $t['benefitOffline'], $t['benefitAlerts']];
    $description = ['prompt' => $t['description'], 'ios' => $t['iosIntro'], 'unsupported' => $t['unsupportedBody']];
    $title = nq_ip_fill($t['title'], ['app' => $appName]);
    $installedTitle = nq_ip_fill($t['installedTitle'], ['app' => $appName]);
    $config = ['open' => (bool) $open, 'platform' => $pinned, 'snoozeDays' => $snoozeDays];
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $hasIcon = isset($icon) && $icon instanceof \Illuminate\View\ComponentSlot && ! $icon->isEmpty();
    $hide = fn (bool $cond) => $cond ? 'display: none' : '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'install-prompt-root') }}" x-data="nqInstallPrompt(@js($config))" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->except('data-slot')->cn('contents') }}>
    <template x-teleport="body">
        <div data-slot="dialog-portal">
            <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="install-prompt" data-platform="{{ $initial }}" x-bind:data-platform="platform" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                <x-nq::dialog.header class="items-center text-center" x-show="platform === 'installed'" style="{{ $hide($initial !== 'installed') }}">
                    <span aria-hidden="true" class="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
                        <x-lucide-circle-check class="size-6" />
                    </span>
                    <x-nq::dialog.title>{{ $installedTitle }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['installedBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::dialog.header class="items-start text-start" x-show="platform !== 'installed'" style="{{ $hide($initial === 'installed') }}">
                    <span class="mb-1 inline-flex size-12 items-center justify-center overflow-hidden rounded-card border border-border bg-card">
                        @if ($hasIcon)
                            {{ $icon }}
                        @else
                            <x-nq::product-mark :size="28" title="" />
                        @endif
                    </span>
                    <x-nq::dialog.title>{{ $title }}</x-nq::dialog.title>
                    <x-nq::dialog.description>
                        <span x-show="platform === 'prompt'" style="{{ $hide($initial !== 'prompt') }}">{{ $description['prompt'] }}</span>
                        <span x-show="platform === 'ios'" style="{{ $hide($initial !== 'ios') }}">{{ $description['ios'] }}</span>
                        <span x-show="platform === 'unsupported'" style="{{ $hide($initial !== 'unsupported') }}">{{ $description['unsupported'] }}</span>
                    </x-nq::dialog.description>
                </x-nq::dialog.header>
                <ul class="flex flex-col gap-2 text-body-sm text-nq-fg-body" x-show="platform === 'prompt'" style="{{ $hide($initial !== 'prompt') }}">
                    @foreach ($lines as $line)
                        <li class="flex items-center gap-2">
                            <x-lucide-circle-check aria-hidden="true" class="size-4 shrink-0 text-nq-success-text" />
                            {{ $line }}
                        </li>
                    @endforeach
                </ul>
                <ol class="flex flex-col gap-2" x-show="platform === 'ios'" style="{{ $hide($initial !== 'ios') }}">
                    @foreach ([['share', $t['iosStep1']], ['square-plus', $t['iosStep2']]] as $i => [$glyph, $step])
                        <li class="flex items-center gap-3 rounded-control border border-border bg-card p-3 text-body-sm">
                            <span aria-hidden="true" class="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-secondary">
                                <x-dynamic-component :component="'lucide-'.$glyph" class="size-4" />
                            </span>
                            <span>
                                <bdi class="me-1 text-muted-foreground tabular-nums">{{ $i + 1 }}.</bdi>
                                {{ $step }}
                            </span>
                        </li>
                    @endforeach
                </ol>
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-show="platform !== 'installed'" x-on:click="notNow()" :style="$initial === 'installed' ? 'display: none' : null">{{ $t['later'] }}</x-nq::button>
                    <x-nq::button variant="primary" x-show="platform === 'prompt'" x-on:click="install()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null"
                        :style="$initial !== 'prompt' ? 'display: none' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        <x-lucide-download aria-hidden="true" />{{ $t['install'] }}
                    </x-nq::button>
                    <x-nq::button variant="primary" x-show="platform !== 'prompt'" x-on:click="close()" :style="$initial === 'prompt' ? 'display: none' : null">{{ $t['done'] }}</x-nq::button>
                </x-nq::dialog.footer>
                <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            </div>
        </div>
    </template>
</div>
