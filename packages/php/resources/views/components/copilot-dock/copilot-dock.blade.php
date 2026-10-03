{{-- <x-nq::copilot-dock :messages="$messages" :starters="['Summarise this week']" stoppable regenerate feedback @nq-send="send($event.detail)" />
     The app-wide assistant (React CopilotDock): a launcher (a round button, or a slim "Ask anything" bar with collapsed-bar) that opens the copilot chat in a non-modal panel.
     The panel docks to an edge or the bottom, floats as a window, or expands to the whole page. Ctrl+J / Cmd+J toggles it from anywhere; Escape inside the panel leaves the full
     page first, then closes it and returns focus to the launcher. Every chat prop (messages, starters, context, models, mentions, commands, toggles, sessions, stoppable, regenerate,
     feedback, share, attachable, labels ...) goes to the copilot chat inside, and so do its events (nq-send, nq-stop, nq-regenerate ...), which bubble from the dock root.
     open: x-modelable (x-model="$wire.assistantOpen"); default closed. hotkey: the letter bound to Ctrl / Cmd (default j; false turns it off). launcher: show the launcher while closed (default true).
     collapsed-bar: the slim bar instead of the round button; Enter sends the text (nq-send) and opens. placement: fixed (default) | absolute (inside a relative parent).
     side: end (default) | start | bottom | float. sides: positions of the layout menu (default all four; one or none hides it). expanded: start as a full page. expandable: show the expand button (default true).
     persist-key: a localStorage key that remembers the side. width (26rem), height (50vh bottom, 40rem float). dock-labels: words (open, panel, layout, end, start, bottom, float, expand, collapse, ask, send).
     Slots: header-actions (extra header buttons), launcher-icon (replaces the sparkles).
     Events, bubbling from the root: nq-dock-open { open }, nq-dock-side { side }, nq-dock-expanded { expanded }, and nq-close (the chat close button).
     Needs the Alpine runtime (@nasaqScripts). --}}
@php
    if (! function_exists('nq_dock_words')) {
        function nq_dock_words(array $override = []): array
        {
            $en = ['open' => 'Open assistant', 'panel' => 'Assistant', 'layout' => 'Panel position', 'end' => 'Dock right', 'start' => 'Dock left', 'bottom' => 'Dock bottom', 'float' => 'Floating window',
                'expand' => 'Expand to full page', 'collapse' => 'Exit full page', 'ask' => 'Ask anything…', 'send' => 'Send'];
            $ar = ['open' => 'افتح المساعد', 'panel' => 'المساعد', 'layout' => 'مكان اللوحة', 'end' => 'ثبّت يسارًا', 'start' => 'ثبّت يمينًا', 'bottom' => 'ثبّت بالأسفل', 'float' => 'نافذة عائمة',
                'expand' => 'وسّع لملء الصفحة', 'collapse' => 'اخرج من ملء الصفحة', 'ask' => 'اسأل عن أي شيء…', 'send' => 'أرسل'];

            return array_merge(\Nasaq\Nasaq::rtl() ? $ar : $en, $override);
        }
    }
@endphp
@props(['messages' => [], 'open' => false, 'hotkey' => 'j', 'launcher' => true, 'collapsedBar' => false, 'placement' => 'fixed', 'side' => 'end', 'sides' => ['end', 'start', 'bottom', 'float'],
    'expanded' => false, 'expandable' => true, 'persistKey' => null, 'width' => '26rem', 'height' => null, 'dockLabels' => [], 'launcherIcon' => null, 'headerActions' => null,
    'mode' => 'panel', 'title' => null, 'starters' => [], 'context' => [], 'contextOptions' => [], 'models' => [], 'model' => null, 'mentions' => [], 'commands' => [],
    'toggles' => [], 'activeToggles' => [], 'sessions' => null, 'activeSessionId' => null, 'newChat' => false, 'attachable' => false, 'accept' => null, 'stoppable' => false,
    'regenerate' => false, 'feedback' => false, 'share' => false, 'copyTargets' => ['claude', 'chatgpt', 'cursor'], 'allowHtml' => false, 'disclaimer' => null, 'labels' => []])
