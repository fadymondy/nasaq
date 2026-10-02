{{-- <x-nq::seo-pages.checklist :issues="$issues" url="https://example.com/pricing" x-on:toggle-fixed="$event.detail.wait(fetch(...))" />
     The issues of one page as a checklist (React SeoIssueChecklist), most severe first, open before fixed. Each has a checkbox to mark it fixed, a severity badge, an optional detail line and a
     "How to fix" disclosure with why it matters and the fix. The score and the open count above follow the checkboxes.
     issues: [['id', 'code' (a key of the catalogue, e.g. title-missing), 'severity' (error | warning | info), 'fixed', 'detail']]. url: the page, shown under the title.
     catalog: extra or replaced issue texts: ['missing-hreflang' => ['severity' => 'warning', 'en' => ['title', 'why', 'fix'], 'ar' => ['title', 'why', 'fix']]]. The built-in one has 14 common issues, in English and Arabic.
     title: header text. toggle (true): makes the checkboxes live; false makes the list read-only. labels: array overriding the built-in words.
     A change fires toggle-fixed on the root with detail { issue, fixed (the new state), wait(promise) }. The checkbox changes at once; if the promise resolves { error } or rejects (or nobody listens) it goes
     back and an alert shows. On success the card keeps the new state, so the score and the order update by themselves.
     Differences from the React component: the list is drawn by Alpine, so it is empty until the runtime starts. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.seo-pages._logic')
@props(['issues' => [], 'url' => null, 'toggle' => true, 'catalog' => [], 'title' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'checklistTitle' => 'مشكلات للإصلاح', 'descNone' => 'تم إصلاح كل شيء في هذه الصفحة.', 'descOne' => 'مشكلة واحدة مفتوحة.', 'descMany' => '{n} مشكلات مفتوحة.',
        'scoreOf' => 'درجة SEO {n} من 100', 'error' => 'خطأ', 'warning' => 'تحذير', 'info' => 'ملاحظة', 'fixed' => 'تم الإصلاح', 'markFixed' => 'تعليم «{title}» كمُصلَح',
        'why' => 'لماذا يهم', 'howToFix' => 'كيف تصلحها', 'allFixed' => 'لا شيء للإصلاح', 'allFixedBody' => 'لا توجد مشكلات مفتوحة في هذه الصفحة.', 'actionsFailed' => 'تعذّر إكمال هذا. حاول مرة أخرى.',
    ] : [
        'checklistTitle' => 'Issues to fix', 'descNone' => 'Everything on this page is fixed.', 'descOne' => '1 issue is open.', 'descMany' => '{n} issues are open.',
        'scoreOf' => 'SEO score {n} of 100', 'error' => 'Error', 'warning' => 'Warning', 'info' => 'Notice', 'fixed' => 'Fixed', 'markFixed' => 'Mark "{title}" as fixed',
        'why' => 'Why it matters', 'howToFix' => 'How to fix', 'allFixed' => 'Nothing to fix', 'allFixedBody' => 'This page has no open issues.', 'actionsFailed' => 'Could not complete this. Try again.',
    ], (array) $labels);
    $list = array_values(array_map(fn ($i) => array_filter((array) $i, fn ($v) => $v !== null), (array) $issues));
    $kinds = array_merge(nq_seo_catalog(), (array) $catalog);
    $texts = [];
    foreach ($list as $i) {
        $kind = $kinds[$i['code']] ?? null;
        $texts[$i['code']] = $kind ? $kind[$ar ? 'ar' : 'en'] : ['title' => $i['code'], 'why' => '', 'fix' => ''];
    }
    $config = [
        'issues' => $list,
        'texts' => $texts,
        'can' => (bool) $toggle,
        'locale' => $ar ? 'ar' : 'en',
        'words' => ['failed' => $t['actionsFailed']] + array_intersect_key($t, array_flip(['scoreOf', 'descNone', 'descOne', 'descMany', 'markFixed', 'fixed', 'error', 'warning', 'info'])),
    ];
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'seo-issue-checklist') }}" x-data="nqSeoChecklist({{ \Illuminate\Support\Js::from($config) }})" {{ $attributes->except('data-slot') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['checklistTitle'] }}</x-nq::card.title>
        <x-nq::card.description>
            @if ($url)<bdi dir="ltr" class="block truncate">{{ $url }}</bdi>@endif
            <span x-text="description"></span>
        </x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        <div class="flex items-center gap-3" x-bind:data-band="band">
            <span class="text-h3 font-semibold tabular-nums" x-bind:class="band === 'good' ? 'text-nq-success-text' : (band === 'fair' ? 'text-nq-warning-text' : 'text-nq-danger-text')">
                <bdi data-slot="num" data-numeric class="tabular-nums" x-text="num(score)"></bdi>
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="text-caption text-muted-foreground" x-text="scoreText"></span>
                <div data-slot="meter" role="meter" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="score" x-bind:aria-valuetext="num(score)" x-bind:aria-label="scoreText"
                    x-bind:data-tone="band === 'good' ? 'success' : (band === 'fair' ? 'warning' : 'danger')" class="flex w-full flex-col gap-1.5">
                    <div data-slot="meter-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft h-1">
                        <div data-slot="meter-indicator" x-bind:style="'inset-inline-start:0;width:' + score + '%'"
                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"
                            x-bind:class="band === 'good' ? 'bg-nq-success' : (band === 'fair' ? 'bg-nq-warning' : 'bg-nq-danger')"></div>
                    </div>
                </div>
            </div>
        </div>
        <p role="alert" class="text-body-sm text-nq-danger-text" x-show="notice" x-text="notice" style="display: none"></p>
        <x-nq::states.empty icon="list-checks" :title="$t['allFixed']" :description="$t['allFixedBody']" x-show="items.length === 0" style="display: none" />
        <ul class="flex flex-col divide-y divide-border rounded-card border border-border" x-show="items.length !== 0">
            <template x-for="issue in rows" x-bind:key="issue.id">
                <li class="flex flex-col gap-2 p-3" x-bind:data-severity="issue.severity" x-bind:data-fixed="issue.fixed ? '' : null">
                    <x-nq::collapsible>
                        <div class="flex items-start gap-3">
                            <x-nq::checkbox class="mt-0.5" x-model="marks[issue.id]" x-bind:aria-label="markLabel(issue)" :disabled="! $toggle" />
                            <div class="flex min-w-0 flex-1 flex-col gap-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span dir="auto" x-bind:class="issue.fixed ? 'text-label text-muted-foreground line-through' : 'text-label text-foreground'" x-text="textOf(issue).title"></span>
                                    <x-nq::badge variant="success" x-show="badgeOf(issue) === 'fixed'" style="display: none">
                                        <x-lucide-circle-alert aria-hidden="true" x-show="issue.severity === 'error'" style="display: none" />
                                        <x-lucide-triangle-alert aria-hidden="true" x-show="issue.severity === 'warning'" style="display: none" />
                                        <x-lucide-info aria-hidden="true" x-show="issue.severity === 'info'" style="display: none" />
                                        <span x-text="badgeText(issue)"></span>
                                    </x-nq::badge>
                                    <x-nq::badge variant="danger" x-show="badgeOf(issue) === 'error'" style="display: none"><x-lucide-circle-alert aria-hidden="true" /><span x-text="badgeText(issue)"></span></x-nq::badge>
                                    <x-nq::badge variant="warning" x-show="badgeOf(issue) === 'warning'" style="display: none"><x-lucide-triangle-alert aria-hidden="true" /><span x-text="badgeText(issue)"></span></x-nq::badge>
                                    <x-nq::badge variant="info" x-show="badgeOf(issue) === 'info'" style="display: none"><x-lucide-info aria-hidden="true" /><span x-text="badgeText(issue)"></span></x-nq::badge>
                                </div>
                                <p dir="auto" class="text-body-sm text-muted-foreground" x-show="issue.detail" x-text="issue.detail" style="display: none"></p>
                                <x-nq::collapsible.trigger variant="link" class="w-fit text-caption text-muted-foreground hover:text-foreground">{{ $t['howToFix'] }}</x-nq::collapsible.trigger>
                            </div>
                        </div>
                        <x-nq::collapsible.panel>
                            <dl class="mt-2 flex flex-col gap-2 ps-7 text-body-sm">
                                <div>
                                    <dt class="text-caption font-medium text-muted-foreground">{{ $t['why'] }}</dt>
                                    <dd dir="auto" class="text-foreground" x-text="textOf(issue).why"></dd>
                                </div>
                                <div>
                                    <dt class="text-caption font-medium text-muted-foreground">{{ $t['howToFix'] }}</dt>
                                    <dd dir="auto" class="text-foreground" x-text="textOf(issue).fix"></dd>
                                </div>
                            </dl>
                        </x-nq::collapsible.panel>
                    </x-nq::collapsible>
                </li>
            </template>
        </ul>
    </x-nq::card.content>
</x-nq::card>
