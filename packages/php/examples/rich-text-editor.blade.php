{{-- Tiptap is not bundled: pass load="() => import('/assets/tiptap.js')" (a module re-exporting Editor, Extension, StarterKit and Placeholder) or set window.NasaqRichText = { load }. --}}
<x-nq::rich-text-editor class="w-[32rem]" value="<p>Hello</p>" aria-label="Notes" />
