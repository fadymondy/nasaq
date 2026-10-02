{{-- Internal: helpers of x-nq::trash-bin, ported from trash-bin.tsx and trash-math.ts. Included with @include('nasaq::components.trash-bin._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_tb_words')) {
        /** The built-in words by locale, with the host's overrides on top. {n} and {name} are filled in by the caller. */
        function nq_tb_words(string $locale, array $override = []): array
        {
            $en = [
                'title' => 'Trash', 'listLabel' => 'Deleted items', 'notice' => 'Items are deleted for good {n} days after you delete them.',
                'noticeKept' => 'Items stay here until you empty the trash.', 'name' => 'Name', 'type' => 'Type', 'deleted' => 'Deleted', 'deletedBy' => 'Deleted by',
                'timeLeft' => 'Time left', 'types' => 'Type', 'restore' => 'Restore', 'restoreSelected' => 'Restore selected', 'delete' => 'Delete forever',
                'deleteSelected' => 'Delete selected forever', 'empty' => 'Empty trash', 'search' => 'Search deleted items',
                'daysLeftOne' => '1 day left', 'daysLeft' => '{n} days left', 'hoursLeftOne' => '1 hour left', 'hoursLeft' => '{n} hours left',
                'due' => 'Due for deletion', 'kept' => 'Kept', 'purgeOn' => 'Deleted for good on {name}', 'emptyTitle' => 'The trash is empty',
                'emptyBody' => 'Things you delete show up here, and you can bring them back until they expire.',
                'deleteTitle' => 'Delete “{name}” forever?', 'deleteTitleMany' => 'Delete {n} items forever?',
                'deleteBody' => 'This cannot be undone. The item and everything inside it is gone for good.', 'emptyDialogTitle' => 'Empty the trash?',
                'emptyDialogBodyOne' => '1 item will be deleted for good. This cannot be undone.', 'emptyDialogBodyMany' => '{n} items will be deleted for good. This cannot be undone.',
                'cancel' => 'Cancel', 'confirmDelete' => 'Delete forever', 'confirmEmpty' => 'Empty trash', 'error' => 'Something went wrong. Nothing was changed.',
                'restoredOne' => '1 item restored', 'restoredMany' => '{n} items restored', 'deletedOne' => '1 item deleted', 'deletedMany' => '{n} items deleted',
                'trashEmptied' => 'Trash emptied', 'unknownType' => 'Item',
            ];
            $ar = [
                'title' => 'سلة المحذوفات', 'listLabel' => 'العناصر المحذوفة', 'notice' => 'تُحذف العناصر نهائيًا بعد {n} يومًا من حذفها.',
                'noticeKept' => 'تبقى العناصر هنا حتى تفرّغ السلة.', 'name' => 'الاسم', 'type' => 'النوع', 'deleted' => 'تاريخ الحذف', 'deletedBy' => 'حذفه',
                'timeLeft' => 'الوقت المتبقي', 'types' => 'النوع', 'restore' => 'استعادة', 'restoreSelected' => 'استعادة المحدد', 'delete' => 'حذف نهائي',
                'deleteSelected' => 'حذف المحدد نهائيًا', 'empty' => 'إفراغ السلة', 'search' => 'ابحث في المحذوفات',
                'daysLeftOne' => 'متبقٍ يوم واحد', 'daysLeftTwo' => 'متبقٍ يومان', 'daysLeftFew' => 'متبقٍ {n} أيام', 'daysLeft' => 'متبقٍ {n} يومًا',
                'hoursLeftOne' => 'متبقية ساعة', 'hoursLeftTwo' => 'متبقٍ ساعتان', 'hoursLeftFew' => 'متبقٍ {n} ساعات', 'hoursLeft' => 'متبقٍ {n} ساعة',
                'due' => 'جاهز للحذف', 'kept' => 'محفوظ', 'purgeOn' => 'يُحذف نهائيًا في {name}', 'emptyTitle' => 'السلة فارغة',
                'emptyBody' => 'ما تحذفه يظهر هنا، ويمكنك استعادته قبل أن تنتهي مهلته.',
                'deleteTitle' => 'حذف «{name}» نهائيًا؟', 'deleteTitleMany' => 'حذف {n} عنصرًا نهائيًا؟',
                'deleteBody' => 'لا يمكن التراجع عن هذا. يُحذف العنصر وكل ما بداخله نهائيًا.', 'emptyDialogTitle' => 'إفراغ السلة؟',
                'emptyDialogBodyOne' => 'سيُحذف عنصر واحد نهائيًا. لا يمكن التراجع عن هذا.', 'emptyDialogBodyMany' => 'سيُحذف {n} عنصرًا نهائيًا. لا يمكن التراجع عن هذا.',
                'cancel' => 'إلغاء', 'confirmDelete' => 'حذف نهائي', 'confirmEmpty' => 'إفراغ السلة', 'error' => 'حدث خطأ ما. لم يتغير شيء.',
                'restoredOne' => 'تمت استعادة عنصر واحد', 'restoredMany' => 'تمت استعادة {n} عنصرًا', 'deletedOne' => 'تم حذف عنصر واحد', 'deletedMany' => 'تم حذف {n} عنصرًا',
                'trashEmptied' => 'تم إفراغ السلة', 'unknownType' => 'عنصر',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_tb_fill(string $sentence, array $vars = []): string
        {
            foreach ($vars as $k => $v) {
                $sentence = str_replace('{'.$k.'}', (string) $v, $sentence);
            }

            return $sentence;
        }

        /** "3 days left" / "1 hour left" in English, with the Arabic dual and plural forms. $unit is daysLeft or hoursLeft. */
        function nq_tb_count_words(array $t, string $unit, int $n, bool $ar): string
        {
            if ($n === 1) {
                return $t[$unit.'One'];
            }
            if ($ar && $n === 2) {
                return $t[$unit.'Two'];
            }
            if ($ar && $n <= 10) {
                return nq_tb_fill($t[$unit.'Few'], ['n' => $n]);
            }

            return nq_tb_fill($t[$unit], ['n' => $n]);
        }

        /** Mirrors trashRetention: purgeAt, daysLeft, hoursLeft, expired, urgency (safe | soon | urgent | expired | kept). */
        function nq_tb_retention(string $deletedAt, ?int $retentionDays, ?string $purgeAt, \DateTimeInterface $now): array
        {
            $start = (new \DateTimeImmutable($deletedAt))->getTimestamp();
            $end = null;
            if ($purgeAt !== null && $purgeAt !== '') {
                $end = (new \DateTimeImmutable($purgeAt))->getTimestamp();
            } elseif ($retentionDays && $retentionDays > 0) {
                $end = $start + $retentionDays * 86400;
            }
            if ($end === null) {
                return ['purgeAt' => null, 'daysLeft' => null, 'hoursLeft' => null, 'expired' => false, 'urgency' => 'kept'];
            }
            $left = $end - $now->getTimestamp();
            $expired = $left <= 0;

            return [
                'purgeAt' => $end,
                'daysLeft' => $expired ? 0 : (int) ceil($left / 86400),
                'hoursLeft' => $expired ? 0 : (int) ceil($left / 3600),
                'expired' => $expired,
                'urgency' => $expired ? 'expired' : ($left <= 3 * 86400 ? 'urgent' : ($left <= 7 * 86400 ? 'soon' : 'safe')),
            ];
        }
    }
@endphp
