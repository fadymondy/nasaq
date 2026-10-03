{{-- <x-nq::issue-view.quick-view :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" update open-full />
     The issue in a side drawer, for boards and lists: a sheet around <x-nq::issue-view variant="drawer">. Every other issue-view prop (statuses, labels, people, projects, update, thread, ...) passes straight through.
     open: start open. Bind it to Livewire with wire:model or x-model (open is x-modelable). trigger slot: the element that opens it (optional).
     open-full: show an "Open" button in the header; it fires nq-issue-open-full { id }. labels-text and locale as in the issue view.
     The sheet is teleported to <body>, so listen on the window: x-on:nq-issue-update.window="..." (and nq-issue-add-sub, nq-issue-open, nq-issue-open-full).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.issue-view._logic')
@props(['issue', 'statuses' => [], 'labels' => [], 'people' => [], 'projects' => [], 'parentOptions' => [], 'subIssues' => [], 'update' => false, 'addSubIssue' => false, 'openIssue' => false, 'checklist' => null, 'development' => null, 'thread' => null, 'activity' => null, 'time' => null, 'ai' => null, 'defaultTab' => null, 'now' => null, 'load' => null, 'labelsText' => [], 'locale' => null, 'open' => false, 'openFull' => false])
@php
    $locale ??= app()->getLocale();
    $t = nq_iv_words($locale, $labelsText);
@endphp
<x-nq::sheet :open="$open" {{ $attributes }}>
    @isset($trigger)
        {{ $trigger }}
    @endisset
    <x-nq::sheet.content side="end" class="w-[min(46rem,100vw)]">
        <x-nq::sheet.header>
            <x-nq::sheet.title class="flex items-center gap-2"><bdi dir="ltr" class="font-mono text-body">{{ $issue['key'] }}</bdi></x-nq::sheet.title>
            <x-nq::sheet.description class="sr-only">{{ $issue['title'] }}</x-nq::sheet.description>
            @if ($openFull)
                <x-nq::button variant="ghost" size="sm" class="self-start" x-on:click="$dispatch('nq-issue-open-full', { id: {{ \Illuminate\Support\Js::from((string) $issue['id'])->toHtml() }} })"><x-lucide-external-link aria-hidden="true" />{{ $t['open'] }}</x-nq::button>
            @endif
        </x-nq::sheet.header>
        <x-nq::sheet.body>
            <x-nq::issue-view :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" :parent-options="$parentOptions" :sub-issues="$subIssues" :update="$update" :add-sub-issue="$addSubIssue" :open-issue="$openIssue"
                :checklist="$checklist" :development="$development" :thread="$thread" :activity="$activity" :time="$time" :ai="$ai" variant="drawer" :default-tab="$defaultTab" :now="$now" :load="$load" :labels-text="$labelsText" :locale="$locale" />
        </x-nq::sheet.body>
    </x-nq::sheet.content>
</x-nq::sheet>
