{{-- <x-nq::mcp-connect server-url="https://mcp.example.com/mcp" server-name="example" :token="$token" testable x-on:test="$event.detail.wait(…)" />
     Connect an MCP server to the AI clients people use. It shows the server URL and token, then one tab per client (Claude Code,
     Claude Desktop, Cursor, VS Code, or plain JSON) with the exact snippet to copy, the steps around it, and a one-click install link
     for Cursor and VS Code. The snippets are plain text built here; the token stays masked until the eye button reveals it.
     server-url: the Streamable HTTP endpoint. server-name (nasaq): the key in each client's config. token: a bearer token for the
     snippets (omit for a YOUR_TOKEN placeholder). token-header: header that carries it (Authorization, sent as "Bearer <token>").
     clients: which tabs, in order (default all of claude-code claude-desktop cursor vscode generic). default-client: the tab open first.
     testable: shows a "Test connection" button. It fires a `test` event on the root with detail { wait(promise) }; resolve
     { ok: true, latencyMs?, tools? } or { ok: false, error? }. A rejection, or nobody listening, shows a generic failure.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['serverUrl', 'serverName' => 'nasaq', 'token' => null, 'tokenHeader' => null, 'clients' => ['claude-code', 'claude-desktop', 'cursor', 'vscode', 'generic'], 'defaultClient' => null, 'testable' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $clients = array_values((array) $clients);
    $first = $defaultClient !== null && in_array($defaultClient, $clients, true) ? $defaultClient : ($clients[0] ?? null);
    $placeholder = 'YOUR_TOKEN';
    $headerName = $tokenHeader ?? 'Authorization';
    $headerValue = fn (string $tok) => strtolower($headerName) === 'authorization' ? "Bearer {$tok}" : $tok;
    $json = function ($value) {
        $raw = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return preg_replace_callback('/^( +)/m', fn ($m) => str_repeat(' ', intdiv(strlen($m[1]), 2)), $raw);
    };
    $compact = fn ($value) => json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $uri = fn (string $v) => strtr(rawurlencode($v), ['%21' => '!', '%27' => "'", '%28' => '(', '%29' => ')', '%2A' => '*']);
    $quote = fn (string $v) => '"'.preg_replace('/(["\\\\$`])/', '\\\\$1', $v).'"';
    $mask = function (string $tok) {
        $n = mb_strlen($tok);
        return $n <= 10 ? str_repeat('•', $n) : mb_substr($tok, 0, 6).str_repeat('•', 12).mb_substr($tok, -4);
    };
    $snippet = function (string $client, string $tok) use ($serverName, $serverUrl, $headerName, $headerValue, $json, $compact, $uri, $quote) {
        $h = [$headerName => $headerValue($tok)];
        switch ($client) {
            case 'claude-code':
                return ['target' => 'Terminal', 'language' => 'bash', 'deepLink' => null,
                    'code' => "claude mcp add --transport http {$serverName} {$serverUrl} --header ".$quote("{$headerName}: ".$headerValue($tok))];
            case 'claude-desktop':
                return ['target' => 'claude_desktop_config.json', 'language' => 'json', 'deepLink' => null,
                    'code' => $json(['mcpServers' => [$serverName => ['command' => 'npx', 'args' => ['-y', 'mcp-remote', $serverUrl, '--header', "{$headerName}: ".$headerValue($tok)]]]])];
            case 'cursor':
                $entry = ['url' => $serverUrl, 'headers' => $h];
                return ['target' => '~/.cursor/mcp.json', 'language' => 'json',
                    'code' => $json(['mcpServers' => [$serverName => $entry]]),
                    'deepLink' => 'cursor://anysphere.cursor-deeplink/mcp/install?name='.$uri($serverName).'&config='.$uri(base64_encode($compact($entry)))];
            case 'vscode':
                $entry = ['type' => 'http', 'url' => $serverUrl, 'headers' => $h];
                return ['target' => '.vscode/mcp.json', 'language' => 'json',
                    'code' => $json(['servers' => [$serverName => $entry]]),
                    'deepLink' => 'vscode:mcp/install?'.$uri($compact(['name' => $serverName] + $entry))];
            default:
                return ['target' => 'mcp.json', 'language' => 'json', 'deepLink' => null,
                    'code' => $json(['mcpServers' => [$serverName => ['type' => 'http', 'url' => $serverUrl, 'headers' => $h]]])];
        }
    };
    $names = [
        'claude-code' => 'Claude Code', 'claude-desktop' => 'Claude Desktop', 'cursor' => 'Cursor', 'vscode' => 'VS Code',
        'generic' => $t::t('Other (JSON)', 'أخرى (JSON)'),
    ];
    $steps = [
        'claude-code' => [$t::t('Open a terminal in your project.', 'افتح الطرفية داخل مشروعك.'), $t::t('Run the command.', 'شغّل الأمر.'), $t::t('Type /mcp in Claude Code to check it is connected.', 'اكتب /mcp في Claude Code للتأكد من الاتصال.')],
        'claude-desktop' => [$t::t('Open Settings, then Developer, then Edit Config.', 'افتح الإعدادات ثم المطوّر ثم تحرير الإعدادات.'), $t::t('Add this to claude_desktop_config.json. It needs Node.js for npx.', 'أضف هذا إلى claude_desktop_config.json. يلزم Node.js من أجل npx.'), $t::t('Restart Claude Desktop.', 'أعد تشغيل Claude Desktop.')],
        'cursor' => [$t::t('Use the button, or add this to ~/.cursor/mcp.json.', 'استخدم الزر، أو أضف هذا إلى ‎~/.cursor/mcp.json.'), $t::t('Open Cursor Settings, then MCP, and turn the server on.', 'افتح إعدادات Cursor ثم MCP وفعّل الخادم.')],
        'vscode' => [$t::t('Use the button, or add this to .vscode/mcp.json.', 'استخدم الزر، أو أضف هذا إلى ‎.vscode/mcp.json.'), $t::t('Open Copilot Chat in Agent mode and start the server from the tools list.', 'افتح Copilot Chat بوضع Agent وشغّل الخادم من قائمة الأدوات.')],
        'generic' => [$t::t("Add this to your client's MCP configuration.", 'أضف هذا إلى إعدادات MCP في عميلك.'), $t::t('Clients that read mcpServers use this shape. Rename the root key if yours differs.', 'العملاء الذين يقرؤون mcpServers يستخدمون هذا الشكل. غيّر المفتاح الجذري إن اختلف عندك.')],
    ];
    $deepLabels = ['cursor' => $t::t('Add to Cursor', 'أضف إلى Cursor'), 'vscode' => $t::t('Install in VS Code', 'ثبّت في VS Code')];
    $hasToken = filled($token);
    $labelServerUrl = $t::t('Server URL', 'رابط الخادم');
    $labelToken = $t::t('Access token', 'رمز الوصول');
    $config = [
        'token' => $hasToken ? (string) $token : '',
        'masked' => $hasToken ? $mask((string) $token) : '',
        'labels' => [
            'showToken' => $t::t('Show token', 'إظهار الرمز'),
            'hideToken' => $t::t('Hide token', 'إخفاء الرمز'),
            'test' => $t::t('Test connection', 'اختبار الاتصال'),
            'testing' => $t::t('Testing…', 'جارٍ الاختبار…'),
            'answered' => $t::t('The server answered ({parts}).', 'ردّ الخادم ({parts}).'),
            'answeredBare' => $t::t('The server answered.', 'ردّ الخادم.'),
            'tool1' => $t::t('1 tool', 'أداة واحدة'),
            'tools' => $t::t('{n} tools', '{n} أدوات'),
            'sep' => $t::t(', ', '، '),
            'failedFallback' => $t::t('The server did not answer. Check the URL and the token.', 'لم يردّ الخادم. تحقق من الرابط والرمز.'),
        ],
    ];
    // One entry per client: the snippet with the real token and with the masked one. The code block follows the reveal flag through code-expr.
    $config['snippets'] = array_map(fn ($c) => ['real' => $snippet($c, $hasToken ? (string) $token : $placeholder)['code'], 'masked' => $hasToken ? $snippet($c, $mask((string) $token))['code'] : null], $clients);
@endphp
{{-- The card's classes, copied from card.blade.php, so the root can carry x-data. --}}
<div data-slot="{{ $attributes->get('data-slot', 'mcp-connect') }}" x-data="nqMcpConnect(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-3xl') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $t::t('Connect an MCP client', 'اربط عميل MCP') }}</x-nq::card.title>
        <x-nq::card.description>{{ $t::t('Let an AI assistant use this workspace through the Model Context Protocol.', 'اسمح لمساعد ذكاء اصطناعي باستخدام مساحة العمل هذه عبر بروتوكول Model Context Protocol.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
            <x-nq::field>
                <x-nq::field.label>{{ $labelServerUrl }}</x-nq::field.label>
                <x-nq::copy-button.field :value="$serverUrl" :label="$labelServerUrl" :copy-label="$t::t('Copy', 'نسخ')" />
            </x-nq::field>
            @if ($hasToken)
                <x-nq::field>
                    <x-nq::field.label>{{ $labelToken }}</x-nq::field.label>
                    <div data-slot="mcp-token" class="contents">
                    <x-nq::input-group>
                        <x-nq::input-group.input readonly ltr aria-label="{{ $labelToken }}" x-bind:value="shownToken" x-on:focus="$el.select()" />
                        <x-nq::input-group.addon align="end">
                            <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="toggleLabel" x-bind:aria-pressed="String(reveal)" x-on:click="reveal = ! reveal">
                                <x-lucide-eye-off aria-hidden="true" x-show="reveal" style="display: none" />
                                <x-lucide-eye aria-hidden="true" x-show="! reveal" />
                            </x-nq::button>
                            <x-nq::copy-button :value="$token" :label="$t::t('Copy token', 'نسخ الرمز')" />
                        </x-nq::input-group.addon>
                    </x-nq::input-group>
                    </div>
                </x-nq::field>
            @endif
        </div>
        @if ($hasToken)
            <p class="text-caption text-muted-foreground">{{ $t::t('The token is shown here so you can paste it. Treat it like a password.', 'يظهر الرمز هنا لتلصقه. تعامل معه كما تتعامل مع كلمة المرور.') }}</p>
        @else
            <x-nq::alert tone="info">{{ $t::t('Create a token first, then paste it where the snippet says YOUR_TOKEN.', 'أنشئ رمزًا أولًا، ثم الصقه مكان YOUR_TOKEN في الشيفرة.') }}</x-nq::alert>
        @endif

        @if ($first !== null)
            <x-nq::tabs :default-value="$first" class="gap-4">
                <x-nq::tabs.list aria-label="{{ $t::t('Client', 'العميل') }}">
                    @foreach ($clients as $c)
                        <x-nq::tabs.tab :value="$c">{{ $names[$c] }}</x-nq::tabs.tab>
                    @endforeach
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>
                @foreach ($clients as $c)
                    @php
                        $ci = $loop->index;
                        $real = $snippet($c, $hasToken ? (string) $token : $placeholder);
                        $masked = $hasToken ? $snippet($c, $mask((string) $token)) : null;
                    @endphp
                    <x-nq::tabs.panel :value="$c" class="flex flex-col gap-4">
                        <ol class="flex flex-col gap-1.5 text-body-sm text-foreground">
                            @foreach ($steps[$c] as $i => $s)
                                <li class="flex gap-2.5">
                                    <span aria-hidden="true" class="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">{{ $i + 1 }}</span>
                                    <span class="sr-only">{{ $t::t('Step '.($i + 1), 'الخطوة '.($i + 1)) }}: </span>
                                    <span class="min-w-0">{{ $s }}</span>
                                </li>
                            @endforeach
                        </ol>
                        <div class="flex flex-col gap-3">
                            <div data-slot="mcp-snippet" class="overflow-hidden rounded-surface border border-border" dir="ltr">
                                <div class="flex h-row items-center justify-between gap-2 border-b border-border bg-nq-surface-soft ps-3 pe-1.5 font-mono text-caption text-muted-foreground">
                                    <span class="truncate">{{ $real['target'] }}</span>
                                    <x-nq::copy-button :value="$real['code']" :label="$t::t('Copy '.$real['target'], 'نسخ '.$real['target'])" />
                                </div>
                                <x-nq::code-block :code="$masked['code'] ?? $real['code']" :language="$real['language']" :copyable="false" :label="$real['target']" class="rounded-none border-0" code-expr="shownSnippet({{ $ci }})" />
                            </div>
                            @if ($real['deepLink'] && isset($deepLabels[$c]))
                                <div>
                                    <x-nq::button :href="$real['deepLink']" data-slot="mcp-deep-link" variant="secondary" size="sm">
                                        <x-lucide-external-link aria-hidden="true" />
                                        {{ $deepLabels[$c] }}
                                    </x-nq::button>
                                </div>
                            @endif
                        </div>
                    </x-nq::tabs.panel>
                @endforeach
            </x-nq::tabs>
        @endif

        @if ($testable)
            <div class="flex flex-col gap-3 border-t border-border pt-4" data-slot="mcp-test" x-bind:data-state="status">
                <div>
                    <x-nq::button type="button" x-bind:disabled="busy" x-bind:aria-busy="String(busy)" x-on:click="run()">
                        <x-lucide-plug aria-hidden="true" />
                        <span x-text="testLabel">{{ $t::t('Test connection', 'اختبار الاتصال') }}</span>
                    </x-nq::button>
                </div>
                <div role="status" aria-live="polite">
                    <x-nq::alert tone="success" :title="$t::t('Connected', 'متصل')" x-show="okShown" style="display: none"><span x-text="detail"></span></x-nq::alert>
                    <x-nq::alert tone="danger" :title="$t::t('Could not connect', 'تعذر الاتصال')" x-show="failShown" style="display: none"><span x-text="failure"></span></x-nq::alert>
                    <x-nq::alert tone="danger" x-show="errorShown" style="display: none">{{ $t::t('The test could not run. Try again.', 'تعذر تشغيل الاختبار. حاول مرة أخرى.') }}</x-nq::alert>
                </div>
            </div>
        @endif
    </x-nq::card.content>
</div>
