{{-- <x-nq::hr-attendance.request-list can-decide can-new /> (inside <x-nq::hr-attendance>)
     Leave requests in a data table with search, a status filter and a row menu. mode (set on the root): "manager" shows the employee column with Approve and Reject (a rejection asks for a note, in a dialog);
     "self" shows Withdraw on pending requests. can-decide enables the manager actions, can-withdraw the self one, can-new a Request leave button. loading: the table's loading rows.
     Decisions fire hr-leave-decide / hr-leave-withdraw from the root (veto with event.detail.fail); the request changes status on success. A menu action that does not fit the row's status or the mode does nothing.
     Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['types' => [], 'mode' => 'manager', 'labels' => []])
@props(['canDecide' => false, 'canWithdraw' => false, 'canNew' => false, 'loading' => false, 'pageSize' => 10])
@php
    $L = fn ($k, $en, $ar) => data_get($labels, $k) ?? \Nasaq\Nasaq::t($en, $ar);
    $manager = $mode !== 'self';
    $statusTone = ['pending' => 'warning', 'approved' => 'success', 'rejected' => 'danger', 'cancelled' => 'neutral'];
    $statusText = [
        'pending' => $L('statuses.pending', 'Pending', 'قيد الموافقة'),
        'approved' => $L('statuses.approved', 'Approved', 'موافق عليها'),
        'rejected' => $L('statuses.rejected', 'Rejected', 'مرفوضة'),
        'cancelled' => $L('statuses.cancelled', 'Withdrawn', 'مسحوبة'),
    ];
    $columns = array_values(array_filter([
        $manager ? ['id' => 'employee', 'header' => $L('employee', 'Employee', 'الموظف'), 'sortable' => true, 'searchable' => true] : null,
        ['id' => 'type', 'header' => $L('type', 'Type', 'النوع'), 'type' => 'tag', 'sortable' => true, 'options' => collect($types)->map(fn ($x) => ['value' => ((array) $x)['id'], 'label' => ((array) $x)['name'], 'hue' => 'blue'])->all()],
        ['id' => 'start', 'header' => $L('from', 'From', 'من'), 'type' => 'date', 'sortable' => true],
        ['id' => 'end', 'header' => $L('to', 'To', 'إلى'), 'type' => 'date', 'sortable' => true],
        ['id' => 'days', 'header' => $L('days', 'Days', 'الأيام'), 'type' => 'number', 'align' => 'end', 'sortable' => true],
        ['id' => 'status', 'header' => $L('status', 'Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => collect($statusText)->map(fn ($label, $v) => ['value' => $v, 'label' => $label, 'tone' => $statusTone[$v]])->values()->all()],
    ]));
    $actions = array_values(array_filter([
        $manager && $canDecide ? ['id' => 'approve', 'label' => $L('approve', 'Approve', 'موافقة'), 'icon' => 'check'] : null,
        $manager && $canDecide ? ['id' => 'reject', 'label' => $L('reject', 'Reject', 'رفض'), 'icon' => 'x', 'danger' => true] : null,
        ! $manager && $canWithdraw ? ['id' => 'withdraw', 'label' => $L('withdraw', 'Withdraw', 'سحب الطلب'), 'icon' => 'undo-2'] : null,
    ]));
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'leave-request-list') }}" x-id="['requests']" x-bind:aria-labelledby="$id('requests')" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 x-bind:id="$id('requests')" class="text-h3 text-foreground">{{ $L('leaveRequests', 'Leave requests', 'طلبات الإجازة') }}</h2>
        @if ($canNew)
            <x-nq::button variant="primary" x-on:click="openRequest()">
                <x-lucide-plus aria-hidden="true" />
                {{ $L('requestLeave', 'Request leave', 'طلب إجازة') }}
            </x-nq::button>
        @endif
    </div>
    <p role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text" x-show="listError" style="display: none">
        <x-lucide-circle-x aria-hidden="true" class="size-4" />
        <span x-text="listError"></span>
    </p>
    <div class="contents" x-on:nq-data-table-action="listAction($event.detail)">
        <x-nq::data-table :label="$L('leaveRequests', 'Leave requests', 'طلبات الإجازة')" name-key="employee" :columns="$columns" :rows="[]" :page-size="$pageSize" :row-actions="$actions"
            :search="$L('search', 'Search requests', 'ابحث في الطلبات')" :loading="$loading" x-model="reqRows">
            <x-slot:empty>
                <x-nq::states.empty :title="$L('emptyRequests', 'No leave requests', 'لا توجد طلبات إجازة')" :description="$L('emptyRequestsDescription', 'Requests will show here.', 'ستظهر الطلبات هنا.')" class="border-0" />
            </x-slot:empty>
        </x-nq::data-table>
    </div>
    <x-nq::dialog x-model="rej.open">
        <x-nq::dialog.content>
            <form class="grid gap-4" x-on:submit.prevent="submitReject()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $L('rejectTitle', 'Reject this request?', 'رفض هذا الطلب؟') }}</x-nq::dialog.title>
                    <x-nq::dialog.description x-text="rejectDescription()"></x-nq::dialog.description>
                </x-nq::dialog.header>
                <div x-id="['note']" data-slot="field" class="flex flex-col gap-1.5">
                    <label data-slot="field-label" x-bind:for="$id('note')" class="text-label text-foreground">{{ $L('note', 'Note', 'ملاحظة') }}</label>
                    <x-nq::field.textarea x-bind:id="$id('note')" x-model="rej.note" />
                    <p data-slot="field-description" class="text-caption text-muted-foreground">{{ $L('noteHint', 'Say why, so they can plan.', 'اذكر السبب ليتمكن من التخطيط.') }}</p>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="rej.open = false">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="danger" x-bind:aria-busy="listBusy ? 'true' : null" x-bind:data-disabled="listBusy ? '' : null">
                        <x-nq::spinner x-show="listBusy" style="display: none" />
                        {{ $L('confirmReject', 'Reject request', 'رفض الطلب') }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
    <span class="sr-only" aria-live="polite" x-text="pendingCount()"></span>
</section>
