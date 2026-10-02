{{-- <x-nq::health-trackers.food-catalogue :items="$items" :families="[['id' => 'caffeine', 'name' => 'Caffeine', 'nameAr' => 'الكافيين']]" pin edit delete add @pin="$event.detail.wait(…)" @delete="$event.detail.wait(…)" />
     The classified catalogue: every food and drink carries a verdict (safe, trigger or unreviewed), who decided it, its trigger families and the person's own note. Unreviewed is neutral and says so: it is never styled as safe.
     A table or cards with search and verdict, type and family filters. Pin, edit and delete are row actions and also open from the context menu.
     items: [id, kind (food | drink), name, nameAr?, verdict (safe | trigger | unreviewed), verdictSource? (none | you | catalogue | clinician), triggerFamilies? [ids], note?, pinned?]. families: [id, name, nameAr?].
     pin / edit / delete / add: switch on the matching action (the Add item button, the row menu entries). label, loading, page-size, labels: as on <x-nq::entity-list>.
     Events on the root:
       pin     detail.id, detail.pinned            resolve, or resolve { error } shown above the list. On success the row updates. (Pin and Unpin are two entries; both show.)
       delete  detail.id                           fired when the person confirms the dialog. Resolve, or resolve { error } shown in the dialog. On success the row leaves the list.
       edit    detail.id                           no answer needed.
       add     (none)                              no answer needed.
     Differences from the React component: cells are text (no pin icon or status chip in the table; the card shows them), the note column is always shown, and there is no per-row "visible when" so pin and unpin are both listed.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'families' => [], 'pin' => false, 'edit' => false, 'delete' => false, 'add' => false, 'label' => null, 'loading' => false, 'pageSize' => 0, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = $t::rtl();
    $w = array_merge([
        'catalogue' => $t::t('Food and drink catalogue', 'كتالوج الأطعمة والمشروبات'),
        'searchPlaceholder' => $t::t('Search the catalogue…', 'ابحث في الكتالوج…'),
        'name' => $t::t('Name', 'الاسم'),
        'kind' => $t::t('Type', 'النوع'),
        'verdict' => $t::t('Verdict', 'الحكم'),
        'families' => $t::t('Trigger families', 'عائلات المحفّزات'),
        'note' => $t::t('Note', 'ملاحظة'),
        'kindFood' => $t::t('Food', 'طعام'),
        'kindDrink' => $t::t('Drink', 'مشروب'),
        'verdictSafe' => $t::t('Safe', 'آمن'),
        'verdictTrigger' => $t::t('Trigger', 'محفّز'),
        'verdictUnreviewed' => $t::t('Unreviewed', 'لم يُراجَع'),
        'sourceNone' => $t::t('Not decided', 'لم يُحسم'),
        'sourceYou' => $t::t('Decided by you', 'حسمتَه أنت'),
        'sourceCatalogue' => $t::t('From the catalogue', 'من الكتالوج'),
        'sourceClinician' => $t::t('From your clinician', 'من طبيبك'),
        'unreviewedHint' => $t::t('Nobody has judged this yet. It is not the same as safe.', 'لم يحكم عليه أحد بعد. وهذا لا يعني أنه آمن.'),
        'catalogueEmpty' => $t::t('The catalogue is empty', 'الكتالوج فارغ'),
        'catalogueEmptyHint' => $t::t('Add the foods and drinks you log so each one carries a verdict.', 'أضف الأطعمة والمشروبات التي تسجّلها ليحمل كل منها حكمًا.'),
        'add' => $t::t('Add item', 'إضافة عنصر'),
        'edit' => $t::t('Edit', 'تعديل'),
        'delete' => $t::t('Delete', 'حذف'),
        'pin' => $t::t('Pin to quick log', 'ثبّت في التسجيل السريع'),
        'unpin' => $t::t('Unpin', 'إلغاء التثبيت'),
        'deleteTitle' => $t::t('Delete {name}?', 'حذف {name}؟'),
        'deleteBody' => $t::t('It leaves the catalogue and your quick log. Entries already logged keep their record.', 'يخرج من الكتالوج ومن التسجيل السريع. تحتفظ الإدخالات المسجّلة بسجلها.'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'actionFailed' => $t::t('That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $verdictText = ['safe' => $w['verdictSafe'], 'trigger' => $w['verdictTrigger'], 'unreviewed' => $w['verdictUnreviewed']];
    $sourceText = ['none' => $w['sourceNone'], 'you' => $w['sourceYou'], 'catalogue' => $w['sourceCatalogue'], 'clinician' => $w['sourceClinician']];
    $kindText = ['food' => $w['kindFood'], 'drink' => $w['kindDrink']];
    $famList = array_values(array_map(fn ($f) => (array) $f, (array) $families));
    $famName = function ($id) use ($famList, $ar) {
        foreach ($famList as $f) {
            if ((string) $f['id'] === (string) $id) {
                return $ar && ! empty($f['nameAr']) ? $f['nameAr'] : $f['name'];
            }
        }

        return (string) $id;
    };
    $rows = array_values(array_map(function ($i) use ($ar, $verdictText, $sourceText, $kindText, $famName) {
        $i = (array) $i;
        $verdict = $i['verdict'] ?? 'unreviewed';
        $source = $verdict !== 'unreviewed' && ! empty($i['verdictSource']) ? ($sourceText[$i['verdictSource']] ?? null) : null;
        $fams = array_values((array) ($i['triggerFamilies'] ?? []));

        return [
            'id' => (string) $i['id'],
            'name' => $ar && ! empty($i['nameAr']) ? $i['nameAr'] : $i['name'],
            'kindKey' => $i['kind'] ?? 'food',
            'kindText' => $kindText[$i['kind'] ?? 'food'] ?? '',
            'verdictKey' => $verdict,
            'verdictText' => $verdictText[$verdict] ?? '',
            'verdictFull' => ($verdictText[$verdict] ?? '').($source ? ' · '.$source : ''),
            'familyIds' => $fams,
            'familiesText' => $fams ? implode($ar ? '، ' : ', ', array_map($famName, $fams)) : '—',
            'note' => $i['note'] ?? '',
            'pinned' => (bool) ($i['pinned'] ?? false),
        ];
    }, (array) $items));
    $count = fn ($v) => count(array_filter($rows, fn ($r) => $r['verdictKey'] === $v));
    $facets = [
        ['id' => 'verdict', 'title' => $w['verdict'], 'key' => 'verdictKey', 'options' => array_map(fn ($v) => ['value' => $v, 'label' => $verdictText[$v].' ('.$count($v).')'], ['safe', 'trigger', 'unreviewed'])],
        ['id' => 'kind', 'title' => $w['kind'], 'key' => 'kindKey', 'options' => [['value' => 'food', 'label' => $w['kindFood']], ['value' => 'drink', 'label' => $w['kindDrink']]]],
    ];
    if (count($famList)) {
        $facets[] = ['id' => 'family', 'title' => $w['families'], 'key' => 'familyIds', 'options' => array_map(fn ($f) => ['value' => (string) $f['id'], 'label' => $famName($f['id'])], $famList)];
    }
    $columns = [
        ['id' => 'name', 'header' => $w['name'], 'key' => 'name', 'sortable' => true, 'searchable' => true],
        ['id' => 'kind', 'header' => $w['kind'], 'key' => 'kindText', 'sortable' => true],
        ['id' => 'verdict', 'header' => $w['verdict'], 'key' => 'verdictFull', 'sortable' => true],
        ['id' => 'families', 'header' => $w['families'], 'key' => 'familiesText'],
        ['id' => 'note', 'header' => $w['note'], 'key' => 'note', 'searchable' => true],
    ];
    $actions = array_values(array_filter([
        $pin ? ['id' => 'pin', 'label' => $w['pin'], 'icon' => 'pin', 'group' => 'main'] : null,
        $pin ? ['id' => 'unpin', 'label' => $w['unpin'], 'icon' => 'pin-off', 'group' => 'main'] : null,
        $edit ? ['id' => 'edit', 'label' => $w['edit'], 'icon' => 'pencil', 'group' => 'main'] : null,
        $delete ? ['id' => 'delete', 'label' => $w['delete'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $config = ['rows' => $rows, 'labels' => ['deleteTitle' => $w['deleteTitle'], 'actionFailed' => $w['actionFailed'], 'genericError' => $w['genericError']]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'food-catalogue') }}" x-data="nqFoodCatalogue(@js($config))" x-on:nq-entity-list-action="onAction($event.detail)" {{ $attributes->except('data-slot') }}>
    <p role="alert" x-show="notice" style="display: none" x-text="notice" class="mb-2 text-caption text-nq-danger-text"></p>
    <x-nq::entity-list :label="$label ?? $w['catalogue']" :columns="$columns" :rows="$rows" :facets="$facets" :selectable="false" :search="$w['searchPlaceholder']" :row-actions="$actions"
        :loading="$loading" :page-size="$pageSize" x-model="items">
        @if ($add)
            <x-slot:toolbar>
                <x-nq::button variant="primary" x-on:click="addItem()"><x-lucide-plus aria-hidden="true" />{{ $w['add'] }}</x-nq::button>
            </x-slot:toolbar>
        @endif
        <x-slot:card>
            <div class="flex min-w-0 flex-col gap-2">
                <span class="flex min-w-0 flex-col">
                    <span class="truncate text-label text-foreground" dir="auto" x-text="row.name"></span>
                    <span class="text-caption text-muted-foreground" x-text="row.kindText"></span>
                </span>
                <span class="flex flex-col gap-0.5">
                    <span class="text-caption text-muted-foreground">{{ $w['verdict'] }}</span>
                    <span class="text-body-sm text-foreground" x-text="row.verdictFull"></span>
                </span>
                <p class="text-caption text-muted-foreground" x-show="row.verdictKey === `unreviewed`" style="display: none">{{ $w['unreviewedHint'] }}</p>
                <span class="text-body-sm text-foreground" x-show="row.familyIds.length > 0" style="display: none" x-text="row.familiesText"></span>
                <span class="line-clamp-2 text-body-sm text-muted-foreground" dir="auto" x-show="row.note" style="display: none" x-text="row.note"></span>
            </div>
        </x-slot:card>
        <x-slot:empty>
            <x-nq::states.empty icon="glass-water" :title="$w['catalogueEmpty']" :description="$w['catalogueEmptyHint']" class="border-0" />
        </x-slot:empty>
    </x-nq::entity-list>

    @if ($delete)
        <x-nq::alert-dialog x-model="confirmOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="deleteTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $w['deleteBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <p role="alert" x-show="failure" style="display: none" x-text="failure" class="text-caption text-nq-danger-text"></p>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel x-bind:disabled="busy">{{ $w['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::button variant="danger" x-bind:aria-busy="busy ? `true` : null" x-bind:disabled="busy" x-on:click="removeItem()">{{ $w['delete'] }}</x-nq::button>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>
