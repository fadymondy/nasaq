@php
    $greet = "export const greet = (name: string) => `Hello, \${name}`;\n";
@endphp
<div class="flex flex-col gap-4">
    <x-nq::command-snippet command="$ npm i @nasaq/web" />
    <x-nq::code-tabs install="@nasaq/web" sync-key="pm" title="Install" />
    <x-nq::code-tabs exec="shadcn@latest add button" sync-key="pm" ai-copy />
    <x-nq::code-block-ai :code="$greet" language="ts" filename="greet.ts" />
</div>
