{{-- <x-nq::analytics-connect :service="['id' => 'ga', 'name' => 'Google Analytics', 'status' => 'disconnected', 'scopes' => [['id' => 'read', 'label' => 'See your reports', 'required' => true]]]" :benefits="['Users and sessions', 'Top pages']"
         @nq-connect="$event.detail.wait(startOAuth($event.detail.id, $event.detail.scopeIds))" />
     The empty state of an analytics page that has no data source yet: what connecting gives you, then the integration-connector card for that one service
     (consent dialog with scopes, account picker, reconnect when the sign-in expired). The host runs OAuth in the event handlers: nq-connect { id, scopeIds },
     nq-disconnect { id }, nq-select-account { id, accountId }, each with detail.wait(promise) (see integration-connector).
     service: id, name, status (disconnected | connected | needs-reauth | error | pending), scopes [id, label, required], optional icon (the brand's official logo as <svg>), accounts, ...
     benefits: short bullets on what the page shows once connected. title / description replace the defaults.
     labels: override title, description, reauth, reauthDescription ({name} is replaced), benefits, readOnly. connector-labels: the integration-connector labels.
     Needs the Alpine runtime. --}}
@props(['service', 'benefits' => [], 'title' => null, 'description' => null, 'labels' => [], 'connectorLabels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $name = $service['name'];
    $status = $service['status'] ?? 'disconnected';
    $reauth = $status === 'needs-reauth';
    $s = array_merge([
        'title' => $t::t('Connect {name}', 'ربط {name}'),
        'description' => $t::t('Nasaq reads your {name} data to build this page. It never changes anything in your account.', 'يقرأ نسق بيانات {name} لبناء هذه الصفحة. ولا يغيّر شيئًا في حسابك أبدًا.'),
        'reauth' => $t::t('Sign in to {name} again', 'سجّل الدخول إلى {name} مجددًا'),
        'reauthDescription' => $t::t('The connection expired, so the data below is out of date until you reconnect.', 'انتهت صلاحية الاتصال، لذا تبقى البيانات قديمة حتى تعيد الربط.'),
        'benefits' => $t::t('What you will see', 'ما الذي ستراه'),
        'readOnly' => $t::t('Read-only access. You can disconnect at any time.', 'وصول للقراءة فقط. يمكنك فك الربط في أي وقت.'),
    ], (array) $labels);
    $fill = fn (string $text) => str_replace('{name}', $name, $text);
    $heading = $title ?? $fill($reauth ? $s['reauth'] : $s['title']);
    $body = $description ?? ($reauth ? $s['reauthDescription'] : $fill($s['description']));
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'analytics-connect') }}" data-status="{{ $status }}" aria-label="{{ $fill($s['title']) }}"
    {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-card border border-dashed border-border px-4 py-10 text-center sm:px-8') }}>
    <div class="flex max-w-lg flex-col gap-2">
        <h2 class="text-h2 text-foreground">{{ $heading }}</h2>
        <p class="text-pretty text-body-sm text-muted-foreground">{{ $body }}</p>
    </div>
    @if (count($benefits))
        <div class="flex flex-col gap-2 text-start">
            <h3 class="text-label text-muted-foreground">{{ $s['benefits'] }}</h3>
            <ul class="flex flex-col gap-1.5">
                @foreach ($benefits as $b)
                    <li class="flex items-start gap-2 text-body-sm text-foreground">
                        <x-lucide-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-success-text" />
                        {{ $b }}
                    </li>
                @endforeach
            </ul>
        </div>
    @endif
    <x-nq::integration-connector bare :services="[$service]" :labels="$connectorLabels"
        class="max-w-sm border-0 bg-transparent p-0 text-start [&_[data-slot=card-content]]:p-0 [&_ul]:sm:grid-cols-1 [&_ul]:xl:grid-cols-1" />
    <p class="text-caption text-muted-foreground">{{ $s['readOnly'] }}</p>
</section>
