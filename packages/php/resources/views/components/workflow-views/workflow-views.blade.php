{{-- <x-nq::workflow-views :steps="$steps" storage-key="workflow:view" highlight="check" clickable> <x-slot:editor>…</x-slot:editor> </x-nq::workflow-views>
     One workflow, three ways: a numbered outline of its steps, a pipeline diagram and (with the editor slot) your editor for the same steps. A switch in the header moves between them and can remember the choice.
     steps: each ['id', 'title', 'description', 'owner', 'kind' (step | decision | human | system | output; decision by default when it has branches), 'children' => steps run inside it, 'branches' => [['label', 'steps' => [...]]]].
     view / default-view: steps (default) | pipeline | editor; view is x-modelable (x-model="$wire.view") and a user pick fires nq-view-change ({ view }). storage-key: remembers the view in localStorage.
     clickable: steps become buttons in both read views and fire nq-step-click ({ id }). highlight: a step id to emphasise. title: the heading (default "Workflow"); hide-title removes it. heading-as: h3 by default. actions slot: more controls after the switch.
     labels: ['title', 'views', 'steps', 'pipeline', 'editor', 'count' (with :n), 'emptyTitle', 'empty', 'kinds' => [...]]. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['steps' => [], 'view' => null, 'defaultView' => 'steps', 'storageKey' => null, 'highlight' => null, 'clickable' => false, 'title' => null, 'hideTitle' => false, 'headingAs' => 'h3', 'labels' => []])
@include('nasaq::components.workflow-views._logic')
@php
    $steps = array_values((array) $steps);
    $hasEditor = isset($editor) && ! $editor->isEmpty();
    $views = $hasEditor ? ['steps', 'pipeline', 'editor'] : ['steps', 'pipeline'];
    $raw = $view ?? $defaultView;
    $current = in_array($raw, $views, true) ? $raw : 'steps';
    $t = array_merge([
        'title' => \Nasaq\Nasaq::t('Workflow', 'سير العمل'),
        'views' => \Nasaq\Nasaq::t('View', 'العرض'),
        'steps' => \Nasaq\Nasaq::t('Steps', 'الخطوات'),
        'pipeline' => \Nasaq\Nasaq::t('Pipeline', 'المسار'),
        'editor' => \Nasaq\Nasaq::t('Editor', 'المحرّر'),
        'emptyTitle' => \Nasaq\Nasaq::t('No steps yet', 'لا خطوات بعد'),
        'empty' => \Nasaq\Nasaq::t('Add a step to start this workflow.', 'أضف خطوة لبدء سير العمل هذا.'),
    ], array_diff_key((array) $labels, ['kinds' => 1, 'count' => 1]));
    $kinds = array_merge([
        'step' => \Nasaq\Nasaq::t('Step', 'خطوة'),
        'decision' => \Nasaq\Nasaq::t('Decision', 'قرار'),
        'human' => \Nasaq\Nasaq::t('Person', 'شخص'),
        'system' => \Nasaq\Nasaq::t('System', 'نظام'),
        'output' => \Nasaq\Nasaq::t('Result', 'نتيجة'),
    ], (array) ($labels['kinds'] ?? []));
    $total = count(nq_wfv_number($steps));
    $countText = isset($labels['count']) ? str_replace('{n}', (string) $total, $labels['count']) : \Nasaq\Nasaq::t($total.' steps', $total.' خطوات');
    $heading = $hideTitle ? null : ($title ?? $t['title']);
    $uid = 'nq-wv-'.\Illuminate\Support\Str::random(6);
    $icons = ['steps' => 'list-tree', 'pipeline' => 'git-branch', 'editor' => 'pencil'];
    $network = $current === 'pipeline' || in_array('pipeline', $views, true) ? nq_wfv_network($steps) : null;
    $config = ['view' => $current, 'views' => $views, 'storageKey' => $storageKey];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'workflow-views') }}" x-data="nqWorkflowViews(@js($config))" x-modelable="view" x-bind:data-view="view"
    @if ($heading) aria-labelledby="{{ $uid }}-title" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col rounded-card border border-border bg-card') }}>
    <header class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        @if ($heading)
            <div class="flex min-w-0 flex-1 items-center gap-2">
                <{{ $headingAs }} id="{{ $uid }}-title" class="text-h4 text-foreground">{{ $heading }}</{{ $headingAs }}>
                @if ($total)
                    <x-nq::badge variant="neutral">{{ $countText }}</x-nq::badge>
                @endif
            </div>
        @else
            <span class="flex-1"></span>
        @endif
        <x-nq::toggle-group :default-value="[$current]" :aria-label="$t['views']" x-effect="value = reconcile(value)">
            @foreach ($views as $v)
                <x-nq::toggle-group.toggle :value="$v" :aria-controls="$uid.'-panel'" :data-view="$v">
                    <x-dynamic-component :component="'lucide-'.$icons[$v]" aria-hidden="true" />
                    {{ $t[$v] }}
                </x-nq::toggle-group.toggle>
            @endforeach
        </x-nq::toggle-group>
        @isset($actions)
            {{ $actions }}
        @endisset
    </header>

    <div id="{{ $uid }}-panel" data-slot="workflow-views-panel" class="min-w-0 p-4">
        @if (! count($steps))
            <div data-view-panel="empty" x-show="view !== 'editor'" @if ($current === 'editor') style="display: none;" @endif>
                <x-nq::states.empty icon="workflow" :title="$t['emptyTitle']" :description="$t['empty']" />
            </div>
        @else
            <div data-view-panel="steps" x-show="view === 'steps'" @if ($current !== 'steps') style="display: none;" @endif>
                @include('nasaq::components.workflow-views._list', ['steps' => $steps, 'prefix' => '', 'kinds' => $kinds, 'clickable' => (bool) $clickable, 'highlight' => $highlight])
            </div>
            <div data-view-panel="pipeline" x-show="view === 'pipeline'" @if ($current !== 'pipeline') style="display: none;" @endif>
                <x-nq::workflow-network :steps="$network['steps']" :links="$network['links']" :highlight="$highlight" :clickable="(bool) $clickable" />
            </div>
        @endif
        @if ($hasEditor)
            <div data-view-panel="editor" x-show="view === 'editor'" @if ($current !== 'editor') style="display: none;" @endif>{{ $editor }}</div>
        @endif
    </div>
</section>
