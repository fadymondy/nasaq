{{-- <x-nq::model-routing-editor :task-classes="$tasks" :models="$models" :providers="$providers" :value="$value" @nq-routing-save="$event.detail.waitUntil(…)" />
     Chooses which model handles each task class, with a fallback, and manages the providers and nodes that run them: automatic routing on
     or off, a route table, modality chips per provider, an active backend switch and a register dialog. It stores nothing: it fires events
     on the root with detail.waitUntil(promise) and your handler saves. Resolve { error: '…' } (or reject) to show a message.
       nq-routing-save             detail { value: { auto, routes: { taskId: { model, fallback } }, backend } }
       nq-routing-register         detail { name, kind: 'cloud'|'node', endpoint, modalities }     resolve, or { error } to keep the dialog open
       nq-routing-remove-provider  detail { id }
     task-classes: [['id', 'label', 'description', 'modality' => text|vision|audio|image|embedding]]. models: [['id', 'label', 'modalities']].
     providers: [['id', 'name', 'kind' => cloud|node, 'endpoint', 'modalities', 'status' => online|offline]]. value: ['auto' => true,
     'routes' => ['chat' => ['model' => 'sonnet', 'fallback' => 'haiku']], 'backend' => 'cloud']. can-save / can-register / can-remove-provider
     (all true) show the footer, the register button and the remove buttons. disabled locks everything.
     After a registration or removal re-render the providers. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['taskClasses' => [], 'models' => [], 'providers' => [], 'value' => null, 'canSave' => true, 'canRegister' => true, 'canRemoveProvider' => true, 'disabled' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $taskClasses = array_values($taskClasses);
    $models = array_values($models);
    $providers = array_values($providers);
    $value ??= ['auto' => true, 'routes' => [], 'backend' => $providers[0]['id'] ?? null];
    $routes = $value['routes'] ?? [];
    $backend = $value['backend'] ?? ($providers[0]['id'] ?? null);
    $uid = 'nq-routing-'.\Illuminate\Support\Str::random(6);
    $mods = ['text' => $t::t('Text', 'نص'), 'vision' => $t::t('Vision', 'رؤية'), 'audio' => $t::t('Audio', 'صوت'), 'image' => $t::t('Image', 'صورة'), 'embedding' => $t::t('Embedding', 'تضمين')];
    $labels = [
        'missing' => $t::t('Choose a model for this task.', 'اختر نموذجًا لهذه المهمة.'),
        'same' => $t::t('The fallback must differ from the model.', 'يجب أن يختلف البديل عن النموذج.'),
        'unknown' => $t::t('This model is no longer available.', 'هذا النموذج لم يعد متاحًا.'),
        'dirty' => $t::t('Unsaved routing changes', 'تغييرات توجيه غير محفوظة'),
        'saved' => $t::t('Saved', 'تم الحفظ'),
        'failed' => $t::t('Could not save. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'),
        'registerFailed' => $t::t('Could not register the provider. Try again.', 'تعذّر تسجيل المزوّد. حاول مرة أخرى.'),
        'nameRequired' => $t::t('Enter a name.', 'أدخل اسمًا.'),
        'nameDuplicate' => $t::t('A provider with this name already exists.', 'يوجد مزوّد بهذا الاسم.'),
        'endpointRequired' => $t::t('Enter the endpoint URL.', 'أدخل رابط نقطة الاتصال.'),
        'endpointInvalid' => $t::t('Enter a full address starting with http:// or https://.', 'أدخل عنوانًا كاملًا يبدأ بـ http:// أو https://.'),
        'modalitiesRequired' => $t::t('Choose at least one modality.', 'اختر وسيطًا واحدًا على الأقل.'),
    ];
    $config = [
        'tasks' => array_map(fn ($k) => ['id' => (string) $k['id'], 'modality' => $k['modality'] ?? 'text'], $taskClasses),
        'models' => array_map(fn ($m) => ['id' => (string) $m['id'], 'modalities' => array_values($m['modalities'] ?? [])], $models),
        'providers' => array_map(fn ($p) => ['id' => (string) $p['id'], 'name' => (string) $p['name']], $providers),
        'value' => ['auto' => (bool) ($value['auto'] ?? true), 'routes' => (object) $routes, 'backend' => $backend],
        'labels' => $labels,
    ];
    $modelsFor = function (array $task) use ($models) {
        $need = $task['modality'] ?? 'text';
        return array_values(array_filter($models, fn ($m) => in_array($need, ! empty($m['modalities']) ? $m['modalities'] : ['text'], true)));
    };
    $off = $disabled ? "''" : 'null';
    $modelLabel = $t::t('Model', 'النموذج');
    $fallbackLabel = $t::t('Fallback', 'البديل');
    $autoLabel = $t::t('Automatic routing', 'التوجيه التلقائي');
@endphp
<form data-slot="model-routing-editor" novalidate x-data="nqModelRoutingEditor(@js($config))" x-on:submit.prevent="submit()" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h3" class="text-h3">{{ $autoLabel }}</x-nq::card.title>
            <x-nq::card.description id="{{ $uid }}-auto-hint">{{ $t::t('Pick the best model for each task class. Your routes below are the preferred choices.', 'اختيار أفضل نموذج لكل فئة مهام. المسارات أدناه هي الخيارات المفضّلة.') }}</x-nq::card.description>
            <x-nq::card.action>
                <x-nq::switch aria-label="{{ $autoLabel }}" aria-describedby="{{ $uid }}-auto-hint" :checked="(bool) ($value['auto'] ?? true)" x-model="auto"
                    x-bind:disabled="{!! $off !!}" x-bind:data-disabled="{!! $off !!}" />
            </x-nq::card.action>
        </x-nq::card.header>
    </x-nq::card>

    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h3" class="text-h3">{{ $t::t('Routes', 'المسارات') }}</x-nq::card.title>
            <x-nq::card.description>{{ $t::t('Which model handles each kind of task, and what to try if it fails.', 'أي نموذج يتولى كل نوع من المهام، وماذا يُجرَّب إذا فشل.') }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content>
            <ul data-slot="routing-routes" class="m-0 flex list-none flex-col divide-y divide-border p-0">
                @foreach ($taskClasses as $n => $task)
                    @php
                        $own = $modelsFor($task);
                        $route = $routes[$task['id']] ?? [];
                        $modelLabelFor = $task['label'].': '.$modelLabel;
                        $fallbackLabelFor = $task['label'].': '.$fallbackLabel;
                        $bad = "flags[$n].any ? '' : null";
                        $mdl = "flags[$n].model";
                        $same = "flags[$n].same";
                        $rowModel = "rows[$n].model";
                        $rowFallback = "rows[$n].fallback";
                    @endphp
                    <li data-slot="routing-route" data-task="{{ $task['id'] }}" x-bind:data-invalid="{!! $bad !!}"
                        class="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
                        <div class="flex min-w-0 flex-col gap-0.5">
                            <span class="text-label text-foreground">{{ $task['label'] }}</span>
                            @if (! empty($task['description']))<span class="text-caption text-muted-foreground">{{ $task['description'] }}</span>@endif
                            @if (! empty($task['modality']) && $task['modality'] !== 'text')
                                <x-nq::badge variant="neutral" class="mt-1 w-fit">{{ $mods[$task['modality']] ?? $task['modality'] }}</x-nq::badge>
                            @endif
                        </div>
                        <x-nq::field :disabled="$disabled" x-model="{{ $mdl }}" class="min-w-0">
                            <x-nq::field.label>{{ $modelLabel }}</x-nq::field.label>
                            <x-nq::select :value="$route['model'] ?? null" x-model="{{ $rowModel }}">
                                <x-nq::select.trigger aria-label="{{ $modelLabelFor }}" :disabled="$disabled"><x-nq::select.value :placeholder="$t::t('Choose a model', 'اختر نموذجًا')" /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($own as $m)
                                        <x-nq::select.item :value="(string) $m['id']"><bdi dir="ltr">{{ $m['label'] }}</bdi></x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                            <x-nq::field.error><span x-text="issueText({{ $n }})"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field :disabled="$disabled" x-model="{{ $same }}" class="min-w-0">
                            <x-nq::field.label>{{ $fallbackLabel }}</x-nq::field.label>
                            <x-nq::select :value="$route['fallback'] ?? '__none__'" x-model="{{ $rowFallback }}">
                                <x-nq::select.trigger aria-label="{{ $fallbackLabelFor }}" :disabled="$disabled"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="__none__">{{ $t::t('None', 'بدون') }}</x-nq::select.item>
                                    @foreach ($own as $m)
                                        <x-nq::select.item :value="(string) $m['id']"><bdi dir="ltr">{{ $m['label'] }}</bdi></x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                            <x-nq::field.error><span x-text="issueText({{ $n }})"></span></x-nq::field.error>
                        </x-nq::field>
                    </li>
                @endforeach
            </ul>
        </x-nq::card.content>
    </x-nq::card>

    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h3" class="text-h3">{{ $t::t('Providers and nodes', 'المزوّدون والعُقد') }}</x-nq::card.title>
            <x-nq::card.description>{{ $t::t('Where models run. Register a cloud provider or a self-hosted node and say what it can do.', 'أين تعمل النماذج. سجّل مزوّدًا سحابيًا أو عقدة مستضافة ذاتيًا وحدّد ما تستطيع فعله.') }}</x-nq::card.description>
            @if ($canRegister)
                <x-nq::card.action>
                    <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="{!! $off !!}" x-on:click="registerOpen = true">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $t::t('Register provider', 'تسجيل مزوّد') }}
                    </x-nq::button>
                </x-nq::card.action>
            @endif
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            @if (count($providers) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t::t('No providers yet. Register one to route tasks.', 'لا يوجد مزوّدون بعد. سجّل واحدًا لتوجيه المهام.') }}</p>
            @else
                <div class="flex flex-col gap-1.5">
                    <span id="{{ $uid }}-backend" class="text-label text-foreground">{{ $t::t('Active backend', 'الواجهة الخلفية النشطة') }}</span>
                    <x-nq::toggle-group aria-labelledby="{{ $uid }}-backend" :default-value="$backend ? [$backend] : []" :disabled="$disabled" x-model="backendSel" class="w-fit max-w-full flex-wrap">
                        @foreach ($providers as $p)
                            <x-nq::toggle-group.toggle :value="(string) $p['id']"><bdi dir="ltr">{{ $p['name'] }}</bdi></x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </div>
                <ul data-slot="routing-providers" class="m-0 flex list-none flex-col divide-y divide-border p-0">
                    @foreach ($providers as $n => $p)
                        @php
                            $kind = $p['kind'] ?? 'cloud';
                            $kindLabel = $kind === 'node' ? $t::t('Node', 'عقدة') : $t::t('Cloud', 'سحابي');
                            $active = "isActive($n) ? '' : null";
                            $removeLabel = $t::t('Remove '.$p['name'], 'إزالة '.$p['name']);
                            $modsLabel = $t::t('Modalities of '.$p['name'], 'وسائط '.$p['name']);
                        @endphp
                        <li data-slot="routing-provider" x-bind:data-active="{!! $active !!}" class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                            @if ($kind === 'node')<x-lucide-server aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />@else<x-lucide-cloud aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />@endif
                            <div class="flex min-w-0 flex-1 basis-48 flex-col">
                                <span class="truncate text-label text-foreground"><bdi dir="ltr">{{ $p['name'] }}</bdi></span>
                                <span class="truncate text-caption text-muted-foreground">{{ $kindLabel }}@if (! empty($p['endpoint'])){{ ' · ' }}<bdi dir="ltr">{{ $p['endpoint'] }}</bdi>@endif</span>
                            </div>
                            <ul aria-label="{{ $modsLabel }}" class="m-0 flex list-none flex-wrap gap-1 p-0">
                                @foreach ($p['modalities'] ?? [] as $m)
                                    <li><x-nq::badge variant="neutral">{{ $mods[$m] ?? $m }}</x-nq::badge></li>
                                @endforeach
                            </ul>
                            @if (! empty($p['status']))
                                <x-nq::badge :variant="$p['status'] === 'online' ? 'success' : 'danger'">{{ $p['status'] === 'online' ? $t::t('Online', 'متصل') : $t::t('Offline', 'غير متصل') }}</x-nq::badge>
                            @endif
                            @if ($canRemoveProvider)
                                <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $removeLabel }}" x-bind:disabled="{!! $off !!}" x-on:click="removeProvider({{ $n }})"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
        </x-nq::card.content>
    </x-nq::card>

    <template x-if="failure">
        <x-nq::alert tone="danger" role="alert"><span x-text="failure"></span></x-nq::alert>
    </template>
    <template x-if="!failure && submitted && issues.length > 0">
        <x-nq::alert tone="warning" icon="circle-alert" role="alert">{{ $t::t('Fix the routes marked below to save.', 'أصلح المسارات المعلَّمة أدناه للحفظ.') }}</x-nq::alert>
    </template>
    @if ($canSave)
        <div data-slot="routing-footer" class="flex flex-wrap items-center justify-end gap-2">
            <span role="status" class="me-auto text-body-sm text-muted-foreground" x-text="status()"></span>
            <x-nq::button type="button" variant="ghost" x-bind:disabled="!dirty || busy || {{ $disabled ? 'true' : 'false' }} ? '' : null" x-on:click="discard()">
                <x-lucide-undo-2 aria-hidden="true" />
                {{ $t::t('Discard changes', 'تجاهل التغييرات') }}
            </x-nq::button>
            <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:disabled="!dirty || {{ $disabled ? 'true' : 'false' }} ? '' : null" x-bind:data-disabled="busy ? '' : null">
                <x-nq::spinner x-show="busy" style="display: none" />
                <x-lucide-save aria-hidden="true" x-show="!busy" />
                {{ $t::t('Save routing', 'حفظ التوجيه') }}
            </x-nq::button>
        </div>
    @endif

    @if ($canRegister)
        <x-nq::dialog x-model="registerOpen">
            <x-nq::dialog.content class="max-h-[90dvh] max-w-lg overflow-y-auto">
                <form novalidate data-slot="routing-register" class="flex flex-col gap-4" x-on:submit.prevent.stop="register()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $t::t('Register a provider', 'تسجيل مزوّد') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Add a cloud API or a self-hosted node and choose which kinds of work it can take.', 'أضف واجهة سحابية أو عقدة مستضافة ذاتيًا واختر أنواع العمل التي تتولاها.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field x-model="regFlags.name">
                        <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                        <x-nq::field.input x-model="regName" autocomplete="off" />
                        <x-nq::field.error><span x-text="regMessages.name"></span></x-nq::field.error>
                    </x-nq::field>
                    <div class="flex flex-col gap-1.5">
                        <span id="{{ $uid }}-kind" class="text-label text-foreground">{{ $t::t('Type', 'النوع') }}</span>
                        <x-nq::toggle-group aria-labelledby="{{ $uid }}-kind" :default-value="['cloud']" x-model="regKind" class="w-fit">
                            <x-nq::toggle-group.toggle value="cloud">{{ $t::t('Cloud', 'سحابي') }}</x-nq::toggle-group.toggle>
                            <x-nq::toggle-group.toggle value="node">{{ $t::t('Node', 'عقدة') }}</x-nq::toggle-group.toggle>
                        </x-nq::toggle-group>
                    </div>
                    <x-nq::field x-model="regFlags.endpoint">
                        <x-nq::field.label>{{ $t::t('Endpoint URL', 'رابط نقطة الاتصال') }}</x-nq::field.label>
                        <x-nq::field.input x-model="regEndpoint" ltr type="url" inputmode="url" placeholder="https://" autocomplete="off" />
                        <x-nq::field.error><span x-text="regMessages.endpoint"></span></x-nq::field.error>
                        <p class="text-caption text-muted-foreground" x-show="!regFlags.endpoint">{{ $t::t('The address the provider is reached at.', 'العنوان الذي يُتصل به بالمزوّد.') }}</p>
                    </x-nq::field>
                    <div class="flex flex-col gap-1.5">
                        <span id="{{ $uid }}-mod" class="text-label text-foreground">{{ $t::t('Modalities', 'الوسائط') }}</span>
                        <x-nq::toggle-group multiple aria-labelledby="{{ $uid }}-mod" :default-value="['text']" x-model="regMods" class="w-fit max-w-full flex-wrap">
                            @foreach ($mods as $key => $label)
                                <x-nq::toggle-group.toggle :value="$key">{{ $label }}</x-nq::toggle-group.toggle>
                            @endforeach
                        </x-nq::toggle-group>
                        <p role="alert" class="flex items-center gap-1.5 text-caption text-nq-danger-text" x-show="regFlags.modalities" style="display: none">
                            <x-lucide-circle-alert aria-hidden="true" class="size-3.5" /><span x-text="regMessages.modalities"></span>
                        </p>
                        <p class="text-caption text-muted-foreground" x-show="!regFlags.modalities">{{ $t::t('What it can handle.', 'ما يستطيع معالجته.') }}</p>
                    </div>
                    <template x-if="regFailure"><x-nq::alert tone="danger" role="alert"><span x-text="regFailure"></span></x-nq::alert></template>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="regBusy ? '' : null" x-on:click="registerOpen = false">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="regBusy ? 'true' : null" x-bind:data-disabled="regBusy ? '' : null">
                            <x-nq::spinner x-show="regBusy" style="display: none" />
                            {{ $t::t('Register', 'تسجيل') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</form>
