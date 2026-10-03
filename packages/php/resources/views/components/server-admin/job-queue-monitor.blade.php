{{-- <x-nq::server-admin.job-queue-monitor :jobs="$jobs" @retry="$event.detail.wait(…)" @forget="$event.detail.wait(…)" />
     A background-job queue by status: five count buttons that filter the table (waiting, running, delayed, done, failed), a queue filter, row menu and bulk Retry /
     Forget, and a detail dialog (click a row) with the error and payload. Retry and forget ask first, except retrying a single job.
     jobs: [['id', 'name', 'queue', 'status' => waiting | active | delayed | completed | failed, 'attempts', 'maxAttempts', 'at' => text already formatted, 'error', 'payload']].
     can-forget (true): offer Forget. labels: overrides for any word. It is presentational: it fires events on the root with detail { …, wait(promise) }.
       retry   detail.ids = [job ids]; resolve, or resolve { error }
       forget  detail.ids = [job ids]; resolve, or resolve { error }
     After success a retried job is waiting and a forgotten job leaves the list. A rejected promise, or no listener, shows a generic error.
     Differences from the React component: the row menu (and the row's context menu) offers Retry only on failed jobs and Forget on any but a running one, and the failure headline
     is not shown under the job name. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['jobs' => [], 'canForget' => true, 'labels' => []])
@include('nasaq::components.server-admin._strings')
@php
    $t = nq_server_admin_strings(app()->getLocale(), $labels);
    $config = ['labels' => $t, 'canForget' => (bool) $canForget, 'jobs' => collect($jobs)->map(fn ($j) => array_filter([
        'id' => (string) $j['id'], 'name' => $j['name'], 'queue' => $j['queue'] ?? 'default', 'status' => $j['status'] ?? 'waiting', 'attempts' => (int) ($j['attempts'] ?? 0),
        'maxAttempts' => $j['maxAttempts'] ?? null, 'at' => $j['at'] ?? '', 'error' => $j['error'] ?? null, 'payload' => $j['payload'] ?? null,
    ], fn ($v) => $v !== null))->values()->all()];
    $tones = ['waiting' => 'neutral', 'active' => 'info', 'delayed' => 'warning', 'completed' => 'success', 'failed' => 'danger'];
    $queues = collect($jobs)->pluck('queue')->filter()->unique()->values()->map(fn ($q) => ['value' => $q, 'label' => $q])->all();
    $columns = [
        ['id' => 'job', 'header' => $t['job'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'queue', 'header' => $t['queue'], 'type' => 'tag', 'filter' => true, 'options' => $queues],
        ['id' => 'status', 'header' => $t['status'], 'type' => 'status', 'sortable' => true,
            'options' => collect($tones)->map(fn ($tone, $k) => ['value' => $k, 'label' => $t['jobStatuses'][$k], 'tone' => $tone])->values()->all()],
        ['id' => 'attempts', 'header' => $t['attempts'], 'type' => 'number', 'align' => 'end'],
        ['id' => 'when', 'header' => $t['when']],
    ];
    $actions = array_values(array_filter([
        ['id' => 'details', 'label' => $t['details'], 'icon' => 'info'],
        ['id' => 'retry', 'label' => $t['retry'], 'icon' => 'rotate-cw', 'visibleWhen' => ['field' => 'status', 'eq' => 'failed']],
        $canForget ? ['id' => 'forget', 'label' => $t['forget'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger', 'visibleWhen' => ['field' => 'status', 'ne' => 'active']] : null,
    ]));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'job-queue-monitor') }}" x-data="nqJobQueue({!! \Illuminate\Support\Js::from($config) !!})"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-row-click="onRowClick($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t['jobsTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['jobsDescription'] }}</x-nq::card.description>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 sm:mt-0" x-show="count('failed') > 0" style="display: none">
            <x-nq::button type="button" variant="secondary" x-on:click="askRetry(failedIds())"><x-lucide-rotate-cw aria-hidden="true" />{{ $t['retryFailed'] }}</x-nq::button>
            @if ($canForget)
                <x-nq::button type="button" variant="ghost" x-on:click="askForget(failedIds())"><x-lucide-trash-2 aria-hidden="true" />{{ $t['forgetFailed'] }}</x-nq::button>
            @endif
        </div>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        <div role="group" aria-label="{{ $t['statusGroup'] }}" data-slot="job-status-counts" class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            @foreach ($tones as $status => $tone)
                <button type="button" data-status="{{ $status }}" x-on:click="toggle('{{ $status }}')" x-bind:aria-pressed="status === '{{ $status }}' ? 'true' : 'false'"
                    class="flex flex-col items-start gap-0.5 rounded-control border border-border bg-card px-3 py-2 text-start transition-colors hover:bg-nq-hover aria-pressed:border-nq-focus aria-pressed:bg-nq-hover focus-visible:outline-1 focus-visible:outline-nq-focus">
                    <span class="text-caption text-muted-foreground">{{ $t['jobStatuses'][$status] }}</span>
                    <span class="text-title tabular-nums text-foreground" x-text="String(count('{{ $status }}'))"></span>
                </button>
            @endforeach
        </div>
        <x-nq::data-table x-model="tableRows" :label="$t['jobsTable']" name-key="label" :search="$t['search']" :view-options="false" :page-size="10" selectable row-click
            :columns="$columns" :rows="[]" :row-actions="$actions" :labels="['empty' => $t['jobsEmpty']]">
            <x-slot:bulk>
                <x-nq::button type="button" variant="primary" size="sm" x-on:click="askRetry(retryable(selectedIds()))">{{ $t['retry'] }}</x-nq::button>
                @if ($canForget)
                    <x-nq::button type="button" variant="danger" size="sm" x-on:click="askForget(forgettable(selectedIds()))">{{ $t['forget'] }}</x-nq::button>
                @endif
            </x-slot:bulk>
        </x-nq::data-table>
    </x-nq::card.content>

    <x-nq::dialog x-model="detailOpen">
        <x-nq::dialog.content>
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="detail ? detail.name : ''"></span></x-nq::dialog.title>
                <x-nq::dialog.description>
                    <span x-text="detail ? detail.queue + ' · ' + attemptsText() : ''"></span>
                </x-nq::dialog.description>
            </x-nq::dialog.header>
            <template x-if="detail">
                <div class="grid gap-3">
                    <div>
                        <h3 class="mb-1 text-label text-foreground">{{ $t['errorLabel'] }}</h3>
                        <pre data-slot="job-error" dir="ltr" class="max-h-48 overflow-auto rounded-control border border-border bg-secondary p-3 font-mono text-caption whitespace-pre-wrap" x-text="detail.error || @js($t['noError'])"></pre>
                    </div>
                    <div x-show="detail.payload" style="display: none">
                        <h3 class="mb-1 text-label text-foreground">{{ $t['payloadLabel'] }}</h3>
                        <pre data-slot="job-payload" dir="ltr" class="max-h-48 overflow-auto rounded-control border border-border bg-secondary p-3 font-mono text-caption whitespace-pre-wrap" x-text="detail.payload"></pre>
                    </div>
                </div>
            </template>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="secondary" x-on:click="detailOpen = false">{{ $t['close'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
    @include('nasaq::components.server-admin._confirm', ['t' => $t])
</div>