@php
    $t = nq_dock_words($dockLabels);
    $rtl = \Nasaq\Nasaq::rtl();
    $all = ['end', 'start', 'bottom', 'float'];
    $menuSides = array_values(array_filter($sides, fn ($s) => in_array($s, $all, true)));
    $side = in_array($side, $all, true) ? $side : 'end';
    $panelId = $attributes->get('id') ?? 'nq-dock-'.\Illuminate\Support\Str::random(6);
    $iconFor = fn ($s) => ['end' => $rtl ? 'panel-left' : 'panel-right', 'start' => $rtl ? 'panel-right' : 'panel-left', 'bottom' => 'panel-bottom', 'float' => 'picture-in-picture-2'][$s];
    $config = \Illuminate\Support\Js::from([
        'open' => (bool) $open, 'side' => $side, 'sides' => $all, 'expanded' => (bool) $expanded, 'hotkey' => $hotkey === false ? false : (string) $hotkey, 'persistKey' => $persistKey,
        'collapsedBar' => (bool) $collapsedBar, 'width' => $width, 'height' => $height, 'model' => $model ?? ($models[0]['id'] ?? null), 'context' => array_values($context),
        'words' => ['open' => $t['open'], 'send' => $t['send'], 'expand' => $t['expand'], 'collapse' => $t['collapse']],
    ])->toHtml();
    $keys = $hotkey ? 'Control+'.strtoupper($hotkey) : null;
    $shape = ['end' => 'inset-y-0 end-0 border-s', 'start' => 'inset-y-0 start-0 border-e', 'bottom' => 'inset-x-0 bottom-0 border-t', 'float' => 'bottom-4 end-4 max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] rounded-card border'];
    $placementClass = $placement === 'absolute' ? 'absolute' : 'fixed';
