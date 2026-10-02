{{-- <x-nq::hr-attendance.payroll-runs can-approve can-mark-paid /> (inside <x-nq::hr-attendance>)
     Payroll runs with gross, deductions and net worked out from their lines, and a detail dialog per run (click a row or use View details) with the approve and paid steps.
     can-approve moves a draft run to approved (hr-payroll-approve), can-mark-paid an approved one to paid (hr-payroll-paid); veto either with event.detail.fail. loading: the table's loading rows.
     Money is minor units in the root's currency (USD, SAR in Arabic). Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['currency' => null, 'labels' => []])
@props(['canApprove' => false, 'canMarkPaid' => false, 'loading' => false])
@php
    $L = fn ($k, $en, $ar) => data_get($labels, $k) ?? \Nasaq\Nasaq::t($en, $ar);
    $cur = strtoupper($currency ?: (\Nasaq\Nasaq::rtl() ? 'SAR' : 'USD'));
    $runTone = ['draft' => 'neutral', 'approved' => 'info', 'paid' => 'success'];
    $runText = [
        'draft' => $L('runStatuses.draft', 'Draft', 'مسودة'),
        'approved' => $L('runStatuses.approved', 'Approved', 'معتمدة'),
        'paid' => $L('runStatuses.paid', 'Paid', 'مصروفة'),
    ];
    $columns = [
        ['id' => 'period', 'header' => $L('period', 'Period', 'الفترة')],
        ['id' => 'employees', 'header' => $L('employees', 'Employees', 'الموظفون'), 'type' => 'number', 'align' => 'end', 'sortable' => true],
        ['id' => 'gross', 'header' => $L('gross', 'Gross', 'الإجمالي'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
        ['id' => 'deductions', 'header' => $L('deductions', 'Deductions', 'الخصومات'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true, 'hidden' => true],
        ['id' => 'net', 'header' => $L('net', 'Net pay', 'صافي الراتب'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
        ['id' => 'payDate', 'header' => $L('payDate', 'Pay date', 'تاريخ الصرف'), 'type' => 'date', 'sortable' => true],
        ['id' => 'status', 'header' => $L('status', 'Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => collect($runText)->map(fn ($label, $v) => ['value' => $v, 'label' => $label, 'tone' => $runTone[$v]])->values()->all()],
    ];
    $lineColumns = [
        ['id' => 'employee', 'header' => $L('employee', 'Employee', 'الموظف'), 'sortable' => true],
        ['id' => 'days', 'header' => $L('days2', 'Days worked', 'أيام العمل'), 'type' => 'number', 'align' => 'end', 'hidden' => true],
        ['id' => 'basic', 'header' => $L('basic', 'Basic', 'الأساسي'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
        ['id' => 'allowances', 'header' => $L('allowances', 'Allowances', 'البدلات'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
        ['id' => 'deductions', 'header' => $L('deductions', 'Deductions', 'الخصومات'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
        ['id' => 'net', 'header' => $L('net', 'Net pay', 'صافي الراتب'), 'type' => 'currency', 'currency' => $cur, 'align' => 'end', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        ['id' => 'view', 'label' => $L('viewRun', 'View details', 'عرض التفاصيل')],
        $canApprove ? ['id' => 'approve', 'label' => $L('approveRun', 'Approve run', 'اعتماد المسيرة'), 'icon' => 'check', 'group' => 'step'] : null,
        $canMarkPaid ? ['id' => 'paid', 'label' => $L('markPaid', 'Mark as paid', 'تحديد كمصروفة'), 'icon' => 'circle-check', 'group' => 'step'] : null,
    ]));
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'payroll-runs') }}" x-id="['payroll']" x-bind:aria-labelledby="$id('payroll')" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <h2 x-bind:id="$id('payroll')" class="flex items-center gap-2 text-h3 text-foreground">
        <x-lucide-wallet aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ $L('payroll', 'Payroll runs', 'مسيرات الرواتب') }}
    </h2>
    <p role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text" x-show="runDlg.error" style="display: none">
        <x-lucide-circle-x aria-hidden="true" class="size-4" />
        <span x-text="runDlg.error"></span>
    </p>
    <div class="contents" x-on:nq-data-table-action="runAction($event.detail)" x-on:nq-data-table-row-click="rowOpen($event.detail)">
        <x-nq::data-table :label="$L('runsLabel', 'Payroll runs', 'مسيرات الرواتب')" name-key="period" :columns="$columns" :rows="[]" :search="false" row-click :row-actions="$actions" :loading="$loading" x-model="runRows">
            <x-slot:empty>
                <x-nq::states.empty icon="wallet" :title="$L('emptyRuns', 'No payroll runs yet', 'لا توجد مسيرات رواتب بعد')" :description="$L('emptyRunsDescription', 'Runs appear here once you start one.', 'تظهر المسيرات هنا عند بدء أول واحدة.')" class="border-0" />
            </x-slot:empty>
        </x-nq::data-table>
    </div>
    <x-nq::dialog x-model="runDlg.open">
        <x-nq::dialog.content class="max-w-3xl">
            <x-nq::dialog.header>
                <x-nq::dialog.title class="flex flex-wrap items-center gap-2">
                    <span x-text="runTitle()"></span>
                    <x-nq::status tone="neutral" class="text-body-sm font-normal" x-show="openRunStatus() === 'draft'">{{ $runText['draft'] }}</x-nq::status>
                    <x-nq::status tone="info" class="text-body-sm font-normal" x-show="openRunStatus() === 'approved'" style="display: none">{{ $runText['approved'] }}</x-nq::status>
                    <x-nq::status tone="success" class="text-body-sm font-normal" x-show="openRunStatus() === 'paid'" style="display: none">{{ $runText['paid'] }}</x-nq::status>
                </x-nq::dialog.title>
                <x-nq::dialog.description x-text="runDescription()"></x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::data-table :label="$L('linesLabel', 'Payroll lines', 'بنود الرواتب')" name-key="employee" :columns="$lineColumns" :rows="[]" :search="false" :view-options="false" x-model="lineRows" />
            <dl class="grid grid-cols-3 gap-3 rounded-card bg-nq-surface p-3 text-body-sm">
                <div>
                    <dt class="text-muted-foreground">{{ $L('gross', 'Gross', 'الإجمالي') }}</dt>
                    <dd class="text-foreground" x-text="totals().gross"></dd>
                </div>
                <div>
                    <dt class="text-muted-foreground">{{ $L('deductions', 'Deductions', 'الخصومات') }}</dt>
                    <dd class="text-foreground" x-text="totals().deductions"></dd>
                </div>
                <div>
                    <dt class="text-muted-foreground">{{ $L('net', 'Net pay', 'صافي الراتب') }}</dt>
                    <dd class="font-semibold text-foreground" x-text="totals().net"></dd>
                </div>
            </dl>
            <p role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text" x-show="runDlg.error" style="display: none">
                <x-lucide-circle-x aria-hidden="true" class="size-4" />
                <span x-text="runDlg.error"></span>
            </p>
            <x-nq::dialog.footer>
                <x-nq::button variant="ghost" x-on:click="runDlg.open = false" x-bind:data-disabled="runDlg.busy ? '' : null">{{ $L('close', 'Close', 'إغلاق') }}</x-nq::button>
                @if ($canApprove)
                    <x-nq::button variant="primary" x-show="openRunStatus() === 'draft'" x-on:click="approveRun()" x-bind:aria-busy="runDlg.busy ? 'true' : null" x-bind:data-disabled="runDlg.busy ? '' : null">
                        <x-nq::spinner x-show="runDlg.busy" style="display: none" />
                        {{ $L('approveRun', 'Approve run', 'اعتماد المسيرة') }}
                    </x-nq::button>
                @endif
                @if ($canMarkPaid)
                    <x-nq::button variant="primary" x-show="openRunStatus() === 'approved'" style="display: none" x-on:click="payRun()" x-bind:aria-busy="runDlg.busy ? 'true' : null" x-bind:data-disabled="runDlg.busy ? '' : null">
                        <x-nq::spinner x-show="runDlg.busy" style="display: none" />
                        {{ $L('markPaid', 'Mark as paid', 'تحديد كمصروفة') }}
                    </x-nq::button>
                @endif
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>
