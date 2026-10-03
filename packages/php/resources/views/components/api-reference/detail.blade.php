{{-- <x-nq::api-reference.detail :tool="$tool" />
     One tool: name, scope and minimum role, the arguments table and example call and result. Also used inside <x-nq::api-reference>.
     tool: ['id', 'name', 'summary', 'description', 'scope', 'minRole', 'access' => read|write|destructive, 'since', 'deprecated',
            'returns', 'args' => [['name', 'type', 'required', 'description', 'default', 'values' => []]],
            'examples' => [['title', 'call', 'result', 'callLanguage', 'resultLanguage']]]. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['tool'])
@php
    $t = \Nasaq\Nasaq::class;
    $access = $tool['access'] ?? 'read';
    $accessLabels = ['read' => $t::t('Read only', 'قراءة فقط'), 'write' => $t::t('Changes data', 'يغيّر البيانات'), 'destructive' => $t::t('Destructive', 'مدمّر')];
    $accessVariant = ['read' => 'neutral', 'write' => 'warning', 'destructive' => 'danger'];
    $args = $tool['args'] ?? [];
    $examples = $tool['examples'] ?? [];
    $id = $tool['id'];
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'api-tool') }}" data-tool="{{ $id }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    <header class="flex flex-col gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
            <h2 class="min-w-0 break-all font-mono text-h3 text-foreground"><bdi dir="ltr">{{ $tool['name'] }}</bdi></h2>
            <x-nq::copy-button :value="$tool['name']" :label="$t::t('Copy tool name', 'نسخ اسم الأداة')" size="icon-sm" variant="ghost" />
            @if (! empty($tool['deprecated']))
                <x-nq::badge variant="warning">
                    <x-lucide-triangle-alert aria-hidden="true" class="size-3" />
                    {{ $t::t('Deprecated', 'متقادمة') }}
                </x-nq::badge>
            @endif
        </div>
        <p dir="auto" class="text-body text-foreground">{{ $tool['description'] ?? $tool['summary'] }}</p>
        <dl class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
            <div class="flex items-center gap-2">
                <dt class="flex items-center gap-1 text-muted-foreground"><x-lucide-key-round aria-hidden="true" class="size-3.5" />{{ $t::t('Scope', 'النطاق') }}</dt>
                <dd><x-nq::badge variant="outline"><bdi dir="ltr" class="font-mono">{{ $tool['scope'] }}</bdi></x-nq::badge></dd>
            </div>
            <div class="flex items-center gap-2">
                <dt class="flex items-center gap-1 text-muted-foreground"><x-lucide-shield-check aria-hidden="true" class="size-3.5" />{{ $t::t('Minimum role', 'أدنى دور') }}</dt>
                <dd><x-nq::badge variant="info">{{ $tool['minRole'] }}</x-nq::badge></dd>
            </div>
            <div class="flex items-center gap-2">
                <dt class="text-muted-foreground">{{ $t::t('Access', 'الوصول') }}</dt>
                <dd><x-nq::badge :variant="$accessVariant[$access] ?? 'neutral'">{{ $accessLabels[$access] ?? $access }}</x-nq::badge></dd>
            </div>
            @if (! empty($tool['since']))
                <div class="flex items-center gap-2 text-muted-foreground">
                    <dt class="sr-only">{{ $t::t('Since', 'منذ') }}</dt>
                    <dd>{{ $t::t('Since '.$tool['since'], 'منذ '.$tool['since']) }}</dd>
                </div>
            @endif
        </dl>
    </header>

    <section class="flex flex-col gap-2" aria-labelledby="{{ $id }}-args">
        <h3 id="{{ $id }}-args" class="text-label text-foreground">{{ $t::t('Arguments', 'المعاملات') }}</h3>
        @if (count($args))
            <x-nq::table :label="$t::t('Arguments', 'المعاملات')">
                <x-nq::table.header>
                    <x-nq::table.row>
                        <x-nq::table.head>{{ $t::t('Name', 'الاسم') }}</x-nq::table.head>
                        <x-nq::table.head>{{ $t::t('Type', 'النوع') }}</x-nq::table.head>
                        <x-nq::table.head>{{ $t::t('Description', 'الوصف') }}</x-nq::table.head>
                    </x-nq::table.row>
                </x-nq::table.header>
                <x-nq::table.body>
                    @foreach ($args as $a)
                        <x-nq::table.row>
                            <x-nq::table.cell class="align-top">
                                <div class="flex flex-col items-start gap-1">
                                    <bdi dir="ltr" class="font-mono text-code text-foreground">{{ $a['name'] }}</bdi>
                                    <x-nq::badge :variant="! empty($a['required']) ? 'danger' : 'neutral'">{{ ! empty($a['required']) ? $t::t('Required', 'مطلوب') : $t::t('Optional', 'اختياري') }}</x-nq::badge>
                                </div>
                            </x-nq::table.cell>
                            <x-nq::table.cell class="align-top"><bdi dir="ltr" class="font-mono text-code text-muted-foreground">{{ $a['type'] }}</bdi></x-nq::table.cell>
                            <x-nq::table.cell class="min-w-56 align-top whitespace-normal">
                                <p dir="auto" class="text-foreground">{{ $a['description'] ?? '—' }}</p>
                                @if (! empty($a['values']))
                                    <p class="mt-1 flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
                                        {{ $t::t('One of', 'إحدى القيم') }}:
                                        @foreach ($a['values'] as $v)<bdi dir="ltr" class="rounded-control bg-muted px-1.5 py-0.5 font-mono text-code text-foreground">{{ $v }}</bdi>@endforeach
                                    </p>
                                @endif
                                @if (array_key_exists('default', $a) && $a['default'] !== null)
                                    <p class="mt-1 text-caption text-muted-foreground">{{ $t::t('Default', 'الافتراضي') }}: <bdi dir="ltr" class="font-mono text-code text-foreground">{{ $a['default'] }}</bdi></p>
                                @endif
                            </x-nq::table.cell>
                        </x-nq::table.row>
                    @endforeach
                </x-nq::table.body>
            </x-nq::table>
        @else
            <p class="text-body-sm text-muted-foreground">{{ $t::t('This tool takes no arguments.', 'هذه الأداة لا تأخذ معاملات.') }}</p>
        @endif
        @if (! empty($tool['returns']))
            <p dir="auto" class="text-body-sm text-muted-foreground"><span class="text-foreground">{{ $t::t('Returns', 'ما تُرجعه') }}:</span> {{ $tool['returns'] }}</p>
        @endif
    </section>

    @if (count($examples))
        <section class="flex flex-col gap-3" aria-labelledby="{{ $id }}-ex">
            <h3 id="{{ $id }}-ex" class="text-label text-foreground">{{ $t::t('Example', 'مثال') }}</h3>
            @foreach ($examples as $ex)
                <div class="flex flex-col gap-2">
                    @if (! empty($ex['title']))
                        <p dir="auto" class="text-body-sm text-muted-foreground">{{ $ex['title'] }}</p>
                    @endif
                    <div class="grid min-w-0 gap-3 xl:grid-cols-2">
                        <x-nq::code-block :code="$ex['call']" :language="$ex['callLanguage'] ?? 'json'" :filename="$t::t('Call', 'الاستدعاء')" pre-class="max-h-80" />
                        <x-nq::code-block :code="$ex['result']" :language="$ex['resultLanguage'] ?? 'json'" :filename="$t::t('Result', 'النتيجة')" pre-class="max-h-80" />
                    </div>
                </div>
            @endforeach
        </section>
    @endif
</article>
