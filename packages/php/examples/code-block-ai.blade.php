@php
    $greet = "export const greet = (name: string) => `Hello, \${name}`;\n";
@endphp
<x-nq::code-block-ai :code="$greet" language="ts" filename="greet.ts" />
