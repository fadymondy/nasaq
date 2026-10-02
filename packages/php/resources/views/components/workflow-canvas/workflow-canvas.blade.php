{{-- <x-nq::workflow-canvas title="New workflow" :value="$graph" :types="$types" :categories="$categories" saveable x-on:nq-workflow-save="…" />
     An editable workflow: nodes with a status, a "what happens next" picker, a side panel to configure each step, a minimap, zoom controls,
     validation and an execution overlay that draws how a past run went (and replays it). The graph is hand-drawn (SVG edges, positioned nodes,
     pointer events); there is no graph library. The canvas stays left-to-right in Arabic, the toolbar and panels follow the page.
     value: { nodes: [{ id, type, label?, config, position? }], edges: [{ id, source, target, sourceHandle?, label? }] }
     types: [{ id, label, description?, category, icon? (a lucide name), role? ('trigger'), fields?, defaults?, outputs?, keywords? }]
            field: { name, label, kind: text | textarea | number | boolean | select | url | code, required?, placeholder?, help?, options? }
     categories: [{ id, label }] (group headings, in order). runs: [{ id, status, startedAt, durationMs?, trigger?, nodes: { nodeId: { status, durationMs?, items?, output?, error? } } }]
     versions: [{ version, savedAt, author?, note?, graph }]. current-version, direction (horizontal | vertical), read-only, default-run-id, height.
     saveable / runnable / restorable show the Save, Run and Restore buttons; you answer them with events (all bubble from the root):
       nq-workflow-change   detail { graph }                       nq-workflow-save / nq-workflow-run   detail { graph, waitUntil(promise) }
       nq-workflow-restore  detail { version, waitUntil(promise) } resolve { error: "…" } or reject to show why it failed.
     labels: an array overriding any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'value' => ['nodes' => [], 'edges' => []],
    'types' => [],
    'categories' => null,
    'title' => null,
    'runs' => null,
    'versions' => null,
    'currentVersion' => null,
    'direction' => 'horizontal',
    'readOnly' => false,
    'defaultRunId' => null,
    'height' => null,
    'saveable' => false,
    'runnable' => false,
    'restorable' => false,
    'labels' => [],
])
@php
    $rtl = \Nasaq\Nasaq::rtl();
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $s = array_replace_recursive([
        'canvas' => $t('Workflow canvas', 'لوحة سير العمل'),
        'addStep' => $t('Add step', 'إضافة خطوة'),
        'validate' => $t('Validation', 'التحقق'),
        'noProblems' => $t('No problems found', 'لا توجد مشكلات'),
        'problems' => $t(':n to fix', ':n للإصلاح'),
        'runs' => $t('Executions', 'التنفيذات'),
        'versions' => $t('Versions', 'الإصدارات'),
        'run' => $t('Run', 'تشغيل'),
        'save' => $t('Save', 'حفظ'),
        'saving' => $t('Saving', 'جارٍ الحفظ'),
        'saved' => $t('Saved', 'تم الحفظ'),
        'unsaved' => $t('Unsaved changes', 'تغييرات غير محفوظة'),
        'tidy' => $t('Tidy up', 'ترتيب تلقائي'),
        'readOnly' => $t('Read only', 'للقراءة فقط'),
        'runBlocked' => $t('Fix the errors before running', 'أصلح الأخطاء قبل التشغيل'),
        'previewing' => $t('Previewing version :v. Editing is off.', 'معاينة الإصدار :v. التعديل متوقف.'),
        'exitPreview' => $t('Back to current', 'العودة إلى الحالي'),
        'pickerTitle' => $t('What happens next?', 'ماذا يحدث بعد ذلك؟'),
        'pickerStart' => $t('Choose how this workflow starts.', 'اختر كيف يبدأ سير العمل هذا.'),
        'pickerAfter' => $t('Choose a step to add after :name.', 'اختر خطوة لإضافتها بعد :name.'),
        'pickerSearch' => $t('Search steps', 'ابحث في الخطوات'),
        'pickerNone' => $t('No step matches ":q".', 'لا توجد خطوة تطابق ":q".'),
        'close' => $t('Close', 'إغلاق'),
        'settings' => $t('Settings', 'الإعدادات'),
        'output' => $t('Output', 'المخرجات'),
        'name' => $t('Name', 'الاسم'),
        'nameHelp' => $t("Shown on the node. Leave empty to use the step's own name.", 'يظهر على العقدة. اتركه فارغًا لاستخدام اسم الخطوة نفسها.'),
        'noFields' => $t('This step has no settings.', 'هذه الخطوة بلا إعدادات.'),
        'unknownType' => $t('Unknown step', 'خطوة غير معروفة'),
        'remove' => $t('Remove step', 'حذف الخطوة'),
        'addNext' => $t('Add next step', 'إضافة الخطوة التالية'),
        'required' => $t('Required', 'مطلوب'),
        'noOutput' => $t('Nothing to show. This step did not run in the selected execution.', 'لا شيء لعرضه. لم تعمل هذه الخطوة في التنفيذ المحدد.'),
        'runStatus' => $t('Status', 'الحالة'),
        'duration' => $t('Duration', 'المدة'),
        'items' => $t('Items', 'العناصر'),
        'errorLabel' => $t('Error', 'الخطأ'),
        'insertHere' => $t('Insert a step here', 'أدرج خطوة هنا'),
        'addAfter' => $t('Add a step after :name', 'أضف خطوة بعد :name'),
        'runsTitle' => $t('Executions', 'التنفيذات'),
        'runsHint' => $t('Pick one to see how it ran on the canvas.', 'اختر تنفيذًا لترى كيف جرى على اللوحة.'),
        'runsNone' => $t('No executions yet. Run the workflow to see one here.', 'لا تنفيذات بعد. شغّل سير العمل لتظهر هنا.'),
        'replay' => $t('Replay', 'إعادة التشغيل'),
        'stopReplay' => $t('Stop', 'إيقاف'),
        'clearOverlay' => $t('Hide overlay', 'إخفاء الطبقة'),
        'seconds' => $t(':n s', ':n ث'),
        'minutes' => $t(':n min', ':n د'),
        'milliseconds' => $t(':n ms', ':n م.ث'),
        'versionsTitle' => $t('Version history', 'سجل الإصدارات'),
        'versionsHint' => $t('Every save, newest first. Preview one on the canvas, then restore it.', 'كل عملية حفظ، الأحدث أولًا. عاين إصدارًا على اللوحة ثم استرجعه.'),
        'versionLabel' => $t('Version :v', 'الإصدار :v'),
        'current' => $t('Current', 'الحالي'),
        'preview' => $t('Preview', 'معاينة'),
        'restore' => $t('Restore', 'استرجاع'),
        'restoring' => $t('Restoring', 'جارٍ الاسترجاع'),
        'restoreTitle' => $t('Restore version :v?', 'استرجاع الإصدار :v؟'),
        'restoreBody' => $t('The current workflow is saved as a new version first, so you can come back to it.', 'يُحفظ سير العمل الحالي كإصدار جديد أولًا، فيمكنك العودة إليه.'),
        'cancel' => $t('Cancel', 'إلغاء'),
        'by' => $t('by :name', 'بواسطة :name'),
        'zoomIn' => $t('Zoom in', 'تكبير'),
        'zoomOut' => $t('Zoom out', 'تصغير'),
        'fit' => $t('Fit to view', 'ملاءمة العرض'),
        'lock' => $t('Lock the canvas', 'قفل اللوحة'),
        'unlock' => $t('Unlock the canvas', 'فتح اللوحة'),
        'minimap' => $t('Overview map', 'خريطة عامة'),
        'failed' => $t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'status' => [
            'idle' => $t('Not run', 'لم يعمل'),
            'running' => $t('Running', 'قيد التشغيل'),
            'success' => $t('Succeeded', 'نجح'),
            'error' => $t('Failed', 'فشل'),
            'skipped' => $t('Skipped', 'تم تخطيه'),
            'waiting' => $t('Waiting', 'بالانتظار'),
        ],
        'issue' => [
            'empty' => $t('The workflow is empty. Add a trigger to start it.', 'سير العمل فارغ. أضف مُشغِّلًا ليبدأ.'),
            'no-trigger' => $t('There is no trigger. Add a step that starts the workflow.', 'لا يوجد مُشغِّل. أضف خطوة تبدأ سير العمل.'),
            'multiple-triggers' => $t(':node is a second trigger. A workflow has one.', ':node مُشغِّل ثانٍ. لسير العمل مُشغِّل واحد فقط.'),
            'unknown-type' => $t(':node uses a step that is not installed.', ':node تستخدم خطوة غير مثبّتة.'),
            'missing-field' => $t(':node needs ":field".', ':node تحتاج إلى ":field".'),
            'unreachable' => $t(':node is not connected to the trigger, so it never runs.', ':node غير متصلة بالمُشغِّل، فلن تعمل.'),
            'cycle' => $t(':node is part of a loop. Steps cannot lead back to themselves.', ':node جزء من حلقة. لا يمكن لخطوة أن تعود إلى نفسها.'),
            'trigger-input' => $t(':node is a trigger, so nothing can lead into it.', ':node مُشغِّل، فلا يمكن توصيل شيء بها.'),
        ],
    ], $labels);

    // Empty PHP arrays encode as [] in JSON; the runtime wants objects where a map is meant.
    $obj = fn ($v) => (object) ($v ?? []);
    $graphOf = fn ($g) => [
        'nodes' => array_map(fn ($n) => array_merge($n, ['config' => $obj($n['config'] ?? [])]), $g['nodes'] ?? []),
        'edges' => array_values($g['edges'] ?? []),
    ];
    $stepTypes = array_map(fn ($ty) => array_merge($ty, ['defaults' => $obj($ty['defaults'] ?? [])]), array_values($types));

    // Icons (and the status glyphs) are rendered here, since the browser has no icon set.
    $icon = fn (string $name, string $class = 'size-4') => svg('lucide-'.$name, $class, ['aria-hidden' => 'true'])->toHtml();
    $icons = ['__unknown' => $icon('circle-alert')];
    foreach ($stepTypes as $ty) {
        $icons[$ty['id']] = $icon($ty['icon'] ?? 'circle-alert');
    }
    $glyphs = [
        'idle' => '',
        'running' => \Illuminate\Support\Facades\Blade::render('<x-nq::spinner class="shrink-0" />'),
        'success' => $icon('circle-check', 'size-4 shrink-0'),
        'error' => $icon('circle-x', 'size-4 shrink-0'),
        'skipped' => $icon('circle-minus', 'size-4 shrink-0'),
        'waiting' => $icon('clock', 'size-4 shrink-0'),
    ];
    // Listed here (not built in the script) so Tailwind sees the classes.
    $border = ['idle' => 'border-border', 'running' => 'border-nq-info', 'success' => 'border-nq-success', 'error' => 'border-nq-danger', 'skipped' => 'border-border border-dashed', 'waiting' => 'border-nq-warning'];
    $tone = ['idle' => 'text-muted-foreground', 'running' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'error' => 'text-nq-danger-text', 'skipped' => 'text-muted-foreground', 'waiting' => 'text-nq-warning-text'];

    $runList = $runs === null ? null : array_map(fn ($r) => array_merge($r, [
        'startedAt' => \Carbon\Carbon::parse($r['startedAt'])->toIso8601String(),
        'nodes' => $obj(array_map(fn ($nr) => array_merge($nr, isset($nr['output']) && is_array($nr['output']) ? ['output' => $nr['output'] ?: (object) []] : []), $r['nodes'] ?? [])),
        'dateHtml' => \Illuminate\Support\Facades\Blade::render('<x-nq::numeric.date-time :value="$d" relative />', ['d' => $r['startedAt']]),
    ]), array_values($runs));
    $versionList = $versions === null ? null : array_map(fn ($v) => array_merge($v, [
        'savedAt' => \Carbon\Carbon::parse($v['savedAt'])->toIso8601String(),
        'graph' => $graphOf($v['graph'] ?? []),
        'dateHtml' => \Illuminate\Support\Facades\Blade::render('<x-nq::numeric.date-time :value="$d" date-style="medium" time-style="short" />', ['d' => $v['savedAt']]),
    ]), array_values($versions));

    $graph = $graphOf($value);
    $empty = count($graph['nodes']) === 0;
    $editable = ! $readOnly;
    $config = [
        'graph' => $graph,
        'types' => $stepTypes,
        'categories' => $categories,
        'runs' => $runList,
        'versions' => $versionList,
        'currentVersion' => $currentVersion,
        'direction' => $direction,
        'readOnly' => (bool) $readOnly,
        'saveable' => (bool) $saveable,
        'runnable' => (bool) $runnable,
        'restorable' => (bool) $restorable,
        'defaultRunId' => $defaultRunId,
        'rtl' => $rtl,
        'icons' => $icons,
        'glyphs' => $glyphs,
        'border' => $border,
        'tone' => $tone,
        't' => $s,
    ];
    $style = 'height: '.(is_numeric($height) ? $height.'px' : ($height ?? '100%')).'; min-height: 480px';
    $dir = $rtl ? 'rtl' : 'ltr';
    $handle = 'absolute size-2.5 rounded-full border border-nq-line-strong bg-card';
    $round = 'flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus';
    $row = 'flex w-full items-center gap-3 px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
    $field = 'flex flex-col gap-1.5';
    $control = 'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'workflow-canvas') }}" dir="{{ $dir }}" style="{{ $style }}" x-data="nqWorkflowCanvas(@js($config))" x-on:keydown="onKey($event)"
    {{ $attributes->except(['data-slot', 'style'])->cn('relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background') }}>
    <div role="toolbar" aria-label="{{ $s['canvas'] }}" class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        @if ($title)<h2 class="me-2 min-w-0 truncate text-label text-foreground">{{ $title }}</h2>@endif
        <x-nq::badge variant="warning" x-show="dirty" style="display: none">{{ $s['unsaved'] }}</x-nq::badge>
        @if ($saveable)<x-nq::badge variant="neutral" x-show="!dirty">{{ $s['saved'] }}</x-nq::badge>@endif
        @if ($readOnly)<x-nq::badge variant="neutral">{{ $s['readOnly'] }}</x-nq::badge>@endif
        <div class="ms-auto flex flex-wrap items-center gap-2">
            <x-nq::button variant="secondary" size="sm" x-show="editable" x-bind:disabled="pickerTypesCount === 0" x-on:click="openPicker()" :style="$editable ? null : 'display: none'">
                <x-lucide-plus aria-hidden="true" />
                {{ $s['addStep'] }}
            </x-nq::button>
            <x-nq::button variant="ghost" size="sm" x-show="editable" x-bind:disabled="nodes.length === 0" x-on:click="tidy()" :style="$editable ? null : 'display: none'">
                <x-lucide-wand-2 aria-hidden="true" />
                {{ $s['tidy'] }}
            </x-nq::button>
            <x-nq::popover data-slot="workflow-validation">
                <x-nq::popover.trigger variant="ghost" size="sm" aria-label="{{ $s['validate'] }}">
                    <x-lucide-shield-check aria-hidden="true" class="text-nq-success-text" x-show="problems.length === 0" />
                    <x-lucide-triangle-alert aria-hidden="true" class="text-nq-warning-text" x-show="problems.length !== 0" style="display: none" x-bind:class="errorCount === 0 ? 'text-nq-warning-text' : 'text-nq-danger-text'" />
                    <span x-text="problems.length === 0 ? t.validate : problemsText">{{ $s['validate'] }}</span>
                </x-nq::popover.trigger>
                <x-nq::popover.content align="end" class="w-80">
                    <p x-show="problems.length === 0" class="flex items-center gap-2 text-body-sm">
                        <x-lucide-shield-check aria-hidden="true" class="size-4 text-nq-success-text" />
                        {{ $s['noProblems'] }}
                    </p>
                    <ul x-show="problems.length !== 0" style="display: none" class="flex flex-col gap-1" aria-label="{{ $s['validate'] }}">
                        <template x-for="p in problems" :key="p.key">
                            <li>
                                <button type="button" :disabled="!p.nodeId" x-on:click="goIssue(p); close()"
                                    class="flex w-full items-start gap-2 rounded-control p-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent">
                                    <x-lucide-triangle-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0" x-bind:class="p.error ? 'text-nq-danger-text' : 'text-nq-warning-text'" />
                                    <span x-text="p.text"></span>
                                </button>
                            </li>
                        </template>
                    </ul>
                </x-nq::popover.content>
            </x-nq::popover>
                <x-nq::button variant="ghost" size="sm" x-show="cfg.runs !== null" :style="$runs === null ? 'display: none' : null" x-bind:aria-pressed="panelKind === 'runs'" x-bind:class="panelKind === 'runs' ? 'border-border bg-card' : ''" x-on:click="togglePanel('runs')">
                    <x-lucide-list-checks aria-hidden="true" />
                    {{ $s['runs'] }}
                </x-nq::button>
                <x-nq::button variant="ghost" size="sm" x-show="cfg.versions !== null" :style="$versions === null ? 'display: none' : null" x-bind:aria-pressed="panelKind === 'versions'" x-bind:class="panelKind === 'versions' ? 'border-border bg-card' : ''" x-on:click="togglePanel('versions')">
                    <x-lucide-history aria-hidden="true" />
                    {{ $s['versions'] }}
                </x-nq::button>
            @if ($saveable)
                <x-nq::button variant="secondary" size="sm" x-show="editable" x-bind:disabled="saveDisabled" x-on:click="save()" :style="$editable ? null : 'display: none'">
                    <x-nq::spinner x-show="busy === 'save'" style="display: none" />
                    <x-lucide-save aria-hidden="true" x-show="busy !== 'save'" />
                    <span x-text="busy === 'save' ? t.saving : t.save">{{ $s['save'] }}</span>
                </x-nq::button>
            @endif
            @if ($runnable)
                <x-nq::button variant="primary" size="sm" x-show="!previewing" x-bind:disabled="runDisabled" x-bind:title="errorCount === 0 ? null : t.runBlocked" x-on:click="startRun()">
                    <x-nq::spinner x-show="busy === 'run'" style="display: none" />
                    <x-lucide-play aria-hidden="true" x-show="busy !== 'run'" />
                    {{ $s['run'] }}
                </x-nq::button>
            @endif
        </div>
    </div>
    <p x-show="message" x-text="message" role="alert" style="display: none" class="border-b border-border bg-nq-danger-soft px-3 py-1.5 text-body-sm text-nq-danger-text"></p>
    <div x-show="previewing" role="status" style="display: none" class="flex flex-wrap items-center gap-2 border-b border-border bg-nq-info-soft px-3 py-1.5 text-body-sm text-nq-info-text">
        <span x-text="previewText"></span>
        <x-nq::button variant="ghost" size="sm" class="ms-auto" x-on:click="exitPreview()">{{ $s['exitPreview'] }}</x-nq::button>
    </div>
    <template x-if="runBar">
        <div role="status" class="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-3 py-1.5 text-body-sm">
            <span class="inline-flex" aria-hidden="true" x-bind:class="runBar.tone" x-html="runBar.glyph"></span>
            <span x-text="runBar.label"></span>
            <span x-show="runBar.duration !== ''" class="text-muted-foreground"><bdi x-text="runBar.duration"></bdi></span>
            <span x-show="runBar.progress !== ''" class="text-muted-foreground"><bdi x-text="runBar.progress"></bdi></span>
        </div>
    </template>

    <div class="relative min-h-0 flex-1" dir="ltr">
        <div x-ref="surface" data-slot="workflow-surface" role="application" aria-label="{{ $s['canvas'] }}" class="absolute inset-0 touch-none overflow-hidden bg-background"
            x-bind:class="locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'" x-bind:style="surfaceStyle"
            x-on:pointerdown="panDown($event)" x-on:click="paneClick($event)" x-on:wheel="onWheel($event)">
            <div class="absolute left-0 top-0 origin-top-left" x-bind:class="animate ? 'transition-transform duration-200' : ''" x-bind:style="worldStyle">
                <svg class="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden="true" x-html="edgeSvg"
                    x-on:click.stop="edgeClick($event)" x-on:pointerover="edgeOver($event, true)" x-on:pointerout="edgeOver($event, false)"></svg>
                <template x-for="e in edgeLabels" :key="e.id">
                    <div data-flow-ui class="absolute flex items-center gap-1" :style="e.style" x-on:pointerenter="setHover(e.id)" x-on:pointerleave="setHover(null)">
                        <span x-show="e.showText" class="rounded-full border border-border bg-card px-1.5 text-caption text-muted-foreground"><bdi x-text="e.text"></bdi></span>
                        <button x-show="e.showInsert" type="button" data-slot="workflow-edge-insert" aria-label="{{ $s['insertHere'] }}" title="{{ $s['insertHere'] }}"
                            class="{{ $round }}" x-on:click.stop="insertOnEdge(e.id)">
                            <x-lucide-plus class="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </template>
                <template x-for="n in nodes" :key="n.id">
                    <div class="absolute" :style="'left:' + n.left + ';top:' + n.top">
                        <div dir="{{ $dir }}" data-slot="workflow-node" :data-node-id="n.id" :data-status="n.status" :data-selected="n.selected ? 'true' : null" :data-type="n.type" role="group" tabindex="0" :aria-label="n.title"
                            :style="n.size"
                            class="relative flex touch-none items-center gap-3 rounded-card border bg-card px-3 py-2.5 text-start text-foreground shadow-xs transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                            :class="[n.border, n.trigger ? 'rounded-s-[28px]' : '', n.selected ? 'outline-2 outline-offset-2 outline-nq-focus' : '', n.status === 'running' ? 'shadow-[0_0_0_3px_color-mix(in_oklab,var(--nq-info)_18%,transparent)]' : '', n.errorIdle ? 'border-nq-danger/60' : '', n.editable ? 'cursor-grab' : 'cursor-pointer']"
                            x-on:click="nodeClick(n.id)" x-on:keydown="nodeKey(n.id, $event)" x-on:pointerdown="nodeDown(n.id, $event)">
                            <span x-show="!n.trigger" aria-hidden="true" data-handle="target" class="{{ $handle }}"
                                :class="n.horizontal ? 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'"></span>
                            <span class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4" x-html="n.icon"></span>
                            <span class="min-w-0 flex-1">
                                <span class="block truncate text-label" :title="n.title" x-text="n.title"></span>
                                <span class="block truncate text-caption text-muted-foreground" :title="n.subtitle" x-text="n.subtitle"></span>
                                <span x-show="n.detail !== ''" class="block truncate text-caption text-muted-foreground"><bdi x-text="n.detail"></bdi></span>
                            </span>
                            <span x-show="n.hasRun" role="img" class="inline-flex" :aria-label="n.statusLabel" :class="n.tone" x-html="n.glyph"></span>
                            <span x-show="n.showIssue" role="img" :aria-label="n.issueLabel">
                                <x-lucide-circle-alert class="size-4 text-nq-danger-text" aria-hidden="true" x-show="n.hasError" />
                                <x-lucide-triangle-alert class="size-4 text-nq-warning-text" aria-hidden="true" x-show="!n.hasError" />
                            </span>
                            <template x-for="o in n.outputs" :key="o.id || 'out'">
                                <span class="contents">
                                    <span aria-hidden="true" data-handle="source" :data-handle-id="o.id" class="{{ $handle }} touch-none" :class="n.editable ? 'cursor-crosshair' : ''" :style="o.handleStyle"
                                        x-on:pointerdown.stop="connectDown(n.id, o.id || null, $event)"></span>
                                    <template x-if="n.branching"><span aria-hidden="true" class="pointer-events-none absolute -translate-y-1/2 rounded-sm bg-secondary px-1 text-caption text-muted-foreground"
                                        :class="n.horizontal ? 'right-3' : 'bottom-1 -translate-x-1/2 translate-y-0'" :style="o.labelStyle" x-text="o.label"></span></template>
                                    <template x-if="n.editable && !o.used"><button type="button" data-slot="workflow-node-add" :aria-label="o.addLabel" :title="o.addLabel" :style="o.addStyle"
                                        class="absolute {{ $round }}" :class="n.horizontal ? '-translate-y-1/2' : '-translate-x-1/2'"
                                        x-on:pointerdown.stop x-on:click.stop="openPicker({ sourceId: n.id, sourceHandle: o.id || null })">
                                        <x-lucide-plus class="size-3.5" aria-hidden="true" />
                                    </button></template>
                                </span>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <div data-flow-ui class="absolute bottom-3 left-3 z-[5] flex items-end gap-2">
            <div class="flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" aria-label="{{ $s['canvas'] }}">
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none" aria-label="{{ $s['zoomIn'] }}" title="{{ $s['zoomIn'] }}" x-on:click="zoomBy(1.25)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none border-t border-border" aria-label="{{ $s['zoomOut'] }}" title="{{ $s['zoomOut'] }}" x-on:click="zoomBy(0.8)"><x-lucide-minus aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none border-t border-border" aria-label="{{ $s['fit'] }}" title="{{ $s['fit'] }}" x-on:click="fit(0.25)"><x-lucide-maximize-2 aria-hidden="true" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" class="rounded-none border-t border-border" x-bind:aria-label="locked ? t.unlock : t.lock" x-bind:title="locked ? t.unlock : t.lock" x-bind:aria-pressed="locked" x-on:click="toggleLock()">
                    <x-lucide-lock aria-hidden="true" x-show="locked" style="display: none" />
                    <x-lucide-lock-open aria-hidden="true" x-show="!locked" />
                </x-nq::button>
            </div>
            <span class="rounded-control border border-border bg-card px-2 py-1 text-caption text-muted-foreground tabular-nums" aria-hidden="true"><bdi x-text="zoomPct + '%'">100%</bdi></span>
        </div>
        <svg data-flow-ui data-slot="workflow-minimap" role="img" aria-label="{{ $s['minimap'] }}" width="160" height="104" viewBox="0 0 1 1" x-bind:view-box.camel="miniView" preserveAspectRatio="xMidYMid meet"
            class="absolute bottom-3 right-3 z-[5] cursor-pointer rounded-control border border-border bg-card shadow-xs max-sm:hidden" x-html="miniSvg" x-on:pointerdown.stop="miniDown($event)"></svg>

        <div x-show="empty" @unless ($empty) style="display: none" @endunless class="pointer-events-none absolute inset-0 flex items-center justify-center p-6" dir="{{ $dir }}">
            <div class="pointer-events-auto flex max-w-xs flex-col items-center gap-3 text-center">
                <p class="text-body-sm text-muted-foreground">{{ $s['issue']['empty'] }}</p>
                <x-nq::button variant="primary" x-show="editable" x-on:click="openPicker()" :style="$editable ? null : 'display: none'">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $s['addStep'] }}
                </x-nq::button>
            </div>
        </div>

        <aside x-show="panelKind !== ''" style="display: none" data-slot="workflow-side-panel" aria-label="{{ $s['canvas'] }}" dir="{{ $dir }}"
            class="absolute inset-y-0 end-0 z-10 flex w-full max-w-sm flex-col border-s border-border bg-card shadow-floating">
            <template x-if="panelKind === 'picker'">
                <div data-slot="workflow-node-picker" class="flex h-full min-h-0 flex-col" x-on:keydown.escape="closePanel()">
                    <x-nq::workflow-canvas.panel-header :title="$s['pickerTitle']" title-expr="t.pickerTitle" hint-expr="pickerHint" :close-label="$s['close']" />
                    <div class="relative border-b border-border px-4 py-3">
                        <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <x-nq::field.input class="ps-9" placeholder="{{ $s['pickerSearch'] }}" aria-label="{{ $s['pickerSearch'] }}" role="combobox" aria-expanded="true"
                            x-init="$el.focus()" x-on:input="setQuery($event.target.value)" x-on:keydown="pickerKey($event)" />
                    </div>
                    <div role="listbox" aria-label="{{ $s['pickerTitle'] }}" class="min-h-0 flex-1 overflow-y-auto py-2">
                        <p x-show="pickerEmpty" x-text="pickerNone" class="px-4 py-6 text-center text-body-sm text-muted-foreground"></p>
                        <template x-for="g in pickerGroupsVm" :key="g.id">
                            <div role="group" :aria-label="g.label" class="pb-2">
                                <p class="eyebrow px-4 pb-1 pt-2" x-text="g.label"></p>
                                <template x-for="s in g.steps" :key="s.id">
                                    <button type="button" role="option" tabindex="-1" :aria-selected="s.active" :data-pick-type="s.id"
                                        class="flex w-full items-start gap-3 px-4 py-2.5 text-start transition-colors" :class="s.active ? 'bg-nq-hover' : 'hover:bg-nq-hover'"
                                        x-on:mouseenter="hoverStep(s.idx)" x-on:click="pick(s.id)">
                                        <span class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4" x-html="s.icon"></span>
                                        <span class="min-w-0">
                                            <span class="block text-label text-foreground" x-text="s.label"></span>
                                            <span x-show="s.description !== ''" class="block text-caption text-muted-foreground" x-text="s.description"></span>
                                        </span>
                                    </button>
                                </template>
                            </div>
                        </template>
                    </div>
                </div>
            </template>

            <template x-if="panelKind === 'config' && cfgVm">
                <div data-slot="workflow-config-panel" class="flex h-full min-h-0 flex-col">
                    <x-nq::workflow-canvas.panel-header title-expr="cfgVm.title" hint-expr="cfgVm.hint" icon-expr="cfgVm.icon" :close-label="$s['close']" />
                    <x-nq::tabs default-value="settings" x-model="cfgTab" class="min-h-0 flex-1 gap-0">
                        <x-nq::tabs.list variant="underline" class="px-4">
                            <x-nq::tabs.tab value="settings">{{ $s['settings'] }}</x-nq::tabs.tab>
                            <x-nq::tabs.tab value="output">{{ $s['output'] }}</x-nq::tabs.tab>
                            <x-nq::tabs.indicator />
                        </x-nq::tabs.list>
                        <div class="min-h-0 flex-1 overflow-y-auto">
                            <x-nq::tabs.panel value="settings">
                                <div class="flex flex-col gap-4 p-4">
                                    <div class="{{ $field }}">
                                        <label for="nq-wf-name" class="text-label text-foreground">{{ $s['name'] }}</label>
                                        <input id="nq-wf-name" type="text" data-slot="input" class="{{ $control }} h-control" x-bind:value="cfgVm.name" x-bind:placeholder="cfgVm.namePlaceholder" x-bind:disabled="cfgVm.readOnly" x-on:input="setLabel($event.target.value)">
                                        <p class="text-caption text-muted-foreground">{{ $s['nameHelp'] }}</p>
                                    </div>
                                    <p x-show="cfgVm.noFields" class="text-body-sm text-muted-foreground">{{ $s['noFields'] }}</p>
                                    <template x-for="f in fields" :key="f.name">
                                        <div>
                                            <div x-show="f.isBool" class="flex items-center justify-between gap-3">
                                                <div class="min-w-0">
                                                    <span class="text-label text-foreground" x-text="f.label"></span>
                                                    <p x-show="f.help !== ''" class="text-caption text-muted-foreground" x-text="f.help"></p>
                                                </div>
                                                <button type="button" role="switch" data-slot="switch" :aria-checked="f.checked ? 'true' : 'false'" :aria-label="f.label" :disabled="f.disabled" :data-checked="f.checked ? '' : null" :data-unchecked="f.checked ? null : ''"
                                                    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none transition-colors duration-150 ease-nq data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50"
                                                    x-on:click="toggleField(f.name)">
                                                    <span data-slot="switch-thumb" class="block size-4 rounded-full bg-background shadow-xs transition-[translate] duration-150 ease-nq" :class="f.checked ? 'translate-x-3.5 rtl:-translate-x-3.5 bg-primary-foreground' : ''"></span>
                                                </button>
                                            </div>
                                            <div x-show="!f.isBool" class="{{ $field }}" :data-invalid="f.invalid ? '' : null">
                                                <label :for="'nq-wf-f-' + f.name" class="text-label text-foreground">
                                                    <span x-text="f.label"></span>
                                                    <span x-show="f.required" aria-hidden="true" class="ms-1 text-nq-danger-text">*</span>
                                                </label>
                                                <select x-show="f.isSelect" :id="f.isSelect ? 'nq-wf-f-' + f.name : null" data-slot="select" :disabled="f.disabled" :aria-invalid="f.invalid ? 'true' : null" class="{{ $control }} h-control"
                                                    x-on:change="setField(f.name, $event.target.value)">
                                                    <option value="" :selected="f.text === ''" x-text="f.placeholder"></option>
                                                    <template x-for="o in f.options" :key="o.value">
                                                        <option :value="o.value" :selected="o.value === f.text" x-text="o.label"></option>
                                                    </template>
                                                </select>
                                                <textarea x-show="f.isArea" :id="f.isArea ? 'nq-wf-f-' + f.name : null" data-slot="textarea" :rows="f.isCode ? 5 : 3" :dir="f.isCode ? 'ltr' : null" :spellcheck="f.isCode ? 'false' : null" :placeholder="f.placeholder" :disabled="f.disabled" :aria-invalid="f.invalid ? 'true' : null"
                                                    class="{{ $control }} min-h-20 py-2" :class="f.isCode ? 'font-mono text-caption' : ''" x-bind:value="f.text" x-on:input="setField(f.name, $event.target.value)"></textarea>
                                                <input x-show="f.isInput" :id="f.isInput ? 'nq-wf-f-' + f.name : null" data-slot="input" :type="f.inputType" :inputmode="f.inputMode || null" :dir="f.ltr ? 'ltr' : null" :placeholder="f.placeholder" :disabled="f.disabled" :aria-invalid="f.invalid ? 'true' : null"
                                                    class="{{ $control }} h-control" x-bind:value="f.text" x-on:input="setField(f.name, $event.target.value, f.kind)">
                                                <p x-show="f.help !== ''" class="text-caption text-muted-foreground" x-text="f.help"></p>
                                                <div x-show="f.invalid" role="alert" class="text-caption text-nq-danger-text">{{ $s['required'] }}</div>
                                            </div>
                                        </div>
                                    </template>
                                    <template x-for="m in otherIssues" :key="m">
                                        <p class="flex items-start gap-2 text-body-sm text-nq-warning-text">
                                            <x-lucide-circle-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
                                            <span x-text="m"></span>
                                        </p>
                                    </template>
                                </div>
                            </x-nq::tabs.panel>
                            <x-nq::tabs.panel value="output">
                                <div x-show="cfgVm.hasRun" class="flex flex-col gap-3 p-4">
                                    <dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-body-sm">
                                        <dt class="text-muted-foreground">{{ $s['runStatus'] }}</dt>
                                        <dd class="flex items-center gap-1.5">
                                            <span class="inline-flex" aria-hidden="true" :class="cfgVm.tone" x-html="cfgVm.glyph"></span>
                                            <span x-text="cfgVm.statusLabel"></span>
                                        </dd>
                                        <template x-if="cfgVm.duration !== ''">
                                            <dt class="text-muted-foreground">{{ $s['duration'] }}</dt>
                                        </template>
                                        <template x-if="cfgVm.duration !== ''">
                                            <dd><bdi x-text="cfgVm.duration"></bdi></dd>
                                        </template>
                                        <template x-if="cfgVm.items !== ''">
                                            <dt class="text-muted-foreground">{{ $s['items'] }}</dt>
                                        </template>
                                        <template x-if="cfgVm.items !== ''">
                                            <dd><bdi x-text="cfgVm.items"></bdi></dd>
                                        </template>
                                    </dl>
                                    <div x-show="cfgVm.error !== ''" role="alert" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
                                        <p class="font-medium">{{ $s['errorLabel'] }}</p>
                                        <p dir="auto" x-text="cfgVm.error"></p>
                                    </div>
                                    <figure x-show="cfgVm.output !== ''" data-slot="code-block" data-language="json" dir="ltr" class="relative m-0 overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start">
                                        <pre role="region" tabindex="0" aria-label="{{ $s['output'] }}" class="m-0 max-h-72 overflow-auto bg-transparent p-3 font-mono text-code text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"><code x-text="cfgVm.output"></code></pre>
                                    </figure>
                                </div>
                                <p x-show="!cfgVm.hasRun" class="p-4 text-body-sm text-muted-foreground">{{ $s['noOutput'] }}</p>
                            </x-nq::tabs.panel>
                        </div>
                    </x-nq::tabs>
                    <div x-show="!cfgVm.readOnly" class="flex items-center gap-2 border-t border-border px-4 py-3">
                        <x-nq::button variant="secondary" size="sm" x-on:click="addNext()">
                            <x-lucide-plus aria-hidden="true" />
                            {{ $s['addNext'] }}
                        </x-nq::button>
                        <x-nq::button variant="ghost" size="sm" class="ms-auto text-nq-danger-text" x-on:click="removeNode(panelState.id)">
                            <x-lucide-trash-2 aria-hidden="true" />
                            {{ $s['remove'] }}
                        </x-nq::button>
                    </div>
                </div>
            </template>

                <template x-if="panelKind === 'runs'">
                    <div data-slot="workflow-runs-panel" class="flex h-full min-h-0 flex-col">
                        <x-nq::workflow-canvas.panel-header :title="$s['runsTitle']" :hint="$s['runsHint']" :close-label="$s['close']">
                            <x-slot:icon><x-lucide-list-checks aria-hidden="true" /></x-slot:icon>
                        </x-nq::workflow-canvas.panel-header>
                        <div x-show="runId !== null" class="flex items-center gap-2 border-b border-border px-4 py-2">
                            <x-nq::button variant="secondary" size="sm" x-on:click="toggleReplay()">
                                <x-lucide-square aria-hidden="true" x-show="cursor !== null" style="display: none" />
                                <x-lucide-play aria-hidden="true" x-show="cursor === null" />
                                <span x-text="replayLabel">{{ $s['replay'] }}</span>
                            </x-nq::button>
                            <x-nq::button variant="ghost" size="sm" x-on:click="clearRun()">
                                <x-lucide-eye-off aria-hidden="true" />
                                {{ $s['clearOverlay'] }}
                            </x-nq::button>
                        </div>
                        <p x-show="runsVm.length === 0" class="p-4 text-body-sm text-muted-foreground">{{ $s['runsNone'] }}</p>
                        <ol class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                            <template x-for="r in runsVm" :key="r.id">
                                <li :data-run-row="r.id" :class="r.selected ? 'bg-nq-selected' : ''">
                                    <button type="button" :aria-pressed="r.selected" class="{{ $row }}" x-on:click="selectRun(r.id)">
                                        <span class="inline-flex size-5 shrink-0 items-center justify-center [&_svg]:size-5" role="img" :aria-label="r.statusLabel" :class="r.tone" x-html="r.glyph"></span>
                                        <span class="min-w-0 flex-1">
                                            <span class="block text-label text-foreground" x-text="r.statusLabel"></span>
                                            <span class="block truncate text-caption text-muted-foreground"><span x-html="r.dateHtml"></span><span x-show="r.trigger !== ''"> · <span x-text="r.trigger"></span></span></span>
                                        </span>
                                        <span x-show="r.duration !== ''" class="shrink-0 text-caption text-muted-foreground tabular-nums"><bdi x-text="r.duration"></bdi></span>
                                    </button>
                                </li>
                            </template>
                        </ol>
                    </div>
                </template>

                <template x-if="panelKind === 'versions'">
                    <div data-slot="workflow-versions-panel" class="flex h-full min-h-0 flex-col">
                        <x-nq::workflow-canvas.panel-header :title="$s['versionsTitle']" :hint="$s['versionsHint']" :close-label="$s['close']">
                            <x-slot:icon><x-lucide-history aria-hidden="true" /></x-slot:icon>
                        </x-nq::workflow-canvas.panel-header>
                        <p x-show="restoreError !== ''" x-text="restoreError" role="alert" style="display: none" class="border-b border-border bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text"></p>
                        <ol class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                            <template x-for="v in versionsVm" :key="v.version">
                                <li :data-version-row="v.version" class="px-4 py-3" :class="v.previewing ? 'bg-nq-selected' : ''">
                                    <button type="button" :aria-pressed="v.previewing" class="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" x-on:click="previewVersion(v.version)">
                                        <span class="flex flex-wrap items-center gap-2">
                                            <span class="text-label text-foreground" x-text="v.label"></span>
                                            <x-nq::badge variant="success" x-show="v.current">{{ $s['current'] }}</x-nq::badge>
                                            <x-nq::badge variant="info" x-show="v.previewing">{{ $s['preview'] }}</x-nq::badge>
                                        </span>
                                        <span class="block text-caption text-muted-foreground"><span x-html="v.dateHtml"></span><span x-show="v.by !== ''"> · <span x-text="v.by"></span></span></span>
                                        <span x-show="v.note !== ''" class="mt-1 block text-body-sm text-foreground" x-text="v.note"></span>
                                    </button>
                                    <x-nq::button variant="secondary" size="sm" class="mt-2" data-restore x-show="v.canRestore" x-on:click="askRestore(v.version)">{{ $s['restore'] }}</x-nq::button>
                                </li>
                            </template>
                        </ol>
                    </div>
                </template>
        </aside>
    </div>
        <x-nq::alert-dialog x-model="confirmOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title x-text="confirmTitle" />
                    <x-nq::alert-dialog.description>{{ $s['restoreBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action variant="primary" data-slot="workflow-restore-confirm" x-bind:disabled="restoreBusy" x-on:click="doRestore()">
                        <span x-text="restoreBusy ? t.restoring : t.restore">{{ $s['restore'] }}</span>
                    </x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
</div>
