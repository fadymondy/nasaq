{{-- <x-nq::brand-guidelines brand="nasaq" intro="How to use the Nasaq mark and colours." />
     A brand guidelines page: the logo with downloads, the palette with copyable values, typography, do and don't, and the social cards.
     By default it shows the brand's own mark (as SVG downloads on a light and a dark ground) and palette. It never draws a logo of its own and never offers font files.
     brand: a brand key or legacy alias. title, intro. id: prefix for the section anchors (default brand-<key>).
     assets: list of ['id', 'name', 'format', 'href', 'filename', 'ground'?, 'description'?] (default: the two mark files). colors: list of ['id', 'value', 'name'?, 'usage'?, 'onColor'?] (default: the brand palette).
     fonts: list of ['id', 'family', 'role', 'sample'?, 'kind'? sans|mono, 'weights'?, 'licence'?, 'href'?]. dos / donts: lists of ['id', 'title', 'description'?, 'example'?] (default: the built-in rules; [] hides a column).
     og-cards: list of ['id', 'title', 'description'?, 'image'?, 'imageAlt'?, 'size'?, 'href'?, 'filename'?, 'brand'?]. Pass [] to hide a section.
     Parts: brand-guidelines.swatch, .asset-card, .do-dont, .og-card. Needs the Alpine runtime for the copy buttons (@nasaqScripts). --}}
