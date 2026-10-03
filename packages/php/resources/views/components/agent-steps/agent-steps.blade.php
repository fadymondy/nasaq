{{-- <x-nq::agent-steps :steps="$steps" :redact-keys="['token']" retry>  <x-slot:confirm> <x-nq::agent-steps.confirm … /> </x-slot:confirm>  </x-nq::agent-steps>
     The tool calls an agent made, planned or is waiting to make, in order. A summary line says where the run stands (working, waiting for you,
     failed, done). Each step opens to its arguments and result. A step that needs a person shows the confirm slot, so the run and the
     decision sit together. Needs the Alpine runtime (@nasaqScripts).
     steps: array of { id, label, status (pending|running|awaiting|done|error|skipped), tool?, args?, result?, error?, durationMs? }. steps is x-modelable.
     title: heading (default "Agent steps"). redact-keys: argument keys masked at any depth. default-open-ids: step ids whose details start open.
     retry: show Retry on failed steps; the "retry" { id } event bubbles. Result code is shown as json when it parses as JSON, else as plain text.
     <x-slot:confirm>: shown under every step that is awaiting approval. --}}
@props(['steps' => [], 'title' => null, 'redactKeys' => [], 'defaultOpenIds' => [], 'retry' => false, 'confirm' => null])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $options = array_filter([
        'redactKeys' => $redactKeys ?: null,
        'defaultOpenIds' => $defaultOpenIds ?: null,
        'retry' => $retry ? true : null,
    ], fn ($v) => $v !== null);
    $badges = [
        'pending' => ['outline', $T('Queued', 'في الانتظار')],
        'running' => ['info', $T('Running', 'قيد التنفيذ')],
        'awaiting' => ['warning', $T('Needs approval', 'تحتاج موافقة')],
        'done' => ['success', $T('Done', 'تمّت')],
        'error' => ['danger', $T('Failed', 'فشلت')],
        'skipped' => ['neutral', $T('Skipped', 'تم التخطي')],
    ];
    $icons = [
        'awaiting' => ['shield-question', 'text-nq-warning-text'],
        'done' => ['check', 'text-nq-success-text'],
        'error' => ['triangle-alert', 'text-nq-danger-text'],
        'skipped' => ['ban', 'text-muted-foreground'],
        'pending' => ['circle-dashed', 'text-muted-foreground'],
    ];
    $panel = 'h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'agent-steps') }}" x-data="nqAgentSteps(@js(array_values((array) $steps)), {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="steps"
    x-id="['nq-agent-steps']" x-bind:data-state="state()" x-bind:aria-labelledby="$id('nq-agent-steps', 'h')"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <header class="flex flex-wrap items-center justify-between gap-2">
        <h3 x-bind:id="$id('nq-agent-steps', 'h')" class="text-body-sm font-semibold text-foreground">{{ $title ?? $T('Agent steps', 'خطوات الوكيل') }}</h3>
        <p role="status" class="flex items-center gap-2 text-caption text-muted-foreground">
            <x-lucide-loader-circle x-show="state() === 'running'" x-cloak style="display: none" aria-hidden="true" class="size-3.5 animate-spin motion-reduce:animate-none" />
            <span x-text="summary()" x-bind:class="state() === 'awaiting' ? 'text-nq-warning-text' : (state() === 'error' ? 'text-nq-danger-text' : (state() === 'done' ? 'text-nq-success-text' : ''))"></span>
            <span x-show="totalText() !== ''" x-cloak style="display: none" dir="ltr" class="tabular-nums" x-text="totalText()"></span>
        </p>
    </header>
    <ol class="flex flex-col">
        <template x-for="s in rows()" :key="s.id">
            <li data-slot="agent-step" x-bind:data-status="s.status" class="flex gap-3">
                <div class="flex flex-col items-center">
                    <span class="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card">
                        <x-lucide-loader-circle x-show="s.status === 'running'" x-cloak style="display: none" aria-hidden="true" class="size-4 animate-spin motion-reduce:animate-none" />
                        @foreach ($icons as $status => [$icon, $tone])
                            <x-dynamic-component :component="'lucide-'.$icon" x-show="s.status === '{{ $status }}'" x-cloak style="display: none" aria-hidden="true" class="size-4 {{ $tone }}" />
                        @endforeach
                    </span>
                    <span x-show="!s.last" aria-hidden="true" class="my-1 w-px flex-1 bg-border"></span>
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-2" x-bind:class="s.last ? '' : 'pb-4'">
                    <div>
                        <div class="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
                            <span dir="auto" class="text-body-sm" x-bind:class="s.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'" x-text="s.label"></span>
                            <code x-show="s.tool" x-cloak style="display: none" dir="ltr" class="rounded-sm bg-secondary px-1 font-mono text-[0.85em] text-muted-foreground" x-text="s.tool"></code>
                            @foreach ($badges as $status => [$variant, $label])
                                <x-nq::badge :variant="$variant" x-show="s.status === '{{ $status }}'" x-cloak style="display: none">{{ $label }}</x-nq::badge>
                            @endforeach
                            <span x-show="s.duration !== ''" x-cloak style="display: none" dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-text="s.duration"></span>
                            <span class="flex-1"></span>
                            <x-nq::button size="sm" variant="secondary" x-show="showRetry(s)" x-cloak style="display: none" x-on:click="retry(s.id)">{{ $T('Retry', 'إعادة المحاولة') }}</x-nq::button>
                            <button type="button" x-show="s.hasDetails" x-cloak style="display: none" x-on:click="toggle(s)" x-bind:aria-expanded="s.open ? 'true' : 'false'"
                                x-bind:aria-label="s.open ? $nq.t('Hide details', 'إخفاء التفاصيل') : $nq.t('Show details', 'عرض التفاصيل')"
                                class="grid size-6 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <x-lucide-chevron-down aria-hidden="true" class="size-4 transition-transform duration-150 ease-nq" x-bind:class="s.open ? 'rotate-180' : ''" />
                            </button>
                        </div>
                        <div x-show="s.hasDetails" x-nq-presence="s.open" class="{{ $panel }}" style="display: none">
                            <div class="mt-2 flex flex-col gap-2">
                                <div x-show="s.error" x-cloak style="display: none">
                                    <x-nq::alert tone="danger" :title="$T('Error', 'الخطأ')"><span dir="auto" x-text="s.error"></span></x-nq::alert>
                                </div>
                                <div x-show="s.argsText !== ''" x-cloak style="display: none" class="flex flex-col gap-1">
                                    <span class="text-caption text-muted-foreground">{{ $T('Arguments', 'المعاملات') }}</span>
                                    <x-nq::code-block code="" language="json" :label="$T('Arguments', 'المعاملات')" pre-class="max-h-48" code-expr="s.argsText" />
                                </div>
                                <div x-show="s.result" x-cloak style="display: none" class="flex flex-col gap-1">
                                    <span class="text-caption text-muted-foreground">{{ $T('Result', 'النتيجة') }}</span>
                                    <div x-show="s.lang === 'json'" x-cloak style="display: none">
                                        <x-nq::code-block code="" language="json" :label="$T('Result', 'النتيجة')" pre-class="max-h-48" code-expr="s.result ?? ''" />
                                    </div>
                                    <div x-show="s.lang !== 'json'" x-cloak style="display: none">
                                        <x-nq::code-block code="" language="text" :label="$T('Result', 'النتيجة')" pre-class="max-h-48" code-expr="s.result ?? ''" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    @if ($confirm !== null && ! $confirm->isEmpty())
                        <template x-if="s.status === 'awaiting'">
                            <div>{{ $confirm }}</div>
                        </template>
                    @endif
                </div>
            </li>
        </template>
    </ol>
</section>
