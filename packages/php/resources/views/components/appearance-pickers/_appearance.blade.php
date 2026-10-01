{{-- Internal: helpers shared by the appearance-pickers parts (port of web/src/components/appearance-pickers/appearance-model.ts and its strings).
     Included with @include('nasaq::components.appearance-pickers._appearance'); every function is defined once. --}}
@php
    if (! function_exists('nq_appearance_t')) {
        /** The built-in words, English or Arabic, with the caller's overrides (a flat array; sizes, widths and spacings are nested) on top. */
        function nq_appearance_t(array $labels = []): array
        {
            $base = \Nasaq\Nasaq::rtl() ? [
                'theme' => 'المظهر', 'fontSize' => 'حجم النص', 'smaller' => 'نص أصغر', 'larger' => 'نص أكبر', 'width' => 'عرض السطر', 'spacing' => 'تباعد الأسطر',
                'reset' => 'استعادة الافتراضي', 'preview' => 'معاينة', 'previewTitle' => 'مكان هادئ للقراءة',
                'previewBody' => 'إعدادات القراءة الجيدة لا تُلاحَظ. النص كبير بما يكفي، والأسطر قصيرة بما يكفي، والمسافة بينها تريح العين. غيّر أي إعداد وستتبعه هذه الفقرة فورًا.',
                'wallpaper' => 'الخلفية', 'none' => 'بلا خلفية', 'upload' => 'رفع صورة', 'dim' => 'تعتيم الصورة', 'light' => 'فاتح', 'dark' => 'داكن',
                'sizes' => ['sm' => 'صغير', 'md' => 'متوسط', 'lg' => 'كبير', 'xl' => 'كبير جدًا'],
                'widths' => ['narrow' => 'ضيق', 'normal' => 'عادي', 'wide' => 'واسع', 'full' => 'كامل'],
                'spacings' => ['compact' => 'متقارب', 'normal' => 'عادي', 'relaxed' => 'مريح'],
            ] : [
                'theme' => 'Theme', 'fontSize' => 'Text size', 'smaller' => 'Smaller text', 'larger' => 'Larger text', 'width' => 'Line width', 'spacing' => 'Line spacing',
                'reset' => 'Reset', 'preview' => 'Preview', 'previewTitle' => 'A quiet place to read',
                'previewBody' => 'Good reading settings disappear. The text is large enough, the lines are short enough, and the space between them lets your eyes rest. Change a setting and this paragraph follows at once.',
                'wallpaper' => 'Wallpaper', 'none' => 'None', 'upload' => 'Upload a picture', 'dim' => 'Dim the picture', 'light' => 'Light', 'dark' => 'Dark',
                'sizes' => ['sm' => 'Small', 'md' => 'Medium', 'lg' => 'Large', 'xl' => 'Extra large'],
                'widths' => ['narrow' => 'Narrow', 'normal' => 'Normal', 'wide' => 'Wide', 'full' => 'Full'],
                'spacings' => ['compact' => 'Compact', 'normal' => 'Normal', 'relaxed' => 'Relaxed'],
            ];
            foreach (['sizes', 'widths', 'spacings'] as $key) {
                $base[$key] = array_merge($base[$key], $labels[$key] ?? []);
                unset($labels[$key]);
            }

            return array_merge($base, $labels);
        }

        function nq_appearance_defaults(): array
        {
            return ['fontSize' => 'md', 'width' => 'normal', 'spacing' => 'normal'];
        }

        /** Saved reading preferences (an array or JSON text) with unknown or missing fields set to the defaults. */
        function nq_appearance_parse(mixed $saved): array
        {
            if (is_string($saved)) {
                $saved = json_decode($saved, true);
            }
            $d = nq_appearance_defaults();
            $saved = is_array($saved) ? $saved : [];
            $ok = ['fontSize' => ['sm', 'md', 'lg', 'xl'], 'width' => ['narrow', 'normal', 'wide', 'full'], 'spacing' => ['compact', 'normal', 'relaxed']];
            foreach ($ok as $key => $allowed) {
                $d[$key] = in_array($saved[$key] ?? null, $allowed, true) ? $saved[$key] : $d[$key];
            }

            return $d;
        }

        /** The inline style that carries a choice: --reading-scale, --reading-max-width, --reading-line-height. */
        function nq_appearance_vars(array $p): string
        {
            $scale = ['sm' => '0.875', 'md' => '1', 'lg' => '1.125', 'xl' => '1.25'];
            $ch = ['narrow' => '52ch', 'normal' => '68ch', 'wide' => '88ch', 'full' => 'none'];
            $line = ['compact' => '1.4', 'normal' => '1.6', 'relaxed' => '1.85'];

            return '--reading-scale: '.$scale[$p['fontSize']].'; --reading-max-width: '.$ch[$p['width']].'; --reading-line-height: '.$line[$p['spacing']];
        }

        function nq_appearance_percent(string $size): int
        {
            return (int) round(['sm' => 0.875, 'md' => 1, 'lg' => 1.125, 'xl' => 1.25][$size] * 100);
        }

        /** The CSS background for a wallpaper: a picture address is covered, anything else is used as written. */
        function nq_appearance_wallpaper_css(string $background): string
        {
            $v = trim($background);

            return preg_match('#^(https?://|/|\./|\.\./|data:image/|blob:)#i', $v) ? 'center / cover no-repeat url("'.str_replace('"', '%22', $v).'")' : $v;
        }

        /** Wallpapers grouped by their group, in order of first appearance. */
        function nq_appearance_groups(array $wallpapers): array
        {
            $groups = [];
            foreach ($wallpapers as $w) {
                $groups[$w['group'] ?? ''][] = $w;
            }

            return $groups;
        }

        /** The four preview colours of a theme, repeating the last when fewer are given. */
        function nq_appearance_colors(array $theme): array
        {
            $s = array_values($theme['swatches'] ?? []);

            return array_map(fn ($i) => $s[min($i, count($s) - 1)] ?? 'transparent', [0, 1, 2, 3]);
        }

        /** Classes shared by theme cards and wallpaper tiles. */
        function nq_appearance_card(): string
        {
            return 'group relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-card border border-border bg-card p-2 text-start outline-none transition-colors '
                .'hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '
                .'data-checked:border-primary data-checked:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50';
        }
    }
@endphp
