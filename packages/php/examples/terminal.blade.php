@php
    $lines = [
        ['kind' => 'command', 'text' => 'pnpm build'],
        "\e[32m✓\e[0m compiled 214 modules",
        ['kind' => 'error', 'text' => 'warning: chunk is larger than 500 kB'],
    ];
@endphp
<x-nq::terminal title="~/app" streaming clearable command :lines="$lines" />
