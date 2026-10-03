@php
    $source = 'export const greet = (name: string) => `Hello, ${name}`;'."\n".'// highlighted line'."\n".'greet("Nasaq");';
@endphp
<x-nq::code-block language="ts" filename="greet.ts" line-numbers highlight-lines="2" :code="$source" />
<p class="mt-3 text-body">Run <x-nq::code-block.inline-code>pnpm add @fadymondy/nasaq</x-nq::code-block.inline-code> first.</p>

<div class="mt-6" x-data="{ snippet: 'npm i nasaq', next() { this.snippet = 'pnpm add nasaq\npnpm dlx nasaq init' } }">
    <x-nq::code-block id="live-code" language="bash" filename="install.sh" line-numbers code="npm i nasaq" code-expr="snippet" />
    <x-nq::button id="live-code-change" size="sm" class="mt-3" x-on:click="next()">Use pnpm</x-nq::button>
</div>
