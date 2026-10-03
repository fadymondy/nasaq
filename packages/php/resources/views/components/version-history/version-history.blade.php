{{-- <x-nq::version-history :versions="$versions" language="json" restorable x-on:nq-version-restore="$event.detail.waitUntil(restore($event.detail.id))" />
     Saved versions newest first. Choose one to read it (read-only), compare it with the previous version, the current one or any other,
     and restore it after a confirmation. It only draws the history; you save the restore on the server.
     versions: [['id' => 'v2', 'version' => 2, 'savedAt' => $date (DateTime, timestamp or string), 'author' => 'Sara', 'note' => 'What changed', 'content' => '...text...']].
     current-id: the live version (default: the newest). default-selected-id: start with one open. language: syntax for the preview (default text). loading.
     restorable: show "Restore this version" on every version but the current one.
     Restoring is yours: listen for nq-version-restore ({ id }) on it and call event.detail.waitUntil(promise).
     Resolve { error: "…" } or reject to show the message; the confirmation closes either way.
     Selecting dispatches nq-version-select ({ id }, id is null when closed). Slot `preview`: not available (content is text); the changes view is always the line diff.
     labels: an array overriding any built-in string (list, version ("Version :n"), current, by ("by :name"), none, noneBody, pick, pickBody, back, preview, changes,
     readOnly, compareWith, previous, currentVersion, noPrevious, identical, added (":n added"), removed, unchanged (":n unchanged lines"), lineAdded, lineRemoved,
     restore, restoring, restoreTitle ("Restore version :n?"), restoreBody, restoreConfirm, cancel, diffLabel).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['versions' => [], 'currentId' => null, 'defaultSelectedId' => null, 'restorable' => false, 'language' => 'text', 'loading' => false, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $l = array_merge([
        'list' => $t('Versions', 'النسخ'),
        'version' => $t('Version :n', 'النسخة :n'),
        'current' => $t('Current', 'الحالية'),
        'by' => $t('by :name', 'بواسطة :name'),
        'none' => $t('No versions yet', 'لا نسخ بعد'),
        'noneBody' => $t('Every save will show up here, newest first.', 'ستظهر كل عملية حفظ هنا، الأحدث أولًا.'),
        'pick' => $t('Choose a version', 'اختر نسخة'),
        'pickBody' => $t('Pick a version to read it, compare it and restore it.', 'اختر نسخة لقراءتها ومقارنتها واستعادتها.'),
        'back' => $t('Back to versions', 'العودة إلى النسخ'),
        'preview' => $t('Preview', 'معاينة'),
        'changes' => $t('Changes', 'التغييرات'),
        'readOnly' => $t('Read only', 'للقراءة فقط'),
        'compareWith' => $t('Compare with', 'قارن مع'),
        'previous' => $t('Previous version', 'النسخة السابقة'),
        'currentVersion' => $t('Current version', 'النسخة الحالية'),
        'noPrevious' => $t('This is the first version. There is nothing to compare it with.', 'هذه أول نسخة، فلا شيء لمقارنتها به.'),
        'identical' => $t('No differences.', 'لا اختلافات.'),
        'added' => $t(':n added', ':n مضاف'),
        'removed' => $t(':n removed', ':n محذوف'),
        'unchanged' => $t(':n unchanged lines', ':n أسطر دون تغيير'),
        'lineAdded' => $t('Added', 'مضاف'),
        'lineRemoved' => $t('Removed', 'محذوف'),
        'restore' => $t('Restore this version', 'استعادة هذه النسخة'),
        'restoring' => $t('Restoring', 'جارٍ الاستعادة'),
        'restoreTitle' => $t('Restore version :n?', 'استعادة النسخة :n؟'),
        'restoreBody' => $t('Restoring saves it as a new version on top. Nothing is deleted, and you can go back.', 'تُحفظ الاستعادة كنسخة جديدة فوق الحالية. لا يُحذف شيء ويمكنك الرجوع.'),
        'restoreConfirm' => $t('Restore', 'استعادة'),
        'cancel' => $t('Cancel', 'إلغاء'),
        'diffLabel' => $t('Differences', 'الاختلافات'),
        'failed' => $t('Could not restore. Try again.', 'تعذّرت الاستعادة. حاول مرة أخرى.'),
    ], (array) $labels);
    $vs = collect($versions)->map(fn ($v) => (array) $v)->map(fn ($v) => $v + ['_ts' => \Carbon\Carbon::parse($v['savedAt'] instanceof \DateTimeInterface ? $v['savedAt']->format('c') : (is_numeric($v['savedAt']) ? \Carbon\Carbon::createFromTimestamp($v['savedAt'])->format('c') : $v['savedAt']))->getTimestamp()])
        ->sort(fn ($a, $b) => [$b['_ts'], $b['version']] <=> [$a['_ts'], $a['version']])->values();
    $liveId = $currentId ?? ($vs->first()['id'] ?? null);
    $selectedStart = $defaultSelectedId !== null && $vs->contains('id', $defaultSelectedId) ? $defaultSelectedId : null;
    $config = [
        'versions' => $vs->map(fn ($v) => ['id' => (string) $v['id'], 'version' => (int) $v['version'], 'content' => (string) ($v['content'] ?? '')])->all(),
        'liveId' => $liveId === null ? null : (string) $liveId,
        'selected' => $selectedStart === null ? null : (string) $selectedStart,
        'restorable' => (bool) $restorable,
        't' => ['version' => $l['version'], 'added' => $l['added'], 'removed' => $l['removed'], 'unchanged' => $l['unchanged'], 'restoreTitle' => $l['restoreTitle'], 'failed' => $l['failed']],
    ];
    $fill = fn (string $s, string|int $n) => str_replace(':n', (string) $n, $s);
    $dateFmt = ['date-style' => 'medium', 'time-style' => 'short'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'version-history') }}" x-data="nqVersionHistory(@js($config))" x-id="['nq-vh-compare']" @if ($loading) aria-busy="true" @endif
    {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start') }}>
    <section aria-label="{{ $l['list'] }}" x-bind:class="selected !== null ? 'hidden lg:block' : ''" class="min-w-0 rounded-card border border-border bg-card">
        @if ($loading)
            <div class="flex flex-col gap-2 p-3">
                @for ($i = 0; $i < 3; $i++)<x-nq::states.skeleton class="h-16" />@endfor
            </div>
        @elseif ($vs->isEmpty())
            <x-nq::states icon="history" :title="$l['none']" :description="$l['noneBody']" />
        @else
            <ol class="divide-y divide-border">
                @foreach ($vs as $v)
                    <li data-version-row="{{ $v['version'] }}" x-bind:class="selected === @js((string) $v['id']) ? 'bg-nq-selected' : ''">
                        <button type="button" x-bind:aria-pressed="selected === @js((string) $v['id']) ? 'true' : 'false'" x-on:click="toggle(@js((string) $v['id']))"
                            class="block w-full px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                            <span class="flex flex-wrap items-center gap-2">
                                <span class="text-label text-foreground">{{ $fill($l['version'], $v['version']) }}</span>
                                @if ((string) $v['id'] === (string) $liveId)<x-nq::badge variant="success">{{ $l['current'] }}</x-nq::badge>@endif
                            </span>
                            <span class="block text-caption text-muted-foreground">
                                <x-nq::numeric.date-time :value="$v['savedAt']" date-style="medium" time-style="short" />
                                @if (! empty($v['author'])) · {{ str_replace(':name', $v['author'], $l['by']) }}@endif
                            </span>
                            @if (! empty($v['note']))<span dir="auto" class="mt-1 block text-body-sm text-foreground">{{ $v['note'] }}</span>@endif
                        </button>
                    </li>
                @endforeach
            </ol>
        @endif
    </section>

    <section x-bind:class="selected === null ? 'hidden lg:block' : ''" x-bind:aria-label="selected === null ? @js($l['pick']) : versionLabel(current)" class="min-w-0 rounded-card border border-border bg-card p-4">
        <div x-show="selected === null" @if ($selectedStart !== null) style="display: none" @endif>
            <x-nq::states icon="history" :title="$l['pick']" :description="$l['pickBody']" />
        </div>
        <div x-show="selected !== null" @if ($selectedStart === null) style="display: none" @endif class="flex flex-col gap-4">
            <header class="flex flex-wrap items-start gap-3">
                <x-nq::button variant="ghost" size="icon-sm" class="lg:hidden" aria-label="{{ $l['back'] }}" title="{{ $l['back'] }}" x-on:click="toggle(null)">
                    <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                </x-nq::button>
                <div class="min-w-0 flex-1">
                    @foreach ($vs as $v)
                        <div x-show="selected === @js((string) $v['id'])" @if ($selectedStart !== (string) $v['id']) style="display: none" @endif>
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="text-h4 text-foreground">{{ $fill($l['version'], $v['version']) }}</h2>
                                @if ((string) $v['id'] === (string) $liveId)
                                    <x-nq::badge variant="success">{{ $l['current'] }}</x-nq::badge>
                                @else
                                    <x-nq::badge variant="outline">{{ $l['readOnly'] }}</x-nq::badge>
                                @endif
                            </div>
                            <p class="text-body-sm text-muted-foreground">
                                <x-nq::numeric.date-time :value="$v['savedAt']" date-style="medium" time-style="short" />
                                @if (! empty($v['author'])) · {{ str_replace(':name', $v['author'], $l['by']) }}@endif
                            </p>
                            @if (! empty($v['note']))<p dir="auto" class="mt-1 text-body-sm text-foreground">{{ $v['note'] }}</p>@endif
                        </div>
                    @endforeach
                </div>
                @if ($restorable)
                    <x-nq::alert-dialog x-model="dialogOpen">
                        <x-nq::alert-dialog.trigger variant="primary" size="sm" x-show="canRestore" style="display: none">
                            <x-lucide-rotate-ccw aria-hidden="true" />
                            {{ $l['restore'] }}
                        </x-nq::alert-dialog.trigger>
                        <x-nq::alert-dialog.content>
                            <x-nq::alert-dialog.header>
                                <x-nq::alert-dialog.title><span x-text="restoreTitle"></span></x-nq::alert-dialog.title>
                                <x-nq::alert-dialog.description>{{ $l['restoreBody'] }}</x-nq::alert-dialog.description>
                            </x-nq::alert-dialog.header>
                            <x-nq::alert-dialog.footer>
                                <x-nq::alert-dialog.cancel x-bind:disabled="busy">{{ $l['cancel'] }}</x-nq::alert-dialog.cancel>
                                <x-nq::button variant="primary" data-slot="version-restore-confirm" x-on:click="restore()"
                                    x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                                    <template x-if="busy"><x-nq::spinner /></template>
                                    <span x-text="busy ? @js($l['restoring']) : @js($l['restoreConfirm'])"></span>
                                </x-nq::button>
                            </x-nq::alert-dialog.footer>
                        </x-nq::alert-dialog.content>
                    </x-nq::alert-dialog>
                @endif
            </header>
            <p role="alert" x-show="error" x-text="error" style="display: none" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text"></p>
            <x-nq::tabs default-value="preview">
                <x-nq::tabs.list variant="underline">
                    <x-nq::tabs.tab value="preview">{{ $l['preview'] }}</x-nq::tabs.tab>
                    <x-nq::tabs.tab value="changes">{{ $l['changes'] }}</x-nq::tabs.tab>
                </x-nq::tabs.list>
                <x-nq::tabs.panel value="preview">
                    @foreach ($vs as $v)
                        <div x-show="selected === @js((string) $v['id'])" @if ($selectedStart !== (string) $v['id']) style="display: none" @endif>
                            <x-nq::code-block :code="$v['content'] ?? ''" :language="$language" :label="$fill($l['version'], $v['version'])" pre-class="max-h-[28rem]" />
                        </div>
                    @endforeach
                </x-nq::tabs.panel>
                <x-nq::tabs.panel value="changes">
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="text-label text-foreground" x-bind:id="$id('nq-vh-compare')">{{ $l['compareWith'] }}</span>
                            <x-nq::select value="previous" x-model="baseline">
                                <x-nq::select.trigger x-bind:aria-labelledby="$id('nq-vh-compare')" class="w-56">
                                    <x-nq::select.value />
                                </x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="previous">{{ $l['previous'] }}</x-nq::select.item>
                                    <x-nq::select.item value="current">{{ $l['currentVersion'] }}</x-nq::select.item>
                                    @foreach ($vs as $v)
                                        <x-nq::select.item :value="(string) $v['id']" x-show="selected !== {!! \Illuminate\Support\Js::from((string) $v['id']) !!}">{{ $fill($l['version'], $v['version']) }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                            <span x-show="showStats" style="display: none" class="flex gap-2 text-body-sm tabular-nums" aria-live="polite">
                                <span class="text-nq-success-text" x-text="'+ ' + fill(@js($l['added']), stats.added)"></span>
                                <span class="text-nq-danger-text" x-text="'− ' + fill(@js($l['removed']), stats.removed)"></span>
                            </span>
                        </div>
                        <p x-show="base === null" class="text-body-sm text-muted-foreground">{{ $l['noPrevious'] }}</p>
                        <p x-show="showIdentical" style="display: none" class="text-body-sm text-muted-foreground">{{ $l['identical'] }}</p>
                        <div x-show="showStats" style="display: none" dir="ltr" role="table" aria-label="{{ $l['diffLabel'] }}" data-slot="version-diff"
                            class="overflow-x-auto rounded-control border border-border font-mono text-code">
                            <template x-for="(it, i) in items" :key="i">
                                <div>
                                    <div x-show="it.type === 'gap'" role="row" dir="auto" class="bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground" x-text="fill(@js($l['unchanged']), it.count)"></div>
                                    <div x-show="it.type !== 'gap'" role="row" x-bind:data-diff="it.type === 'gap' ? null : it.type" x-bind:class="rowClass(it)">
                                        <span role="cell" aria-hidden="true" class="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums" x-text="it.oldLine ?? ''"></span>
                                        <span role="cell" aria-hidden="true" class="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums" x-text="it.newLine ?? ''"></span>
                                        <span role="cell" class="w-6 shrink-0 select-none text-center font-semibold" x-bind:aria-label="it.type === 'add' ? @js($l['lineAdded']) : (it.type === 'del' ? @js($l['lineRemoved']) : null)"
                                            x-text="it.type === 'add' ? '+' : (it.type === 'del' ? '−' : '')"></span>
                                        <span role="cell" class="whitespace-pre pe-3 text-foreground" x-text="it.text || ' '"></span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </x-nq::tabs.panel>
            </x-nq::tabs>
        </div>
    </section>
</div>
