{{-- <x-nq::kill-switch :paused="null" :active-count="14" :browsers="[['id' => 'b1', 'name' => 'Chrome on MacBook', 'device' => 'macOS', 'online' => true, 'current' => true]]" />
     One switch to stop every automation, with a required reason, and a confirmed resume. While paused it shows who stopped it, when and why.
     An optional list of paired browsers lets you unpair one you do not recognise. Pair it with <x-nq::kill-switch.paused-banner> on every page.
     paused: null when automations run, or ['by' => ..., 'at' => ..., 'reason' => ...] when the stop is on.
     active-count: how many automations are active, shown while running. browsers: [id, name, device, online, lastSeen, current]; omit to hide the list.
     can-unpair (default true when browsers are given): shows Unpair on every browser but the current one. labels: array overriding the words.
     Nothing here does the work. Each action fires a bubbling, cancelable event with detail { ..., resolve(result?), reject(message), waitUntil(promise) }:
       "nq-kill-switch-stop"    { reason }   the reason is never empty
       "nq-kill-switch-resume"  { }
       "nq-kill-switch-unpair"  { id }
     @nq-kill-switch-stop="$event.detail.waitUntil($wire.stopAll($event.detail.reason))". An error (resolve({ error }), reject(message), a rejected promise)
     keeps the dialog open and shows the message; with nobody listening the dialog just closes. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.kill-switch._kill-switch')
@props(['paused' => null, 'activeCount' => null, 'browsers' => null, 'canUnpair' => true, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_kill_switch_strings($locale, $labels);
    $isPaused = $paused !== null;
    $browsers = $browsers === null ? null : array_values($browsers);
    $online = $browsers ? count(array_filter($browsers, fn ($b) => ! empty($b['online']))) : 0;
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $config = ['failed' => $t['failed'], 'unpairTitle' => $t['unpairTitle']];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'kill-switch') }}" data-paused="{{ $isPaused ? 'true' : 'false' }}" aria-label="{{ $t['title'] }}" x-data="nqKillSwitch(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::card :class="$isPaused ? 'border-nq-danger/40' : ''">
        <x-nq::card.header>
            <x-nq::card.title as="h2" class="flex items-center gap-2">
                @if ($isPaused)<x-lucide-circle-pause aria-hidden="true" class="size-4 text-nq-danger-text" />@else<x-lucide-shield-alert aria-hidden="true" class="size-4 text-muted-foreground" />@endif
                {{ $t['title'] }}
            </x-nq::card.title>
            <x-nq::card.description>{{ $t['description'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <div x-show="error" x-cloak style="display: none">
                <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
            </div>
            @if ($isPaused)
                <x-nq::alert tone="danger" :title="$t['paused']">
                    <span class="block">{{ str_replace('{who}', $paused['by'] ?? '', $t['pausedBy']) }}, <x-nq::numeric.date-time :value="$paused['at']" relative /></span>
                    <span class="block text-foreground">{{ $t['reason'] }}: {{ $paused['reason'] ?? '' }}</span>
                </x-nq::alert>
                <div>
                    <x-nq::alert-dialog.confirm-button variant="primary" :title="$t['resumeTitle']" :description="$t['resumeBody']" :confirm-label="$t['resumeConfirm']" :cancel-label="$t['cancel']" x-on:click="resume()">
                        <x-lucide-circle-play aria-hidden="true" />
                        {{ $t['resume'] }}
                    </x-nq::alert-dialog.confirm-button>
                </div>
            @else
                <div class="flex items-center gap-2 text-body-sm text-muted-foreground">
                    <x-nq::badge variant="success">{{ $t['running'] }}</x-nq::badge>
                    @if ($activeCount !== null)<span>{{ nq_kill_switch_running_count($locale, (int) $activeCount) }}</span>@endif
                </div>
                <div>
                    <x-nq::button variant="danger" x-on:click="stopOpen = true" aria-haspopup="dialog">
                        <x-lucide-octagon-x aria-hidden="true" />
                        {{ $t['stopAll'] }}
                    </x-nq::button>
                </div>
            @endif
        </x-nq::card.content>
    </x-nq::card>

    @if ($browsers !== null)
        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h2">{{ $t['browsersTitle'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['browsersBody'] }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content>
                @if (count($browsers) === 0)
                    <x-nq::states.empty icon="unplug" :title="$t['browsersEmpty']" :description="$t['browsersEmptyBody']" />
                @else
                    <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                        @foreach ($browsers as $b)
                            @php
                                $current = ! empty($b['current']);
                                $isOnline = ! empty($b['online']);
                                $unpairable = $canUnpair && ! $current;
                                $row = 'flex flex-wrap items-center gap-3 p-3';
                            @endphp
                            <li data-slot="kill-switch-browser" data-online="{{ $isOnline ? 'true' : 'false' }}" @if ($current) data-current @endif>
                                @if ($unpairable)
                                    <x-nq::context-menu>
                                        <x-nq::context-menu.trigger :class="$row">
                                            @include('nasaq::components.kill-switch._browser-row')
                                            <x-nq::button size="sm" variant="secondary" :aria-label="str_replace('{name}', $b['name'], $t['unpairFor'])" x-on:click="askUnpair({{ $js($b['id']) }}, {{ $js($b['name']) }})">{{ $t['unpair'] }}</x-nq::button>
                                        </x-nq::context-menu.trigger>
                                        <x-nq::context-menu.content>
                                            <x-nq::context-menu.item variant="danger" x-on:click="askUnpair({{ $js($b['id']) }}, {{ $js($b['name']) }})">
                                                <x-lucide-unplug aria-hidden="true" />
                                                {{ $t['unpair'] }}
                                            </x-nq::context-menu.item>
                                        </x-nq::context-menu.content>
                                    </x-nq::context-menu>
                                @else
                                    <div class="{{ $row }}">
                                        @include('nasaq::components.kill-switch._browser-row')
                                    </div>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                    <p class="mt-2 text-caption text-muted-foreground"><x-nq::numeric :value="$online" /> / <x-nq::numeric :value="count($browsers)" /> {{ $t['online'] }}</p>
                @endif
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::alert-dialog x-model="unpairOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="unpairTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t['unpairBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel x-bind:disabled="unpairBusy">{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::button variant="danger" x-on:click="unpair()" x-bind:disabled="unpairBusy" x-bind:aria-busy="unpairBusy ? 'true' : undefined">
                        <x-nq::spinner x-show="unpairBusy" x-cloak style="display: none" />
                        {{ $t['unpair'] }}
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif

    @unless ($isPaused)
        <x-nq::dialog x-model="stopOpen">
            <x-nq::dialog.content :show-close="false">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['stopTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['stopBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field x-model="reasonInvalid">
                    <x-nq::field.label>{{ $t['reasonLabel'] }}</x-nq::field.label>
                    <x-nq::field.textarea rows="3" x-model="reason" x-on:input="clearReason()" placeholder="{{ $t['reasonPlaceholder'] }}" />
                    <x-nq::field.error>{{ $t['reasonRequired'] }}</x-nq::field.error>
                    <x-nq::field.description x-show="!reasonInvalid">{{ $t['reasonHint'] }}</x-nq::field.description>
                </x-nq::field>
                <div x-show="stopError" x-cloak style="display: none">
                    <x-nq::alert tone="danger"><span x-text="stopError"></span></x-nq::alert>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-on:click="closeStop()" x-bind:disabled="busy">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button variant="danger" x-on:click="stop()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : undefined">
                        <x-nq::spinner x-show="busy" x-cloak style="display: none" />
                        <x-lucide-octagon-x x-show="!busy" aria-hidden="true" />
                        {{ $t['stopConfirm'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endunless
</section>
