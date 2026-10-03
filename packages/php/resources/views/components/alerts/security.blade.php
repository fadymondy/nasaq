{{-- <x-nq::alerts.security :alerts="[['id' => 's1', 'title' => 'Many failed sign-ins', 'severity' => 'high', 'status' => 'open', 'source' => 'auth', 'createdAt' => $at, 'category' => 'auth', 'ip' => '203.0.113.9']]" />
     The alert list for security events (see <x-nq::alerts.list> for the shared props and events). Each alert adds category (auth|network|malware|data|policy|other), ip, location,
     account and recommendation, and the search also looks in them. actions: [id, label, variant] buttons on every alert that is not resolved; the default is Block IP (id "block-ip")
     and Mark as false positive (id "false-positive"). Pass [] to hide them. Each fires "nq-alert-action" with detail { id, action, resolve(result?), reject(message), waitUntil(promise) }. --}}
@include('nasaq::components.alerts._alerts')
@props(['alerts' => [], 'loading' => false, 'defaultStatus' => 'open', 'defaultSort' => 'severity', 'hideFilters' => false, 'title' => null, 'labels' => [], 'locale' => null,
    'canAcknowledge' => true, 'canResolve' => true, 'canReopen' => true, 'actions' => null])
@php
    $locale ??= app()->getLocale();
    $security = true;
    $actions ??= [
        ['id' => 'block-ip', 'label' => nq_alerts_strings($locale, $labels)['blockIp'], 'variant' => 'danger'],
        ['id' => 'false-positive', 'label' => nq_alerts_strings($locale, $labels)['falsePositive'], 'variant' => 'secondary'],
    ];
@endphp
@include('nasaq::components.alerts._alerts-core')
