{{-- <x-nq::server-admin.package-updates-panel :packages="$packages" :reboot-required="true" last-checked="2 hours ago" @check="…" @update="…" @reboot="…" />
     The updates waiting on a server: a summary (count, security, download size), a table with a type filter, per-row Update, selection with Update selected,
     Update all (confirms), Check for updates, and a restart banner when the server needs one.
     packages: [['name', 'currentVersion', 'newVersion', 'kind' => security | kernel | regular, 'sizeBytes']]. reboot-required: show the restart banner.
     last-checked: text already formatted. labels: overrides for any word. It is presentational: it fires events on the root with detail { …, wait(promise) }.
       check   (no detail); resolve, or resolve { error }. The host refreshes the list itself (reload the page or re-render).
       update  detail.names = [package names]; resolve, or resolve { error }
       reboot  (no detail); resolve, or resolve { error }
     After a successful update the packages leave the list; after a restart the banner goes. A rejected promise, or no listener, shows a generic error.
     Differences from the React component: the whole list is one page, and the "last checked" time is text you pass. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['packages' => [], 'rebootRequired' => false, 'lastChecked' => null, 'labels' => []])
@include('nasaq::components.server-admin._strings')
@php
    $t = nq_server_admin_strings(app()->getLocale(), $labels);
    $config = ['labels' => $t, 'rebootRequired' => (bool) $rebootRequired, 'packages' => collect($packages)->map(fn ($p) => array_filter([
        'name' => $p['name'], 'currentVersion' => $p['currentVersion'] ?? '', 'newVersion' => $p['newVersion'] ?? '', 'kind' => $p['kind'] ?? 'regular',
        'sizeBytes' => $p['sizeBytes'] ?? null,
    ], fn ($v) => $v !== null))->values()->all()];
    $columns = [
        ['id' => 'package', 'header' => $t['package'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'version', 'header' => $t['version']],
        ['id' => 'kind', 'header' => $t['kind'], 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'security', 'label' => $t['kinds']['security'], 'tone' => 'danger'],
            ['value' => 'kernel', 'label' => $t['kinds']['kernel'], 'tone' => 'warning'],
            ['value' => 'regular', 'label' => $t['kinds']['regular'], 'tone' => 'neutral'],
        ]],
        ['id' => 'size', 'header' => $t['size'], 'align' => 'end'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'package-updates') }}" x-data="nqPackageUpdates({!! \Illuminate\Support\Js::from($config) !!})" x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t['packagesTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['packagesDescription'] }}</x-nq::card.description>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
            <x-nq::button type="button" variant="secondary" x-on:click="check()" x-bind:aria-busy="checking ? 'true' : null" x-bind:data-disabled="checking ? '' : null">
                <x-nq::spinner x-show="checking" style="display: none" />
                <x-lucide-refresh-cw x-show="! checking" aria-hidden="true" />
                <span x-text="checking ? @js($t['checking']) : @js($t['checkNow'])"></span>
            </x-nq::button>
            <x-nq::button type="button" variant="primary" x-show="packages.length > 0" style="display: none" x-on:click="askUpdateAll()" x-bind:data-disabled="busy ? '' : null">
                <x-lucide-download aria-hidden="true" />
                {{ $t['updateAll'] }}
            </x-nq::button>
        </div>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        <template x-if="rebootRequired">
            <x-nq::alert tone="warning" :title="$t['rebootTitle']">
                {{ $t['rebootBody'] }}
                <x-slot:action>
                    <x-nq::button type="button" variant="secondary" size="sm" x-on:click="askReboot()">{{ $t['reboot'] }}</x-nq::button>
                </x-slot:action>
            </x-nq::alert>
        </template>
        <p data-slot="package-summary" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-muted-foreground" x-show="packages.length > 0" style="display: none">
            <span class="text-foreground" x-text="totalText()"></span>
            <span x-show="summary.security > 0" style="display: none" class="text-nq-danger" x-text="securityText()"></span>
            <span x-show="summary.downloadBytes > 0" style="display: none" x-text="downloadText()"></span>
            <span>{{ $t['lastChecked'] }}: {{ $lastChecked ?? $t['neverChecked'] }}</span>
        </p>
        <x-nq::data-table x-model="tableRows" :label="$t['packagesTable']" name-key="label" :search="$t['search']" :view-options="false" :page-size="10" selectable
            :columns="$columns" :rows="[]" :row-actions="[['id' => 'update', 'label' => $t['updateOne'], 'icon' => 'download']]"
            :labels="['empty' => $t['upToDate']]">
            <x-slot:bulk>
                <x-nq::button type="button" variant="primary" size="sm" x-on:click="updateSelected(selectedIds())">{{ $t['updateSelected'] }}</x-nq::button>
            </x-slot:bulk>
        </x-nq::data-table>
    </x-nq::card.content>
    @include('nasaq::components.server-admin._confirm', ['t' => $t])
</div>
