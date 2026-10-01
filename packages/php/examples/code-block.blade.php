@php
    $source = 'export const greet = (name: string) => `Hello, ${name}`;'."\n".'// highlighted line'."\n".'greet("Nasaq");';
@endphp
<x-nq::code-block language="ts" filename="greet.ts" line-numbers highlight-lines="2" :code="$source" />
<p class="mt-3 text-body">Run <x-nq::code-block.inline-code>pnpm add @fadymondy/nasaq</x-nq::code-block.inline-code> first.</p>
