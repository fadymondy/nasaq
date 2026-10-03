@php
    $groups = [
        ['id' => 'nav', 'title' => 'Navigation', 'titleAr' => 'التنقل', 'items' => [
            ['id' => 'palette', 'label' => 'Open the command palette', 'labelAr' => 'فتح لوحة الأوامر', 'keys' => 'Mod+K'],
            ['id' => 'inbox', 'label' => 'Go to inbox', 'labelAr' => 'الانتقال إلى الوارد', 'keys' => 'G I'],
        ]],
    ];
@endphp
<x-nq::keyboard-shortcuts.dialog :groups="$groups" />
