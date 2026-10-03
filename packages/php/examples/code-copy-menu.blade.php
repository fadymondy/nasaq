@php
    $greet = "export const greet = (name: string) => `Hello, \${name}`;\n";
@endphp
<x-nq::code-copy-menu :code="$greet" language="ts" filename="greet.ts" />
