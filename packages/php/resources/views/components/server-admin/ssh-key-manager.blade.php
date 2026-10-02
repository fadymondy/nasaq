{{-- <x-nq::server-admin.ssh-key-manager :servers="$servers" :keys="$keys" @install-change="$event.detail.wait(…)" @add="…" @remove="…" />
     Which SSH keys can sign in to which server: a table with one switch per server, "n of m" coverage, a row menu (install on all, remove from all, delete), and an
     Add key dialog that checks the pasted public key as you type (and refuses a private key at once).
     servers: [['id', 'name']]. keys: [['id', 'name', 'type', 'fingerprint', 'comment', 'addedAt' => text, 'lastUsedAt' => text, 'installedOn' => [server ids]]].
     labels: overrides for any word. It is presentational: it fires events on the root with detail { …, wait(promise) }.
       install-change  detail.keyId, detail.serverId, detail.installed (bool); resolve, or resolve { error } (the switch rolls back on an error)
       add             detail.input = { name, publicKey, type, comment? }; resolve with { key: [...] } to add it to the list, or resolve { error }
       remove          detail.keyId; resolve, or resolve { error }
     A rejected promise, or no listener, shows a generic error. Differences from the React component: the table is not scrollable sideways with a pinned key column,
     the fingerprint, added and last-used columns are hidden (open the View menu to show them), and a switch is named "{key id} on {server}" (the table names an edit cell by the row id). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['servers' => [], 'keys' => [], 'labels' => []])
@include('nasaq::components.server-admin._strings')
@php
    $t = nq_server_admin_strings(app()->getLocale(), $labels);
    $config = ['labels' => $t, 'servers' => collect($servers)->map(fn ($s) => ['id' => (string) $s['id'], 'name' => $s['name']])->values()->all(),
        'keys' => collect($keys)->map(fn ($k) => array_filter([
            'id' => (string) $k['id'], 'name' => $k['name'], 'type' => $k['type'] ?? '', 'fingerprint' => $k['fingerprint'] ?? '', 'comment' => $k['comment'] ?? null,
            'addedAt' => $k['addedAt'] ?? '', 'lastUsedAt' => $k['lastUsedAt'] ?? null, 'installedOn' => array_values(array_map('strval', $k['installedOn'] ?? [])),
        ], fn ($v) => $v !== null))->values()->all()];
    $columns = array_merge([
        ['id' => 'key', 'header' => $t['sshKey'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'type', 'header' => $t['kind'], 'type' => 'tag'],
        ['id' => 'fingerprint', 'header' => 'Fingerprint', 'hidden' => true],
        ['id' => 'coverage', 'header' => $t['sshServers']],
    ], collect($servers)->map(fn ($s) => ['id' => 's_'.$s['id'], 'header' => $s['name'], 'type' => 'boolean', 'edit' => 'switch', 'hideable' => true])->all(), [
        ['id' => 'added', 'header' => $t['addedOn'], 'hidden' => true],
        ['id' => 'used', 'header' => $t['lastUsed'], 'hidden' => true],
    ]);
    $actions = [
        ['id' => 'all', 'label' => $t['installOnAll'], 'icon' => 'server'],
        ['id' => 'none', 'label' => $t['removeFromAll'], 'icon' => 'server-off'],
        ['id' => 'delete', 'label' => $t['deleteKey'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ssh-key-manager') }}" x-data="nqSshKeys({!! \Illuminate\Support\Js::from($config) !!})"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t['sshTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['sshDescription'] }}</x-nq::card.description>
        </div>
        <x-nq::button type="button" variant="primary" class="mt-3 sm:mt-0" x-on:click="openAdd()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['addKey'] }}
        </x-nq::button>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t['sshTable']" name-key="label" :search="$t['search']" :page-size="10"
            :columns="$columns" :rows="[]" :row-actions="$actions"
            :labels="['empty' => $t['noKeys'], 'editCell' => str_replace(['{key}', '{server}'], ['{row}', '{column}'], $t['installedOn'])]" />
    </x-nq::card.content>

    <x-nq::dialog x-model="addOpen">
        <x-nq::dialog.content>
            <form novalidate data-slot="ssh-key-form" class="grid gap-4" x-on:submit.prevent="submit()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['addKeyTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['addKeyBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <template x-if="formError"><x-nq::alert tone="danger"><span x-text="formError"></span></x-nq::alert></template>
                <x-nq::field x-model="nameInvalid">
                    <x-nq::field.label>{{ $t['keyName'] }}</x-nq::field.label>
                    <x-nq::field.input x-model="keyName" placeholder="{{ $t['keyNamePlaceholder'] }}" autocomplete="off" />
                    <x-nq::field.error><span x-text="nameError"></span></x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="keyInvalid">
                    <x-nq::field.label>{{ $t['publicKey'] }}</x-nq::field.label>
                    <x-nq::field.textarea x-model="keyText" dir="ltr" rows="4" spellcheck="false" autocomplete="off" placeholder="ssh-ed25519 AAAA… you@laptop" class="py-2 font-mono text-caption" />
                    <x-nq::field.description><span x-text="detected"></span></x-nq::field.description>
                    <x-nq::field.error><span x-text="keyError"></span></x-nq::field.error>
                </x-nq::field>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="addOpen = false" x-bind:disabled="pending ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                        <x-nq::spinner x-show="pending" style="display: none" />
                        {{ $t['addKey'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
    @include('nasaq::components.server-admin._confirm', ['t' => $t])
</div>
