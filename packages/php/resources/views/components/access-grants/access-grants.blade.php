{{-- <x-nq::access-grants :apps="$apps" :resources="$resources" :grants="$grants" can-revoke can-change-grant @revoke="$event.detail.wait(…)" @change-grant="$event.detail.wait(…)" />
     Who and what can act for you: authorized apps and agents per workspace with their scopes and a Revoke button, delegated agent keys, and a matrix of
     agents by resource where each cell is no access, read or read and write. Cell changes save at once and go back if the host fails.
     apps: [['id', 'name', 'kind' => app | agent, 'publisher', 'logo', 'orgId', 'scopes' => ['docs:read'], 'authorizedAt', 'lastUsedAt']].
     scope-labels: ['docs:read' => 'Read documents']. organizations: [['id', 'name']]; a workspace filter shows when there are two or more.
     resources: [['id', 'label']], the matrix columns. grants: ['agentId' => ['resourceId' => none | read | write]].
     agent-keys: ['keys' => …, 'scopes' => …, 'defaultScopes', 'expiryOptions', 'defaultExpiryDays'], the props of <x-nq::api-keys>; its heading text is fixed there. Omit to hide.
     can-revoke / can-change-grant (both false): add Revoke, or let the matrix cells change. sections: ['apps', 'keys', 'grants'] (default all). labels: any string below, by key.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       revoke        detail.appId; resolve, or resolve { error }
       change-grant  detail.agentId, detail.resourceId, detail.level; resolve, or resolve { error }
       (the agent keys section fires create, rotate and revoke, see api-keys; revoke there carries detail.id)
     A rejected promise shows a generic error. After a revoke re-render the page without the app. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['apps' => [], 'scopeLabels' => [], 'organizations' => [], 'resources' => [], 'grants' => [], 'agentKeys' => null, 'sections' => ['apps', 'keys', 'grants'], 'canRevoke' => false, 'canChangeGrant' => false, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $has = fn (string $s) => in_array($s, $sections, true);
    $num = fn (int $n) => (new \NumberFormatter(($ar ? 'ar' : 'en').'-u-nu-latn', \NumberFormatter::DECIMAL))->format($n);
    $scopeName = fn (string $id) => $scopeLabels[$id] ?? $id;
    $orgName = fn ($id) => collect($organizations)->firstWhere('id', $id)['name'] ?? null;
    $readOnlyScope = fn (string $s) => (bool) preg_match('/[:.]read$/', $s);
    $agents = collect($apps)->where('kind', 'agent')->values()->all();
    $resourceIds = collect($resources)->pluck('id')->map(fn ($i) => (string) $i)->all();
    $levelOf = fn ($agent, $resource) => $grants[$agent][$resource] ?? 'none';
    $levels = ['none' => $L('levelNone', 'No access', 'بلا وصول'), 'read' => $L('levelRead', 'Read', 'قراءة'), 'write' => $L('levelWrite', 'Read and write', 'قراءة وكتابة')];
    $counts = function ($agent) use ($resourceIds, $levelOf) {
        $r = 0; $w = 0;
        foreach ($resourceIds as $res) { $l = $levelOf($agent, $res); if ($l !== 'none') $r++; if ($l === 'write') $w++; }
        return [$r, $w];
    };
    $cells = [];
    foreach ($agents as $a) foreach ($resourceIds as $res) $cells[$a['id'].':'.$res] = $levelOf($a['id'], $res);
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'apps' => (object) collect($apps)->mapWithKeys(fn ($a) => [(string) $a['id'] => ['name' => $a['name']]])->all(),
        'resources' => $resourceIds,
        'agents' => collect($agents)->pluck('id')->all(),
        'cells' => (object) $cells,
        'labels' => [
            'summary' => $L('summary', 'Reads {r}, writes {w}', 'يقرأ {r}، ويكتب {w}'),
            'revokeTitle' => $L('revokeTitle', 'Revoke {name}?', 'إلغاء وصول {name}؟'),
            'revokeFailed' => $L('revokeFailed', 'Access could not be revoked. Try again.', 'تعذّر إلغاء الوصول. حاول مرة أخرى.'),
            'revoked' => $L('revoked', '{name} was revoked.', 'تم إلغاء وصول {name}.'),
            'grantFailed' => $L('grantFailed', 'That change did not save, so it was put back. Try again.', 'لم يُحفظ هذا التغيير فأُعيد كما كان. حاول مرة أخرى.'),
        ],
    ];
    $dismiss = $L('dismiss', 'Dismiss', 'إغلاق');
    $revoke = $L('revoke', 'Revoke', 'إلغاء الوصول');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'access-grants') }}" x-data="nqAccessGrants(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <template x-if="notice !== null && notice.tone === 'success'">
        <x-nq::alert tone="success" role="status" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <template x-if="notice !== null && notice.tone === 'danger'">
        <x-nq::alert tone="danger" role="alert" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>

    @if ($has('apps'))
        <x-nq::account-settings.settings-section :title="$L('appsTitle', 'Authorized apps and agents', 'التطبيقات والوكلاء المصرّح لهم')" :description="$L('appsBody', 'Apps and AI agents you have allowed to act on your behalf. Revoking cuts their access at once.', 'تطبيقات ووكلاء ذكاء اصطناعي سمحت لهم بالتصرف نيابةً عنك. الإلغاء يقطع وصولهم فورًا.')">
            @if (count($organizations) > 1)
                <x-slot:action>
                    <x-nq::select value="all" x-model="org">
                        <x-nq::select.trigger :aria-label="$L('workspace', 'Workspace', 'مساحة العمل')" class="w-48"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            <x-nq::select.item value="all">{{ $L('allWorkspaces', 'All workspaces', 'كل مساحات العمل') }}</x-nq::select.item>
                            @foreach ($organizations as $o)
                                <x-nq::select.item :value="(string) $o['id']">{{ $o['name'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-slot:action>
            @endif
            @if (count($apps))
                <ul aria-label="{{ $L('appsLabel', 'Authorized apps and agents', 'التطبيقات والوكلاء المصرّح لهم') }}" data-slot="access-apps" class="flex flex-col divide-y divide-border rounded-card border border-border">
                    @foreach ($apps as $a)
                        @php
                            $scopes = array_values($a['scopes'] ?? []);
                            $shown = array_slice($scopes, 0, 3);
                            $rest = array_slice($scopes, 3);
                            $isAgent = ($a['kind'] ?? 'app') === 'agent';
                            $org = $orgName($a['orgId'] ?? null);
                        @endphp
                        <li data-org="{{ $a['orgId'] ?? '' }}" x-show="inOrg($el.dataset.org)" class="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                            <x-nq::avatar :name="$a['name']" :src="$a['logo'] ?? null" shape="square" size="lg" />
                            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="truncate text-label text-foreground">{{ $a['name'] }}</span>
                                    <x-nq::badge :variant="$isAgent ? 'accent' : 'neutral'">
                                        @if ($isAgent)<x-lucide-bot aria-hidden="true" />@else<x-lucide-plug aria-hidden="true" />@endif
                                        {{ $isAgent ? $L('agent', 'Agent', 'وكيل') : $L('app', 'App', 'تطبيق') }}
                                    </x-nq::badge>
                                    @if (count($scopes) && collect($scopes)->every($readOnlyScope))
                                        <x-nq::badge variant="info">{{ $L('readOnly', 'Read only', 'قراءة فقط') }}</x-nq::badge>
                                    @endif
                                </div>
                                <p class="text-caption text-muted-foreground">{{ $a['publisher'] ?? '' }}@if ($org)<span x-show="org === 'all'">{{ ($a['publisher'] ?? '') !== '' ? ' · ' : '' }}{{ $org }}</span>@endif</p>
                                <div class="flex flex-wrap gap-1.5">
                                    @forelse ($shown as $s)
                                        <x-nq::badge variant="outline">{{ $scopeName($s) }}</x-nq::badge>
                                    @empty
                                        <span class="text-caption text-muted-foreground">{{ $L('noScopes', 'No permissions', 'بلا صلاحيات') }}</span>
                                    @endforelse
                                    @if (count($rest))
                                        <x-nq::tooltip :content="collect($rest)->map($scopeName)->implode(', ')">
                                            <x-nq::badge variant="outline" tabindex="0">{{ $ar ? '+'.$num(count($rest)).' أخرى' : '+'.$num(count($rest)).' more' }}</x-nq::badge>
                                        </x-nq::tooltip>
                                    @endif
                                </div>
                                <p class="text-caption text-muted-foreground">
                                    {{ $L('authorized', 'Authorized', 'تاريخ التصريح') }} <x-nq::numeric.date-time :value="$a['authorizedAt']" date-style="medium" /> · {{ $L('lastUsed', 'Last used', 'آخر استخدام') }}
                                    @if (! empty($a['lastUsedAt']))<x-nq::numeric.date-time :value="$a['lastUsedAt']" relative />@else{{ $L('neverUsed', 'Never used', 'لم يُستخدم') }}@endif
                                </p>
                            </div>
                            @if ($canRevoke)
                                <x-nq::button type="button" size="sm" variant="secondary" data-app="{{ $a['id'] }}" x-on:click="askRevoke($el.dataset.app)"><x-lucide-trash-2 aria-hidden="true" />{{ $revoke }}</x-nq::button>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @else
                <x-nq::states.empty :title="$L('appsEmpty', 'No apps or agents yet', 'لا توجد تطبيقات أو وكلاء بعد')" :description="$L('appsEmptyHint', 'When you approve an app or connect an agent, it appears here.', 'عندما توافق على تطبيق أو تربط وكيلًا سيظهر هنا.')" />
            @endif
        </x-nq::account-settings.settings-section>
    @endif

    @if ($has('keys') && $agentKeys)
        <div data-slot="access-agent-keys">
            <x-nq::api-keys :keys="$agentKeys['keys'] ?? []" :scopes="$agentKeys['scopes'] ?? []" :default-scopes="$agentKeys['defaultScopes'] ?? []" :expiry-options="$agentKeys['expiryOptions'] ?? [7, 30, 90, 365, null]" :default-expiry-days="$agentKeys['defaultExpiryDays'] ?? 90" />
        </div>
    @endif

    @if ($has('grants') && count($resources))
        <x-nq::account-settings.settings-section :title="$L('grantsTitle', 'What agents can reach', 'ما يستطيع الوكلاء الوصول إليه')" :description="$L('grantsBody', 'Choose, per agent, which resources it can read and which it can change. Write includes read.', 'اختر لكل وكيل الموارد التي يقرأها والتي يغيّرها. الكتابة تشمل القراءة.')">
            @if (count($agents))
                <div class="overflow-x-auto">
                    <table data-slot="access-matrix" aria-label="{{ $L('grantsLabel', 'Agent access by resource', 'وصول الوكلاء حسب المورد') }}" class="w-full min-w-[32rem] border-collapse text-body-sm">
                        <thead>
                            <tr class="border-b border-border">
                                <th scope="col" class="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">{{ $L('agentColumn', 'Agent', 'الوكيل') }}</th>
                                @foreach ($resources as $r)
                                    <th scope="col" class="px-2 py-2 text-start text-label text-foreground">{{ $r['label'] }}</th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($agents as $a)
                                @php [$reads, $writes] = $counts($a['id']); @endphp
                                <tr data-org="{{ $a['orgId'] ?? '' }}" x-show="inOrg($el.dataset.org)" class="border-b border-border last:border-b-0">
                                    <th scope="row" class="py-3 pe-3 text-start font-normal">
                                        <span class="block text-label text-foreground">{{ $a['name'] }}</span>
                                        <span class="block text-caption text-muted-foreground" data-agent="{{ $a['id'] }}" x-text="summary($el.dataset.agent)">{{ $ar ? 'يقرأ '.$num($reads).'، ويكتب '.$num($writes) : 'Reads '.$num($reads).', writes '.$num($writes) }}</span>
                                    </th>
                                    @foreach ($resources as $r)
                                        @php $level = $levelOf($a['id'], $r['id']); @endphp
                                        <td class="px-2 py-3">
                                            <div class="contents" x-data="{ k: @js($a['id'].':'.$r['id']) }">
                                                <x-nq::select :value="$level" x-model="cells[k]">
                                                    <x-nq::select.trigger :aria-label="$a['name'].': '.$r['label']" :data-level="$level" x-bind:data-level="cells[k]" :disabled="! $canChangeGrant" :class="'h-control-sm min-w-32'.($level === 'none' ? ' text-muted-foreground' : '')"><x-nq::select.value /></x-nq::select.trigger>
                                                    <x-nq::select.content>
                                                        @foreach ($levels as $value => $label)
                                                            <x-nq::select.item :value="$value">{{ $label }}</x-nq::select.item>
                                                        @endforeach
                                                    </x-nq::select.content>
                                                </x-nq::select>
                                            </div>
                                        </td>
                                    @endforeach
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @else
                <x-nq::states.empty icon="bot" :title="$L('grantsEmpty', 'No agents connected', 'لا يوجد وكلاء مرتبطون')" :description="$L('grantsEmptyHint', 'Connect an agent to control what it can reach.', 'اربط وكيلًا لتتحكم فيما يصل إليه.')" />
            @endif
        </x-nq::account-settings.settings-section>
    @endif

    @if ($canRevoke)
        <x-nq::alert-dialog x-model="revokeOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="revokeTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L('revokeBody', 'It loses access immediately and must ask you again to get it back. Its agent keys stop working.', 'يفقد وصوله فورًا وعليه أن يطلب منك من جديد ليستعيده. وتتوقف مفاتيح الوكيل عن العمل.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="revokeOpen = false" x-bind:disabled="busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="runRevoke()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        {{ $revoke }}
                    </x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
