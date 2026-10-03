{{-- <x-nq::setup-wizard title="Set up your workspace" :steps="[['id' => 'name', 'title' => 'Name'], ['id' => 'agent', 'title' => 'Agent']]" :completed="$done" :can-finish="$ok"
         x-on:nq-step-complete="$event.detail.waitUntil(save($event.detail.stepId))" x-on:nq-finish="$event.detail.waitUntil(finish())">
       <x-nq::setup-wizard.step id="name"> ...your form... </x-nq::setup-wizard.step>
       <x-nq::setup-wizard.step id="agent"> <x-nq::setup-wizard.agent-enroll command="curl ... | sh" /> </x-nq::setup-wizard.step>
       <x-slot:done-action><x-nq::button href="/">Open the dashboard</x-nq::button></x-slot:done-action>
     </x-nq::setup-wizard>
     A first-run wizard: a step rail on wide screens, a progress bar on phones, Back, Continue and Skip, and a finish gate the server controls. Needs the Alpine runtime.
     steps: [{ id, title, description?, optional?, ready? }]. Put each step's body in <x-nq::setup-wizard.step id>. current: the first step shown (zero-based).
     completed: step ids the server counts as done; required steps missing from it block Finish. can-finish: false blocks Finish and shows gate-message.
     title, description: the rail heading. done-title, done-description, <x-slot:done-action>: the completion screen. labels: override any string.
     Events (bubble from the root, each with detail.waitUntil(promise); resolve { error } to stay put and show why):
       nq-step-complete { stepId }  leaving a step forward    nq-finish {}  the last step's Finish    nq-step-change { index, stepId }  after any move.
     From Alpine inside it: setReady(id, bool) holds Continue, setCompleted(ids), setCanFinish(ok, message). --}}
