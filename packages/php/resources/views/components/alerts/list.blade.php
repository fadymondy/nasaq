{{-- <x-nq::alerts.list :alerts="[['id' => 'a1', 'title' => 'API latency above 2s', 'severity' => 'critical', 'status' => 'open', 'source' => 'api-gateway', 'createdAt' => $at]]" />
     A list of alerts to triage: status tabs, severity and source filters, search and sort, then acknowledge, resolve or reopen. Each row expands to its description and a timeline.
     alerts: [id, title, severity (critical|high|medium|low|info), status (open|acknowledged|resolved), source, createdAt, description, count, tags[], timeline[[id, type, at, actor, note]]].
     The server renders every row, so the list is only as long as what you pass; filtering and sorting happen in the browser (needs the Alpine runtime, @nasaqScripts).
     default-status (open), default-sort (severity | newest), hide-filters, loading, title, labels (array overriding the words).
     can-acknowledge / can-resolve / can-reopen (default true): show those buttons; set false to hide one.
     Nothing here changes an alert. Each button fires a bubbling, cancelable event from its row with detail { id, resolve(result?), reject(message), waitUntil(promise) }:
       "nq-alert-acknowledge"   "nq-alert-resolve"   "nq-alert-reopen"
     @nq-alert-resolve="$event.detail.waitUntil($wire.resolve($event.detail.id))". An error (resolve({ error }), reject(message), a rejected promise) shows on that row;
     with nobody listening the action counts as done. Re-render the list to show the new status. --}}
@include('nasaq::components.alerts._alerts')
@props(['alerts' => [], 'loading' => false, 'defaultStatus' => 'open', 'defaultSort' => 'severity', 'hideFilters' => false, 'title' => null, 'labels' => [], 'locale' => null,
    'canAcknowledge' => true, 'canResolve' => true, 'canReopen' => true])
@php
    $locale ??= app()->getLocale();
    $security = false;
    $actions = [];
@endphp
@include('nasaq::components.alerts._alerts-core')
