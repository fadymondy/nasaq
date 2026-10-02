@php
    $steps = [
        ['cmd' => 'npx create-togo-app my-shop', 'out' => ["\e[32m✓\e[0m Installed 214 packages"]],
        ['cmd' => 'cd my-shop && togo dev', 'out' => ['ready on http://localhost:5173']],
    ];
@endphp
<x-nq::typing-terminal title="~/my-shop" :steps="$steps" />