@endphp
<div data-slot="copilot-dock-root" x-data="nqCopilotDock({!! $config !!})" x-modelable="isOpen" x-on:keydown.window="onHotkey($event)" x-on:nq-close="closeDock()" class="contents">
    @if ($launcher && ! $collapsedBar)
        <button type="button" data-slot="copilot-dock-launcher" x-ref="launcher" x-show="! isOpen" @if ($open) style="display: none" @endif aria-expanded="false" aria-controls="{{ $panelId }}"
            @if ($keys) aria-keyshortcuts="{{ $keys }}" @endif x-bind:title="launcherName()" title="{{ $t['open'] }}" aria-label="{{ $t['open'] }}" x-on:click="setOpen(true)"
            class="{{ \Nasaq\Cn::merge($placementClass, 'bottom-4 end-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating', 'transition-colors duration-150 ease-nq hover:bg-primary/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-5') }}">
            @if ($launcherIcon && ! $launcherIcon->isEmpty()){{ $launcherIcon }}@else<x-lucide-sparkles aria-hidden="true" />@endif
        </button>
    @endif
    @if ($launcher && $collapsedBar)
        <form data-slot="copilot-dock-bar" role="search" aria-label="{{ $t['panel'] }}" x-show="! isOpen" @if ($open) style="display: none" @endif x-on:submit.prevent="sendBar()"
            class="{{ \Nasaq\Cn::merge($placementClass, 'inset-x-0 bottom-4 z-40 mx-auto flex w-[min(calc(100%-2rem),36rem)] items-center gap-2 rounded-full border border-border bg-background ps-3 pe-1.5 py-1.5 shadow-floating', 'focus-within:border-nq-focus') }}">
            <span aria-hidden="true" class="text-primary [&_svg]:size-4">@if ($launcherIcon && ! $launcherIcon->isEmpty()){{ $launcherIcon }}@else<x-lucide-sparkles />@endif</span>
            <input type="text" x-ref="bar" x-model="barText" aria-label="{{ $t['ask'] }}" aria-controls="{{ $panelId }}" @if ($keys) aria-keyshortcuts="{{ $keys }}" @endif placeholder="{{ $t['ask'] }}"
                class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <kbd x-show="shortcut && ! barText" style="display: none" x-text="shortcut" dir="ltr" class="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline"></kbd>
            <x-nq::button type="submit" size="icon-sm" class="rounded-full" x-bind:aria-label="barLabel()" aria-label="{{ $t['open'] }}">
                <x-lucide-arrow-up x-show="barText.trim() !== ``" style="display: none" aria-hidden="true" />
                <x-lucide-maximize-2 x-show="barText.trim() === ``" aria-hidden="true" />
            </x-nq::button>
        </form>
    @endif
    <div id="{{ $panelId }}" x-ref="panel" role="complementary" aria-label="{{ $t['panel'] }}" tabindex="-1" data-slot="{{ $attributes->get('data-slot', 'copilot-dock') }}"
        @unless ($open) hidden @endunless @if ($open) data-open="" @endif data-side="{{ $side }}" @if ($expanded) data-expanded="" @endif
        x-bind:hidden="! isOpen" x-bind:data-open="isOpen ? `` : null" x-bind:data-side="dockSide" x-bind:data-expanded="isExpanded ? `` : null" x-bind:style="sizeStyle()" x-bind:class="shapeClass()"
        x-on:keydown="onPanelKey($event)"
        {{ $attributes->except(['data-slot', 'id'])->cn($placementClass.' z-40 flex flex-col overflow-hidden border-border bg-background shadow-floating outline-none') }}>
        <x-nq::copilot-chat :messages="$messages" :mode="$expanded ? 'page' : 'panel'" :title="$title" :starters="$starters" :context="$context" :context-options="$contextOptions"
            :models="$models" :model="$model" :mentions="$mentions" :commands="$commands" :toggles="$toggles" :active-toggles="$activeToggles" :sessions="$sessions" :active-session-id="$activeSessionId"
            closable :new-chat="$newChat" :attachable="$attachable" :accept="$accept" :stoppable="$stoppable" :regenerate="$regenerate" :feedback="$feedback" :share="$share" :copy-targets="$copyTargets"
            :allow-html="$allowHtml" :disclaimer="$disclaimer" :labels="$labels" class="min-h-0 flex-1">
            <x-slot:header-actions>
                @if ($headerActions && ! $headerActions->isEmpty()){{ $headerActions }}@endif
                @if (count($menuSides) > 1)
                    <div class="contents" x-show="! isExpanded">
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $t['layout'] }}" title="{{ $t['layout'] }}" data-slot="copilot-dock-layout">
                                @foreach ($all as $s)
                                    <span class="contents" x-show="dockSide === `{{ $s }}`" @if ($s !== $side) style="display: none" @endif><x-dynamic-component :component="'lucide-'.$iconFor($s)" aria-hidden="true" /></span>
                                @endforeach
                            </x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="end">
                                <x-nq::dropdown-menu.label>{{ $t['layout'] }}</x-nq::dropdown-menu.label>
                                <x-nq::dropdown-menu.radio-group :value="$side" x-model="dockSide">
                                    @foreach ($menuSides as $s)
                                        <x-nq::dropdown-menu.radio-item :value="$s">
                                            <x-dynamic-component :component="'lucide-'.$iconFor($s)" aria-hidden="true" class="size-4 text-muted-foreground" />
                                            {{ $t[$s] }}
                                        </x-nq::dropdown-menu.radio-item>
                                    @endforeach
                                </x-nq::dropdown-menu.radio-group>
                            </x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                    </div>
                @endif
                @if ($expandable)
                    <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="copilot-dock-expand" x-bind:aria-pressed="isExpanded ? `true` : `false`" x-bind:aria-label="expandLabel()" x-bind:title="expandLabel()"
                        aria-label="{{ $expanded ? $t['collapse'] : $t['expand'] }}" x-on:click="setExpanded(! isExpanded)">
                        <x-lucide-minimize-2 x-show="isExpanded" :style="$expanded ? '' : 'display: none'" aria-hidden="true" />
                        <x-lucide-maximize-2 x-show="! isExpanded" :style="$expanded ? 'display: none' : ''" aria-hidden="true" />
                    </x-nq::button>
                @endif
            </x-slot:header-actions>
        </x-nq::copilot-chat>
    </div>
</div>
