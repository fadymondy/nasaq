{{-- <x-nq::project-view.settings :project="$project" :statuses="$statuses" :labels="$labels" :budget="$budget" save :workflow="true" :members="[...]" :integrations="[...]" archive delete />
     The Settings tab of x-nq::project-view: a settings page with General, Budget, Members, Workflow, Integrations and the Danger zone.
     project: ['key', 'name', 'client', 'status', 'startDate', 'dueDate', 'budget', 'currency']. budget: ['total', 'spent', 'currency'] or null.
     save: shows the General and Budget forms. workflow: true or ['defaultTab', 'copy'] shows x-nq::status-label-manager. members: props of x-nq::members-manager, or null.
     integrations: [['id', 'name', 'description', 'icon' (a lucide name), 'connected']] or null. archive / delete: show the danger cards (delete asks for the project key).
     State and events (nq-project-save, nq-project-integration, nq-project-archive, nq-project-delete) belong to the enclosing x-nq::project-view.
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['project', 'statuses' => [], 'labels' => [], 'budget' => null, 'save' => false, 'workflow' => null, 'members' => null, 'integrations' => null, 'archive' => false, 'delete' => false, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_pv_words($locale, (array) $text);
    $currency = $budget['currency'] ?? ($project['currency'] ?? \Nasaq\Nasaq::currency($locale));
    $archived = ($project['status'] ?? '') === 'archived';
    $showArchive = $archive && ! $archived;
    $general = $save ? [
        ['id' => 'general', 'label' => $t['pageGeneral'], 'description' => $t['pageGeneralHint'], 'keywords' => [$t['name'], $t['client'], $t['status'], $t['startDate'], $t['dueDate']]],
        ['id' => 'budget', 'label' => $t['pageBudget'], 'description' => $t['pageBudgetHint'], 'keywords' => [$t['budgetTotal'], $t['currency']]],
    ] : [];
    $team = array_values(array_filter([
        $members ? ['id' => 'members', 'label' => $t['pageMembers'], 'description' => $t['pageMembersHint']] : null,
        $workflow ? ['id' => 'workflow', 'label' => $t['pageWorkflow'], 'description' => $t['pageWorkflowHint']] : null,
    ]));
    $connections = $integrations ? [['id' => 'integrations', 'label' => $t['pageIntegrations'], 'description' => $t['pageIntegrationsHint']]] : [];
    $danger = ($archive || $delete) ? [['id' => 'danger', 'label' => $t['pageDanger'], 'description' => $t['pageDangerHint'], 'tone' => 'danger']] : [];
    $groups = array_values(array_filter([
        ['id' => 'project', 'label' => $t['groupProject'], 'pages' => $general],
        ['id' => 'team', 'label' => $t['groupTeam'], 'pages' => $team],
        ['id' => 'connections', 'label' => $t['groupConnections'], 'pages' => $connections],
        ['id' => 'danger', 'label' => $t['pageDanger'], 'pages' => $danger],
    ], fn ($g) => count($g['pages']) > 0));
    $money = fn ($n) => nq_pv_money($n, $currency, $locale);
    $statusKeys = array_keys($t['statuses']);
    $uid = 'nq-pv-set-'.substr(md5(json_encode($project['key'] ?? $project['name'] ?? '')), 0, 6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-settings') }}" {{ $attributes->except('data-slot')->cn('contents') }}>
<x-nq::settings-sections :title="$t['settingsTitle']" :description="false" :groups="$groups">
    @if ($save)
        <x-nq::settings-sections.page id="general">
            <div class="@container">
                <x-nq::card>
                    <x-nq::card.content class="pt-4">
                        <form class="grid gap-4 @2xl:grid-cols-2" x-on:submit.prevent="saveProject(@js($t['saved']))">
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
                                <x-nq::field.input value="{{ $project['name'] ?? '' }}" x-model="draft.name" x-on:input="touchDraft()" />
                            </x-nq::field>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['key'] }}</x-nq::field.label>
                                <x-nq::field.input ltr readonly value="{{ $project['key'] ?? '' }}" />
                                <x-nq::field.description>{{ $t['keyHint'] }}</x-nq::field.description>
                            </x-nq::field>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['client'] }}</x-nq::field.label>
                                <x-nq::field.input value="{{ $project['client'] ?? '' }}" x-model="draft.client" x-on:input="touchDraft()" />
                            </x-nq::field>
                            <div class="flex flex-col gap-1.5">
                                <span id="{{ $uid }}-status" class="text-label">{{ $t['status'] }}</span>
                                <x-nq::select :value="$project['status'] ?? 'active'" x-model="draft.status">
                                    <x-nq::select.trigger aria-labelledby="{{ $uid }}-status"><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        @foreach ($statusKeys as $s)
                                            <x-nq::select.item :value="$s">{{ $t['statuses'][$s] }}</x-nq::select.item>
                                        @endforeach
                                    </x-nq::select.content>
                                </x-nq::select>
                            </div>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['startDate'] }}</x-nq::field.label>
                                <x-nq::field.input ltr type="date" value="{{ $project['startDate'] ?? '' }}" x-model="draft.startDate" x-on:input="touchDraft()" />
                            </x-nq::field>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['dueDate'] }}</x-nq::field.label>
                                <x-nq::field.input ltr type="date" value="{{ $project['dueDate'] ?? '' }}" x-model="draft.dueDate" x-on:input="touchDraft()" />
                            </x-nq::field>
                            <div class="flex items-center gap-3 @2xl:col-span-2">
                                <x-nq::button type="submit" x-bind:disabled="settingsBusy">{{ $t['save'] }}</x-nq::button>
                                <span role="status" class="text-body-sm text-muted-foreground" x-show="settingsSaved" x-cloak style="display: none" x-text="settingsSaved"></span>
                                <span role="alert" class="text-body-sm text-nq-danger-text" x-show="settingsError" x-cloak style="display: none" x-text="settingsError"></span>
                            </div>
                        </form>
                    </x-nq::card.content>
                </x-nq::card>
            </div>
        </x-nq::settings-sections.page>

        <x-nq::settings-sections.page id="budget">
            <div class="@container">
                <x-nq::card>
                    <x-nq::card.content class="flex flex-col gap-4 pt-4">
                        <form class="grid gap-4 @2xl:grid-cols-2" x-on:submit.prevent="saveProject(@js($t['budgetSaved']))">
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['budgetTotal'] }}</x-nq::field.label>
                                <x-nq::field.input ltr inputmode="decimal" value="{{ $project['budget'] ?? '' }}" x-model="draft.budget" x-on:input="touchDraft()" />
                            </x-nq::field>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['currency'] }}</x-nq::field.label>
                                <x-nq::field.input ltr readonly value="{{ $currency }}" />
                            </x-nq::field>
                            <div class="flex items-center gap-3 @2xl:col-span-2">
                                <x-nq::button type="submit" x-bind:disabled="settingsBusy">{{ $t['save'] }}</x-nq::button>
                                <span role="status" class="text-body-sm text-muted-foreground" x-show="settingsSaved" x-cloak style="display: none" x-text="settingsSaved"></span>
                                <span role="alert" class="text-body-sm text-nq-danger-text" x-show="settingsError" x-cloak style="display: none" x-text="settingsError"></span>
                            </div>
                        </form>
                        @if ($budget)
                            <div class="flex flex-col gap-2 border-t border-border pt-4">
                                <x-nq::progress.meter aria-label="{{ $t['budgetSpent'] }}" :value="min($budget['spent'], $budget['total'])" :max="$budget['total']" size="md" :show-value="false" :locale="$locale" />
                                <p class="m-0 text-body-sm text-muted-foreground">{{ $t['budgetSpent'] }}: <bdi class="text-foreground">{{ $money($budget['spent']) }}</bdi> / <bdi>{{ $money($budget['total']) }}</bdi></p>
                            </div>
                        @endif
                    </x-nq::card.content>
                </x-nq::card>
            </div>
        </x-nq::settings-sections.page>
    @endif

    @if ($members)
        <x-nq::settings-sections.page id="members">
            <x-nq::members-manager :members="$members['members'] ?? []" :invites="$members['invites'] ?? null" :roles="$members['roles'] ?? []" :current-user-id="$members['currentUserId'] ?? null"
                :grantable-roles="$members['grantableRoles'] ?? null" :owner-role="$members['ownerRole'] ?? 'owner'" :can-manage="$members['canManage'] ?? true" :can-invite="$members['canInvite'] ?? false"
                :can-change-role="$members['canChangeRole'] ?? false" :can-remove="$members['canRemove'] ?? false" :can-resend="$members['canResend'] ?? false" :can-revoke="$members['canRevoke'] ?? false"
                :can-transfer="$members['canTransfer'] ?? false" :can-leave="$members['canLeave'] ?? false" :page-size="$members['pageSize'] ?? 8" :loading="$members['loading'] ?? false" :labels="$members['labels'] ?? []" />
        </x-nq::settings-sections.page>
    @endif

    @if ($workflow)
        <x-nq::settings-sections.page id="workflow">
            <x-nq::status-label-manager :statuses="$statuses" :labels="$labels" :default-tab="is_array($workflow) ? ($workflow['defaultTab'] ?? 'statuses') : 'statuses'" :copy="is_array($workflow) ? ($workflow['copy'] ?? []) : []" />
        </x-nq::settings-sections.page>
    @endif

    @if ($integrations)
        <x-nq::settings-sections.page id="integrations">
            <div data-slot="project-integrations" class="flex min-w-0 flex-col gap-3">
                <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="integError" x-cloak style="display: none" x-text="integError"></p>
                <ul class="m-0 flex list-none flex-col gap-2 p-0">
                    @foreach (array_values($integrations) as $n => $i)
                        <li>
                            <x-nq::card>
                                <x-nq::card.content class="flex min-w-0 items-center justify-between gap-3 pt-4">
                                    <div class="flex min-w-0 items-center gap-3">
                                        @if (! empty($i['icon']))
                                            <span aria-hidden="true" class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground [&_svg]:size-5"><x-dynamic-component :component="'lucide-'.$i['icon']" /></span>
                                        @endif
                                        <div class="flex min-w-0 flex-col gap-0.5">
                                            <span class="flex flex-wrap items-center gap-2 text-label">
                                                {{ $i['name'] }}
                                                <x-nq::status tone="success" x-show="integ[{{ $n }}]" x-cloak style="display: none">{{ $t['connected'] }}</x-nq::status>
                                                <x-nq::status tone="neutral" x-show="! integ[{{ $n }}]">{{ $t['notConnected'] }}</x-nq::status>
                                            </span>
                                            @if (! empty($i['description']))
                                                <span class="text-body-sm text-muted-foreground">{{ $i['description'] }}</span>
                                            @endif
                                        </div>
                                    </div>
                                    <x-nq::switch :checked="(bool) ($i['connected'] ?? false)" x-model="integ[{{ $n }}]" x-bind:aria-label="integLabel({{ $n }})" x-bind:disabled="integBusy === {{ $n }}" />
                                </x-nq::card.content>
                            </x-nq::card>
                        </li>
                    @endforeach
                </ul>
            </div>
        </x-nq::settings-sections.page>
    @endif

    @if ($archive || $delete)
        <x-nq::settings-sections.page id="danger">
            <div data-slot="project-danger" class="flex min-w-0 flex-col gap-3">
                @if ($showArchive)
                    <x-nq::card>
                        <x-nq::card.content class="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
                            <div class="flex min-w-0 flex-col gap-0.5">
                                <span class="text-label">{{ $t['archiveTitle'] }}</span>
                                <span class="text-body-sm text-muted-foreground">{{ $t['archiveBody'] }}</span>
                            </div>
                            <x-nq::button variant="secondary" x-on:click="askDanger('archive')"><x-lucide-archive aria-hidden="true" />{{ $t['archiveAction'] }}</x-nq::button>
                        </x-nq::card.content>
                    </x-nq::card>
                @endif
                @if ($delete)
                    <x-nq::card class="border-nq-danger/40">
                        <x-nq::card.content class="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
                            <div class="flex min-w-0 flex-col gap-0.5">
                                <span class="text-label">{{ $t['deleteTitle'] }}</span>
                                <span class="text-body-sm text-muted-foreground">{{ $t['deleteBody'] }}</span>
                            </div>
                            <x-nq::button variant="danger" x-on:click="askDanger('delete')"><x-lucide-trash-2 aria-hidden="true" />{{ $t['deleteAction'] }}</x-nq::button>
                        </x-nq::card.content>
                    </x-nq::card>
                @endif

                <x-nq::dialog x-model="dangerOpen">
                    <x-nq::dialog.content>
                        <form class="flex flex-col gap-4" x-on:submit.prevent="runDanger()">
                            <x-nq::dialog.header>
                                <x-nq::dialog.title>
                                    <span x-show="isDelete()" x-cloak style="display: none">{{ $t['deleteConfirmTitle'] }}</span>
                                    <span x-show="! isDelete()">{{ $t['archiveConfirmTitle'] }}</span>
                                </x-nq::dialog.title>
                                <x-nq::dialog.description>
                                    <span x-show="isDelete()" x-cloak style="display: none">{{ $t['deleteConfirmBody'] }}</span>
                                    <span x-show="! isDelete()">{{ $t['archiveConfirmBody'] }}</span>
                                </x-nq::dialog.description>
                            </x-nq::dialog.header>
                            <div x-show="isDelete()" x-cloak style="display: none">
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['deleteConfirmField'] }}</x-nq::field.label>
                                    <x-nq::field.input ltr autocomplete="off" placeholder="{{ $project['key'] ?? $project['name'] }}" x-model="typed" />
                                </x-nq::field>
                            </div>
                            <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="dangerError" x-cloak style="display: none" x-text="dangerError"></p>
                            <x-nq::dialog.footer>
                                <x-nq::button type="button" variant="ghost" x-bind:disabled="dangerBusy" x-on:click="dangerOpen = false">{{ $t['cancel'] }}</x-nq::button>
                                <x-nq::button type="submit" variant="danger" x-show="isDelete()" x-cloak style="display: none" x-bind:disabled="dangerBusy || ! dangerReady()">{{ $t['deleteAction'] }}</x-nq::button>
                                <x-nq::button type="submit" variant="primary" x-show="! isDelete()" x-bind:disabled="dangerBusy">{{ $t['archiveAction'] }}</x-nq::button>
                            </x-nq::dialog.footer>
                        </form>
                    </x-nq::dialog.content>
                </x-nq::dialog>
            </div>
        </x-nq::settings-sections.page>
    @endif
</x-nq::settings-sections>
</div>
