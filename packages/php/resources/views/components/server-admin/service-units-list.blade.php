{{-- <x-nq::server-admin.service-units-list :services="$services" @action="$event.detail.wait(…)" @view-logs="…" />
     The systemd units of a server in a searchable table: state (with a filter), at-boot, memory and since, a description under each row, and a row menu to
     start, stop, restart, reload, enable or disable at boot, or view logs. Stop, restart and disable ask first. Only the actions that fit the unit's state work.
     services: [['id', 'name', 'description', 'state' => active | inactive | failed | activating | deactivating | reloading, 'enabled' => bool, 'memoryBytes', 'since' => text already formatted]].
     labels: overrides for any word. It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       action     detail.id, detail.action (start | stop | restart | reload | enable | disable); resolve, or resolve { error }
       view-logs  detail.id
     After success the list updates itself (state and at-boot). A rejected promise, or no listener, shows a generic error.
     Differences from the React component: the row menu (also opened by right-click, long-press or Shift+F10 on a row) lists only the actions that fit the unit's state, through the table's actions-key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['services' => [], 'labels' => []])
@include('nasaq::components.server-admin._strings')
@php
    $t = nq_server_admin_strings(app()->getLocale(), $labels);
    $config = ['labels' => $t, 'services' => collect($services)->map(fn ($s) => array_filter([
        'id' => (string) $s['id'], 'name' => $s['name'], 'description' => $s['description'] ?? null, 'state' => $s['state'] ?? 'inactive',
        'enabled' => ! empty($s['enabled']), 'memoryBytes' => $s['memoryBytes'] ?? null, 'since' => $s['since'] ?? null,
    ], fn ($v) => $v !== null))->values()->all()];
    $tones = ['active' => 'success', 'inactive' => 'neutral', 'failed' => 'danger', 'activating' => 'info', 'deactivating' => 'warning', 'reloading' => 'info'];
    $columns = [
        ['id' => 'service', 'header' => $t['service'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'state', 'header' => $t['state'], 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => collect($tones)->map(fn ($tone, $k) => ['value' => $k, 'label' => $t['states'][$k], 'tone' => $tone])->values()->all()],
        ['id' => 'boot', 'header' => $t['boot'], 'type' => 'tag', 'filter' => true,
            'options' => [['value' => 'enabled', 'label' => $t['enabledAtBoot'], 'tone' => 'success'], ['value' => 'disabled', 'label' => $t['disabledAtBoot'], 'tone' => 'neutral']]],
        ['id' => 'memory', 'header' => $t['memory'], 'align' => 'end'],
        ['id' => 'since', 'header' => $t['since']],
    ];
    $icons = ['start' => 'play', 'stop' => 'square', 'restart' => 'rotate-cw', 'reload' => 'refresh-cw', 'enable' => 'toggle-right', 'disable' => 'toggle-left'];
    $actions = collect($icons)->map(fn ($icon, $id) => ['id' => $id, 'label' => $t['actions'][$id], 'icon' => $icon, 'danger' => $id === 'stop'])->values()->all();
    $actions[] = ['id' => 'logs', 'label' => $t['viewLogs'], 'icon' => 'scroll-text', 'group' => 'logs'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'service-units') }}" x-data="nqServiceUnits({!! \Illuminate\Support\Js::from($config) !!})" x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $t['servicesTitle'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $t['servicesDescription'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t['servicesTable']" name-key="label" actions-key="actions" :search="$t['search']" :view-options="false" :page-size="10" expand="description"
            :columns="$columns" :rows="[]" :row-actions="$actions" :labels="['empty' => $t['servicesEmpty']]" />
    </x-nq::card.content>
    @include('nasaq::components.server-admin._confirm', ['t' => $t])
</div>