@props(['steps' => [], 'current' => 0, 'completed' => null, 'canFinish' => true, 'gateMessage' => null, 'title' => null, 'description' => null, 'doneTitle' => null, 'doneDescription' => null, 'labels' => [], 'doneAction' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $S = [
        'stepOf' => ['Step {current} of {total}', 'الخطوة {current} من {total}'],
        'back' => ['Back', 'رجوع'],
        'next' => ['Continue', 'متابعة'],
        'skip' => ['Skip for now', 'تخطَّ الآن'],
        'finish' => ['Finish setup', 'إنهاء الإعداد'],
        'optional' => ['Optional', 'اختيارية'],
        'steps' => ['Setup steps', 'خطوات الإعداد'],
        'gate' => ['Finish these steps first', 'أكمل هذه الخطوات أولًا'],
        'failed' => ['Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'],
        'doneTitle' => ['You are all set', 'كل شيء جاهز'],
        'doneDescription' => ['Setup is complete.', 'اكتمل الإعداد.'],
        'complete' => ['Completed', 'مكتملة'],
        'current' => ['Current step', 'الخطوة الحالية'],
        'upcoming' => ['Upcoming', 'قادمة'],
    ];
    $l = [];
    foreach ($S as $k => [$en, $arText]) {
        $l[$k] = $labels[$k] ?? ($ar ? $arText : $en);
    }
    $steps = array_values(array_map(fn ($s) => [
        'id' => (string) $s['id'], 'title' => (string) ($s['title'] ?? ''), 'description' => $s['description'] ?? null,
        'optional' => (bool) ($s['optional'] ?? false), 'ready' => ($s['ready'] ?? true) !== false,
    ], $steps));
    $total = count($steps);
    $cur = max(0, min((int) $current, max($total - 1, 0)));
    $last = $cur === $total - 1;
    $stepNow = $steps[$cur] ?? ['id' => '', 'title' => '', 'description' => null, 'optional' => false, 'ready' => true];
    $fmt = fn (int $n): string => class_exists(\NumberFormatter::class) ? (new \NumberFormatter(($ar ? 'ar' : 'en').'@numbers=latn', \NumberFormatter::DECIMAL))->format($n) : (string) $n;
    $stepCount = str_replace(['{current}', '{total}'], [$fmt($cur + 1), $fmt($total)], $l['stepOf']);
    $pct = $total > 0 ? (int) round(($cur + 1) / $total * 100) : 0;
    $config = [
        'steps' => $steps, 'current' => $cur, 'completed' => $completed, 'canFinish' => (bool) $canFinish, 'gateMessage' => $gateMessage,
        'labels' => collect($l)->only(['stepOf', 'failed', 'gate', 'complete', 'current', 'upcoming'])->all(),
    ];
    $markerBase = 'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'setup-wizard') }}" x-data="nqSetupWizard({{ \Illuminate\Support\Js::from($config) }})"
    x-bind:data-state="done ? 'done' : null" x-bind:data-step="done ? null : stepId()"
    x-bind:class="done ? 'max-w-xl items-center gap-4 p-8 text-center' : 'max-w-4xl gap-0 p-0 md:grid md:grid-cols-[15rem_1fr]'"
    {{ $attributes->except('data-slot')->cn('mx-auto flex w-full flex-col rounded-card border border-border bg-card text-card-foreground') }}>
    {{-- The wizard --}}
    <div class="contents" x-show="! done">
        <aside class="hidden flex-col gap-5 border-e border-border bg-muted/50 p-6 md:flex">
            @if ($title || $description)
                <div class="flex flex-col gap-1">
                    @if ($title)<p class="text-label text-foreground">{{ $title }}</p>@endif
                    @if ($description)<p class="text-caption text-muted-foreground">{{ $description }}</p>@endif
                </div>
            @endif
            <nav aria-label="{{ $l['steps'] }}">
                <ol data-slot="stepper" data-orientation="vertical" class="m-0 flex list-none flex-col p-0">
                    @foreach ($steps as $i => $s)
                        @php($st = $i < $cur ? 'complete' : ($i === $cur ? 'current' : 'upcoming'))
                        <li data-slot="stepper-item" x-bind:data-status="status({{ $i }})" class="grid grid-cols-[1.75rem_1fr] gap-x-3">
                            <button type="button" data-slot="stepper-step" x-bind:aria-current="status({{ $i }}) === 'current' ? 'step' : null" x-bind:disabled="! canGo({{ $i }})" x-on:click="railGo({{ $i }})"
                                class="col-span-2 grid grid-cols-subgrid items-start gap-3 rounded-control text-start outline-none enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                <span data-slot="stepper-marker" class="{{ $markerBase }}"
                                    x-bind:class="{ 'border-transparent bg-primary text-primary-foreground': status({{ $i }}) === 'complete', 'border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30': status({{ $i }}) === 'current', 'border-border bg-background text-muted-foreground': status({{ $i }}) === 'upcoming' }">
                                    <x-lucide-check aria-hidden="true" x-show="status({{ $i }}) === 'complete'" :style="($st !== 'complete') ? 'display: none' : null" />
                                    <span x-show="status({{ $i }}) !== 'complete'" @style(['display: none' => $st === 'complete'])><x-nq::numeric :value="$i + 1" /></span>
                                </span>
                                <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
                                    <span class="text-label" x-bind:class="status({{ $i }}) === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'">
                                        {{ $s['title'] }}
                                        <span class="sr-only" x-text="'(' + statusLabel({{ $i }}) + ')'">({{ $l[$st] }})</span>
                                    </span>
                                    @if ($s['optional'])<span class="text-caption text-muted-foreground">{{ $l['optional'] }}</span>@endif
                                </span>
                            </button>
                            @if ($i < $total - 1)
                                <span aria-hidden="true" data-slot="stepper-connector" x-bind:data-complete="status({{ $i }}) === 'complete' ? '' : null"
                                    x-bind:class="status({{ $i }}) === 'complete' ? 'bg-primary' : 'bg-border'"
                                    class="col-start-1 row-start-2 my-1 min-h-6 w-px justify-self-center rounded-full transition-colors duration-150 ease-nq"></span>
                            @endif
                        </li>
                    @endforeach
                </ol>
            </nav>
        </aside>
        <div class="flex min-w-0 flex-col gap-5 p-5 sm:p-8">
            <div class="flex flex-col gap-2 md:hidden">
                @if ($title)<p class="text-label text-foreground">{{ $title }}</p>@endif
                <div data-slot="progress" role="progressbar" aria-label="{{ $l['steps'] }}" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="pct()" x-bind:aria-valuetext="pct() + '%'" class="flex w-full flex-col gap-1.5">
                    <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                        <span class="text-label text-foreground" x-text="stepCount()">{{ $stepCount }}</span><span></span>
                    </div>
                    <div data-slot="progress-track" class="relative block h-2 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                        <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + pct() + '%'" class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                    </div>
                </div>
            </div>
            <header class="flex flex-col gap-1">
                <p class="hidden text-caption text-muted-foreground md:block" x-text="stepCount()">{{ $stepCount }}</p>
                <h2 x-ref="heading" tabindex="-1" class="text-h2 text-foreground outline-none" x-text="step().title">{{ $stepNow['title'] }}</h2>
                <p class="text-body-sm text-muted-foreground" x-show="step().description" x-text="step().description" @style(['display: none' => ! $stepNow['description']])>{{ $stepNow['description'] }}</p>
            </header>

            <div data-slot="setup-wizard-body" x-bind:aria-busy="busy() ? 'true' : null" class="min-w-0">
                {{ $slot }}
            </div>

            <x-nq::alert tone="warning" x-show="gated()" style="display: none">
                <span class="block text-label text-foreground" x-text="gateTitle()">{{ $gateMessage ?? $l['gate'] }}</span>
                <ul class="m-0 flex list-disc flex-col gap-0.5 ps-4">
                    <template x-for="s in missing()" x-bind:key="s.id">
                        <li><button type="button" class="text-start underline underline-offset-2" x-on:click="goId(s.id)" x-text="s.title"></button></li>
                    </template>
                </ul>
            </x-nq::alert>
            <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>

            <footer class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <x-nq::button variant="ghost" x-on:click="back()" x-bind:disabled="backOff()" x-bind:data-disabled="backOff() ? '' : null" x-bind:class="first() ? 'invisible' : ''">
                    <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $l['back'] }}
                </x-nq::button>
                <div class="flex flex-col-reverse gap-2 sm:flex-row">
                    <x-nq::button variant="secondary" x-show="canSkip()" x-on:click="skip()" x-bind:disabled="busy()" x-bind:data-disabled="busy() ? '' : null" :style="(! ($stepNow['optional'] && ! $last)) ? 'display: none' : null">{{ $l['skip'] }}</x-nq::button>
                    <x-nq::button variant="primary" x-show="! last()" x-on:click="next()" x-bind:disabled="nextBlocked()" x-bind:data-disabled="nextBlocked() ? '' : null" x-bind:aria-busy="pending === 'next' ? 'true' : null" :style="($last) ? 'display: none' : null">
                        <template x-if="pending === 'next'"><x-nq::spinner /></template>
                        {{ $l['next'] }}
                        <x-lucide-arrow-right aria-hidden="true" class="rtl:-scale-x-100" />
                    </x-nq::button>
                    <x-nq::button variant="primary" x-show="last()" x-on:click="finish()" x-bind:disabled="finishBlocked()" x-bind:data-disabled="finishBlocked() ? '' : null" x-bind:aria-busy="pending === 'finish' ? 'true' : null" :style="(! $last) ? 'display: none' : null">
                        <template x-if="pending === 'finish'"><x-nq::spinner /></template>
                        <x-lucide-circle-check aria-hidden="true" />
                        {{ $l['finish'] }}
                    </x-nq::button>
                </div>
            </footer>
        </div>
    </div>

    {{-- The completion screen --}}
    <div class="contents" x-show="done" style="display: none">
        <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <x-lucide-circle-check aria-hidden="true" class="size-6" />
        </span>
        <h2 x-ref="doneHeading" tabindex="-1" class="text-h2 text-foreground outline-none">{{ $doneTitle ?? $l['doneTitle'] }}</h2>
        <p class="text-body text-muted-foreground">{{ $doneDescription ?? $l['doneDescription'] }}</p>
        {{ $doneAction }}
    </div>
</div>
