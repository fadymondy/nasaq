{{-- <x-nq::integration-connector :services="[['id' => 'gsc', 'name' => 'Search Console', 'group' => 'Google', 'status' => 'disconnected', 'scopes' => [['id' => 'read', 'label' => 'Read performance data', 'required' => true]]]]"
         @nq-connect="$event.detail.wait(startOAuth($event.detail.id, $event.detail.scopeIds))" @nq-disconnect="$event.detail.wait(revoke($event.detail.id))" />
     Cards for the outside services a workspace connects to (Google Analytics, Search Console, YouTube, GitHub, Slack ...): status, who authorised it,
     last sync, an account picker, and Connect, Reconnect or Disconnect. Connect first shows exactly which permissions are asked for (required ones locked).
     services: each id, name, status (disconnected | connected | needs-reauth | error | pending), scopes [id, label, required], and optionally description,
       icon (the brand's official logo as <svg>), group, grantedScopes [ids], connectedAs, accounts [id, name, detail], accountId, lastSyncAt, message, learnMoreHref.
     Actions fire events on the root with detail { ..., wait(promise) }: `nq-connect` { id, scopeIds }, `nq-disconnect` { id }, `nq-select-account` { id, accountId }.
     Pass a promise to wait() to show the pending state; resolve { error } (or reject) to show a message, otherwise the card flips to its new state.
     Connected services that have accounts show an account picker (fires nq-select-account). bare hides the title and description.
     labels: override any string. Needs the Alpine runtime. --}}
@props(['services' => [], 'bare' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'title' => $t::t('Connections', 'الاتصالات'),
        'description' => $t::t('Connect the services this workspace reads from or posts to.', 'اربط الخدمات التي تقرأ منها مساحة العمل هذه أو تنشر إليها.'),
        'list' => $t::t('Services', 'الخدمات'),
        'connect' => $t::t('Connect', 'ربط'),
        'reconnect' => $t::t('Reconnect', 'إعادة الربط'),
        'disconnect' => $t::t('Disconnect', 'فك الربط'),
        'manage' => $t::t('Change permissions', 'تغيير الصلاحيات'),
        'status' => [
            'disconnected' => $t::t('Not connected', 'غير مرتبطة'),
            'connected' => $t::t('Connected', 'مرتبطة'),
            'needs-reauth' => $t::t('Needs sign-in again', 'تحتاج تسجيل دخول جديد'),
            'error' => $t::t('Connection problem', 'مشكلة في الاتصال'),
            'pending' => $t::t('Connecting…', 'جارٍ الربط…'),
        ],
        'connectedAs' => $t::t('Signed in as', 'مسجَّل باسم'),
        'account' => $t::t('Account', 'الحساب'),
        'lastSync' => $t::t('Last synced', 'آخر مزامنة'),
        'never' => $t::t('Not synced yet', 'لم تتم المزامنة بعد'),
        'justNow' => $t::t('Just now', 'الآن'),
        'permissions' => $t::t('Permissions', 'الصلاحيات'),
        'permissionsOne' => $t::t('1 permission', 'صلاحية واحدة'),
        'permissionsMany' => $t::t('{n} permissions', '{n} صلاحيات'),
        'required' => $t::t('Required', 'مطلوبة'),
        'dialogTitle' => $t::t('Connect {name}', 'ربط {name}'),
        'dialogBody' => $t::t('You will go to {name} to sign in and approve access. Nasaq never sees your password.', 'ستنتقل إلى {name} لتسجيل الدخول والموافقة على الوصول. لا يرى نسق كلمة مرورك أبدًا.'),
        'dialogPermissions' => $t::t('Nasaq will be able to', 'سيتمكن نسق من'),
        'continue' => $t::t('Continue to {name}', 'المتابعة إلى {name}'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'disconnectTitle' => $t::t('Disconnect {name}?', 'فك ربط {name}؟'),
        'disconnectBody' => $t::t('Nasaq stops reading from this service and deletes the stored access. Data already imported stays. You can connect it again later.', 'يتوقف نسق عن القراءة من هذه الخدمة ويحذف بيانات الوصول المخزّنة. تبقى البيانات المستوردة سابقًا. يمكنك الربط مجددًا لاحقًا.'),
        'disconnectConfirm' => $t::t('Disconnect', 'فك الربط'),
        'noPermissions' => $t::t('Pick at least one permission.', 'اختر صلاحية واحدة على الأقل.'),
        'emptyTitle' => $t::t('No services to connect', 'لا توجد خدمات للربط'),
        'emptyBody' => $t::t('Services you can connect will appear here.', 'ستظهر هنا الخدمات التي يمكنك ربطها.'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $s['status'] = (array) $s['status'];
    $tones = ['disconnected' => 'neutral', 'connected' => 'success', 'needs-reauth' => 'warning', 'error' => 'danger', 'pending' => 'info'];
    $rows = collect($services)->map(fn ($v) => $v + [
        'description' => null, 'icon' => null, 'group' => null, 'grantedScopes' => null, 'connectedAs' => null, 'accounts' => [], 'accountId' => null,
        'lastSyncAt' => null, 'message' => null, 'learnMoreHref' => null,
    ])->values();
    $groups = $rows->map(fn ($r) => $r['group'] ?? '')->unique()->values()->all();
    $init = [
        'services' => (object) $rows->mapWithKeys(fn ($r) => [$r['id'] => [
            'name' => $r['name'],
            'scopes' => collect($r['scopes'])->map(fn ($sc) => ['id' => $sc['id'], 'label' => $sc['label'], 'required' => (bool) ($sc['required'] ?? false)])->values()->all(),
            'granted' => $r['grantedScopes'] ?? collect($r['scopes'])->pluck('id')->all(),
        ]])->all(),
        'status' => (object) $rows->mapWithKeys(fn ($r) => [$r['id'] => $r['status']])->all(),
        'account' => (object) $rows->mapWithKeys(fn ($r) => [$r['id'] => $r['accountId']])->all(),
        'strings' => [
            'dialogTitle' => $s['dialogTitle'], 'dialogBody' => $s['dialogBody'], 'continue' => $s['continue'], 'noPermissions' => $s['noPermissions'],
            'genericError' => $s['genericError'], 'permissionsOne' => $s['permissionsOne'], 'permissionsMany' => $s['permissionsMany'],
        ],
    ];
    $uid = 'nq-integration-'.substr(md5(json_encode($rows)), 0, 6);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'integration-connector') }}" x-data="nqIntegrationConnector({!! \Illuminate\Support\Js::from($init) !!})"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    @unless ($bare)
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $s['title'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $s['description'] }}</x-nq::card.description>
        </x-nq::card.header>
    @endunless
    <x-nq::card.content :class="$bare ? 'pt-6' : ''">
        @if ($rows->isEmpty())
            <x-nq::states.empty icon="link-2" :title="$s['emptyTitle']" :description="$s['emptyBody']" />
        @else
            <div class="flex flex-col gap-5">
                <x-nq::alert tone="danger" dismissible x-model="hasError" style="display: none"><span x-text="error"></span></x-nq::alert>
                @foreach ($groups as $group)
                    <section class="flex flex-col gap-3" aria-label="{{ $group ?: $s['list'] }}">
                        @if ($group)
                            <h3 class="text-label text-muted-foreground">{{ $group }}</h3>
                        @endif
                        <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            @foreach ($rows->filter(fn ($r) => ($r['group'] ?? '') === $group) as $r)
                                @php
                                    $id = $r['id'];
                                    $jsId = \Illuminate\Support\Js::from($id);
                                    $isConnected = in_array($r['status'], ['connected', 'needs-reauth', 'error'], true);
                                    $isPending = $r['status'] === 'pending';
                                    $granted = $r['grantedScopes'] ?? collect($r['scopes'])->pluck('id')->all();
                                    $items = collect($r['accounts'])->values();
                                    $showMessage = $r['message'] && in_array($r['status'], ['error', 'needs-reauth'], true);
                                @endphp
                                <li data-slot="integration-service" data-service="{{ $id }}" x-bind:data-status="status[{!! $jsId !!}]"
                                    class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex min-w-0 items-center gap-3">
                                            @if ($r['icon'])
                                                <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-6" aria-hidden="true">{!! $r['icon'] !!}</span>
                                            @endif
                                            <div class="flex min-w-0 flex-col">
                                                <h3 class="truncate text-label text-foreground" dir="auto">{{ $r['name'] }}</h3>
                                                @foreach ($tones as $state => $tone)
                                                    <x-nq::status :tone="$tone" class="text-caption" x-show="status[{!! $jsId !!}] === '{{ $state }}'" :style="$r['status'] === $state ? '' : 'display: none'">{{ $s['status'][$state] }}</x-nq::status>
                                                @endforeach
                                            </div>
                                        </div>
                                    </div>
                                    @if ($r['description'])
                                        <p class="text-body-sm text-muted-foreground">{{ $r['description'] }}</p>
                                    @endif
                                    @if ($r['message'])
                                        <x-nq::alert tone="danger" x-show="status[{!! $jsId !!}] === 'error'" :style="$r['status'] === 'error' ? '' : 'display: none'">{{ $r['message'] }}</x-nq::alert>
                                        <x-nq::alert tone="warning" x-show="status[{!! $jsId !!}] === 'needs-reauth'" :style="$r['status'] === 'needs-reauth' ? '' : 'display: none'">{{ $r['message'] }}</x-nq::alert>
                                    @endif
                                    <dl class="grid gap-1 text-caption text-muted-foreground" x-show="isConnected({!! $jsId !!})" @unless ($isConnected) style="display: none" @endunless>
                                        @if ($r['connectedAs'])
                                            <div class="flex flex-wrap gap-1">
                                                <dt>{{ $s['connectedAs'] }}</dt>
                                                <dd dir="ltr" class="text-foreground"><bdi>{{ $r['connectedAs'] }}</bdi></dd>
                                            </div>
                                        @endif
                                        <div class="flex flex-wrap gap-1">
                                            <dt>{{ $s['lastSync'] }}</dt>
                                            <dd>
                                                @if ($r['lastSyncAt'] === null)
                                                    <span x-show="! synced[{!! $jsId !!}]">{{ $s['never'] }}</span>
                                                @else
                                                    <span class="contents" x-show="! synced[{!! $jsId !!}]"><x-nq::numeric.date-time :value="$r['lastSyncAt']" relative /></span>
                                                @endif
                                                <span x-show="synced[{!! $jsId !!}]" style="display: none">{{ $s['justNow'] }}</span>
                                            </dd>
                                        </div>
                                        <div class="flex flex-wrap gap-1">
                                            <dt>{{ $s['permissions'] }}</dt>
                                            <dd x-text="permissionsLabel({!! $jsId !!})">{{ count($granted) === 1 ? $s['permissionsOne'] : str_replace('{n}', (string) count($granted), $s['permissionsMany']) }}</dd>
                                        </div>
                                    </dl>
                                    @if ($items->isNotEmpty())
                                        <div class="contents" x-show="isConnected({!! $jsId !!})" @unless ($isConnected) style="display: none" @endunless>
                                            <x-nq::field>
                                                <x-nq::field.label>{{ $s['account'] }}</x-nq::field.label>
                                                <x-nq::select x-model="account[{!! $jsId !!}]" :value="$r['accountId']">
                                                    <x-nq::select.trigger aria-label="{{ $r['name'].': '.$s['account'] }}"><x-nq::select.value /></x-nq::select.trigger>
                                                    <x-nq::select.content>
                                                        @foreach ($items as $a)
                                                            <x-nq::select.item :value="$a['id']">
                                                                <span class="flex min-w-0 flex-col">
                                                                    <span class="truncate" dir="auto">{{ $a['name'] }}</span>
                                                                    @if (! empty($a['detail']))
                                                                        <span class="truncate text-caption text-muted-foreground" dir="ltr">{{ $a['detail'] }}</span>
                                                                    @endif
                                                                </span>
                                                            </x-nq::select.item>
                                                        @endforeach
                                                    </x-nq::select.content>
                                                </x-nq::select>
                                            </x-nq::field>
                                        </div>
                                    @endif
                                    <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
                                        <x-nq::button type="button" variant="primary" size="sm" x-show="! isConnected({!! $jsId !!})" :style="$isConnected ? 'display: none' : ''"
                                            x-on:click="openDialog({!! $jsId !!})" x-bind:aria-busy="status[{!! $jsId !!}] === 'pending' ? 'true' : null" x-bind:disabled="status[{!! $jsId !!}] === 'pending' || busy !== null">
                                            <x-nq::spinner x-show="status[{!! $jsId !!}] === 'pending'" :style="$isPending ? '' : 'display: none'" />
                                            <x-lucide-link-2 aria-hidden="true" x-show="status[{!! $jsId !!}] !== 'pending'" :style="$isPending ? 'display: none' : ''" />
                                            {{ $s['connect'] }}
                                        </x-nq::button>
                                        <span class="contents" x-show="isConnected({!! $jsId !!})" @unless ($isConnected) style="display: none" @endunless>
                                            <x-nq::button type="button" variant="primary" size="sm" x-show="status[{!! $jsId !!}] !== 'connected'" :style="$r['status'] !== 'connected' ? '' : 'display: none'"
                                                x-on:click="openDialog({!! $jsId !!})" x-bind:disabled="busy !== null">{{ $s['reconnect'] }}</x-nq::button>
                                            <x-nq::button type="button" size="sm" x-show="status[{!! $jsId !!}] === 'connected'" :style="$r['status'] === 'connected' ? '' : 'display: none'"
                                                x-on:click="openDialog({!! $jsId !!})" x-bind:disabled="busy !== null">{{ $s['manage'] }}</x-nq::button>
                                            <x-nq::alert-dialog>
                                                <x-nq::alert-dialog.trigger size="sm" variant="danger" x-bind:disabled="busy !== null">
                                                    <x-nq::spinner x-show="busy === {!! $jsId !!}" style="display: none" />
                                                    {{ $s['disconnect'] }}
                                                </x-nq::alert-dialog.trigger>
                                                <x-nq::alert-dialog.content>
                                                    <x-nq::alert-dialog.header>
                                                        <x-nq::alert-dialog.title>{{ str_replace('{name}', $r['name'], $s['disconnectTitle']) }}</x-nq::alert-dialog.title>
                                                        <x-nq::alert-dialog.description>{{ $s['disconnectBody'] }}</x-nq::alert-dialog.description>
                                                    </x-nq::alert-dialog.header>
                                                    <x-nq::alert-dialog.footer>
                                                        <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                                                        <x-nq::alert-dialog.action variant="danger" data-slot="confirm-button-action" x-on:click="disconnect({!! $jsId !!})">{{ $s['disconnectConfirm'] }}</x-nq::alert-dialog.action>
                                                    </x-nq::alert-dialog.footer>
                                                </x-nq::alert-dialog.content>
                                            </x-nq::alert-dialog>
                                        </span>
                                        @if ($r['learnMoreHref'])
                                            <a href="{{ $r['learnMoreHref'] }}" target="_blank" rel="noreferrer"
                                                class="ms-auto inline-flex items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground">
                                                {{ $s['permissions'] }}
                                                <x-lucide-external-link aria-hidden="true" class="size-3" />
                                            </a>
                                        @endif
                                    </div>
                                </li>
                            @endforeach
                        </ul>
                    </section>
                @endforeach
            </div>
            {{-- The consent dialog: one for the whole list, filled from the service being connected. --}}
            <x-nq::dialog x-model="dialogOpen">
                <x-nq::dialog.content>
                    <form data-slot="integration-connect-dialog" class="grid gap-4" novalidate x-on:submit.prevent="submit()">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title><span x-text="dialogTitle"></span></x-nq::dialog.title>
                            <x-nq::dialog.description><span x-text="dialogBody"></span></x-nq::dialog.description>
                        </x-nq::dialog.header>
                        <x-nq::alert tone="danger" x-show="dialogError" style="display: none"><span x-text="dialogError"></span></x-nq::alert>
                        <fieldset class="grid gap-2 border-0 p-0">
                            <legend class="mb-1 text-label text-foreground">{{ $s['dialogPermissions'] }}</legend>
                            <ul class="grid gap-1 rounded-card border border-border p-2">
                                <template x-for="(sc, i) in scopes" :key="sc.id">
                                    <li class="flex items-start gap-2.5 rounded-control px-2 py-1.5">
                                        <x-nq::checkbox class="mt-0.5" x-bind:id="'{{ $uid }}-' + sc.id" x-model="picked[i]" x-bind:disabled="sc.required" x-bind:data-disabled="sc.required ? '' : null" />
                                        <label x-bind:for="'{{ $uid }}-' + sc.id" class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-body-sm text-foreground">
                                            <span x-text="sc.label"></span>
                                            <x-nq::badge variant="outline" x-show="sc.required">{{ $s['required'] }}</x-nq::badge>
                                        </label>
                                    </li>
                                </template>
                            </ul>
                        </fieldset>
                        <x-nq::dialog.footer>
                            <x-nq::button type="button" variant="ghost" x-bind:disabled="dialogBusy" x-on:click="closeDialog()">{{ $s['cancel'] }}</x-nq::button>
                            <x-nq::button type="submit" variant="primary" x-bind:disabled="dialogBusy" x-bind:aria-busy="dialogBusy ? 'true' : null">
                                <x-nq::spinner x-show="dialogBusy" style="display: none" />
                                <span x-text="continueLabel"></span>
                            </x-nq::button>
                        </x-nq::dialog.footer>
                    </form>
                </x-nq::dialog.content>
            </x-nq::dialog>
        @endif
    </x-nq::card.content>
</div>
