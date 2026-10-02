{{-- Internal: the words of x-nq::agent-persona-editor, ported from the strings of agent-persona-editor.tsx.
     Included with @include('nasaq::components.agent-persona-editor._logic'); the function is defined once. Sentences use %1$s and %2$s. --}}
@php
    if (! function_exists('nq_ape_words')) {
        /** The built-in words for a locale, with `$override` laid over them. */
        function nq_ape_words(string $locale, array $override = []): array
        {
            $en = [
                'label' => 'Agent persona', 'identity' => 'Identity', 'name' => 'Name', 'namePlaceholder' => 'Support agent',
                'nameRequired' => 'Give the agent a name.', 'tagline' => 'Tagline', 'taglinePlaceholder' => 'Answers billing questions', 'color' => 'Colour',
                'icon' => 'Icon', 'model' => 'Model', 'traits' => 'Traits', 'traitsHint' => 'Short words for how the agent comes across. Press Enter to add one.',
                'traitsPlaceholder' => 'Add a trait', 'greeting' => 'Greeting', 'greetingHint' => 'The first thing the agent says.', 'persona' => 'Persona',
                'personaHint' => 'Who the agent is and how it behaves, in Markdown. This is added to its instructions.', 'write' => 'Write', 'preview' => 'Preview',
                'previewEmpty' => 'Nothing to preview yet.', 'personaTooLong' => 'Keep the persona under %1$s characters.', 'insert' => 'Add a section',
                'sections' => ['Role', 'Tone', 'Rules', 'Boundaries'], 'words' => '%1$s words', 'chars' => '%1$s of %2$s', 'save' => 'Save persona',
                'saving' => 'Saving', 'revert' => 'Revert', 'unsaved' => 'Unsaved changes', 'saved' => 'Saved.',
                'saveFailed' => 'The persona could not be saved. Try again.', 'previewTitle' => 'How it looks', 'unnamed' => 'Unnamed agent',
            ];
            $ar = [
                'label' => 'شخصية الوكيل', 'identity' => 'الهوية', 'name' => 'الاسم', 'namePlaceholder' => 'وكيل الدعم', 'nameRequired' => 'أعطِ الوكيل اسمًا.',
                'tagline' => 'الوصف المختصر', 'taglinePlaceholder' => 'يجيب عن أسئلة الفواتير', 'color' => 'اللون', 'icon' => 'الأيقونة', 'model' => 'النموذج',
                'traits' => 'السمات', 'traitsHint' => 'كلمات قصيرة تصف طريقة الوكيل. اضغط Enter لإضافة سمة.', 'traitsPlaceholder' => 'أضف سمة', 'greeting' => 'التحية',
                'greetingHint' => 'أول ما يقوله الوكيل.', 'persona' => 'الشخصية', 'personaHint' => 'من هو الوكيل وكيف يتصرف، بصيغة Markdown. تُضاف إلى تعليماته.',
                'write' => 'كتابة', 'preview' => 'معاينة', 'previewEmpty' => 'لا شيء للمعاينة بعد.', 'personaTooLong' => 'اجعل الشخصية أقل من %1$s حرف.',
                'insert' => 'إضافة قسم', 'sections' => ['الدور', 'النبرة', 'القواعد', 'الحدود'], 'words' => '%1$s كلمة', 'chars' => '%1$s من %2$s',
                'save' => 'حفظ الشخصية', 'saving' => 'جارٍ الحفظ', 'revert' => 'تراجع', 'unsaved' => 'تغييرات غير محفوظة', 'saved' => 'تم الحفظ.',
                'saveFailed' => 'تعذر حفظ الشخصية. حاول مرة أخرى.', 'previewTitle' => 'كيف تبدو', 'unnamed' => 'وكيل بلا اسم',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }
    }
@endphp
