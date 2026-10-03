{{-- <x-nq::workflow-marketplace :listings="$listings" :categories="$categories" />
     The store of workflow steps and ready-made presets: search, category chips, a kind switch (All, Steps, Presets), a detail sheet and install. A thin layer over <x-nq::catalog-store>.
     listings: catalog items (['id', 'name', 'summary', 'category'] + optional icon (a lucide name), publisher, installs, installed, price…) plus 'kind' => 'step' | 'preset',
       'step' => ['role' => 'trigger' | 'action', 'inputs' => [...], 'outputs' => [...], 'fields' => [['name', 'label', 'kind', 'required']]], 'preset' => ['steps' => [...workflow-network steps], 'links' => [...]].
     categories: ['id', 'label', 'icon']. labels: overrides for the marketplace strings (kindAll, kindStep, kindPreset, kindLabel, trigger, action, fields, required, inputs, outputs, preview, stepsCount (fn ($n) => ...), none)
     and 'store' => [...] for the catalog store's. Install, uninstall and open fire the catalog store's bubbling nq-install / nq-uninstall / nq-open events ({ id, item, wait(promise) }); the id is the listing id.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['listings' => [], 'categories' => [], 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl(app()->getLocale());
    $labels = (array) $labels;
    $store = (array) ($labels['store'] ?? []);
    unset($labels['store']);
    $t = array_merge([
        'kindAll' => \Nasaq\Nasaq::t('All', 'الكل'),
        'kindStep' => \Nasaq\Nasaq::t('Steps', 'خطوات'),
        'kindPreset' => \Nasaq\Nasaq::t('Presets', 'قوالب جاهزة'),
        'kindLabel' => \Nasaq\Nasaq::t('Kind', 'النوع'),
        'trigger' => \Nasaq\Nasaq::t('Trigger', 'مُشغّل'),
        'action' => \Nasaq\Nasaq::t('Action', 'إجراء'),
        'fields' => \Nasaq\Nasaq::t('Settings', 'الإعدادات'),
        'required' => \Nasaq\Nasaq::t('required', 'مطلوب'),
        'inputs' => \Nasaq\Nasaq::t('Takes', 'يستقبل'),
        'outputs' => \Nasaq\Nasaq::t('Gives', 'يعطي'),
        'preview' => \Nasaq\Nasaq::t('What it does', 'ماذا يفعل'),
        'stepsCount' => fn ($n) => $ar ? $n.' خطوات' : $n.' steps',
        'none' => \Nasaq\Nasaq::t('Nothing', 'لا شيء'),
    ], $labels);
    $listings = array_values((array) $listings);
    $byId = [];
    $kinds = [];
    $items = [];
    foreach ($listings as $l) {
        $byId[(string) $l['id']] = $l;
        $kinds[(string) $l['id']] = $l['kind'] ?? 'step';
        $item = $l;
        unset($item['kind'], $item['step'], $item['preset'], $item['details']);
        $item['badge'] = ($l['kind'] ?? 'step') === 'preset' ? ($ar ? 'قالب' : 'Preset') : (($l['step']['role'] ?? null) === 'trigger' ? $t['trigger'] : $t['action']);
        $items[] = $item;
    }
    $detail = fn (array $item) => new \Illuminate\Support\HtmlString(
        view('nasaq::components.workflow-marketplace._detail', ['listing' => $byId[(string) $item['id']] ?? [], 't' => $t])->render()
    );
@endphp
<div class="contents" data-slot="workflow-marketplace" x-data="nqWorkflowMarketplace(@js($kinds))">
    <x-nq::catalog-store :items="$items" :categories="$categories" :labels="$store" :detail="$detail" {{ $attributes }}>
        <x-slot:toolbarStart>
            <x-nq::toggle-group :default-value="['all']" x-model="kindSel" aria-label="{{ $t['kindLabel'] }}">
                <x-nq::toggle-group.toggle value="all">{{ $t['kindAll'] }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="step">{{ $t['kindStep'] }}</x-nq::toggle-group.toggle>
                <x-nq::toggle-group.toggle value="preset">{{ $t['kindPreset'] }}</x-nq::toggle-group.toggle>
            </x-nq::toggle-group>
        </x-slot:toolbarStart>
    </x-nq::catalog-store>
</div>
