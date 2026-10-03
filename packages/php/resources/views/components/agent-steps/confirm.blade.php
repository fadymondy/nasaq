{{-- <x-nq::agent-steps.confirm :changes="$changes" summary="The agent wants to rename the retry setting." />
     Human in the loop before the agent acts: each proposed change with its diff, a tick to leave one out, its risk, and Apply or Reject.
     Rejecting can ask for a reason. High risk changes need an extra tick before Apply. It never applies anything itself: handle the
     "apply" { ids, wait(promise) } and "reject" { reason, wait(promise) } events (bubbling), pass the work to detail.wait(promise) so the
     buttons stay busy until it settles, and resolve { error } or reject it to show a failure and keep the choice open. "decided"
     { decision } follows a successful apply or reject. Needs the Alpine runtime (@nasaqScripts).
     changes: array of { id, title, before?, after?, target?, description?, risk? (low|medium|high) }; before empty means a new item, after empty a deletion.
     changes is x-modelable. title: heading. summary: one line above the changes (or <x-slot:summary>). require-reason: make the reason mandatory when rejecting.
     default-unchecked: ids that start unticked. default-open-ids: ids whose diff starts open (default: the first). --}}
@props(['changes' => [], 'title' => null, 'summary' => null, 'requireReason' => false, 'defaultUnchecked' => [], 'defaultOpenIds' => null])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $options = array_filter([
        'requireReason' => $requireReason ? true : null,
        'defaultUnchecked' => $defaultUnchecked ?: null,
        'defaultOpenIds' => $defaultOpenIds,
    ], fn ($v) => $v !== null);
    $risks = ['low' => ['neutral', $T('Low risk', 'خطورة منخفضة')], 'medium' => ['warning', $T('Medium risk', 'خطورة متوسطة')], 'high' => ['danger', $T('High risk', 'خطورة عالية')]];
    $kinds = ['create' => ['file-plus-2', $T('New', 'جديد')], 'edit' => ['pencil', $T('Edit', 'تعديل')], 'delete' => ['file-x-2', $T('Delete', 'حذف')]];
    $panel = 'h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0';
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'agent-confirm') }}" x-data="nqAgentConfirm(@js(array_values((array) $changes)), {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="changes"
    x-id="['nq-agent-confirm']" x-bind:data-decision="decision" x-bind:aria-busy="busy !== null ? 'true' : 'false'" x-bind:aria-labelledby="$id('nq-agent-confirm', 'h')"
    {{ $attributes->except('data-slot')->cn('min-w-0 [&[data-decision]]:block') }}>
    <div x-show="decision !== null" x-cloak style="display: none">
        <div x-show="decision === 'applied'" x-cloak style="display: none">
            <x-nq::alert tone="success" role="status" :title="$T('Changes applied', 'تم تطبيق التغييرات')"><span x-text="appliedText()"></span></x-nq::alert>
        </div>
        <div x-show="decision === 'rejected'" x-cloak style="display: none">
            <x-nq::alert tone="info" role="status" :title="$T('Changes rejected', 'تم رفض التغييرات')">{{ $T('The agent was told and nothing changed.', 'أُبلغ الوكيل ولم يتغير شيء.') }}</x-nq::alert>
        </div>
    </div>
    <div x-show="decision === null" class="flex min-w-0 flex-col gap-3 rounded-floating border border-nq-warning/40 bg-card p-3 sm:p-4">
        <header class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
                <x-lucide-shield-alert aria-hidden="true" class="size-4 shrink-0 text-nq-warning-text" />
                <h4 x-bind:id="$id('nq-agent-confirm', 'h')" class="text-body-sm font-semibold text-foreground">{{ $title ?? $T('Review before applying', 'راجع قبل التطبيق') }}</h4>
                @foreach ($risks as $risk => [$variant, $label])
                    <x-nq::badge :variant="$variant" x-show="overall() === '{{ $risk }}'" x-cloak style="display: none">{{ $label }}</x-nq::badge>
                @endforeach
            </div>
            <p dir="auto" class="text-body-sm text-muted-foreground">
                {{ $summary ?? $T('The agent wants to make these changes. Nothing changes until you apply them.', 'يريد الوكيل إجراء هذه التغييرات. لن يتغير شيء حتى تطبّقها.') }}
            </p>
        </header>
        <ul class="flex flex-col gap-2">
            <template x-for="(c, i) in changes" :key="c.id">
                <li data-slot="agent-change" x-bind:data-kind="kind(c)" x-bind:data-checked="picked[c.id] ? '' : null"
                    class="rounded-control border border-border bg-background transition-opacity duration-150 ease-nq" x-bind:class="(! picked[c.id] &amp;&amp; selectable()) ? 'opacity-60' : ''">
                    <div class="flex items-start gap-3 p-3">
                        <x-nq::checkbox x-show="selectable()" x-cloak style="display: none" x-model="picked[c.id]" x-bind:disabled="busy !== null" x-bind:aria-label="$nq.t('Apply ', 'تطبيق ') + c.title" class="mt-1" />
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                @foreach ($kinds as $kind => [$icon, $label])
                                    <x-dynamic-component :component="'lucide-'.$icon" x-show="kind(c) === '{{ $kind }}'" x-cloak style="display: none" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                                @endforeach
                                <span dir="auto" class="text-body-sm font-medium text-foreground" x-text="c.title"></span>
                                <x-nq::badge variant="outline" x-text="kindText(c)"></x-nq::badge>
                                @foreach (['medium' => $risks['medium'], 'high' => $risks['high']] as $risk => [$variant, $label])
                                    <x-nq::badge :variant="$variant" x-show="c.risk === '{{ $risk }}'" x-cloak style="display: none">{{ $label }}</x-nq::badge>
                                @endforeach
                            </div>
                            <bdi x-show="c.target" x-cloak style="display: none" dir="ltr" class="truncate font-mono text-caption text-muted-foreground" x-text="c.target"></bdi>
                            <p x-show="c.description" x-cloak style="display: none" dir="auto" class="text-caption text-muted-foreground" x-text="c.description"></p>
                        </div>
                        <div class="flex shrink-0 items-center gap-2">
                            <span class="flex flex-col items-end text-caption tabular-nums sm:flex-row sm:gap-2">
                                <span class="text-nq-success-text"><span aria-hidden="true">+</span><span x-text="stats(c).added"></span><span class="sr-only" x-text="' ' + $nq.t(stats(c).added + ' added', stats(c).added + ' مضاف')"></span></span>
                                <span class="text-nq-danger-text"><span aria-hidden="true">−</span><span x-text="stats(c).removed"></span><span class="sr-only" x-text="' ' + $nq.t(stats(c).removed + ' removed', stats(c).removed + ' محذوف')"></span></span>
                            </span>
                            <button type="button" x-on:click="toggle(c, i)" x-bind:aria-expanded="isOpen(c, i) ? 'true' : 'false'"
                                x-bind:aria-label="isOpen(c, i) ? $nq.t('Hide changes', 'إخفاء التغييرات') : $nq.t('Show changes', 'عرض التغييرات')"
                                class="grid size-7 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <x-lucide-chevron-down aria-hidden="true" class="size-4 transition-transform duration-150 ease-nq" x-bind:class="isOpen(c, i) ? 'rotate-180' : ''" />
                            </button>
                        </div>
                    </div>
                    <div x-nq-presence="isOpen(c, i)" class="{{ $panel }}" style="display: none">
                        <div class="border-t border-border p-3">
                            <x-nq::agent-steps.diff items-expr="diffOf(c)" />
                        </div>
                    </div>
                </li>
            </template>
        </ul>
        <label x-show="needsReview()" x-cloak style="display: none" class="flex items-start gap-2 text-body-sm text-foreground">
            <x-nq::checkbox x-model="reviewed" x-bind:disabled="busy !== null" class="mt-0.5" />
            <span dir="auto">{{ $T('I reviewed these changes and understand they are hard to undo', 'راجعت هذه التغييرات وأدرك أن التراجع عنها صعب') }}</span>
        </label>
        <div x-show="error" x-cloak style="display: none">
            <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-2">
            <span role="status" class="text-caption text-muted-foreground" x-text="selectedText()"></span>
            <div class="flex flex-wrap items-center gap-2">
                <x-nq::button variant="ghost" x-bind:disabled="busy !== null" x-on:click="askReject()">{{ $T('Reject', 'رفض') }}</x-nq::button>
                <x-nq::button variant="primary" x-bind:disabled="! canApply()" x-bind:aria-busy="busy === 'apply' ? 'true' : null" x-bind:aria-describedby="riskHint()" x-on:click="apply()">
                    <x-lucide-loader-circle x-show="busy === 'apply'" x-cloak style="display: none" aria-hidden="true" class="animate-spin motion-reduce:animate-none" />
                    <span x-text="applyLabel()"></span>
                </x-nq::button>
            </div>
            <span x-show="needsReview() &amp;&amp; ! reviewed" x-cloak style="display: none" x-bind:id="$id('nq-agent-confirm', 'risk')" class="sr-only">{{ $T('Confirm you reviewed the high risk changes', 'أكّد أنك راجعت التغييرات عالية الخطورة') }}</span>
        </footer>
    </div>

    <template x-teleport="body">
        <div data-slot="dialog-portal" x-on:keydown.escape.window="rejecting &amp;&amp; cancelReject()">
            <div data-slot="dialog-backdrop" x-nq-presence="rejecting" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="agent-confirm-reject" role="dialog" aria-modal="true" x-nq-presence="rejecting" x-trap.noscroll="rejecting"
                class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                <div class="flex flex-col gap-1.5">
                    <h2 data-slot="dialog-title" class="text-h3 text-foreground">{{ $T('Reject these changes', 'رفض هذه التغييرات') }}</h2>
                    <p data-slot="dialog-description" class="text-body-sm text-muted-foreground">{{ $T('Tell the agent why, so it can try again. The reason is optional.', 'أخبر الوكيل بالسبب ليحاول من جديد. السبب اختياري.') }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="nq-agent-confirm-reason" class="text-label text-foreground">{{ $T('Reason', 'السبب') }}</label>
                    <textarea id="nq-agent-confirm-reason" data-slot="textarea" rows="3" x-model="reason" placeholder="{{ $T('For example, keep the old retry limit', 'مثلًا، أبقِ حد إعادة المحاولة القديم') }}" x-bind:aria-invalid="reasonMissing() ? 'true' : null"
                        class="w-full min-w-0 rounded-control border border-input bg-card px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus aria-invalid:border-nq-danger"></textarea>
                    <p data-slot="field-error" x-show="reasonMissing()" x-cloak style="display: none" class="text-caption text-nq-danger-text">{{ $T('Give a reason so the agent can adjust', 'اذكر سببًا ليتمكن الوكيل من التعديل') }}</p>
                </div>
                <div x-show="error &amp;&amp; rejecting" x-cloak style="display: none">
                    <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
                </div>
                <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <x-nq::button variant="ghost" x-bind:disabled="busy !== null" x-on:click="cancelReject()">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button variant="danger" x-bind:aria-busy="busy === 'reject' ? 'true' : null" x-on:click="reject()">{{ $T('Reject changes', 'رفض التغييرات') }}</x-nq::button>
                </div>
            </div>
        </div>
    </template>
</section>
