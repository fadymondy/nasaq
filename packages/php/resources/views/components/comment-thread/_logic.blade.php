{{-- Internal: helpers of x-nq::comment-thread, ported from comment-thread-logic.ts and the strings of comment-thread.tsx.
     Included with @include('nasaq::components.comment-thread._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_ct_words')) {
        /** The built-in words for a locale, with `$override` laid over them. Sentences use %s placeholders. */
        function nq_ct_words(string $locale, array $override = []): array
        {
            $en = [
                'title' => 'Comments', 'empty' => 'No comments yet', 'emptyHint' => 'Start the conversation. Use @ to mention someone.',
                'write' => 'Write a comment…', 'writeReply' => 'Write a reply…', 'send' => 'Comment', 'reply' => 'Reply', 'save' => 'Save', 'cancel' => 'Cancel',
                'edit' => 'Edit', 'delete' => 'Delete', 'confirmDelete' => 'Delete this comment?', 'approve' => 'Approve', 'edited' => 'edited',
                'pending' => 'Awaiting review', 'pendingHint' => 'Only you and moderators can see this until it is approved.',
                'actions' => 'Actions for the comment by %s', 'replies' => '%s replies',
                'human' => 'Member', 'agent' => 'Agent', 'client' => 'Client', 'bot' => 'Bot',
                'signIn' => 'Sign in to comment', 'signInHint' => 'You need an account to join this conversation.', 'signInAction' => 'Sign in',
                'threadLabel' => 'Comment thread', 'failed' => 'That did not work. Try again.',
            ];
            $ar = [
                'title' => 'التعليقات', 'empty' => 'لا توجد تعليقات بعد', 'emptyHint' => 'ابدأ النقاش. استخدم @ للإشارة إلى شخص.',
                'write' => 'اكتب تعليقًا…', 'writeReply' => 'اكتب ردًا…', 'send' => 'تعليق', 'reply' => 'رد', 'save' => 'حفظ', 'cancel' => 'إلغاء',
                'edit' => 'تعديل', 'delete' => 'حذف', 'confirmDelete' => 'حذف هذا التعليق؟', 'approve' => 'اعتماد', 'edited' => 'معدّل',
                'pending' => 'بانتظار المراجعة', 'pendingHint' => 'لا يراه غيرك والمشرفون إلى أن يُعتمد.',
                'actions' => 'إجراءات تعليق %s', 'replies' => '%s ردود',
                'human' => 'عضو', 'agent' => 'وكيل', 'client' => 'عميل', 'bot' => 'روبوت',
                'signIn' => 'سجّل الدخول للتعليق', 'signInHint' => 'تحتاج إلى حساب للمشاركة في هذا النقاش.', 'signInAction' => 'تسجيل الدخول',
                'threadLabel' => 'سلسلة التعليقات', 'failed' => 'لم ينجح ذلك. حاول مرة أخرى.',
            ];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Groups a flat list into threads: roots oldest first, each with its replies oldest first. A reply to a reply joins the root; a reply with no parent becomes a root. */
        function nq_ct_build(array $comments): array
        {
            $comments = array_values($comments);
            $time = fn ($c) => \Carbon\Carbon::parse($c['createdAt'])->getTimestamp();
            usort($comments, fn ($a, $b) => $time($a) <=> $time($b));
            $byId = [];
            foreach ($comments as $c) {
                $byId[$c['id']] = $c;
            }
            $rootOf = function (array $c) use ($byId): ?string {
                $seen = [];
                $cur = $c;
                while (! empty($cur['parentId']) && ! isset($seen[$cur['id']])) {
                    $seen[$cur['id']] = true;
                    if (! isset($byId[$cur['parentId']])) {
                        return null;
                    }
                    $cur = $byId[$cur['parentId']];
                }

                return $cur['id'];
            };
            $nodes = [];
            foreach ($comments as $c) {
                $root = ! empty($c['parentId']) ? $rootOf($c) : $c['id'];
                if ($root === null || $root === $c['id']) {
                    $nodes[$c['id']] = ['comment' => $c, 'replies' => []];
                }
            }
            foreach ($comments as $c) {
                if (empty($c['parentId'])) {
                    continue;
                }
                $root = $rootOf($c);
                if ($root !== null && $root !== $c['id'] && isset($nodes[$root])) {
                    $nodes[$root]['replies'][] = $c;
                }
            }

            return array_values($nodes);
        }

        /** Turns `@Name` (for every known mention) into a Markdown link `[@Name](#mention-<id>)`, longest names first. */
        function nq_ct_link_mentions(string $body, array $mentions): string
        {
            if (! $mentions) {
                return $body;
            }
            $byName = [];
            foreach ($mentions as $m) {
                $byName[mb_strtolower($m['name'])] = $m;
            }
            $names = array_keys($byName);
            usort($names, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
            $re = '/(?<![\p{L}\p{N}\[\\\\])@('.implode('|', array_map(fn ($n) => preg_quote($n, '/'), $names)).')(?![\p{L}\p{N}])/iu';

            return preg_replace_callback($re, function ($m) use ($byName) {
                $mention = $byName[mb_strtolower($m[1])] ?? null;

                return $mention ? '[@'.preg_replace('/([\[\]\\\\])/', '\\\\$1', $m[1]).'](#mention-'.rawurlencode($mention['id']).')' : $m[0];
            }, $body) ?? $body;
        }
    }
@endphp
