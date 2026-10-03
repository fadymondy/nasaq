{{-- <x-nq::code-block-ai language="ts" filename="greet.ts" :code="$source" />
     A code block whose copy button is the copy menu: Copy code, Copy as Markdown, prompts for AI assistants.
     Takes the <x-nq::code-block> props (code, language, filename, line-numbers, highlight-lines, label, pre-class) and the
     <x-nq::code-copy-menu> ones (instruction, targets, open-links). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['code', 'language' => 'text', 'filename' => null, 'lineNumbers' => false, 'highlightLines' => null, 'label' => null, 'preClass' => null, 'instruction' => null, 'targets' => ['claude', 'chatgpt', 'cursor'], 'openLinks' => true])
<x-nq::code-block :code="$code" :language="$language" :filename="$filename" :line-numbers="$lineNumbers" :highlight-lines="$highlightLines" :label="$label" :pre-class="$preClass" {{ $attributes }}>
    <x-slot:copyAction>
        <x-nq::code-copy-menu :code="$code" :language="$language" :filename="$filename" :instruction="$instruction" :targets="$targets" :open-links="$openLinks" />
    </x-slot:copyAction>
</x-nq::code-block>
