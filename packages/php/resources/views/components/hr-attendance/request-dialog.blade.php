{{-- <x-nq::hr-attendance.request-dialog /> (inside <x-nq::hr-attendance>)
     A leave request form. It shows the working days the request costs and what is left, and refuses overlaps and overdrafts before sending. The balances' Request leave buttons and the request list's New button
     open it. It sends hr-leave-request from the root (veto it with event.detail.fail) and adds a pending request on success. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['types' => [], 'labels' => []])
@php
    $L = fn ($k, $en, $ar) => data_get($labels, $k) ?? \Nasaq\Nasaq::t($en, $ar);
    $options = collect($types)->map(fn ($x) => ['value' => ((array) $x)['id'], 'label' => ((array) $x)['name']])->all();
@endphp
<x-nq::dialog x-model="req.open">
    <x-nq::dialog.content>
        <form novalidate class="grid gap-4" x-on:submit.prevent="submitRequest()">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $L('requestTitle', 'Request leave', 'طلب إجازة') }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $L('requestDescription', 'Pick the type and dates. Weekends and public holidays are not counted.', 'اختر النوع والتواريخ. لا تُحتسب العطلات الأسبوعية والرسمية.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <div x-id="['type']" data-slot="field" class="flex flex-col gap-1.5">
                <label data-slot="field-label" x-bind:for="$id('type')" class="text-label text-foreground">{{ $L('leaveType', 'Leave type', 'نوع الإجازة') }}</label>
                <x-nq::native-select :options="$options" x-bind:id="$id('type')" x-model="req.typeId" x-bind:disabled="req.busy ? '' : null" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <div data-slot="field" class="flex flex-col gap-1.5" x-bind:data-invalid="invalidRange() ? '' : null">
                    <span data-slot="field-label" class="text-label text-foreground">{{ $L('from', 'From', 'من') }}</span>
                    <x-nq::date-picker x-model="req.start" :aria-label="$L('from', 'From', 'من')" />
                </div>
                <div data-slot="field" class="flex flex-col gap-1.5" x-bind:data-invalid="invalidRange() ? '' : null">
                    <span data-slot="field-label" class="text-label text-foreground">{{ $L('to', 'To', 'إلى') }}</span>
                    <x-nq::date-picker x-model="req.end" :aria-label="$L('to', 'To', 'إلى')" />
                </div>
            </div>
            <div class="grid gap-2">
                <label class="flex items-center justify-between gap-3 text-body-sm text-foreground">
                    {{ $L('halfFirst', 'Half day on the first day', 'نصف يوم في اليوم الأول') }}
                    <x-nq::switch x-model="req.halfStart" />
                </label>
                <label class="flex items-center justify-between gap-3 text-body-sm text-foreground" x-show="showHalfEnd()" style="display: none">
                    {{ $L('halfLast', 'Half day on the last day', 'نصف يوم في اليوم الأخير') }}
                    <x-nq::switch x-model="req.halfEnd" />
                </label>
            </div>
            <div x-id="['reason']" data-slot="field" class="flex flex-col gap-1.5">
                <label data-slot="field-label" x-bind:for="$id('reason')" class="text-label text-foreground">{{ $L('reason', 'Reason', 'السبب') }}</label>
                <x-nq::field.textarea x-bind:id="$id('reason')" x-model="req.reason" />
                <p data-slot="field-description" class="text-caption text-muted-foreground">{{ $L('reasonHint', 'Optional. Your manager sees this.', 'اختياري. يراه مديرك.') }}</p>
            </div>
            <p class="flex flex-wrap items-center gap-x-2 text-body-sm text-foreground" aria-live="polite" x-show="daysOk()" style="display: none">
                <x-lucide-circle-check aria-hidden="true" class="size-4 text-nq-success-text" />
                <span x-text="daysText()"></span>
                <span class="text-muted-foreground" x-show="hasLeft()" x-text="leftText()"></span>
            </p>
            <div data-slot="field-error" role="alert" class="flex items-center gap-2 text-caption text-nq-danger-text" x-show="shownProblem()" style="display: none">
                <x-lucide-circle-x aria-hidden="true" class="size-4" />
                <span x-text="shownProblem()"></span>
            </div>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="req.open = false" x-bind:data-disabled="req.busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                <x-nq::button type="submit" variant="primary" x-bind:aria-busy="req.busy ? 'true' : null" x-bind:data-disabled="req.busy ? '' : null">
                    <x-nq::spinner x-show="req.busy" style="display: none" />
                    {{ $L('submit', 'Send request', 'إرسال الطلب') }}
                </x-nq::button>
            </x-nq::dialog.footer>
        </form>
    </x-nq::dialog.content>
</x-nq::dialog>