@props(['brand' => null, 'title' => null, 'intro' => null, 'id' => null, 'assets' => null, 'colors' => null, 'fonts' => [], 'dos' => null, 'donts' => null, 'ogCards' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);

    // The brand registry (mark cells and colours), the same data as packages/brands.
    $marks = [
        'nasaq' => ['Nasaq', [[1, 0], [5, 0], [2, 1], [4, 1], [3, 2]], [[3, 2]], '#15694A', '#4CC495', '#C9A227'],
        'fadymondy' => ['Fady Mondy', [[1, 0], [3, 0], [0, 1], [2, 1], [1, 2], [3, 2], [0, 3], [2, 3]], [[3, 0]], '#0E1A3C', '#F0EBE1', '#C9A227'],
        'mahaam' => ['Mahaam', [[1, 0], [3, 0], [0, 1], [2, 1]], [[3, 0]], '#8C3FB5', null, '#C9A227'],
        'zekra' => ['Zekra', [[3, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [2, 3], [4, 3]], [[3, 0]], '#6D4DE6', null, '#C9A227'],
        'moharrik' => ['Moharrik', [[1, 0], [3, 0], [0, 1], [4, 1], [1, 2], [3, 2], [2, 3]], [[3, 0]], '#00A0A8', null, '#C9A227'],
        'seatfor' => ['SeatFor', [[1, 0], [3, 0], [5, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2]], [[4, 1]], '#B8479B', null, '#C9A227'],
        'health-debug' => ['Health Debug', [[1, 0], [3, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2], [2, 3]], [[3, 0]], '#B0243F', null, '#C9A227'],
        'circlexo' => ['CircleXO', [[3, 0], [2, 1], [4, 1], [1, 2], [5, 2], [2, 3], [4, 3], [3, 4]], [[3, 0]], '#6FA8D6', null, '#C9A227'],
        'hosbah' => ['Hosbah', [[1, 0], [3, 0], [2, 1], [1, 2], [3, 2], [2, 3], [1, 4], [3, 4]], [[3, 0]], '#2E6F9E', null, '#C9A227'],
        'orchestra' => ['Orchestra', [[3, 2], [4, 3], [5, 2], [6, 1]], [[6, 1]], '#D97757', null, '#8C3B1F'],
        'togo' => ['ToGO', [[0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 2]], [[2, 1], [2, 3], [3, 2]], '#0E1A3C', '#F0EBE1', '#1F8A99'],
    ];
    // brand light, brand dark, action light, action dark, on-action light, on-action dark, accent
    $colorTable = [
        'nasaq' => ['#15694A', '#4CC495', '#15694A', '#4CC495', '#F0EBE1', '#0E1A3C', '#C9A227'],
        'fadymondy' => ['#0E1A3C', '#F0EBE1', '#E2661C', '#E2661C', '#0E1A3C', '#0E1A3C', '#C9A227'],
        'mahaam' => ['#8C3FB5', '#B784D6', '#8C3FB5', '#B784D6', '#F0EBE1', '#0E1A3C', '#C9A227'],
        'zekra' => ['#6D4DE6', '#6D4DE6', '#6D4DE6', '#6D4DE6', '#FFFFFF', '#FFFFFF', '#C9A227'],
        'moharrik' => ['#00A0A8', '#2EC4CB', '#00A0A8', '#2EC4CB', '#0B1429', '#0B1429', '#C9A227'],
        'seatfor' => ['#B8479B', '#B8479B', '#E2661C', '#E2661C', '#0E1A3C', '#0E1A3C', '#C9A227'],
        'health-debug' => ['#B0243F', '#D9455F', '#B0243F', '#D9455F', '#F0EBE1', '#0E1A3C', '#C9A227'],
        'circlexo' => ['#6FA8D6', '#6FA8D6', '#3D7CAE', '#6FA8D6', '#FFFFFF', '#0E1A3C', '#C9A227'],
        'hosbah' => ['#2E6F9E', '#7FB0D6', '#2E6F9E', '#7FB0D6', '#FFFFFF', '#0E1A3C', '#C9A227'],
        'orchestra' => ['#D97757', '#D97757', '#D97757', '#D97757', '#0E1A3C', '#0E1A3C', '#8C3B1F'],
        'togo' => ['#0E1A3C', '#F0EBE1', '#1F8A99', '#1F8A99', '#0B1429', '#0B1429', '#1F8A99'],
    ];
    $aliases = ['managy' => 'mahaam', 'cabrain' => 'zekra', 'claude-digital-twin' => 'moharrik', 'booki' => 'seatfor', 'cloudy' => 'hosbah', 'orchestra-mcp' => 'orchestra', 'fady-mondy' => 'fadymondy', 'togo-framework' => 'togo'];
    $given = $brand ?: (config('nasaq.brand') ?: 'nasaq');
    $key = isset($marks[$given]) ? $given : ($aliases[$given] ?? null);

    // The mark as an SVG file, laid out exactly like the brand package's markSvg().
    $markSvg = function (string $key, bool $dark) use ($marks) {
        [$name, $cells, $accentCells, $body, $bodyOnDark, $accent] = $marks[$key];
        $cols = array_column($cells, 0);
        $rows = array_column($cells, 1);
        $width = max($cols) - min($cols) + 1;
        $height = max($rows) - min($rows) + 1;
        $unit = 100 / max($width, $height);
        $x0 = (100 - $width * $unit) / 2;
        $y0 = (100 - $height * $unit) / 2;
        $accentSet = array_map(fn ($c) => $c[0].','.$c[1], $accentCells);
        $fill = $dark ? ($bodyOnDark ?? $body) : $body;
        $out = '';
        foreach ($cells as $c) {
            $attrs = 'x="'.round($x0 + ($c[0] - min($cols)) * $unit, 3).'" y="'.round($y0 + ($c[1] - min($rows)) * $unit, 3).'" width="'.round($unit, 3).'" height="'.round($unit, 3).'"';
            $out .= in_array($c[0].','.$c[1], $accentSet, true) ? '<rect '.$attrs.' fill="'.$accent.'"/>' : '<rect class="b" '.$attrs.' fill="'.$fill.'"/>';
        }
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>'.htmlspecialchars($name, ENT_XML1).'</title>'.$out.'</svg>';

        return 'data:image/svg+xml;charset=utf-8,'.strtr(rawurlencode($svg), ['%21' => '!', '%27' => "'", '%28' => '(', '%29' => ')', '%2A' => '*']);
    };

    $downloads = $assets ?? ($key ? [
        ['id' => 'mark-light', 'name' => $t('Mark on a light ground', 'الشعار على خلفية فاتحة'), 'format' => 'SVG', 'href' => $markSvg($key, false), 'filename' => $key.'-mark.svg', 'ground' => 'light'],
        ['id' => 'mark-dark', 'name' => $t('Mark on a dark ground', 'الشعار على خلفية داكنة'), 'format' => 'SVG', 'href' => $markSvg($key, true), 'filename' => $key.'-mark-on-dark.svg', 'ground' => 'dark'],
    ] : []);

    $palette = $colors;
    if ($palette === null) {
        $palette = [];
        if ($key) {
            [$bl, $bd, $al, $ad, $ol, $od, $ac] = $colorTable[$key];
            $palette = [
                ['id' => 'brand-light', 'value' => $bl], ['id' => 'brand-dark', 'value' => $bd],
                ['id' => 'action-light', 'value' => $al, 'onColor' => $ol], ['id' => 'action-dark', 'value' => $ad, 'onColor' => $od],
                ['id' => 'accent', 'value' => $ac],
            ];
        }
    }

    $doList = $dos ?? [
        ['id' => 'd1', 'title' => $t('Use the mark as supplied', 'استخدم الشعار كما هو'), 'description' => $t('Take the file from this page. It is generated from the brand\'s specification.', 'خذ الملف من هذه الصفحة. فهو مولَّد من مواصفات العلامة.')],
        ['id' => 'd2', 'title' => $t('Keep clear space', 'اترك مساحة حرة'), 'description' => $t('Leave at least the width of one cube on every side.', 'اترك عرض مكعب واحد على الأقل من كل جانب.')],
        ['id' => 'd3', 'title' => $t('Use the colour pairs listed', 'استخدم أزواج الألوان المذكورة'), 'description' => $t('The dark-ground colours are for dark grounds, the light ones for light.', 'ألوان الخلفية الداكنة للخلفيات الداكنة، والفاتحة للفاتحة.')],
    ];
    $dontList = $donts ?? [
        ['id' => 'n1', 'title' => $t('Do not recolour the mark', 'لا تغيّر ألوان الشعار'), 'description' => $t('Its body and its accent cube keep their colours on every ground.', 'يحتفظ جسمه ومكعبه المميّز بلونيهما على كل خلفية.')],
        ['id' => 'n2', 'title' => $t('Do not mirror, stretch or redraw it', 'لا تعكسه ولا تمطّه ولا تعِد رسمه'), 'description' => $t('It does not flip in right-to-left layouts.', 'لا ينقلب في التخطيطات من اليمين إلى اليسار.')],
        ['id' => 'n3', 'title' => $t('Do not swap in a generic icon', 'لا تستبدله بأيقونة عامة'), 'description' => $t('If the mark is unavailable, use the brand name as text.', 'إن لم يتوفر الشعار فاستخدم اسم العلامة نصًا.')],
        ['id' => 'n4', 'title' => $t('Do not invent colours', 'لا تخترع ألوانًا'), 'description' => $t('Use only the palette on this page.', 'استخدم اللوحة الواردة في هذه الصفحة فقط.')],
    ];

    $sections = [
        ['logo', $t('Logo', 'الشعار'), count($downloads) > 0],
        ['color', $t('Colour', 'الألوان'), count($palette) > 0],
        ['typography', $t('Typography', 'الخطوط'), count($fonts) > 0],
        ['usage', $t('Usage', 'الاستخدام'), count($doList) + count($dontList) > 0],
        ['social', $t('Social cards', 'بطاقات المشاركة'), count($ogCards) > 0],
    ];
    $visible = array_values(array_filter($sections, fn ($s) => $s[2]));
    $base = $id ?? 'brand-'.($key ?? 'x');
    $intros = [
        'logo' => $t('The mark is drawn from the brand\'s own specification. Use these files as they are.', 'الشعار مرسوم من مواصفات العلامة نفسها. استخدم هذه الملفات كما هي.'),
        'color' => $t('Copy a value and use it exactly. Do not adjust a brand colour to suit a layout.', 'انسخ القيمة واستخدمها كما هي. لا تعدّل لون العلامة ليناسب التصميم.'),
        'typography' => $t('The typefaces the brand is set in. Font files are not shared here. Get them from their licence holder.', 'الخطوط التي تُكتب بها العلامة. ملفات الخطوط غير متاحة هنا. احصل عليها من صاحب الترخيص.'),
        'usage' => $t('How the marks and colours are and are not used.', 'كيف تُستخدم الشعارات والألوان وكيف لا تُستخدم.'),
        'social' => $t('What a link to the product looks like when it is shared.', 'كيف يبدو رابط المنتج عند مشاركته.'),
    ];
    $sectionsLabel = $t('Sections', 'الأقسام');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'brand-guidelines') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-10') }}>
    <header class="flex flex-col gap-4">
        <x-nq::product-mark.logo :brand="$key ?? $given" :size="40" />
        <h1 class="text-h1 text-foreground">{{ $title ?? $t('Brand guidelines', 'دليل الهوية') }}</h1>
        @if ($intro || trim((string) $slot) !== '')<p class="max-w-prose text-body text-muted-foreground">{{ trim((string) $slot) !== '' ? $slot : $intro }}</p>@endif
        @if (count($visible) > 1)
            <nav aria-label="{{ $sectionsLabel }}">
                <x-nq::text-utilities.scroll-fade :label="$sectionsLabel">
                    @foreach ($visible as $s)
                        <x-nq::button variant="secondary" size="sm" :href="'#'.$base.'-'.$s[0]">{{ $s[1] }}</x-nq::button>
                    @endforeach
                </x-nq::text-utilities.scroll-fade>
            </nav>
        @endif
    </header>

    @if (count($downloads))
        <section aria-labelledby="{{ $base }}-logo" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 id="{{ $base }}-logo" class="text-h2 text-foreground">{{ $sections[0][1] }}</h2>
                <p class="max-w-prose text-body text-muted-foreground">{{ $intros['logo'] }}</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                @foreach ($downloads as $asset)
                    <x-nq::brand-guidelines.asset-card :asset="$asset" :brand="$key ?? $given" />
                @endforeach
            </div>
        </section>
    @endif

    @if (count($palette))
        <section aria-labelledby="{{ $base }}-color" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 id="{{ $base }}-color" class="text-h2 text-foreground">{{ $sections[1][1] }}</h2>
                <p class="max-w-prose text-body text-muted-foreground">{{ $intros['color'] }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
                @foreach ($palette as $color)
                    <x-nq::brand-guidelines.swatch :color="$color" />
                @endforeach
            </div>
        </section>
    @endif

    @if (count($fonts))
        <section aria-labelledby="{{ $base }}-typography" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 id="{{ $base }}-typography" class="text-h2 text-foreground">{{ $sections[2][1] }}</h2>
                <p class="max-w-prose text-body text-muted-foreground">{{ $intros['typography'] }}</p>
            </div>
            <ul class="grid gap-4 sm:grid-cols-2">
                @foreach ($fonts as $font)
                    <li class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-4">
                        <span class="flex items-center justify-between gap-2">
                            <bdi dir="ltr" class="text-label text-foreground">{{ $font['family'] }}</bdi>
                            <x-nq::badge variant="outline">{{ $font['role'] }}</x-nq::badge>
                        </span>
                        @if (! empty($font['sample']))
                            <x-nq::text-utilities.user-text block class="{{ ($font['kind'] ?? 'sans') === 'mono' ? 'text-h2 text-foreground font-mono' : 'text-h2 text-foreground font-sans' }}">{{ $font['sample'] }}</x-nq::text-utilities.user-text>
                        @endif
                        <dl class="flex flex-col gap-0.5 text-caption text-muted-foreground">
                            @if (! empty($font['weights']))
                                <div class="flex gap-2"><dt>{{ $t('Weights', 'الأوزان') }}</dt><dd dir="ltr">{{ $font['weights'] }}</dd></div>
                            @endif
                            @if (! empty($font['licence']))
                                <div class="flex gap-2"><dt>{{ $t('Licence', 'الترخيص') }}</dt><dd>@if (! empty($font['href']))<a class="underline underline-offset-4" href="{{ $font['href'] }}" target="_blank" rel="noopener noreferrer">{{ $font['licence'] }}</a>@else{{ $font['licence'] }}@endif</dd></div>
                            @endif
                        </dl>
                    </li>
                @endforeach
            </ul>
        </section>
    @endif

    @if (count($doList) + count($dontList) > 0)
        <section aria-labelledby="{{ $base }}-usage" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 id="{{ $base }}-usage" class="text-h2 text-foreground">{{ $sections[3][1] }}</h2>
                <p class="max-w-prose text-body text-muted-foreground">{{ $intros['usage'] }}</p>
            </div>
            <x-nq::brand-guidelines.do-dont :dos="$doList" :donts="$dontList" />
        </section>
    @endif

    @if (count($ogCards))
        <section aria-labelledby="{{ $base }}-social" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 id="{{ $base }}-social" class="text-h2 text-foreground">{{ $sections[4][1] }}</h2>
                <p class="max-w-prose text-body text-muted-foreground">{{ $intros['social'] }}</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                @foreach ($ogCards as $card)
                    <x-nq::brand-guidelines.og-card :card="$card" :brand="$key ?? $given" />
                @endforeach
            </div>
        </section>
    @endif

    @if (count($visible) === 0)
        <p class="text-body text-muted-foreground">{{ $t('Nothing to show yet.', 'لا شيء للعرض بعد.') }}</p>
    @endif
</div>
