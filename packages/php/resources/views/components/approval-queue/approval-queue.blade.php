{{-- <x-nq::approval-queue :items="$items" convert convert-label="Convert to task" />
     A pending-first queue of things waiting for a person to decide: an automation asking to run an action, a review with pass/fail
     criteria, a comment to moderate, a customer request. Each item shows who asked, when it expires, its arguments with secrets
     masked, and Approve / Reject / Convert. Rejecting asks for a reason.
     items: array of { id, kind (action|review|moderation|request), status (pending|approved|rejected|expired|converted), title, description?,
     requester?, createdAt (ms or ISO), expiresAt?, args?, redact?, criteria?: [{ id, label, met }], quote?, reason?, decidedBy?, decidedAt? }.
     convert: show the Convert button (convert-label names it). default-filter: pending (default) | decided | all. now: reference time in ms.
     optimistic: false stops the queue marking an item decided itself. The "approve" { id }, "reject" { id, reason } and "convert" { id }
     events bubble: persist the decision, then pass fresh items. items is x-modelable. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'convert' => false, 'convertLabel' => null, 'defaultFilter' => 'pending', 'now' => null, 'optimistic' => true, 'title' => null])
@php
    $options = array_filter([
        'defaultFilter' => $defaultFilter !== 'pending' ? $defaultFilter : null,
        'convert' => $convert ?: null,
        'now' => $now,
        'optimistic' => $optimistic ? null : false,
    ], fn ($v) => $v !== null);
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $kinds = ['action' => ['warning', $T('Action', 'إجراء')], 'review' => ['info', $T('Review', 'مراجعة')], 'moderation' => ['outline', $T('Moderation', 'إشراف')], 'request' => ['accent', $T('Request', 'طلب')]];
    $statuses = ['pending' => ['warning', $T('Pending', 'قيد الانتظار')], 'approved' => ['success', $T('Approved', 'تمت الموافقة')], 'rejected' => ['danger', $T('Rejected', 'مرفوض')], 'expired' => ['neutral', $T('Expired', 'منتهي')], 'converted' => ['info', $T('Converted', 'تم التحويل')]];
    $tabs = ['pending' => $T('Pending', 'قيد الانتظار'), 'decided' => $T('Decided', 'تم البت فيها'), 'all' => $T('All', 'الكل')];
    $convertText = $convertLabel ?? $T('Convert', 'تحويل');
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'approval-queue') }}" aria-label="{{ $title ?? $T('Approvals', 'الموافقات') }}" x-data="nqApprovalQueue(@js(array_values((array) $items)), {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="items"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-body-sm text-muted-foreground" aria-live="polite" x-text="waitingText()"></p>
        <div role="tablist" aria-label="{{ $T('Filter the queue', 'تصفية الطابور') }}" data-slot="tabs-list" class="inline-flex items-center gap-1 rounded-control bg-secondary p-1">
            @foreach ($tabs as $value => $label)
                <button type="button" role="tab" data-slot="tabs-tab" x-on:click="filter = '{{ $value }}'" x-bind:aria-selected="filter === '{{ $value }}'" x-bind:data-active="filter === '{{ $value }}' ? '' : null"
                    class="inline-flex h-control-sm items-center gap-1.5 rounded-control px-3 text-label text-muted-foreground outline-none transition-colors focus-visible:outline-2 focus-visible:outline-nq-focus data-active:bg-card data-active:text-foreground">
                    {{ $label }}
                    @if ($value === 'pending')
                        <span x-show="waiting() > 0" x-cloak style="display: none" class="text-caption tabular-nums text-muted-foreground" x-text="waiting()"></span>
                    @endif
                </button>
            @endforeach
        </div>
    </div>

    <div x-show="rows().length === 0" x-cloak style="display: none">
        <x-nq::states icon="circle-check" x-show="filter === 'pending'" :title="$T('You are all caught up', 'لا شيء متأخر')" :description="$T('Nothing needs a decision right now.', 'لا شيء يحتاج إلى قرار الآن.')" />
        <x-nq::states icon="shield-question" x-show="filter !== 'pending'" :title="$T('The queue is empty', 'الطابور فارغ')" :description="$T('Requests that need a decision show up here.', 'تظهر هنا الطلبات التي تحتاج إلى قرار.')" />
    </div>
    <ul x-show="rows().length > 0" aria-label="{{ $T('Approval requests', 'طلبات الموافقة') }}" class="flex flex-col gap-3">
        <template x-for="item in rows()" :key="item.id">
            <li data-slot="approval-item" x-bind:data-status="item.shown" x-bind:data-kind="item.kind">
                <x-nq::card class="gap-3 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-2">
                                @foreach ($kinds as $k => [$variant, $label])
                                    <x-nq::badge :variant="$variant" x-show="item.kind === '{{ $k }}'" x-cloak style="display: none">{{ $label }}</x-nq::badge>
                                @endforeach
                                @foreach ($statuses as $s => [$variant, $label])
                                    <x-nq::badge :variant="$variant" x-show="item.shown === '{{ $s }}'" x-cloak style="display: none">{{ $label }}</x-nq::badge>
                                @endforeach
                                <x-nq::badge variant="success" x-show="item.criteria && item.criteria.length > 0 && item.unmet === 0" x-cloak style="display: none"><x-lucide-check aria-hidden="true" />{{ $T('Pass', 'ناجح') }}</x-nq::badge>
                                <x-nq::badge variant="danger" x-show="item.criteria && item.criteria.length > 0 && item.unmet > 0" x-cloak style="display: none"><x-lucide-x aria-hidden="true" />{{ $T('Fail', 'راسب') }}</x-nq::badge>
                            </div>
                            <h3 class="text-label text-foreground" x-text="item.title"></h3>
                            <p x-show="item.description" class="text-body-sm text-muted-foreground" x-text="item.description"></p>
                        </div>
                        <dl class="flex flex-col gap-0.5 text-caption text-muted-foreground sm:items-end">
                            <div x-show="item.requester" class="flex gap-1"><dt>{{ $T('By', 'بواسطة') }}</dt><dd class="text-foreground" x-text="item.requester"></dd></div>
                            <div class="flex gap-1"><dt>{{ $T('Requested', 'طُلب') }}</dt><dd class="tabular-nums" x-text="item.createdText"></dd></div>
                            <div x-show="item.expiresText && (item.shown === 'pending' || item.shown === 'expired')" x-cloak style="display: none" class="flex items-center gap-1" x-bind:class="item.shown === 'expired' && 'text-nq-danger-text'">
                                <x-lucide-clock aria-hidden="true" class="size-3" />
                                <dt x-text="item.shown === 'expired' ? $nq.t('Expired', 'انتهى') : $nq.t('Expires', 'ينتهي')"></dt>
                                <dd class="tabular-nums" x-text="item.expiresText"></dd>
                            </div>
                        </dl>
                    </div>

                    <blockquote x-show="item.quote" x-cloak style="display: none" class="border-s-2 border-border ps-3 text-body-sm text-foreground" x-text="item.quote"></blockquote>

                    <div x-show="item.argRows.length > 0" x-cloak style="display: none" class="flex flex-col gap-1.5">
                        <p class="text-caption text-muted-foreground">{{ $T('Arguments', 'المعاملات') }}</p>
                        <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-control border border-border bg-secondary/50 p-2.5">
                            <template x-for="a in item.argRows" :key="a.key">
                                <div class="contents">
                                    <dt dir="ltr" class="text-start font-mono text-caption text-muted-foreground" x-text="a.key"></dt>
                                    <dd dir="ltr" class="flex min-w-0 items-center gap-1 break-words text-start font-mono text-caption" x-bind:class="a.redacted ? 'text-muted-foreground' : 'text-foreground'">
                                        <span x-show="a.redacted" aria-label="{{ $T('Hidden', 'مخفي') }}" class="flex"><x-lucide-eye-off class="size-3 shrink-0" /></span>
                                        <span x-text="a.value"></span>
                                    </dd>
                                </div>
                            </template>
                        </dl>
                    </div>

                    <div x-show="item.criteria && item.criteria.length > 0" x-cloak style="display: none" class="flex flex-col gap-1.5">
                        <p class="text-caption text-muted-foreground">{{ $T('Criteria', 'المعايير') }}<span x-show="item.unmet > 0" x-text="' · ' + item.unmet + ' ' + $nq.t('not met', 'غير مستوفاة')"></span></p>
                        <ul class="flex flex-col gap-1">
                            <template x-for="c in item.criteria ?? []" :key="c.id">
                                <li class="flex items-center gap-2 text-body-sm">
                                    <span x-show="c.met" aria-label="{{ $T('Pass', 'ناجح') }}" class="flex"><x-lucide-circle-check class="size-4 shrink-0 text-nq-success-text" /></span>
                                    <span x-show="!c.met" x-cloak style="display: none" aria-label="{{ $T('Fail', 'راسب') }}" class="flex"><x-lucide-circle-x class="size-4 shrink-0 text-nq-danger-text" /></span>
                                    <span x-bind:class="!c.met && 'text-nq-danger-text'" x-text="c.label"></span>
                                </li>
                            </template>
                        </ul>
                    </div>

                    <p x-show="item.shown !== 'pending' && (item.reason || item.decidedBy)" x-cloak style="display: none" class="flex flex-wrap gap-x-3 text-body-sm text-muted-foreground">
                        <span x-show="item.decidedBy">{{ $T('Decided by', 'تم البت بواسطة') }} <span class="text-foreground" x-text="item.decidedBy"></span> <span class="tabular-nums" x-text="item.decidedText"></span></span>
                        <span x-show="item.reason">{{ $T('Reason', 'السبب') }}: <span class="text-foreground" x-text="item.reason"></span></span>
                    </p>

                    <div x-show="item.decidable" x-cloak style="display: none" class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <x-nq::button variant="primary" size="sm" x-bind:disabled="!item.approvable" x-bind:aria-label="$nq.t('Approve ', 'موافقة على ') + item.title" x-bind:title="item.approvable ? null : $nq.t('Fix the unmet criteria before approving.', 'أصلح المعايير غير المستوفاة قبل الموافقة.')" x-on:click="approve(item.id)">
                            <x-lucide-check aria-hidden="true" />{{ $T('Approve', 'موافقة') }}
                        </x-nq::button>
                        <x-nq::button variant="secondary" size="sm" x-bind:aria-label="$nq.t('Reject ', 'رفض ') + item.title" x-on:click="askReject(item.id)">
                            <x-lucide-ban aria-hidden="true" />{{ $T('Reject', 'رفض') }}
                        </x-nq::button>
                        <x-nq::button variant="ghost" size="sm" x-show="convert" x-cloak style="display: none" x-bind:aria-label="{!! \Illuminate\Support\Js::from($convertText) !!} + ' ' + item.title" x-on:click="toConvert(item.id)">
                            <x-lucide-arrow-right-left aria-hidden="true" />{{ $convertText }}
                        </x-nq::button>
                        <span x-show="!item.approvable" x-cloak style="display: none" class="text-caption text-nq-danger-text">{{ $T('Fix the unmet criteria before approving.', 'أصلح المعايير غير المستوفاة قبل الموافقة.') }}</span>
                    </div>
                </x-nq::card>
            </li>
        </template>
    </ul>

    <template x-teleport="body">
        <div data-slot="dialog-portal" x-on:keydown.escape.window="rejecting && cancelReject()">
            <div data-slot="dialog-backdrop" x-nq-presence="rejecting !== null" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="approval-reject" role="dialog" aria-modal="true" x-nq-presence="rejecting !== null" x-trap.noscroll="rejecting !== null"
                class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                <div class="flex flex-col gap-1.5">
                    <h2 data-slot="dialog-title" class="text-h3 text-foreground" x-text="$nq.t('Reject ', 'رفض ') + (rejecting?.title ?? '') + '?'"></h2>
                    <p data-slot="dialog-description" class="text-body-sm text-muted-foreground">{{ $T('The person who asked will see your reason.', 'سيرى صاحب الطلب السبب الذي تكتبه.') }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="nq-approval-reason" class="text-label text-foreground">{{ $T('Reason', 'السبب') }}</label>
                    <textarea id="nq-approval-reason" data-slot="textarea" rows="3" x-model="reason" placeholder="{{ $T('Say why this is rejected', 'اذكر سبب الرفض') }}" x-bind:aria-invalid="touched && reason.trim() === '' ? 'true' : null"
                        class="w-full min-w-0 rounded-control border border-input bg-card px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus aria-invalid:border-nq-danger"></textarea>
                    <p data-slot="field-error" x-show="touched && reason.trim() === ''" x-cloak style="display: none" class="text-caption text-nq-danger-text">{{ $T('Give a reason.', 'اكتب سببًا.') }}</p>
                </div>
                <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <x-nq::button variant="ghost" x-on:click="cancelReject()">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button variant="danger" x-on:click="submitReject()">{{ $T('Reject', 'رفض') }}</x-nq::button>
                </div>
            </div>
        </div>
    </template>
</section>
