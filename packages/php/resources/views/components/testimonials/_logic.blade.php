{{-- Internal: the words and pure helpers of the testimonial components, ported from testimonials.tsx and testimonials-logic.ts. Included with
     @include('nasaq::components.testimonials._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_tm_words')) {
        /** The testimonial components' own words for the current locale, with the host's overrides on top. {n} and {max} are replaced. */
        function nq_tm_words(array $override = []): array
        {
            $en = [
                'name' => 'Your name', 'role' => 'Role', 'company' => 'Company', 'email' => 'Email', 'emailHint' => 'Optional. We only use it to thank you.',
                'quote' => 'Your testimonial', 'quoteHint' => 'Up to {max} characters.', 'rating' => 'Rating', 'star' => '{n} star', 'stars' => '{n} stars', 'two' => '{n} stars',
                'consent' => 'You may show my name and words on your website.', 'submit' => 'Send testimonial',
                'thanks' => 'Thank you! Your testimonial is on its way to be reviewed.', 'another' => 'Send another', 'empty' => 'No testimonials yet.',
                'previous' => 'Previous testimonial', 'next' => 'Next testimonial', 'goTo' => 'Testimonial {n}', 'ratedOutOf' => 'Rated {n} out of 5',
                'honeypot' => 'Leave this field empty', 'failed' => 'Something went wrong. Please try again.',
                'errors' => [
                    'name' => 'Enter your name.', 'quote-short' => 'Write a little more.', 'quote-long' => 'That is too long.', 'rating' => 'Pick a rating from 1 to 5.',
                    'email' => 'Enter a valid email address.', 'consent' => 'Please agree so we can show it.',
                ],
            ];
            $ar = [
                'name' => 'اسمك', 'role' => 'المسمى الوظيفي', 'company' => 'الشركة', 'email' => 'البريد الإلكتروني', 'emailHint' => 'اختياري. نستخدمه لشكرك فقط.',
                'quote' => 'شهادتك', 'quoteHint' => 'حتى {max} حرفًا.', 'rating' => 'التقييم', 'star' => '{n} نجمة', 'stars' => '{n} نجوم', 'two' => '{n} نجمتان',
                'consent' => 'يمكنكم عرض اسمي وكلماتي على موقعكم.', 'submit' => 'أرسل الشهادة',
                'thanks' => 'شكرًا لك! شهادتك في طريقها إلى المراجعة.', 'another' => 'إرسال شهادة أخرى', 'empty' => 'لا شهادات بعد.',
                'previous' => 'الشهادة السابقة', 'next' => 'الشهادة التالية', 'goTo' => 'الشهادة {n}', 'ratedOutOf' => 'التقييم {n} من 5',
                'honeypot' => 'اترك هذا الحقل فارغًا', 'failed' => 'حدث خطأ. حاول مرة أخرى.',
                'errors' => [
                    'name' => 'أدخل اسمك.', 'quote-short' => 'اكتب أكثر قليلًا.', 'quote-long' => 'النص أطول من المسموح.', 'rating' => 'اختر تقييمًا من 1 إلى 5.',
                    'email' => 'أدخل بريدًا إلكترونيًا صحيحًا.', 'consent' => 'يرجى الموافقة لنتمكن من عرضها.',
                ],
            ];
            $words = \Nasaq\Nasaq::rtl() ? $ar : $en;
            foreach ($override as $k => $v) {
                $words[$k] = is_array($v) && is_array($words[$k] ?? null) ? array_merge($words[$k], $v) : $v;
            }

            return $words;
        }

        /** "Rated {n} out of 5" with the values filled in. */
        function nq_tm_fill(string $sentence, array $vars): string
        {
            foreach ($vars as $k => $v) {
                $sentence = str_replace('{'.$k.'}', (string) $v, $sentence);
            }

            return $sentence;
        }

        /** "3 stars" in the locale: Arabic has its own forms for 1, 2 and 3 to 10. */
        function nq_tm_stars(int $n, array $t): string
        {
            $ar = \Nasaq\Nasaq::rtl();
            $key = $n === 1 ? 'star' : ($ar && $n === 2 ? 'two' : ($ar && $n > 10 ? 'star' : 'stars'));

            return nq_tm_fill($t[$key], ['n' => $n]);
        }

        /** A number with Latin digits in the current locale. */
        function nq_tm_num(int $n): string
        {
            if (! class_exists(\NumberFormatter::class)) {
                return (string) $n;
            }

            return (string) (new \NumberFormatter(str_replace('_', '-', \Nasaq\Nasaq::rtl() ? 'ar' : app()->getLocale()).'@numbers=latn', \NumberFormatter::DECIMAL))->format($n);
        }

        /** Featured first, then higher ratings, then newer ones; otherwise the given order (PHP sorts are stable). */
        function nq_tm_order(array $list): array
        {
            usort($list, function ($a, $b) {
                $f = (int) ! empty($b['featured']) - (int) ! empty($a['featured']);
                if ($f) {
                    return $f;
                }
                $r = ($b['rating'] ?? 0) <=> ($a['rating'] ?? 0);

                return $r ?: strcmp((string) ($b['date'] ?? ''), (string) ($a['date'] ?? ''));
            });

            return $list;
        }
    }
@endphp
