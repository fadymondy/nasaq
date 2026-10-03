{{-- <x-nq::mail-settings.mail-domains :domains="$domains" />
     Mail domains: pick a domain and see an SPF, DKIM and DMARC checklist (expected record with a copy button, what DNS returned, warnings for an open SPF
     or a DMARC policy of none), its mailboxes with quota use and its aliases. Adding and removing is through events; removals ask first.
     The host does the DNS lookups and passes the statuses back on the next render. Switching domain is done in the browser.
     domains: [[id, name, checkedAt (timestamp or date string), checks: [[kind (spf | dkim | dmarc), status (pass | fail | missing | pending), name, expected, found, type]],
       mailboxes: [[id, local, quotaMb, usedMb]], aliases: [[id, source, destination]]]]. default-domain-id: the domain shown first (default the first one).
     loading marks the tables as loading. labels: array overriding the words.
     Each action fires a bubbling, cancelable event with detail { ..., resolve(result?), reject(message), waitUntil(promise) }:
       "nq-mail-recheck" { domainId }                                  "nq-mail-add-mailbox" { domainId, local, quotaMb, password }   "nq-mail-remove-mailbox" { domainId, id }
       "nq-mail-add-alias" { domainId, source, destination }          "nq-mail-remove-alias" { domainId, id }
     @nq-mail-recheck="$event.detail.waitUntil($wire.recheck($event.detail.domainId))". An error (resolve({ error }), reject(message), a rejected promise) is shown in an alert;
     with nobody listening the action counts as done. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.mail-settings._mail-settings')
@props(['domains' => [], 'defaultDomainId' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_mail_strings($locale, $labels);
    $list = array_values(array_map(fn ($d) => (array) $d, (array) $domains));
    $firstId = $defaultDomainId ?? ($list[0]['id'] ?? '');
    $healthTone = ['healthy' => 'success', 'attention' => 'info', 'critical' => 'warning'];
    $dnsTone = ['pass' => 'success', 'fail' => 'danger', 'missing' => 'danger', 'pending' => 'info'];
    $at = function ($v) {
        if (is_numeric($v)) {
            return $v > 100000000000 ? $v / 1000 : $v;
        }

        return $v;
    };
    $config = [
        'domainId' => $firstId,
        'domains' => array_map(fn ($d) => ['id' => $d['id'], 'name' => $d['name']], $list),
        'strings' => [
            'genericError' => $t['genericError'],
            'removeMailboxTitle' => $t['removeMailboxTitle'], 'removeMailboxBody' => $t['removeMailboxBody'],
            'removeAliasTitle' => $t['removeAliasTitle'], 'removeAliasBody' => $t['removeAliasBody'],
        ],
    ];
    $hidden = fn ($id) => $id === $firstId ? '' : 'display: none';
@endphp
@if (count($list) === 0)
    <x-nq::card data-slot="{{ $attributes->get('data-slot', 'mail-domains') }}" {{ $attributes->except('data-slot')->cn('w-full') }}>
        <x-nq::card.content>
            <x-nq::states.empty icon="mail" :title="$t['noDomains']" :description="$t['noDomainsBody']" />
        </x-nq::card.content>
    </x-nq::card>
@else
<div data-slot="{{ $attributes->get('data-slot', 'mail-domains') }}" x-data="nqMailDomains(@js($config))" x-on:nq-data-table-action="onAction($event)" @if ($loading) aria-busy="true" @endif {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <x-nq::card class="w-full">
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $t['domainsTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['domainsDescription'] }}</x-nq::card.description>
            <x-nq::card.action>
                @foreach ($list as $d)
                    @php $health = nq_mail_health($d['checks'] ?? []); @endphp
                    <span x-show="domainId === {{ \Illuminate\Support\Js::from($d['id']) }}" @if ($d['id'] !== $firstId) style="display: none" x-cloak @endif>
                        <x-nq::status :tone="$healthTone[$health]" :data-health="$health">{{ $t['health'][$health] }}</x-nq::status>
                    </span>
                @endforeach
            </x-nq::card.action>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <div x-show="failure" x-cloak style="display: none">
                <x-nq::alert tone="danger"><span x-text="failure"></span></x-nq::alert>
            </div>
            <x-nq::field class="max-w-sm">
                <x-nq::field.label>{{ $t['domain'] }}</x-nq::field.label>
                <x-nq::select :value="$firstId" x-model="domainId">
                    <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($list as $d)
                            <x-nq::select.item :value="$d['id']"><bdi dir="ltr">{{ $d['name'] }}</bdi></x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
            </x-nq::field>
        </x-nq::card.content>
    </x-nq::card>

    @foreach ($list as $d)
        @php
            $id = $d['id'];
            $checks = collect($d['checks'] ?? []);
            $mailboxRows = array_map(fn ($m) => [
                'id' => $m['id'], 'local' => $m['local'], 'address' => $m['local'].'@'.$d['name'],
                'used' => nq_mail_mb($m['usedMb']).' / '.nq_mail_mb($m['quotaMb']).' ('.round(nq_mail_fraction($m['usedMb'], $m['quotaMb']) * 100).'%)',
            ], array_values($d['mailboxes'] ?? []));
            $aliasRows = array_map(fn ($a) => ['id' => $a['id'], 'source' => $a['source'], 'address' => $a['source'].'@'.$d['name'], 'destination' => $a['destination']], array_values($d['aliases'] ?? []));
        @endphp
        <div data-domain="{{ $id }}" x-show="domainId === {{ \Illuminate\Support\Js::from($id) }}" @if ($id !== $firstId) style="display: none" x-cloak @endif class="flex flex-col gap-6">
            <x-nq::card data-slot="mail-dns" class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['checklistTitle'] }}</x-nq::card.title>
                    <x-nq::card.description>
                        {{ $t['checklistDescription'] }}
                        @if (! empty($d['checkedAt']))
                            {{ $t['lastChecked'] }} <x-nq::numeric.date-time :value="$at($d['checkedAt'])" relative />.
                        @endif
                    </x-nq::card.description>
                    <x-nq::card.action>
                        <x-nq::button size="sm" variant="secondary" type="button" x-on:click="recheck()" x-bind:disabled="checking" x-bind:aria-busy="checking ? 'true' : undefined">
                            <x-nq::spinner x-show="checking" x-cloak style="display: none" />
                            <x-lucide-shield-check x-show="!checking" aria-hidden="true" class="size-4" />
                            <span x-text="checking ? @js($t['checking']) : @js($t['recheck'])">{{ $t['recheck'] }}</span>
                        </x-nq::button>
                    </x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-4">
                    @foreach (['spf', 'dkim', 'dmarc'] as $kind)
                        @php
                            $check = $checks->first(fn ($c) => $c['kind'] === $kind);
                            $status = $check['status'] ?? 'missing';
                        @endphp
                        <section data-slot="mail-dns-row" data-kind="{{ $kind }}" data-status="{{ $status }}" aria-label="{{ $t['kinds'][$kind] }}" class="flex flex-col gap-2 rounded-control border border-border p-3">
                            <div class="flex flex-wrap items-start justify-between gap-2">
                                <div class="flex min-w-0 flex-col">
                                    <span class="text-label text-foreground">{{ $t['kinds'][$kind] }}</span>
                                    <span class="text-caption text-muted-foreground">{{ $t['kindHelp'][$kind] }}</span>
                                </div>
                                @if ($status === 'pending')
                                    <span class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground"><x-nq::spinner /> {{ $t['dnsStatus']['pending'] }}</span>
                                @else
                                    <x-nq::status :tone="$dnsTone[$status]">{{ $t['dnsStatus'][$status] }}</x-nq::status>
                                @endif
                            </div>
                            @if ($check)
                                <div class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                                    <span>{{ $t['recordType'] }}</span>
                                    <x-nq::badge variant="outline">{{ $check['type'] ?? 'TXT' }}</x-nq::badge>
                                    <span>{{ $t['recordName'] }}</span>
                                    <bdi dir="ltr" class="font-mono text-code text-foreground">{{ $check['name'] }}</bdi>
                                </div>
                                <x-nq::copy-button.field :value="$check['expected']" :label="$t['kinds'][$kind].': '.$t['expected']" :copy-label="$t['copyRecord']" />
                                @if ($status !== 'pass')
                                    <p class="text-caption text-muted-foreground">
                                        {{ $t['found'] }}:
                                        @if (! empty($check['found']))
                                            <bdi dir="ltr" class="font-mono text-code text-foreground break-all">{{ $check['found'] }}</bdi>
                                        @else
                                            {{ $t['nothingFound'] }}
                                        @endif
                                    </p>
                                @endif
                            @endif
                            @foreach (nq_mail_warnings($kind, $check['found'] ?? null, $t) as $w)
                                <x-nq::alert tone="warning">{{ $w }}</x-nq::alert>
                            @endforeach
                        </section>
                    @endforeach
                </x-nq::card.content>
            </x-nq::card>

            <x-nq::card data-slot="mail-mailboxes" class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['mailboxesTitle'] }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t['mailboxesDescription'] }}</x-nq::card.description>
                    <x-nq::card.action>
                        <x-nq::button size="sm" variant="secondary" type="button" x-on:click="mailboxOpen = true">
                            <x-lucide-mail-plus aria-hidden="true" class="size-4" />
                            {{ $t['addMailbox'] }}
                        </x-nq::button>
                    </x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::data-table :label="$t['mailboxesTable']" name-key="address" :page-size="8" :search="false" :view-options="false" :loading="$loading"
                        :columns="[['id' => 'address', 'header' => $t['address'], 'sortable' => true, 'hideable' => false], ['id' => 'used', 'header' => $t['used']]]"
                        :rows="$mailboxRows" :row-actions="[['id' => 'remove', 'label' => $t['remove'], 'icon' => 'trash-2', 'danger' => true]]">
                        <x-slot:empty><x-nq::states.empty icon="mail" :title="$t['mailboxesEmpty']" class="border-0" /></x-slot:empty>
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>

            <x-nq::card data-slot="mail-aliases" class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t['aliasesTitle'] }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t['aliasesDescription'] }}</x-nq::card.description>
                    <x-nq::card.action>
                        <x-nq::button size="sm" variant="secondary" type="button" x-on:click="aliasOpen = true">
                            <x-lucide-plus aria-hidden="true" class="size-4" />
                            {{ $t['addAlias'] }}
                        </x-nq::button>
                    </x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::data-table :label="$t['aliasesTable']" name-key="address" :page-size="8" :search="false" :view-options="false" :loading="$loading"
                        :columns="[['id' => 'address', 'header' => $t['aliasSource'], 'sortable' => true, 'hideable' => false], ['id' => 'destination', 'header' => $t['aliasDestination'], 'sortable' => true]]"
                        :rows="$aliasRows" :row-actions="[['id' => 'remove', 'label' => $t['remove'], 'icon' => 'trash-2', 'danger' => true]]">
                        <x-slot:empty><x-nq::states.empty icon="mail" :title="$t['aliasesEmpty']" class="border-0" /></x-slot:empty>
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>
        </div>
    @endforeach

    <x-nq::dialog x-model="mailboxOpen">
        <x-nq::dialog.content class="max-w-md">
            <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="addMailbox()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['addMailboxTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description><bdi dir="ltr">@<span x-text="domainName"></span></bdi></x-nq::dialog.description>
                </x-nq::dialog.header>
                <div x-show="mError" x-cloak style="display: none">
                    <x-nq::alert tone="danger"><span x-text="mError"></span></x-nq::alert>
                </div>
                <x-nq::field x-model="mLocalBad">
                    <x-nq::field.label>{{ $t['localPart'] }}</x-nq::field.label>
                    <x-nq::field.input ltr x-model="mLocal" placeholder="{{ $t['localPlaceholder'] }}" autocomplete="off" spellcheck="false" />
                    <x-nq::field.error>{{ $t['localInvalid'] }}</x-nq::field.error>
                </x-nq::field>
                <div class="grid gap-4 sm:grid-cols-2">
                    <x-nq::field x-model="mQuotaBad">
                        <x-nq::field.label>{{ $t['quotaLabel'] }}</x-nq::field.label>
                        <x-nq::field.input ltr inputmode="numeric" x-model="mQuota" autocomplete="off" />
                        <x-nq::field.error>{{ $t['quotaInvalid'] }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field x-model="mPasswordBad">
                        <x-nq::field.label>{{ $t['mailboxPassword'] }}</x-nq::field.label>
                        <x-nq::field.input ltr type="password" x-model="mPassword" autocomplete="new-password" />
                        <x-nq::field.error>{{ $t['mailboxPasswordInvalid'] }}</x-nq::field.error>
                    </x-nq::field>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="mailboxOpen = false" x-bind:disabled="mPending">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="mPending" x-bind:aria-busy="mPending ? 'true' : undefined">
                        <x-nq::spinner x-show="mPending" x-cloak style="display: none" />
                        {{ $t['add'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="aliasOpen">
        <x-nq::dialog.content class="max-w-md">
            <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="addAlias()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['addAliasTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description><bdi dir="ltr">@<span x-text="domainName"></span></bdi></x-nq::dialog.description>
                </x-nq::dialog.header>
                <div x-show="aError" x-cloak style="display: none">
                    <x-nq::alert tone="danger"><span x-text="aError"></span></x-nq::alert>
                </div>
                <x-nq::field x-model="aSourceBad">
                    <x-nq::field.label>{{ $t['aliasSourceLabel'] }}</x-nq::field.label>
                    <x-nq::field.input ltr x-model="aSource" placeholder="{{ $t['aliasSourcePlaceholder'] }}" autocomplete="off" spellcheck="false" />
                    <x-nq::field.error>{{ $t['aliasSourceInvalid'] }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="aDestBad">
                    <x-nq::field.label>{{ $t['aliasDestLabel'] }}</x-nq::field.label>
                    <x-nq::field.input ltr type="email" x-model="aDest" placeholder="{{ $t['aliasDestPlaceholder'] }}" autocomplete="off" />
                    <x-nq::field.error>{{ $t['aliasDestInvalid'] }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="aliasOpen = false" x-bind:disabled="aPending">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="aPending" x-bind:aria-busy="aPending ? 'true' : undefined">
                        <x-nq::spinner x-show="aPending" x-cloak style="display: none" />
                        {{ $t['add'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::alert-dialog x-model="removeOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="removeTitle"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description><span x-text="removeBody"></span></x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel x-bind:disabled="removePending">{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::button type="button" variant="danger" x-on:click="confirmRemove()" x-bind:disabled="removePending" x-bind:aria-busy="removePending ? 'true' : undefined">
                    <x-nq::spinner x-show="removePending" x-cloak style="display: none" />
                    {{ $t['remove'] }}
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>
@endif
